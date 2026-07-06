#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Vec, Symbol, IntoVal};

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
    Voted(u32, Address),     // (election_id, voter_address) -> bool
    VoteCount(u32, u32),     // (election_id, candidate_idx) -> u32
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
    
    pub fn get_election(&self, id: u32) -> Election {
        self.env.invoke_contract::<Election>(
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
    pub fn cast_vote(
        env: Env,
        election_id: u32,
        voter: Address,
        candidate_idx: u32,
        registry_contract: Address,
    ) {
        // Authenticate the voter to verify signature
        voter.require_auth();

        // 1. Inter-contract call to ElectionRegistryContract to verify election status
        let registry_client = RegistryContractClient::new(&env, registry_contract);
        let election = registry_client.get_election(election_id);

        if election.closed {
            panic!("Voting closed");
        }

        let ledger_timestamp = env.ledger().timestamp();
        if ledger_timestamp > election.end_time {
            panic!("Voting closed");
        }

        if candidate_idx >= election.candidates.len() {
            panic!("Invalid candidate");
        }

        // 2. Prevent duplicate voting
        let voted_key = DataKey::Voted(election_id, voter.clone());
        if env.storage().persistent().has(&voted_key) {
            panic!("Voter has already voted");
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
            (symbol_short!("voting"), symbol_short!("vote_cast")),
            (election_id, voter, candidate_idx),
        );
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
}
