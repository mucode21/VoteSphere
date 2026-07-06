import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getElection, 
  hasVoted, 
  getElectionResults, 
  getElectionWinner,
  buildCastVoteTx,
  buildCloseElectionTx,
  buildCalculateResultsTx,
  CONTRACT_REGISTRY_ID,
  CONTRACT_VOTING_ID,
  CONTRACT_RESULTS_ID
} from '../services/stellar';
import { signTx } from '../wallet/wallet-service';
import { txManager } from '../services/transactions/tx-manager';
import { useToast } from '../context/ToastContext';
import Button from '../components/Button';

interface ElectionDetailsPageProps {
  electionId: number;
  walletConnected: boolean;
  walletType: 'freighter' | 'albedo' | 'xbull' | null;
  userAddress: string | null;
  onNavigate: (page: string, params?: any) => void;
}

const ElectionDetailsPage = ({
  electionId,
  walletConnected,
  walletType,
  userAddress,
  onNavigate
}: ElectionDetailsPageProps) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [txError, setTxError] = useState<string | null>(null);
  const [txSuccessHash, setTxSuccessHash] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState<string | null>(null);

  // Fetch election details
  const { data: election, isLoading: loadingElection, error: electionError } = useQuery({
    queryKey: ['election', electionId],
    queryFn: () => getElection(electionId)
  });

  // Check if voter has voted
  const { data: voted = false, refetch: refetchVoted } = useQuery({
    queryKey: ['voted', electionId, userAddress],
    queryFn: () => (userAddress ? hasVoted(electionId, userAddress) : Promise.resolve(false)),
    enabled: !!userAddress
  });

  // Fetch results if election is closed
  const { data: results = [], refetch: refetchResults } = useQuery({
    queryKey: ['results', electionId],
    queryFn: () => getElectionResults(electionId),
    enabled: !!election?.closed
  });

  // Fetch winner if election is closed
  const { data: winnerIdx = 0, refetch: refetchWinner } = useQuery({
    queryKey: ['winner', electionId],
    queryFn: () => getElectionWinner(electionId),
    enabled: !!election?.closed
  });

  // Cast vote mutation using unified txManager
  const castVoteMutation = useMutation({
    mutationFn: async (candidateIdx: number) => {
      if (!userAddress || !walletType) {
        throw new Error('Please connect your wallet first');
      }
      setTxError(null);
      setTxSuccessHash(null);

      const hash = await txManager.executeTx(
        `Cast Vote (Candidate #${candidateIdx + 1})`,
        () => buildCastVoteTx(electionId, candidateIdx, userAddress),
        (xdr) => signTx(walletType, xdr, userAddress, 'TESTNET'),
        (status, err) => {
          if (status === 'signing') {
            setLoadingMsg('Waiting for Wallet Signature...');
          } else if (status === 'submitting') {
            setLoadingMsg('Submitting to Stellar Testnet RPC...');
          } else if (status === 'pending') {
            setLoadingMsg('Transaction pending (network congestion)...');
          } else if (status === 'success' || status === 'failed') {
            setLoadingMsg(null);
          }
          if (err) {
            setTxError(err);
          }
        }
      );
      return hash;
    },
    onSuccess: (hash) => {
      setTxSuccessHash(hash);
      setLoadingMsg(null);
      toast.success('Your vote was successfully cast and recorded on-chain!');
      refetchVoted();
      queryClient.invalidateQueries({ queryKey: ['election', electionId] });
      queryClient.invalidateQueries({ queryKey: ['results', electionId] });
    },
    onError: (err: any) => {
      const errMsg = err.message || 'Transaction simulation or submission failed';
      setTxError(errMsg);
      setLoadingMsg(null);
      toast.error(errMsg);
    }
  });

  // Close election mutation (Admin helper) using unified txManager
  const closeElectionMutation = useMutation({
    mutationFn: async () => {
      if (!userAddress || !walletType) {
        throw new Error('Please connect your wallet first');
      }
      setTxError(null);
      setTxSuccessHash(null);

      const hash = await txManager.executeTx(
        `Close Election #${electionId}`,
        () => buildCloseElectionTx(electionId, userAddress),
        (xdr) => signTx(walletType, xdr, userAddress, 'TESTNET'),
        (status, err) => {
          if (status === 'signing') {
            setLoadingMsg('Signing with wallet...');
          } else if (status === 'submitting') {
            setLoadingMsg('Submitting to Testnet...');
          } else if (status === 'pending') {
            setLoadingMsg('Transaction pending (network congestion)...');
          } else if (status === 'success' || status === 'failed') {
            setLoadingMsg(null);
          }
          if (err) {
            setTxError(err);
          }
        }
      );
      return hash;
    },
    onSuccess: () => {
      setLoadingMsg('Calculation results phase incoming...');
      toast.info('Election closed on-chain. Invoking votes tally...');
      calculateResultsMutation.mutate();
    },
    onError: (err: any) => {
      const errMsg = err.message || 'Failed to close election';
      setTxError(errMsg);
      setLoadingMsg(null);
      toast.error(errMsg);
    }
  });

  // Calculate results mutation using unified txManager
  const calculateResultsMutation = useMutation({
    mutationFn: async () => {
      if (!userAddress || !walletType) {
        throw new Error('Please connect your wallet first');
      }
      const hash = await txManager.executeTx(
        `Calculate Results for Election #${electionId}`,
        () => buildCalculateResultsTx(electionId, userAddress),
        (xdr) => signTx(walletType, xdr, userAddress, 'TESTNET'),
        (status, err) => {
          if (status === 'signing') {
            setLoadingMsg('Signing tally transaction...');
          } else if (status === 'submitting') {
            setLoadingMsg('Submitting Tally to Soroban Results Contract...');
          } else if (status === 'pending') {
            setLoadingMsg('Transaction pending (network congestion)...');
          } else if (status === 'success' || status === 'failed') {
            setLoadingMsg(null);
          }
          if (err) {
            setTxError(err);
          }
        }
      );
      return hash;
    },
    onSuccess: (hash) => {
      setTxSuccessHash(hash);
      setLoadingMsg(null);
      toast.success('Election results successfully tallied and finalized!');
      queryClient.invalidateQueries({ queryKey: ['election', electionId] });
      refetchResults();
      refetchWinner();
    },
    onError: (err: any) => {
      const errMsg = err.message || 'Failed to calculate results';
      setTxError(errMsg);
      setLoadingMsg(null);
      toast.error(errMsg);
    }
  });

  // Memoize results calculations to prevent unnecessary re-runs
  const totalTally = useMemo(() => {
    return results.reduce((acc, r) => acc + r, 0);
  }, [results]);

  if (loadingElection) {
    return (
      <div className="flex flex-col justify-center items-center py-24 text-center">
        <span className="material-symbols-outlined text-primary text-5xl animate-spin mb-4">sync</span>
        <p className="font-headline-sm text-headline-sm">Querying election details on-chain...</p>
      </div>
    );
  }

  if (electionError || !election) {
    return (
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 text-center">
        <div className="bg-error-container text-on-error-container p-8 rounded-xl">
          <span className="material-symbols-outlined text-5xl mb-4">error</span>
          <h2 className="font-headline-sm text-headline-sm mb-2">Election Not Found</h2>
          <p className="font-body-md text-body-md mb-6">Could not find election registry with ID #{electionId} on the ledger.</p>
          <button 
            type="button" 
            onClick={() => onNavigate('explore')} 
            className="bg-primary text-on-primary px-6 py-2 rounded focus:outline-none"
          >
            Back to Explore
          </button>
        </div>
      </div>
    );
  }

  const isExpired = Date.now() / 1000 > election.end_time;
  const isClosed = election.closed;

  return (
    <div className="max-w-container-max mx-auto w-full px-margin-mobile md:px-margin-desktop py-12">
      {/* Back button */}
      <button 
        type="button"
        onClick={() => onNavigate('explore')}
        className="flex items-center gap-1 text-on-surface-variant hover:text-primary mb-8 transition-colors focus:outline-none"
      >
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        <span className="font-label-sm text-label-sm uppercase">Back to list</span>
      </button>

      {/* Header Section */}
      <header className="mb-16 border-b border-outline-variant/30 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <span className="bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm px-3 py-1 rounded-full uppercase tracking-wider mb-3 inline-block">
            Proposal ID: #{election.id}
          </span>
          <h1 className="font-display-lg text-display-lg text-primary mb-4">{election.title}</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">
            {election.description}
          </p>
        </div>

        {/* Admin tools */}
        {isExpired && !isClosed && (
          <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant flex flex-col gap-2">
            <p className="font-label-sm text-label-sm text-on-surface-variant">Voting finished but tally not run yet</p>
            <Button
              type="button"
              onClick={() => closeElectionMutation.mutate()}
              loading={closeElectionMutation.isPending || calculateResultsMutation.isPending}
              className="bg-primary text-on-primary font-label-sm text-label-sm px-6 py-3 uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-2 focus:outline-none"
            >
              Close & Tally Votes
              <span className="material-symbols-outlined text-sm">analytics</span>
            </Button>
          </div>
        )}
      </header>

      {/* Overview and Status Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter mb-16">
        {/* Rules Card */}
        <section className="md:col-span-8 bg-surface-container-lowest p-8 rounded-lg border border-outline-variant/50 vellum-card">
          <h2 className="font-headline-sm text-headline-sm text-primary mb-4">Election Integrity Guidelines</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mb-6">
            All voting operations on VoteSphere are executed inside a secure sandboxed WebAssembly execution environment on the Stellar Soroban network. Once submitted, your vote is cryptographically tied to the election's contract state and cannot be modified or censored.
          </p>
          <div className="bg-surface-container-low p-4 rounded border border-outline-variant/30 overflow-x-auto">
            <h4 className="font-label-sm text-label-sm text-on-surface uppercase mb-2">Technical Details</h4>
            <ul className="list-disc pl-5 font-body-md text-sm text-on-surface-variant space-y-1">
              <li>Registry Contract: <span className="font-mono text-xs break-all">{CONTRACT_REGISTRY_ID}</span></li>
              <li>Voting Contract: <span className="font-mono text-xs break-all">{CONTRACT_VOTING_ID}</span></li>
              <li>Results Contract: <span className="font-mono text-xs break-all">{CONTRACT_RESULTS_ID}</span></li>
            </ul>
          </div>
        </section>

        {/* Status Card */}
        <section className="md:col-span-4 bg-surface-container-lowest p-8 rounded-lg border border-outline-variant/50 vellum-card flex flex-col justify-between">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-primary mb-4">Status & Details</h2>
            <div className={`inline-block font-label-sm text-xs px-3 py-1 rounded-full mb-6 uppercase tracking-wider ${
              isClosed ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'
            }`}>
              {isClosed ? 'Voting Closed & Tallied' : isExpired ? 'Voting Phase Completed' : 'Active Voting Phase'}
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between border-b border-outline-variant/30 pb-2">
                <span className="text-on-surface-variant font-body-md">Closes:</span>
                <span className="font-label-md text-on-surface">
                  {new Date(election.end_time * 1000).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between border-b border-outline-variant/30 pb-2">
                <span className="text-on-surface-variant font-body-md">Your Status:</span>
                <span className="font-label-md text-on-surface">
                  {!walletConnected ? 'Wallet Required' : voted ? 'Vote Recorded' : 'Not Voted Yet'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <span className="material-symbols-outlined text-4xl text-primary opacity-50 block">gavel</span>
          </div>
        </section>
      </div>

      {/* Status Feedback (Toasts/Banner) */}
      {(txError || txSuccessHash || loadingMsg) && (
        <div className="mb-12">
          {loadingMsg && (
            <div className="bg-primary/10 border border-primary/20 text-on-surface p-6 rounded-xl flex items-center gap-4">
              <span className="material-symbols-outlined text-3xl text-primary animate-spin">sync</span>
              <div>
                <h4 className="font-label-md text-label-md uppercase">Transaction in Progress</h4>
                <p className="font-body-md text-sm text-on-surface-variant">{loadingMsg}</p>
              </div>
            </div>
          )}

          {txError && (
            <div className="bg-error-container border border-error/20 text-on-error-container p-6 rounded-xl flex items-center gap-4">
              <span className="material-symbols-outlined text-3xl">error</span>
              <div>
                <h4 className="font-label-md text-label-md uppercase">Transaction Failed</h4>
                <p className="font-body-md text-sm">{txError}</p>
              </div>
            </div>
          )}

          {txSuccessHash && (
            <div className="bg-secondary-container border border-secondary/20 text-on-secondary-container p-6 rounded-xl flex items-center gap-4">
              <span className="material-symbols-outlined text-3xl text-emerald-600">done</span>
              <div>
                <h4 className="font-label-md text-label-md uppercase">Transaction Complete</h4>
                <p className="font-body-md text-sm mb-2">Your action has been confirmed on the Stellar blockchain.</p>
                <a 
                  href={`https://stellar.expert/explorer/testnet/tx/${txSuccessHash}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="font-mono text-xs underline break-all hover:text-primary transition-colors"
                >
                  Tx Hash: {txSuccessHash}
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Candidates & Voting Section */}
      <section className="mb-16">
        <h2 className="font-headline-md text-headline-md text-primary mb-8 border-b border-outline-variant/30 pb-4">
          {isClosed ? 'Final Results Tally' : 'Official Candidates & Voting Options'}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {election.candidates.map((cand, idx) => {
            const votes = results[idx] || 0;
            const votePercent = totalTally > 0 ? Math.round((votes / totalTally) * 100) : 0;
            const isWinner = isClosed && idx === winnerIdx && votes > 0;

            const portraits = [
              "https://lh3.googleusercontent.com/aida-public/AB6AXuDlkiBeYCk6Ro1Mzb62vOgYFCKoVOTn1Se4Vy-Jz1UGvzPVfIDG9_eQrDih9dv4Khlphy_VvD1enMQm-yUpvAc8lTYcaSflWsi4biJrlbWRbEVStAWELFo76KLsyN9O8udf-3efosO0SHuuxy0HRvt3ihoIZgxdo9lCpQiMPmvNGpa6ZDXrc9qRdFo_41QEhpokfKuX0tFH2FCXZ9IUz8HNNg95skuHfqTpkBBXRaNG7-boh0EyYqTO5w",
              "https://lh3.googleusercontent.com/aida-public/AB6AXuD9-4HHammXyaBWbkzzdof5GFEMeCOMgCyJ1vQ4KU8A4xkzwexflwR7wzHK5YYxkyCPGxnmS3gYI7onM1JCZ3mMOhRtTCb-GhnVrIIGO9zZmhmlZwof13VbDsBMTmJDVz-6dEdei2Tp0ESnT8kWSFFq22axj2MaW4QRY7z5IkQ2dmJntoAWqJ1M0R5WZkwW8Idvq73ZQU_mp-rEkUZtCC7NaksTbo74S6sohUhJwlhiwyhtPzM0dDsyWw",
              "https://lh3.googleusercontent.com/aida-public/AB6AXuCmuL-VioB9-vKYUYXA8YQze1JV8qcsH8jd7xTurfufBZs3ZwQRf9wrKwkzFffW0sxilOBZ9tK-xRNk1xfUtt9IwMirZq1vfQXWe0kEVh_mMN7jvA0E_EhJJMI0NMaiFH--iLe6mfxCE8wgqOZMtJ4y6kePkBDZugW9Nkq27AiGXi5UCC25nwnxUfx9LUPNu06oAR6EB5ApmwiTtdKplFq9e5PKHMdliXZuLim799NqgGH_Zpu_edYCQg"
            ];
            const pImage = portraits[idx % portraits.length];

            return (
              <div 
                key={idx}
                className={`bg-surface-container-lowest p-6 rounded-lg border ambient-shadow flex flex-col justify-between relative overflow-hidden ${
                  isWinner ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-outline-variant/30'
                }`}
              >
                {isWinner && (
                  <div className="absolute top-0 right-0 bg-primary text-on-primary px-3 py-1 text-xs uppercase tracking-widest font-label-sm z-10">
                    Winner
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden border border-outline-variant shrink-0">
                      <img className="w-full h-full object-cover" alt={cand} src={pImage} />
                    </div>
                    <div>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface line-clamp-1">{cand}</h3>
                      <p className="font-label-sm text-secondary uppercase tracking-widest">Candidate #{idx + 1}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  {isClosed ? (
                    // Closed results
                    <div className="space-y-2">
                      <div className="flex justify-between font-label-md text-label-md text-on-surface">
                        <span>{votes} Votes</span>
                        <span>{votePercent}%</span>
                      </div>
                      <div className="w-full bg-surface-variant rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: `${votePercent}%` }}></div>
                      </div>
                    </div>
                  ) : (
                    // Active voting controls with validation
                    !walletConnected ? (
                      <button
                        type="button"
                        onClick={() => toast.warning('Please connect your wallet first at the top of the page!')}
                        className="w-full bg-surface-container border border-outline-variant/30 text-on-surface-variant font-label-md px-6 py-3 rounded uppercase transition-colors flex justify-center items-center gap-2 focus:outline-none"
                      >
                        <span>Connect to Vote</span>
                        <span className="material-symbols-outlined text-sm">lock</span>
                      </button>
                    ) : (
                      <Button
                        type="button"
                        loading={castVoteMutation.isPending && castVoteMutation.variables === idx}
                        onClick={() => castVoteMutation.mutate(idx)}
                        disabled={castVoteMutation.isPending || voted || isExpired}
                        className="w-full bg-[#B8860B] text-on-primary font-label-md px-6 py-3 rounded uppercase hover:opacity-90 transition-opacity flex justify-center items-center gap-2 disabled:bg-outline/30 disabled:cursor-not-allowed focus:outline-none"
                      >
                        <span>{voted ? 'Vote Recorded' : `Vote for Candidate ${idx + 1}`}</span>
                        <span className="material-symbols-outlined text-sm">how_to_vote</span>
                      </Button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default ElectionDetailsPage;
