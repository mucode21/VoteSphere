#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec, IntoVal, BytesN, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Election {
    pub id: u32,
    pub title: String,
    pub description: String,
    pub candidates: Vec<String>,
    pub end_time: u64,
    pub closed: bool,
    pub result_contract: Address,
}

#[contracttype]
pub enum DataKey {
    Admin,
    ElectionIds,
    Election(u32),
}

// Client definition for ResultContract to satisfy contract-to-contract interaction
pub struct ResultContractClient<'a> {
    pub env: &'a Env,
    pub address: Address,
}

impl<'a> ResultContractClient<'a> {
    pub fn new(env: &'a Env, address: Address) -> Self {
        Self { env, address }
    }
    
    pub fn init_elec(&self, election_id: u32, num_candidates: u32) {
        self.env.invoke_contract::<()>(
            &self.address,
            &Symbol::new(self.env, "init_elec"),
            soroban_sdk::vec![
                self.env,
                election_id.into_val(self.env),
                num_candidates.into_val(self.env)
            ],
        );
    }

    pub fn fin_elec(&self, election_id: u32) {
        self.env.invoke_contract::<()>(
            &self.address,
            &Symbol::new(self.env, "fin_elec"),
            soroban_sdk::vec![
                self.env,
                election_id.into_val(self.env)
            ],
        );
    }
}

#[contract]
pub struct ElectionRegistryContract;

#[contractimpl]
impl ElectionRegistryContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("Not initialized");
        admin.require_auth();

        env.deployer().update_current_contract_wasm(new_wasm_hash);

        // Emit ContractUpgraded event
        env.events().publish(
            (Symbol::new(&env, "upgrade"), Symbol::new(&env, "contract_upgraded")),
            Symbol::new(&env, "registry"),
        );
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).expect("Not initialized")
    }

    pub fn create_election(
        env: Env,
        id: u32,
        title: String,
        description: String,
        candidates: Vec<String>,
        end_time: u64,
        result_contract: Address,
    ) {
        // Input validation
        if title.len() == 0 {
            panic!("Title cannot be empty");
        }
        if description.len() == 0 {
            panic!("Description cannot be empty");
        }
        if candidates.len() < 2 {
            panic!("Must have at least 2 candidates");
        }
        let now = env.ledger().timestamp();
        if end_time <= now {
            panic!("End time must be in the future");
        }

        let key = DataKey::Election(id);
        if env.storage().persistent().has(&key) {
            panic!("Election already exists");
        }

        let election = Election {
            id,
            title: title.clone(),
            description: description.clone(),
            candidates: candidates.clone(),
            end_time,
            closed: false,
            result_contract: result_contract.clone(),
        };

        // Save metadata
        env.storage().persistent().set(&key, &election);

        // Keep track of election IDs
        let mut ids: Vec<u32> = env
            .storage()
            .persistent()
            .get(&DataKey::ElectionIds)
            .unwrap_or(Vec::new(&env));
        ids.push_back(id);
        env.storage().persistent().set(&DataKey::ElectionIds, &ids);

        // Notify ResultContract to initialize tracking (Contract-to-Contract Call)
        let result_client = ResultContractClient::new(&env, result_contract);
        result_client.init_elec(id, candidates.len());

        // Emit event
        env.events().publish(
            (Symbol::new(&env, "registry"), Symbol::new(&env, "election_created")),
            (id, title),
        );
    }

    pub fn update_election(
        env: Env,
        id: u32,
        title: String,
        description: String,
    ) {
        // Role authorization check
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("Not initialized");
        admin.require_auth();

        if title.len() == 0 || description.len() == 0 {
            panic!("Title/description cannot be empty");
        }

        let key = DataKey::Election(id);
        let mut election: Election = env.storage().persistent().get(&key).expect("Election not found");
        
        if election.closed {
            panic!("Election already closed");
        }

        election.title = title.clone();
        election.description = description.clone();
        
        env.storage().persistent().set(&key, &election);

        // Emit event
        env.events().publish(
            (Symbol::new(&env, "registry"), Symbol::new(&env, "election_updated")),
            (id, title),
        );
    }

    pub fn get_election(env: Env, id: u32) -> Election {
        let key = DataKey::Election(id);
        env.storage()
            .persistent()
            .get(&key)
            .expect("Election not found")
    }

    pub fn list_elections(env: Env) -> Vec<Election> {
        let ids: Vec<u32> = env
            .storage()
            .persistent()
            .get(&DataKey::ElectionIds)
            .unwrap_or(Vec::new(&env));

        let mut list = Vec::new(&env);
        for id in ids.iter() {
            let key = DataKey::Election(id);
            if let Some(election) = env.storage().persistent().get::<DataKey, Election>(&key) {
                list.push_back(election);
            }
        }
        list
    }

    pub fn close_election(env: Env, id: u32) {
        // Role authorization check
        let admin: Address = env.storage().instance().get(&DataKey::Admin).expect("Not initialized");
        admin.require_auth();

        let key = DataKey::Election(id);
        let mut election: Election = env
            .storage()
            .persistent()
            .get(&key)
            .expect("Election not found");

        if election.closed {
            panic!("Election already closed");
        }

        election.closed = true;
        env.storage().persistent().set(&key, &election);

        // Notify ResultContract (Contract-to-Contract Call)
        let result_client = ResultContractClient::new(&env, election.result_contract.clone());
        result_client.fin_elec(id);

        // Emit event
        env.events().publish(
            (Symbol::new(&env, "registry"), Symbol::new(&env, "election_closed")),
            id,
        );
    }

    pub fn version(_env: Env) -> u32 {
        1
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{contract, contractimpl, testutils::Address as _, Address, Env, String, Vec};

    #[contract]
    pub struct MockResultContract;

    #[contractimpl]
    impl MockResultContract {
        pub fn init_elec(_env: Env, _election_id: u32, _num_candidates: u32) {}
        pub fn fin_elec(_env: Env, _election_id: u32) {}
    }

    #[test]
    fn test_initialize_and_metadata() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, ElectionRegistryContract);
        let client = ElectionRegistryContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialize(&admin);

        assert_eq!(client.get_admin(), admin);
    }

    #[test]
    #[should_panic(expected = "Already initialized")]
    fn test_double_initialize_panics() {
        let env = Env::default();
        let contract_id = env.register_contract(None, ElectionRegistryContract);
        let client = ElectionRegistryContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialize(&admin);
        client.initialize(&admin);
    }

    #[test]
    fn test_create_and_update_election() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, ElectionRegistryContract);
        let client = ElectionRegistryContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialize(&admin);

        let mock_result_id = env.register_contract(None, MockResultContract);

        let title = String::from_str(&env, "DAO Proposal");
        let desc = String::from_str(&env, "Should we integrate Stellar?");
        let mut candidates = Vec::new(&env);
        candidates.push_back(String::from_str(&env, "Yes"));
        candidates.push_back(String::from_str(&env, "No"));
        let end_time = env.ledger().timestamp() + 3600;

        client.create_election(&1, &title, &desc, &candidates, &end_time, &mock_result_id);

        let election = client.get_election(&1);
        assert_eq!(election.id, 1);
        assert_eq!(election.title, title);
        assert_eq!(election.closed, false);
        assert_eq!(election.result_contract, mock_result_id);

        // Update election details
        let new_title = String::from_str(&env, "DAO Proposal V2");
        let new_desc = String::from_str(&env, "Should we integrate Stellar soon?");
        client.update_election(&1, &new_title, &new_desc);

        let updated = client.get_election(&1);
        assert_eq!(updated.title, new_title);
        assert_eq!(updated.description, new_desc);
    }

    #[test]
    fn test_close_election() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, ElectionRegistryContract);
        let client = ElectionRegistryContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialize(&admin);

        let mock_result_id = env.register_contract(None, MockResultContract);

        let title = String::from_str(&env, "DAO Proposal");
        let desc = String::from_str(&env, "Should we integrate Stellar?");
        let mut candidates = Vec::new(&env);
        candidates.push_back(String::from_str(&env, "Yes"));
        candidates.push_back(String::from_str(&env, "No"));
        let end_time = env.ledger().timestamp() + 3600;

        client.create_election(&2, &title, &desc, &candidates, &end_time, &mock_result_id);
        client.close_election(&2);

        let election = client.get_election(&2);
        assert_eq!(election.closed, true);
    }
}
