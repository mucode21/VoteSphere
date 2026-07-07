#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, contracterror, Address, Env, String, Vec, IntoVal, BytesN, Symbol};

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

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotFound = 3,
    InvalidInput = 4,
    AlreadyClosed = 5,
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
    pub fn initialize(env: Env, admin: Address) -> Result<(), ContractError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(ContractError::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        Ok(())
    }

    pub fn upgrade(env: Env, new_wasm_hash: BytesN<32>) -> Result<(), ContractError> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin)
            .ok_or(ContractError::NotInitialized)?;
        admin.require_auth();

        env.deployer().update_current_contract_wasm(new_wasm_hash);

        // Emit ContractUpgraded event
        env.events().publish(
            (Symbol::new(&env, "upgrade"), Symbol::new(&env, "contract_upgraded")),
            Symbol::new(&env, "registry"),
        );
        Ok(())
    }

    pub fn get_admin(env: Env) -> Result<Address, ContractError> {
        env.storage().instance().get(&DataKey::Admin)
            .ok_or(ContractError::NotInitialized)
    }

    pub fn create_election(
        env: Env,
        id: u32,
        title: String,
        description: String,
        candidates: Vec<String>,
        end_time: u64,
        result_contract: Address,
    ) -> Result<(), ContractError> {
        // Input validation
        if title.len() == 0 || description.len() == 0 || candidates.len() < 2 {
            return Err(ContractError::InvalidInput);
        }
        let now = env.ledger().timestamp();
        if end_time <= now {
            return Err(ContractError::InvalidInput);
        }

        let key = DataKey::Election(id);
        if env.storage().persistent().has(&key) {
            return Err(ContractError::InvalidInput);
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
        Ok(())
    }

    pub fn update_election(
        env: Env,
        id: u32,
        title: String,
        description: String,
    ) -> Result<(), ContractError> {
        // Role authorization check
        let admin: Address = env.storage().instance().get(&DataKey::Admin)
            .ok_or(ContractError::NotInitialized)?;
        admin.require_auth();

        if title.len() == 0 || description.len() == 0 {
            return Err(ContractError::InvalidInput);
        }

        let key = DataKey::Election(id);
        let mut election: Election = env.storage().persistent().get(&key)
            .ok_or(ContractError::NotFound)?;
        
        if election.closed {
            return Err(ContractError::AlreadyClosed);
        }

        election.title = title.clone();
        election.description = description.clone();
        
        env.storage().persistent().set(&key, &election);

        // Emit event
        env.events().publish(
            (Symbol::new(&env, "registry"), Symbol::new(&env, "election_updated")),
            (id, title),
        );
        Ok(())
    }

    pub fn get_election(env: Env, id: u32) -> Result<Election, ContractError> {
        let key = DataKey::Election(id);
        env.storage()
            .persistent()
            .get(&key)
            .ok_or(ContractError::NotFound)
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

    pub fn close_election(env: Env, id: u32) -> Result<(), ContractError> {
        // Role authorization check
        let admin: Address = env.storage().instance().get(&DataKey::Admin)
            .ok_or(ContractError::NotInitialized)?;
        admin.require_auth();

        let key = DataKey::Election(id);
        let mut election: Election = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(ContractError::NotFound)?;

        if election.closed {
            return Err(ContractError::AlreadyClosed);
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
        Ok(())
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
    fn test_double_initialize_panics() {
        let env = Env::default();
        let contract_id = env.register_contract(None, ElectionRegistryContract);
        let client = ElectionRegistryContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialize(&admin);
        let err = client.try_initialize(&admin).unwrap_err();
        assert!(err.is_ok()); // Invocation failed cleanly with a contract error
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
