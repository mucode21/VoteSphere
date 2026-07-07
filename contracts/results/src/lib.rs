#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, contracterror, Address, Env, Vec, Symbol, IntoVal, BytesN};

#[contracttype]
pub enum DataKey {
    Admin,
    NumCandidates(u32),     // election_id -> num_candidates
    Results(u32),           // election_id -> Vec<u32> (tally per candidate)
    Winner(u32),            // election_id -> candidate_idx
    Finalized(u32),         // election_id -> bool
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    ElectionNotInitialized = 3,
}

// Client definition for VotingContract to satisfy contract-to-contract interaction
pub struct VotingContractClient<'a> {
    pub env: &'a Env,
    pub address: Address,
}

impl<'a> VotingContractClient<'a> {
    pub fn new(env: &'a Env, address: Address) -> Self {
        Self { env, address }
    }
    
    pub fn vote_count(&self, election_id: u32, candidate_idx: u32) -> u32 {
        self.env.invoke_contract::<u32>(
            &self.address,
            &Symbol::new(self.env, "vote_count"),
            soroban_sdk::vec![
                self.env,
                election_id.into_val(self.env),
                candidate_idx.into_val(self.env)
            ],
        )
    }
}

#[contract]
pub struct ResultContract;

#[contractimpl]
impl ResultContract {
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
            Symbol::new(&env, "results"),
        );
        Ok(())
    }

    // Initializer called by ElectionRegistryContract
    pub fn init_elec(env: Env, election_id: u32, num_candidates: u32) {
        let key = DataKey::NumCandidates(election_id);
        env.storage().persistent().set(&key, &num_candidates);
        
        let finalized_key = DataKey::Finalized(election_id);
        env.storage().persistent().set(&finalized_key, &false);
    }

    // Aggregates results from VotingContract
    pub fn calculate_results(env: Env, election_id: u32, voting_contract: Address) -> Result<Vec<u32>, ContractError> {
        let num_candidates: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::NumCandidates(election_id))
            .ok_or(ContractError::ElectionNotInitialized)?;

        let voting_client = VotingContractClient::new(&env, voting_contract);
        let mut results = Vec::new(&env);
        
        let mut winner_idx = 0;
        let mut max_votes = 0;

        for idx in 0..num_candidates {
            let votes = voting_client.vote_count(election_id, idx);
            results.push_back(votes);
            
            if votes > max_votes {
                max_votes = votes;
                winner_idx = idx;
            }
        }

        // Cache results & winner
        env.storage().persistent().set(&DataKey::Results(election_id), &results);
        env.storage().persistent().set(&DataKey::Winner(election_id), &winner_idx);

        // Emit event
        env.events().publish(
            (Symbol::new(&env, "results"), Symbol::new(&env, "result_calculated")),
            (election_id, winner_idx, max_votes),
        );

        Ok(results)
    }

    pub fn get_results(env: Env, election_id: u32) -> Vec<u32> {
        env.storage()
            .persistent()
            .get(&DataKey::Results(election_id))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_winner(env: Env, election_id: u32) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::Winner(election_id))
            .unwrap_or(0)
    }

    // Finalize method called by ElectionRegistryContract
    pub fn fin_elec(env: Env, election_id: u32) {
        let finalized_key = DataKey::Finalized(election_id);
        env.storage().persistent().set(&finalized_key, &true);

        // Emit finalization event
        env.events().publish(
            (Symbol::new(&env, "results"), Symbol::new(&env, "finalized")),
            election_id,
        );
    }

    pub fn version(_env: Env) -> u32 {
        1
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{contract, contractimpl, testutils::Address as _, Address, Env};

    #[contract]
    pub struct MockVotingContract;

    #[contractimpl]
    impl MockVotingContract {
        pub fn vote_count(_env: Env, election_id: u32, candidate_idx: u32) -> u32 {
            if election_id == 1 {
                if candidate_idx == 0 {
                    10
                } else if candidate_idx == 1 {
                    25
                } else {
                    0
                }
            } else {
                0
            }
        }
    }

    #[test]
    fn test_initialize_results() {
        let env = Env::default();
        let contract_id = env.register_contract(None, ResultContract);
        let client = ResultContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialize(&admin);

        assert_eq!(client.version(), 1);
    }

    #[test]
    fn test_calculate_results() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, ResultContract);
        let client = ResultContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialize(&admin);

        // Initialize election 1 with 2 candidates
        client.init_elec(&1, &2);

        let mock_voting_id = env.register_contract(None, MockVotingContract);

        // Calculate results
        let results = client.calculate_results(&1, &mock_voting_id);
        assert_eq!(results.get(0).unwrap(), 10);
        assert_eq!(results.get(1).unwrap(), 25);

        // Verify cached results
        let cached_results = client.get_results(&1);
        assert_eq!(cached_results.get(0).unwrap(), 10);
        assert_eq!(cached_results.get(1).unwrap(), 25);

        // Verify cached winner
        let winner = client.get_winner(&1);
        assert_eq!(winner, 1);
    }

    #[test]
    fn test_finalize_results() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, ResultContract);
        let client = ResultContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialize(&admin);

        client.init_elec(&1, &2);
        client.fin_elec(&1);
    }
}
