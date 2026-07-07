import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getElections, CONTRACT_REGISTRY_ID, CONTRACT_VOTING_ID } from '../services/stellar';
import { eventLedgerFeed, eventStreamService, ContractEvent } from '../services/event-stream';
import { useStore } from '../state/store';

const DashboardPage = () => {
  const [liveEvents, setLiveEvents] = useState<ContractEvent[]>([...eventLedgerFeed]);
  const { analytics } = useStore();

  // Fetch elections list for totals
  const { data: elections = [] } = useQuery({
    queryKey: ['elections'],
    queryFn: getElections
  });

  // Listen for real-time events to push to the local state list immediately
  useEffect(() => {
    const unsubscribe = eventStreamService.subscribe((event) => {
      setLiveEvents(prev => [event, ...prev].slice(0, 50));
    });
    return () => unsubscribe();
  }, []);

  const totalElections = elections.length;
  const activeElections = elections.filter(e => !e.closed).length;
  const closedElections = elections.filter(e => e.closed).length;

  // Compute MVP Analytics
  const avgCandidates = totalElections > 0 
    ? (elections.reduce((acc, el) => acc + el.candidates.length, 0) / totalElections).toFixed(1)
    : '0.0';

  const totalTx = analytics.successfulTransactions + analytics.failedTransactions;
  const txSuccessRate = totalTx > 0 
    ? Math.round((analytics.successfulTransactions / totalTx) * 100) 
    : 100;

  return (
    <div className="max-w-container-max mx-auto w-full px-margin-mobile md:px-margin-desktop py-12">
      {/* Page Header */}
      <header className="mb-12 border-b border-outline-variant/30 pb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-display-lg text-display-lg text-primary mb-2">Governance Analytics</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Live metrics and transaction tracking for VoteSphere on Stellar Testnet.
          </p>
        </div>
        <div className="bg-secondary-container/20 text-primary border border-primary/30 font-label-sm text-label-sm px-4 py-2 rounded-full flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
          Live Event Listener Active
        </div>
      </header>

      {/* Overview stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-12">
        <div className="vellum-card rounded-xl p-6 flex flex-col justify-between items-center text-center">
          <span className="material-symbols-outlined text-primary text-3xl mb-2">how_to_vote</span>
          <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Total Elections</h3>
          <p className="font-headline-sm text-headline-sm text-on-surface mt-2">{totalElections}</p>
        </div>
        <div className="vellum-card rounded-xl p-6 flex flex-col justify-between items-center text-center">
          <span className="material-symbols-outlined text-primary text-3xl mb-2">pending_actions</span>
          <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Active Voting</h3>
          <p className="font-headline-sm text-headline-sm text-on-surface mt-2">{activeElections}</p>
        </div>
        <div className="vellum-card rounded-xl p-6 flex flex-col justify-between items-center text-center">
          <span className="material-symbols-outlined text-primary text-3xl mb-2">check_circle</span>
          <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Tallies Completed</h3>
          <p className="font-headline-sm text-headline-sm text-on-surface mt-2">{closedElections}</p>
        </div>
        <div className="vellum-card rounded-xl p-6 flex flex-col justify-between items-center text-center">
          <span className="material-symbols-outlined text-primary text-3xl mb-2">database</span>
          <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Registry ID</h3>
          <p className="font-mono text-xs text-on-surface mt-2 truncate w-full px-2" title={CONTRACT_REGISTRY_ID}>
            {CONTRACT_REGISTRY_ID.slice(0, 8)}...{CONTRACT_REGISTRY_ID.slice(-8)}
          </p>
        </div>
      </div>

      {/* MVP Performance & Adoption Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-12">
        <div className="vellum-card rounded-xl p-6 flex items-center gap-4">
          <span className="material-symbols-outlined text-primary text-4xl p-3 bg-surface-container-high rounded-full">group</span>
          <div className="flex-grow">
            <h4 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">User Adoption</h4>
            <div className="flex justify-between items-baseline mt-2">
              <span className="font-headline-sm text-headline-sm text-on-surface">{analytics.walletConnections}</span>
              <span className="text-xs text-on-surface-variant">Wallet Connections</span>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">Average Candidates: {avgCandidates}</p>
          </div>
        </div>

        <div className="vellum-card rounded-xl p-6 flex items-center gap-4">
          <span className="material-symbols-outlined text-primary text-4xl p-3 bg-surface-container-high rounded-full">network_check</span>
          <div className="flex-grow">
            <h4 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Reliability Rate</h4>
            <div className="flex justify-between items-baseline mt-2">
              <span className="font-headline-sm text-headline-sm text-on-surface">{txSuccessRate}%</span>
              <span className="text-xs text-on-surface-variant">{analytics.successfulTransactions} Successful Tx</span>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">Total Submissions: {totalTx}</p>
          </div>
        </div>

        <div className="vellum-card rounded-xl p-6 flex items-center gap-4">
          <span className="material-symbols-outlined text-primary text-4xl p-3 bg-surface-container-high rounded-full">analytics</span>
          <div className="flex-grow">
            <h4 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Participation Stats</h4>
            <div className="flex justify-between items-baseline mt-2">
              <span className="font-headline-sm text-headline-sm text-on-surface">{analytics.votesCast}</span>
              <span className="text-xs text-on-surface-variant">Votes Logged</span>
            </div>
            <p className="text-xs text-on-surface-variant mt-1">Avg Votes per Election: {(analytics.votesCast / Math.max(1, totalElections)).toFixed(1)}</p>
          </div>
        </div>
      </div>

      {/* Charts / Visual Representation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter mb-12">
        <div className="vellum-card rounded-xl p-8 flex flex-col">
          <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest mb-6 border-b border-outline-variant/30 pb-2">
            Election Lifecycle Ratio
          </h3>
          <div className="flex-grow flex flex-col justify-center items-center py-6">
            {totalElections > 0 ? (
              <div className="w-full space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Active Proposals ({activeElections})</span>
                    <span className="font-semibold">{Math.round((activeElections / totalElections) * 100)}%</span>
                  </div>
                  <div className="w-full bg-surface-container-low rounded-full h-3">
                    <div className="bg-primary h-3 rounded-full" style={{ width: `${(activeElections / totalElections) * 100}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Tallied Proposals ({closedElections})</span>
                    <span className="font-semibold">{Math.round((closedElections / totalElections) * 100)}%</span>
                  </div>
                  <div className="w-full bg-surface-container-low rounded-full h-3">
                    <div className="bg-secondary h-3 rounded-full" style={{ width: `${(closedElections / totalElections) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-on-surface-variant text-sm">No data recorded on registry contract.</p>
            )}
          </div>
        </div>

        <div className="vellum-card rounded-xl p-8 flex flex-col">
          <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest mb-6 border-b border-outline-variant/30 pb-2">
            On-Chain Event Velocity
          </h3>
          <div className="flex-grow flex flex-col justify-center items-center py-6">
            <div className="w-full text-center">
              <span className="font-display-lg text-4xl text-primary">{liveEvents.length}</span>
              <p className="text-sm text-on-surface-variant mt-2">Events streamed in the current session</p>
            </div>
            <div className="flex justify-center gap-1 w-full mt-4 items-end h-16">
              {[8, 12, 5, 20, 15, 30, 25, 40, liveEvents.length].map((val, i) => (
                <div 
                  key={i} 
                  className="bg-primary-fixed-dim hover:bg-primary w-full rounded-t transition-all duration-300"
                  style={{ height: `${Math.min(val * 2, 60)}px` }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live ledger feed table */}
      <div className="vellum-card rounded-xl p-8">
        <div className="flex justify-between items-center mb-6 border-b border-outline-variant/30 pb-4">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Recent On-Chain Activity</h3>
          <span className="text-xs text-on-surface-variant font-mono">Real-time ledger updates</span>
        </div>
        
        <div className="w-full overflow-x-auto">
          {liveEvents.length === 0 ? (
            <div className="py-12 text-center text-on-surface-variant font-body-md">
              Waiting for new Soroban events... cast a vote or create an election to see it stream live!
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/30">
                  <th className="py-4 px-2 font-normal">Ledger</th>
                  <th className="py-4 px-2 font-normal">Contract</th>
                  <th className="py-4 px-2 font-normal">Event Type</th>
                  <th className="py-4 px-2 font-normal">Details</th>
                </tr>
              </thead>
              <tbody className="font-body-md text-body-md text-on-surface">
                {liveEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-surface-container-low transition-colors border-b border-outline-variant/20">
                    <td className="py-4 px-2 font-mono text-sm">{ev.ledger}</td>
                    <td className="py-4 px-2 font-mono text-xs">
                      {ev.contractId === CONTRACT_REGISTRY_ID ? 'Registry' : ev.contractId === CONTRACT_VOTING_ID ? 'Voting' : 'Results'}
                    </td>
                    <td className="py-4 px-2">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase ${
                        ev.type === 'vote_cast' ? 'bg-[#f0e1c1] text-[#221b07]' :
                        ev.type === 'election_created' ? 'bg-secondary-container text-on-secondary-container' :
                        'bg-error-container text-on-error-container'
                      }`}>
                        {ev.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-sm text-on-surface-variant">
                      {ev.type === 'vote_cast' && `Election #${ev.data.electionId}: Candidate #${ev.data.candidateIdx + 1} voted by ${ev.data.voter.slice(0,6)}...`}
                      {ev.type === 'election_created' && `Election #${ev.data.id} created: "${ev.data.title}"`}
                      {ev.type === 'election_closed' && `Election #${ev.data.id} closed`}
                      {ev.type === 'results_updated' && `Election #${ev.data.electionId} tally calculated. Winner Candidate #${ev.data.winnerIdx + 1}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
