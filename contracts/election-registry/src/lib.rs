#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Vec, symbol_short as sym, IntoVal};

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
    ElectionIds,
    Election(u32),
}

// Client definition for ResultContract to satisfy contract-to-contract interaction
#[contract]
pub struct ResultContractStub;

#[contractimpl]
impl ResultContractStub {
    // Stub to make calls
}

// ResultContractClient trait definition
pub struct ResultContractClient<'a> {
    pub env: &'a Env,
    pub address: Address,
}

impl<'a> ResultContractClient<'a> {
    pub fn new(env: &'a Env, address: Address) -> Self {
        Self { env, address }
    }
    
    pub fn init_election(&self, election_id: u32, num_candidates: u32) {
        self.env.invoke_contract::<()>(
            &self.address,
            &sym!("init_elec"),
            soroban_sdk::vec![
                self.env,
                election_id.into_val(self.env),
                num_candidates.into_val(self.env)
            ],
        );
    }

    pub fn finalize_election(&self, election_id: u32) {
        self.env.invoke_contract::<()>(
            &self.address,
            &sym!("fin_elec"),
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
    pub fn create_election(
        env: Env,
        id: u32,
        title: String,
        description: String,
        candidates: Vec<String>,
        end_time: u64,
        result_contract: Address,
    ) {
        let key = DataKey::election_key(id);
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
        result_client.init_election(id, candidates.len());

        // Emit event
        env.events().publish(
            (symbol_short!("registry"), symbol_short!("created")),
            (id, title),
        );
    }

    pub fn get_election(env: Env, id: u32) -> Election {
        let key = DataKey::election_key(id);
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
            let key = DataKey::election_key(id);
            if let Some(election) = env.storage().persistent().get::<DataKey, Election>(&key) {
                list.push_back(election);
            }
        }
        list
    }

    pub fn close_election(env: Env, id: u32) {
        let key = DataKey::election_key(id);
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
        result_client.finalize_election(id);

        // Emit event
        env.events().publish(
            (symbol_short!("registry"), symbol_short!("closed")),
            id,
        );
    }
}

impl DataKey {
    fn election_key(id: u32) -> Self {
        DataKey::Election(id)
    }
}
