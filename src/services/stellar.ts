import {
  TransactionBuilder,
  Networks,
  Address,
  scValToNative,
  Contract,
  xdr,
  rpc,
  TimeoutInfinite,
  Horizon,
  Account
} from '@stellar/stellar-sdk';

const meta = import.meta as any;

// Load from environment or use default Testnet addresses
export const CONTRACT_REGISTRY_ID = meta.env.CONTRACT_REGISTRY_ID || 'CA4PKYMOWPZXDS55JTHZNETKTZUPL22I35TKZRE7HUDZZVE65SFDGHE5';
export const CONTRACT_VOTING_ID = meta.env.CONTRACT_VOTING_ID || 'CCDHHB2FUCAFU6GSTDEW7UGOMWHV3GF5QZNZGUAI2QO2XHNZYFTXGTXE';
export const CONTRACT_RESULTS_ID = meta.env.CONTRACT_RESULTS_ID || 'CB7PZAP6KNAZGYSPHJUGLK6ECYE4O6XQHV7FCSRJTRX4JY2DC5QGD52K';

export const RPC_URL = meta.env.RPC_URL || 'https://soroban-testnet.stellar.org';
export const HORIZON_URL = meta.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';
export const NETWORK_PASSPHRASE = meta.env.NETWORK_PASSPHRASE || Networks.TESTNET;

export const rpcServer = new rpc.Server(RPC_URL);
export const horizonServer = new Horizon.Server(HORIZON_URL);

export interface Election {
  id: number;
  title: string;
  description: string;
  candidates: string[];
  end_time: number; // timestamp in seconds
  closed: boolean;
  result_contract: string;
}

// Get native balance of XLM for an account
export const getXlmBalance = async (address: string): Promise<string> => {
  try {
    const res = await fetch(`${HORIZON_URL}/accounts/${address}`);
    if (!res.ok) return '0.0000';
    const data = await res.json();
    const balanceObj = data.balances.find((b: any) => b.asset_type === 'native');
    return balanceObj ? parseFloat(balanceObj.balance).toFixed(4) : '0.0000';
  } catch (err) {
    console.error('Error fetching balance:', err);
    return '0.0000';
  }
};

// Soroban View helper
async function simulateContractCall(
  contractId: string,
  methodName: string,
  args: xdr.ScVal[] = []
): Promise<any> {
  const contract = new Contract(contractId);
  const randomSource = 'GBUGQ257P3NIKFYQA2CCYRZITB6JAVJTHI2XUCET5AHSREGS4UPX7L4J'; // any valid address for simulation
  
  const tx = new TransactionBuilder(
    new Account(randomSource, '0'),
    { fee: '100', networkPassphrase: NETWORK_PASSPHRASE }
  )
    .addOperation(contract.call(methodName, ...args))
    .setTimeout(TimeoutInfinite)
    .build();

  const simResponse = await rpcServer.simulateTransaction(tx);
  
  if (rpc.Api.isSimulationError(simResponse)) {
    throw new Error(`Simulation error: ${simResponse.error}`);
  }

  if (simResponse.result) {
    const outputVal = simResponse.result.retval;
    return scValToNative(outputVal);
  }
  return null;
}

// 1. ElectionRegistryContract view calls
export const getElections = async (): Promise<Election[]> => {
  try {
    const nativeList = await simulateContractCall(CONTRACT_REGISTRY_ID, 'list_elections');
    if (!nativeList || !Array.isArray(nativeList)) return [];

    return nativeList.map((e: any) => ({
      id: Number(e.id),
      title: e.title.toString(),
      description: e.description.toString(),
      candidates: Array.isArray(e.candidates) ? e.candidates.map((c: any) => c.toString()) : [],
      end_time: Number(e.end_time),
      closed: Boolean(e.closed),
      result_contract: e.result_contract.toString()
    }));
  } catch (err) {
    console.error('Error fetching elections:', err);
    return [];
  }
};

export const getElection = async (id: number): Promise<Election | null> => {
  try {
    const e = await simulateContractCall(CONTRACT_REGISTRY_ID, 'get_election', [
      xdr.ScVal.scvU32(id)
    ]);
    if (!e) return null;
    return {
      id: Number(e.id),
      title: e.title.toString(),
      description: e.description.toString(),
      candidates: Array.isArray(e.candidates) ? e.candidates.map((c: any) => c.toString()) : [],
      end_time: Number(e.end_time),
      closed: Boolean(e.closed),
      result_contract: e.result_contract.toString()
    };
  } catch (err) {
    console.error(`Error fetching election ${id}:`, err);
    return null;
  }
};

// 2. VotingContract view calls
export const hasVoted = async (electionId: number, voterAddress: string): Promise<boolean> => {
  try {
    const voter = Address.fromString(voterAddress);
    return await simulateContractCall(CONTRACT_VOTING_ID, 'has_voted', [
      xdr.ScVal.scvU32(electionId),
      voter.toScVal()
    ]);
  } catch (err) {
    console.error('Error checking voted status:', err);
    return false;
  }
};

export const getCandidateVoteCount = async (electionId: number, candidateIdx: number): Promise<number> => {
  try {
    const count = await simulateContractCall(CONTRACT_VOTING_ID, 'get_vote_count', [
      xdr.ScVal.scvU32(electionId),
      xdr.ScVal.scvU32(candidateIdx)
    ]);
    return Number(count || 0);
  } catch (err) {
    console.error('Error getting vote count:', err);
    return 0;
  }
};

// 3. ResultContract view calls
export const getElectionResults = async (electionId: number): Promise<number[]> => {
  try {
    const results = await simulateContractCall(CONTRACT_RESULTS_ID, 'get_results', [
      xdr.ScVal.scvU32(electionId)
    ]);
    if (Array.isArray(results)) {
      return results.map((r: any) => Number(r));
    }
    return [];
  } catch (err) {
    console.error('Error getting results:', err);
    return [];
  }
};

export const getElectionWinner = async (electionId: number): Promise<number> => {
  try {
    const winnerIdx = await simulateContractCall(CONTRACT_RESULTS_ID, 'get_winner', [
      xdr.ScVal.scvU32(electionId)
    ]);
    return Number(winnerIdx || 0);
  } catch (err) {
    console.error('Error getting winner:', err);
    return 0;
  }
};

// Helper to wait for Soroban transaction submission to be confirmed
export const submitTransaction = async (signedXdr: string): Promise<string> => {
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const sendRes = await rpcServer.sendTransaction(tx);
  
  if (sendRes.status === 'ERROR') {
    throw new Error(`Submit failed: ${JSON.stringify(sendRes.errorResult)}`);
  }

  // Poll for result
  let retries = 10;
  while (retries > 0) {
    const getRes = await rpcServer.getTransaction(sendRes.hash);
    if (getRes.status === 'SUCCESS') {
      return sendRes.hash;
    } else if (getRes.status === 'FAILED') {
      throw new Error('Transaction execution failed on-chain.');
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
    retries--;
  }
  throw new Error('Transaction polling timed out');
};

// Mutation Transaction builders
export const buildCreateElectionTx = async (
  id: number,
  title: string,
  description: string,
  candidates: string[],
  endTimeSecs: number,
  creatorAddress: string
): Promise<string> => {
  // 1. Fetch sequence
  const sourceAccount = await rpcServer.getAccount(creatorAddress);
  const contract = new Contract(CONTRACT_REGISTRY_ID);
  
  // 2. Build args
  const cAddress = Address.fromString(CONTRACT_RESULTS_ID);
  const candidatesScVal = xdr.ScVal.scvVec(candidates.map(c => xdr.ScVal.scvString(c)));
  
  const rawTx = new TransactionBuilder(sourceAccount, {
    fee: '5000',
    networkPassphrase: NETWORK_PASSPHRASE
  })
    .addOperation(
      contract.call(
        'create_election',
        xdr.ScVal.scvU32(id),
        xdr.ScVal.scvString(title),
        xdr.ScVal.scvString(description),
        candidatesScVal,
        xdr.ScVal.scvU64(new xdr.Uint64(endTimeSecs)),
        cAddress.toScVal()
      )
    )
    .setTimeout(TimeoutInfinite)
    .build();

  const preparedTx = await rpcServer.prepareTransaction(rawTx);
  return preparedTx.toXDR();
};

export const buildCastVoteTx = async (
  electionId: number,
  candidateIdx: number,
  voterAddress: string
): Promise<string> => {
  const sourceAccount = await rpcServer.getAccount(voterAddress);
  const contract = new Contract(CONTRACT_VOTING_ID);
  const voter = Address.fromString(voterAddress);
  const registryAddr = Address.fromString(CONTRACT_REGISTRY_ID);

  const rawTx = new TransactionBuilder(sourceAccount, {
    fee: '5000',
    networkPassphrase: NETWORK_PASSPHRASE
  })
    .addOperation(
      contract.call(
        'cast_vote',
        xdr.ScVal.scvU32(electionId),
        voter.toScVal(),
        xdr.ScVal.scvU32(candidateIdx),
        registryAddr.toScVal()
      )
    )
    .setTimeout(TimeoutInfinite)
    .build();

  const preparedTx = await rpcServer.prepareTransaction(rawTx);
  return preparedTx.toXDR();
};

export const buildCloseElectionTx = async (
  electionId: number,
  voterAddress: string
): Promise<string> => {
  const sourceAccount = await rpcServer.getAccount(voterAddress);
  const contract = new Contract(CONTRACT_REGISTRY_ID);

  const rawTx = new TransactionBuilder(sourceAccount, {
    fee: '5000',
    networkPassphrase: NETWORK_PASSPHRASE
  })
    .addOperation(
      contract.call('close_election', xdr.ScVal.scvU32(electionId))
    )
    .setTimeout(TimeoutInfinite)
    .build();

  const preparedTx = await rpcServer.prepareTransaction(rawTx);
  return preparedTx.toXDR();
};

export const buildCalculateResultsTx = async (
  electionId: number,
  voterAddress: string
): Promise<string> => {
  const sourceAccount = await rpcServer.getAccount(voterAddress);
  const contract = new Contract(CONTRACT_RESULTS_ID);
  const votingAddr = Address.fromString(CONTRACT_VOTING_ID);

  const rawTx = new TransactionBuilder(sourceAccount, {
    fee: '5000',
    networkPassphrase: NETWORK_PASSPHRASE
  })
    .addOperation(
      contract.call(
        'calculate_results',
        xdr.ScVal.scvU32(electionId),
        votingAddr.toScVal()
      )
    )
    .setTimeout(TimeoutInfinite)
    .build();

  const preparedTx = await rpcServer.prepareTransaction(rawTx);
  return preparedTx.toXDR();
};
