#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Vec, Symbol, IntoVal};

#[contracttype]
pub enum DataKey {
    NumCandidates(u32),     // election_id -> num_candidates
    Results(u32),           // election_id -> Vec<u32> (tally per candidate)
    Winner(u32),            // election_id -> candidate_idx
    Finalized(u32),         // election_id -> bool
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
    
    pub fn get_vote_count(&self, election_id: u32, candidate_idx: u32) -> u32 {
        self.env.invoke_contract::<u32>(
            &self.address,
            &Symbol::new(self.env, "get_vote_count"),
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
    // Initializer called by ElectionRegistryContract
    pub fn init_elec(env: Env, election_id: u32, num_candidates: u32) {
        let key = DataKey::NumCandidates(election_id);
        env.storage().persistent().set(&key, &num_candidates);
        
        let finalized_key = DataKey::Finalized(election_id);
        env.storage().persistent().set(&finalized_key, &false);
    }

    // Aggregates results from VotingContract
    pub fn calculate_results(env: Env, election_id: u32, voting_contract: Address) -> Vec<u32> {
        let num_candidates: u32 = env
            .storage()
            .persistent()
            .get(&DataKey::NumCandidates(election_id))
            .expect("Election not initialized in ResultContract");

        let voting_client = VotingContractClient::new(&env, voting_contract);
        let mut results = Vec::new(&env);
        
        let mut winner_idx = 0;
        let mut max_votes = 0;

        for idx in 0..num_candidates {
            let votes = voting_client.get_vote_count(election_id, idx);
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
            (symbol_short!("results"), symbol_short!("updated")),
            (election_id, winner_idx, max_votes),
        );

        results
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
            (symbol_short!("results"), symbol_short!("finalized")),
            election_id,
        );
    }
}
