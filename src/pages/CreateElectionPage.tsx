import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getElections, buildCreateElectionTx } from '../services/stellar';
import { signTx } from '../wallet/wallet-service';
import { txManager } from '../services/transactions/tx-manager';
import { useToast } from '../context/ToastContext';
import Button from '../components/Button';

interface CreateElectionPageProps {
  walletConnected: boolean;
  walletType: 'freighter' | 'albedo' | 'xbull' | null;
  userAddress: string | null;
  onNavigate: (page: string, params?: any) => void;
}

const CreateElectionPage = ({
  walletConnected,
  walletType,
  userAddress,
  onNavigate
}: CreateElectionPageProps) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [step, setStep] = useState(1);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [candidates, setCandidates] = useState<string[]>(['Dr. Elena Rostova', 'Marcus Chen']);
  const [newCandidate, setNewCandidate] = useState('');
  const [endDays, setEndDays] = useState(7); // default 7 days from now
  
  const [txError, setTxError] = useState<string | null>(null);
  const [txSuccessHash, setTxSuccessHash] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState<string | null>(null);

  // Query existing elections to generate unique auto-incremented ID
  const { data: elections = [] } = useQuery({
    queryKey: ['elections'],
    queryFn: getElections
  });

  const addCandidate = () => {
    const trimmed = newCandidate.trim();
    if (!trimmed) {
      toast.warning('Candidate name cannot be empty.');
      return;
    }
    if (candidates.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      toast.warning('Candidate name already exists.');
      return;
    }
    setCandidates([...candidates, trimmed]);
    setNewCandidate('');
  };

  const removeCandidate = (index: number) => {
    setCandidates(candidates.filter((_, i) => i !== index));
  };

  // Mutation to create election using unified txManager
  const createElectionMutation = useMutation({
    mutationFn: async () => {
      if (!userAddress || !walletType) {
        throw new Error('Please connect your wallet first');
      }
      if (!title.trim()) {
        throw new Error('Election title cannot be empty.');
      }
      if (!description.trim()) {
        throw new Error('Election description cannot be empty.');
      }
      if (candidates.length < 2) {
        throw new Error('Please add at least 2 candidates.');
      }

      setTxError(null);
      setTxSuccessHash(null);
      
      const newId = elections.length; // auto-incremented ID
      const endTimeSecs = Math.floor(Date.now() / 1000) + (endDays * 24 * 60 * 60);

      const hash = await txManager.executeTx(
        `Create Election: "${title.trim()}"`,
        () => buildCreateElectionTx(
          newId,
          title.trim(),
          description.trim(),
          candidates,
          endTimeSecs,
          userAddress
        ),
        (xdr) => signTx(walletType, xdr, userAddress, 'TESTNET'),
        (status, err) => {
          if (status === 'signing') {
            setLoadingMsg('Signing with wallet extension...');
          } else if (status === 'submitting') {
            setLoadingMsg('Broadcasting to Stellar Registry Contract...');
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

      return { hash, newId };
    },
    onSuccess: (data) => {
      setTxSuccessHash(data.hash);
      setLoadingMsg(null);
      toast.success('Election created successfully on the Stellar blockchain! Redirecting...');
      queryClient.invalidateQueries({ queryKey: ['elections'] });
      setTimeout(() => {
        onNavigate('details', { id: data.newId });
      }, 3000);
    },
    onError: (err: any) => {
      const errMsg = err.message || 'Soroban build or execution error';
      setTxError(errMsg);
      setLoadingMsg(null);
      toast.error(errMsg);
    }
  });

  const handleNext = () => {
    if (step === 1 && (!title.trim() || !description.trim())) {
      toast.warning('Please fill in both the title and description.');
      return;
    }
    if (step === 2 && candidates.length < 2) {
      toast.warning('Please add at least 2 candidates.');
      return;
    }
    setStep(step + 1);
  };

  return (
    <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12 flex flex-col md:flex-row gap-gutter">
      {/* Sidebar: Progress */}
      <aside className="w-full md:w-1/4 shrink-0">
        <div className="sticky top-12">
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-8">Election Setup</h2>
          <nav className="relative">
            <div className="absolute left-4 top-4 bottom-4 w-px bg-outline-variant/50 z-0"></div>
            <ul className="relative z-10 flex flex-col gap-6">
              {[
                { s: 1, title: 'Basic Information', desc: 'Title & Description' },
                { s: 2, title: 'Candidates', desc: 'Nominees & Options' },
                { s: 3, title: 'Rules', desc: 'Voting Mechanics' },
                { s: 4, title: 'Schedule', desc: 'Timeline & Deadlines' },
                { s: 5, title: 'Review & Publish', desc: 'Final Confirmation' }
              ].map(item => (
                <li 
                  key={item.s} 
                  onClick={() => step > item.s && setStep(item.s)}
                  className={`flex items-start gap-4 transition-opacity ${step === item.s ? 'opacity-100' : 'opacity-60 cursor-pointer'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-label-sm text-label-sm ring-4 ring-background ${
                    step >= item.s ? 'bg-primary text-on-primary' : 'bg-surface-container-high border border-outline text-on-surface'
                  }`}>
                    {item.s}
                  </div>
                  <div className="pt-1">
                    <span className={`block font-label-md text-label-md ${step === item.s ? 'text-primary font-bold' : 'text-on-surface'}`}>
                      {item.title}
                    </span>
                    <span className="block font-label-sm text-label-sm text-on-surface-variant mt-1">
                      {item.desc}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Main Form Area */}
      <div className="w-full md:w-3/4">
        <div className="vellum-card p-8 md:p-12 rounded-lg">
          
          {step === 1 && (
            <div>
              <h2 className="font-headline-sm text-headline-sm text-primary mb-6">Basic Information</h2>
              <div className="space-y-6">
                <div>
                  <label className="block font-label-sm text-label-sm text-outline uppercase tracking-wider mb-2">Election Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full input-ledger text-body-lg focus:outline-none"
                    placeholder="e.g. Protocol Upgrade Proposal Q4"
                  />
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm text-outline uppercase tracking-wider mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full input-ledger text-body-md focus:outline-none"
                    placeholder="Provide details about the election, voting criteria, and implications..."
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="font-headline-sm text-headline-sm text-primary mb-6">Candidates & Nominees</h2>
              <div className="space-y-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCandidate}
                    onChange={(e) => setNewCandidate(e.target.value)}
                    className="flex-grow input-ledger text-body-md focus:outline-none"
                    placeholder="Candidate Name"
                    onKeyDown={(e) => e.key === 'Enter' && addCandidate()}
                  />
                  <Button 
                    type="button"
                    onClick={addCandidate} 
                    className="btn-ghost px-4 py-2 font-label-sm text-label-sm uppercase hover:bg-primary/5 transition-colors focus:outline-none"
                  >
                    Add
                  </Button>
                </div>
                
                <div className="space-y-2 mt-4">
                  {candidates.map((cand, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-surface-container-low p-3 rounded">
                      <span className="font-body-md text-on-surface">{cand}</span>
                      <button 
                        type="button"
                        onClick={() => removeCandidate(idx)} 
                        className="text-error hover:opacity-80 p-1 focus:outline-none"
                      >
                        <span className="material-symbols-outlined text-sm block">delete</span>
                      </button>
                    </div>
                  ))}
                  {candidates.length < 2 && (
                    <p className="text-error text-xs font-label-sm mt-2">Please add at least 2 candidates to build a valid voting card.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="font-headline-sm text-headline-sm text-primary mb-6">Voting Rules</h2>
              <div className="space-y-6 font-body-md text-on-surface-variant">
                <p>VoteSphere uses standard Single Choice Voting on-chain.</p>
                <div className="p-6 bg-surface-container-low rounded border border-outline-variant/30">
                  <h4 className="font-label-sm text-label-sm text-on-surface uppercase mb-2">Rules Applied:</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>One address counts as exactly one vote.</li>
                    <li>Voters cannot change their vote once submitted.</li>
                    <li>Results are tallied transparently post-expiration.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="font-headline-sm text-headline-sm text-primary mb-6">Timeline & Schedule</h2>
              <div className="space-y-6">
                <div>
                  <label className="block font-label-sm text-label-sm text-outline uppercase tracking-wider mb-2">Duration (Days)</label>
                  <select
                    value={endDays}
                    onChange={(e) => setEndDays(Number(e.target.value))}
                    className="w-full input-ledger text-body-md focus:outline-none"
                  >
                    <option value={1}>1 Day</option>
                    <option value={3}>3 Days</option>
                    <option value={7}>7 Days (Recommended)</option>
                    <option value={14}>14 Days</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <h2 className="font-headline-sm text-headline-sm text-primary mb-6">Review & Publish</h2>
              <div className="space-y-6 font-body-md text-on-surface-variant">
                <div className="border-b border-outline-variant/30 pb-4">
                  <h4 className="font-label-sm text-label-sm text-outline uppercase tracking-wider mb-1">Title</h4>
                  <p className="text-on-surface font-semibold">{title}</p>
                </div>
                <div className="border-b border-outline-variant/30 pb-4">
                  <h4 className="font-label-sm text-label-sm text-outline uppercase tracking-wider mb-1">Description</h4>
                  <p className="text-sm">{description}</p>
                </div>
                <div className="border-b border-outline-variant/30 pb-4">
                  <h4 className="font-label-sm text-label-sm text-outline uppercase tracking-wider mb-1">Candidates</h4>
                  <p className="text-on-surface text-sm">{candidates.join(', ')}</p>
                </div>
                <div className="border-b border-outline-variant/30 pb-4">
                  <h4 className="font-label-sm text-label-sm text-outline uppercase tracking-wider mb-1">Ends In</h4>
                  <p className="text-on-surface text-sm">{endDays} days</p>
                </div>

                {/* Status Messages */}
                {loadingMsg && (
                  <div className="bg-primary/10 border border-primary/20 text-on-surface p-4 rounded flex items-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-primary">sync</span>
                    <span className="text-sm">{loadingMsg}</span>
                  </div>
                )}
                
                {txError && (
                  <div className="bg-error-container text-on-error-container p-4 rounded">
                    <p className="text-sm">{txError}</p>
                  </div>
                )}

                {txSuccessHash && (
                  <div className="bg-secondary-container text-on-secondary-container p-4 rounded">
                    <p className="text-sm font-semibold">Success! Election created with ID #{elections.length}</p>
                    <p className="text-xs break-all">Hash: {txSuccessHash}</p>
                  </div>
                )}

                {!walletConnected ? (
                  <div className="bg-error-container text-on-error-container p-4 rounded text-center">
                    Please connect your wallet first to authorize the creation transaction.
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={() => createElectionMutation.mutate()}
                    loading={createElectionMutation.isPending}
                    className="w-full bg-[#B8860B] text-on-primary font-label-md px-6 py-4 rounded uppercase hover:opacity-90 transition-opacity flex justify-center items-center gap-2 focus:outline-none"
                  >
                    <span>Publish to Stellar Ledger</span>
                    <span className="material-symbols-outlined">rocket_launch</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex justify-between items-center mt-12 pt-8 border-t border-outline-variant/30">
            {step > 1 ? (
              <Button 
                type="button"
                onClick={() => setStep(step - 1)}
                className="btn-ghost px-6 py-2 rounded font-label-sm text-label-sm transition-colors focus:outline-none"
              >
                Back
              </Button>
            ) : (
              <div></div>
            )}
            
            {step < 5 && (
              <Button 
                type="button"
                onClick={handleNext}
                disabled={(step === 1 && (!title.trim() || !description.trim())) || (step === 2 && candidates.length < 2)}
                className="btn-primary px-6 py-2 rounded font-label-sm text-label-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
              >
                Next
              </Button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default CreateElectionPage;
