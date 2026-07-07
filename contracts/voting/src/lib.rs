#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, contracterror, Address, Env, String, Vec, Symbol, IntoVal, BytesN};

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
    Voted(u32, Address),     // (election_id, voter_address) -> bool
    VoteCount(u32, u32),     // (election_id, candidate_idx) -> u32
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    VotingClosed = 3,
    InvalidCandidate = 4,
    AlreadyVoted = 5,
}

// Client definition for ElectionRegistryContract to satisfy contract-to-contract interaction
pub struct RegistryContractClient<'a> {
    pub env: &'a Env,
    pub address: Address,
}

impl<'a> RegistryContractClient<'a> {
    pub fn new(env: &'a Env, address: Address) -> Self {
        Self { env, address }
    }
    
    pub fn get_election(&self, id: u32) -> Result<Election, soroban_sdk::Error> {
        self.env.invoke_contract::<Result<Election, soroban_sdk::Error>>(
            &self.address,
            &Symbol::new(self.env, "get_election"),
            soroban_sdk::vec![self.env, id.into_val(self.env)],
        )
    }
}

#[contract]
pub struct VotingContract;

#[contractimpl]
impl VotingContract {
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

        env.events().publish(
            (Symbol::new(&env, "upgrade"), Symbol::new(&env, "contract_upgraded")),
            Symbol::new(&env, "voting"),
        );
        Ok(())
    }

    pub fn cast_vote(
        env: Env,
        election_id: u32,
        voter: Address,
        candidate_idx: u32,
        registry_contract: Address,
    ) -> Result<(), ContractError> {
        // Authenticate the voter to verify signature
        voter.require_auth();

        // 1. Inter-contract call to ElectionRegistryContract to verify election status
        let registry_client = RegistryContractClient::new(&env, registry_contract);
        let election_res = registry_client.get_election(election_id);
        
        let election = match election_res {
            Ok(elec) => elec,
            Err(_) => return Err(ContractError::VotingClosed),
        };

        if election.closed {
            return Err(ContractError::VotingClosed);
        }

        let ledger_timestamp = env.ledger().timestamp();
        if ledger_timestamp > election.end_time {
            return Err(ContractError::VotingClosed);
        }

        if candidate_idx >= election.candidates.len() {
            return Err(ContractError::InvalidCandidate);
        }

        // 2. Prevent duplicate voting
        let voted_key = DataKey::Voted(election_id, voter.clone());
        if env.storage().persistent().has(&voted_key) {
            return Err(ContractError::AlreadyVoted);
        }

        // Record vote status
        env.storage().persistent().set(&voted_key, &true);

        // Record candidate vote count
        let count_key = DataKey::VoteCount(election_id, candidate_idx);
        let current_count: u32 = env
            .storage()
            .persistent()
            .get(&count_key)
            .unwrap_or(0);
        
        env.storage().persistent().set(&count_key, &(current_count + 1));

        // Emit event
        env.events().publish(
            (Symbol::new(&env, "voting"), Symbol::new(&env, "vote_cast")),
            (election_id, voter, candidate_idx),
        );
        Ok(())
    }

    pub fn has_voted(env: Env, election_id: u32, voter: Address) -> bool {
        let voted_key = DataKey::Voted(election_id, voter);
        env.storage().persistent().has(&voted_key)
    }

    pub fn get_vote_count(env: Env, election_id: u32, candidate_idx: u32) -> u32 {
        let count_key = DataKey::VoteCount(election_id, candidate_idx);
        env.storage()
            .persistent()
            .get(&count_key)
            .unwrap_or(0)
    }

    pub fn vote_count(env: Env, election_id: u32, candidate_idx: u32) -> u32 {
        Self::get_vote_count(env, election_id, candidate_idx)
    }

    pub fn candidate_count(env: Env, election_id: u32, registry_contract: Address) -> u32 {
        let registry_client = RegistryContractClient::new(&env, registry_contract);
        let election_res = registry_client.get_election(election_id);
        match election_res {
            Ok(elec) => elec.candidates.len(),
            _ => 0,
        }
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
    pub struct MockRegistryContract;

    #[contractimpl]
    impl MockRegistryContract {
        pub fn get_election(env: Env, id: u32) -> Result<Election, soroban_sdk::Error> {
            let mut candidates = Vec::new(&env);
            candidates.push_back(String::from_str(&env, "Yes"));
            candidates.push_back(String::from_str(&env, "No"));
            Ok(Election {
                id,
                title: String::from_str(&env, "DAO Proposal"),
                description: String::from_str(&env, "DAO Proposal Description"),
                candidates,
                end_time: env.ledger().timestamp() + 3600,
                closed: false,
                result_contract: Address::generate(&env),
            })
        }
    }

    #[test]
    fn test_initialize_voting() {
        let env = Env::default();
        let contract_id = env.register_contract(None, VotingContract);
        let client = VotingContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialize(&admin);
        
        // Assert we can run version
        assert_eq!(client.version(), 1);
    }

    #[test]
    fn test_cast_vote() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, VotingContract);
        let client = VotingContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialize(&admin);

        let mock_registry_id = env.register_contract(None, MockRegistryContract);
        let voter = Address::generate(&env);

        assert_eq!(client.has_voted(&1, &voter), false);
        assert_eq!(client.get_vote_count(&1, &0), 0);

        client.cast_vote(&1, &voter, &0, &mock_registry_id);

        assert_eq!(client.has_voted(&1, &voter), true);
        assert_eq!(client.get_vote_count(&1, &0), 1);
        assert_eq!(client.get_vote_count(&1, &1), 0);
    }

    #[test]
    fn test_double_vote_panics() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, VotingContract);
        let client = VotingContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialize(&admin);

        let mock_registry_id = env.register_contract(None, MockRegistryContract);
        let voter = Address::generate(&env);

        client.cast_vote(&1, &voter, &0, &mock_registry_id);
        let err = client.try_cast_vote(&1, &voter, &1, &mock_registry_id).unwrap_err();
        assert!(err.is_ok()); // Clean contract error on duplicate vote
    }
}
