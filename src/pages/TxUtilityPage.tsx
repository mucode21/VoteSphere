import { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { TransactionBuilder, Operation, Asset, TimeoutInfinite } from '@stellar/stellar-sdk';
import { rpcServer, horizonServer, NETWORK_PASSPHRASE } from '../services/stellar';
import { signTx } from '../wallet/wallet-service';
import { txManager } from '../services/transactions/tx-manager';
import { useStore } from '../state/store';
import { useToast } from '../context/ToastContext';
import Button from '../components/Button';

interface TxUtilityPageProps {
  walletConnected: boolean;
  walletType: 'freighter' | 'albedo' | 'xbull' | null;
  userAddress: string | null;
  xlmBalance: string;
  onRefreshBalance: () => void;
}

const isValidStellarAddress = (address: string) => {
  return /^G[A-Z2-7]{55}$/.test(address);
};

const TxUtilityPage = ({
  walletConnected,
  walletType,
  userAddress,
  xlmBalance,
  onRefreshBalance
}: TxUtilityPageProps) => {
  const toast = useToast();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  
  const [txError, setTxError] = useState<string | null>(null);
  const [txSuccessHash, setTxSuccessHash] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState<string | null>(null);

  // Filter state for transaction history
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed' | 'pending'>('all');

  // Pull transactions from central store
  const { transactions } = useStore();

  // Filtered transactions list
  const filteredTxs = useMemo(() => {
    return transactions.filter(tx => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'success') return tx.status === 'success';
      if (statusFilter === 'failed') return tx.status === 'failed';
      if (statusFilter === 'pending') {
        return tx.status === 'signing' || tx.status === 'submitting' || tx.status === 'pending';
      }
      return true;
    });
  }, [transactions, statusFilter]);

  const sendXlmMutation = useMutation({
    mutationFn: async (params?: { to: string; val: string }) => {
      if (!userAddress || !walletType) {
        throw new Error('Please connect your wallet first');
      }

      const dest = params ? params.to : recipient.trim();
      const amtStr = params ? params.val : amount;

      if (!dest) {
        throw new Error('Recipient address cannot be empty.');
      }

      if (!isValidStellarAddress(dest)) {
        throw new Error('Invalid Stellar destination address format. Must be a 56-character public key starting with "G".');
      }

      const amtVal = parseFloat(amtStr);
      if (isNaN(amtVal) || amtVal <= 0) {
        throw new Error('Transfer amount must be a positive number greater than zero.');
      }

      const balance = parseFloat(xlmBalance);
      const totalCost = amtVal + 0.0001;
      if (balance < totalCost) {
        throw new Error(`Insufficient funds. Your balance is ${balance} XLM, but this transfer requires ${totalCost} XLM (including network fee).`);
      }

      setTxError(null);
      setTxSuccessHash(null);

      // Execute transaction through manager
      const hash = await txManager.executeTx(
        `XLM Payment: ${amtStr} XLM to ${dest.slice(0, 6)}...`,
        async () => {
          const sourceAccount = await rpcServer.getAccount(userAddress);
          const tx = new TransactionBuilder(sourceAccount, {
            fee: '1000', // 0.0001 XLM base fee
            networkPassphrase: NETWORK_PASSPHRASE
          })
            .addOperation(
              Operation.payment({
                destination: dest,
                asset: Asset.native(),
                amount: amtStr
              })
            )
            .setTimeout(TimeoutInfinite)
            .build();
          return tx.toXDR();
        },
        (xdr) => signTx(walletType, xdr, userAddress, 'TESTNET'),
        (status, err) => {
          if (status === 'signing') {
            setLoadingMsg('Signing with wallet...');
          } else if (status === 'submitting') {
            setLoadingMsg('Broadcasting payment to Horizon Network...');
          } else if (status === 'pending') {
            setLoadingMsg('Transaction pending (network congestion)...');
          } else if (status === 'success' || status === 'failed') {
            setLoadingMsg(null);
          }
          if (err) {
            setTxError(err);
          }
        },
        // Custom submit function for Horizon payment submission
        async (signedXdr) => {
          const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
          const res = await horizonServer.submitTransaction(signedTx);
          if (!res.successful) {
            throw new Error('Transaction submission failed on Horizon network');
          }
          return res.hash;
        }
      );

      return { hash, dest, amtStr };
    },
    onSuccess: (data) => {
      setTxSuccessHash(data.hash);
      setLoadingMsg(null);
      toast.success(`Successfully transferred ${data.amtStr} XLM to ${data.dest.slice(0, 6)}...`);
      setRecipient('');
      setAmount('');
      onRefreshBalance();
    },
    onError: (err: any) => {
      const errMsg = err.message || 'Payment transaction failed';
      setTxError(errMsg);
      setLoadingMsg(null);
      toast.error(errMsg);
    }
  });

  // Retry handler for failed transactions
  const handleRetry = (tx: any) => {
    // If it was an XLM Payment, we extract recipient and amount from the action name
    // e.g. "XLM Payment: 5 XLM to GC..."
    if (tx.action.startsWith('XLM Payment:')) {
      try {
        const parts = tx.action.replace('XLM Payment: ', '').split(' XLM to ');
        const amtStr = parts[0];
        const dest = parts[1].replace('...', '');
        
        // Find if we have recipient stored fully, otherwise just prepopulate input
        if (isValidStellarAddress(dest)) {
          sendXlmMutation.mutate({ to: dest, val: amtStr });
        } else {
          // Prepopulate inputs so user can easily fix/resubmit
          setAmount(amtStr);
          toast.info('Prepopulated transfer details. Please enter recipient address to retry.');
        }
      } catch (e) {
        toast.error('Could not auto-parse parameters for retry. Please recreate transfer.');
      }
    } else {
      toast.info('Please trigger this action again from the corresponding proposal or creation page.');
    }
  };

  return (
    <div className="max-w-container-max mx-auto w-full px-margin-mobile md:px-margin-desktop py-12">
      {/* Header */}
      <header className="mb-12 border-b border-outline-variant/30 pb-8">
        <h1 className="font-display-lg text-display-lg text-primary mb-2">XLM Transaction Flow</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          Send native testnet XLM tokens to any Stellar address. Monitor transaction history locally.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
        {/* Form */}
        <div className="md:col-span-6">
          <div className="vellum-card p-8 rounded-lg">
            <h2 className="font-headline-sm text-headline-sm text-primary mb-6">Send Tokens</h2>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block font-label-sm text-label-sm text-outline uppercase tracking-wider">Recipient Address</label>
                  {walletConnected && (
                    <span className="text-[10px] text-on-surface-variant font-mono">Sender: {userAddress?.slice(0, 6)}...</span>
                  )}
                </div>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full input-ledger text-sm font-mono focus:outline-none"
                  placeholder="G..."
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block font-label-sm text-label-sm text-outline uppercase tracking-wider">Amount (XLM)</label>
                  {walletConnected && (
                    <span className="text-xs text-primary font-semibold">Max: {xlmBalance} XLM</span>
                  )}
                </div>
                <input
                  type="number"
                  step="0.0001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full input-ledger text-body-md focus:outline-none"
                  placeholder="0.00"
                />
              </div>

              {/* Status messages */}
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
                  <p className="text-sm font-semibold">Payment successful!</p>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${txSuccessHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono underline hover:text-primary transition-colors break-all"
                  >
                    Hash: {txSuccessHash}
                  </a>
                </div>
              )}

              {!walletConnected ? (
                <div className="bg-error-container text-on-error-container p-4 rounded text-center">
                  Please connect your wallet first.
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={() => sendXlmMutation.mutate(undefined)}
                  loading={sendXlmMutation.isPending}
                  className="w-full bg-[#B8860B] text-on-primary font-label-md px-6 py-3 rounded uppercase hover:opacity-90 transition-opacity flex justify-center items-center gap-2 focus:outline-none"
                >
                  <span>Send XLM Payment</span>
                  <span className="material-symbols-outlined">send</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* History with Filters */}
        <div className="md:col-span-6">
          <div className="vellum-card p-8 rounded-lg min-h-[400px]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="font-headline-sm text-headline-sm text-primary">Transaction History</h2>
              
              {/* Filter Tabs */}
              <div className="flex bg-surface-container-low rounded p-1 border border-outline-variant/30 text-xs">
                {(['all', 'success', 'failed', 'pending'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`px-3 py-1.5 rounded uppercase font-semibold transition-colors focus:outline-none ${
                      statusFilter === f ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {filteredTxs.length === 0 ? (
                <p className="text-on-surface-variant font-body-md text-sm text-center py-12">
                  No {statusFilter !== 'all' ? statusFilter : ''} transactions recorded yet.
                </p>
              ) : (
                filteredTxs.map((item) => {
                  let statusBg = 'bg-outline/10 text-outline';
                  if (item.status === 'success') statusBg = 'bg-secondary-container text-on-secondary-container';
                  else if (item.status === 'failed') statusBg = 'bg-error-container text-on-error-container';
                  else if (item.status === 'signing' || item.status === 'submitting' || item.status === 'pending') {
                    statusBg = 'bg-primary/20 text-primary animate-pulse';
                  }

                  return (
                    <div key={item.id} className="bg-surface-container-low p-4 rounded border border-outline-variant/30 flex flex-col justify-between gap-3 transition-all hover:border-outline-variant/60">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-label-md font-semibold text-on-surface text-sm">{item.action}</div>
                          <span className="text-[10px] text-on-surface-variant font-mono">
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${statusBg}`}>
                          {item.status}
                        </span>
                      </div>
                      
                      {item.error && (
                        <div className="text-xs text-error font-body-sm bg-error/5 p-2 rounded border border-error/15">
                          Error: {item.error}
                        </div>
                      )}

                      <div className="flex justify-between items-center mt-1 pt-2 border-t border-outline-variant/10">
                        {item.hash ? (
                          <a 
                            href={`https://stellar.expert/explorer/testnet/tx/${item.hash}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-xs font-mono underline text-primary hover:text-primary-dark transition-colors truncate max-w-[200px]"
                          >
                            Hash: {item.hash.slice(0, 12)}...{item.hash.slice(-8)}
                          </a>
                        ) : (
                          <span className="text-xs text-on-surface-variant italic">No ledger hash available</span>
                        )}

                        {item.status === 'failed' && (
                          <Button
                            type="button"
                            onClick={() => handleRetry(item)}
                            className="btn-ghost text-xs px-3 py-1 rounded flex items-center gap-1 focus:outline-none border border-outline/30"
                          >
                            <span className="material-symbols-outlined text-xs">replay</span>
                            <span>Retry</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TxUtilityPage;
