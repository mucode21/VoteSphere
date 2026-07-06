import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { TransactionBuilder, Operation, Asset, TimeoutInfinite } from '@stellar/stellar-sdk';
import { rpcServer, horizonServer, NETWORK_PASSPHRASE } from '../services/stellar';
import { signTx } from '../wallet/wallet-service';

interface TxHistoryItem {
  hash: string;
  recipient: string;
  amount: string;
  timestamp: number;
}

interface TxUtilityPageProps {
  walletConnected: boolean;
  walletType: 'freighter' | 'albedo' | 'xbull' | null;
  userAddress: string | null;
  onRefreshBalance: () => void;
}

const TxUtilityPage = ({
  walletConnected,
  walletType,
  userAddress,
  onRefreshBalance
}: TxUtilityPageProps) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [history, setHistory] = useState<TxHistoryItem[]>([]);
  
  const [txError, setTxError] = useState<string | null>(null);
  const [txSuccessHash, setTxSuccessHash] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState<string | null>(null);

  // Load history from localStorage
  useEffect(() => {
    const cached = localStorage.getItem('votesphere_tx_history');
    if (cached) {
      try {
        setHistory(JSON.parse(cached));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveToHistory = (hash: string, rec: string, amt: string) => {
    const item: TxHistoryItem = {
      hash,
      recipient: rec,
      amount: amt,
      timestamp: Date.now()
    };
    const updated = [item, ...history].slice(0, 20); // Keep last 20
    setHistory(updated);
    localStorage.setItem('votesphere_tx_history', JSON.stringify(updated));
  };

  const sendXlmMutation = useMutation({
    mutationFn: async () => {
      if (!userAddress || !walletType) {
        throw new Error('Please connect your wallet first');
      }
      if (!recipient || !amount) {
        throw new Error('Please specify recipient and amount');
      }

      setTxError(null);
      setTxSuccessHash(null);
      setLoadingMsg('1. Retrieving Account Sequence from Horizon...');
      
      const sourceAccount = await rpcServer.getAccount(userAddress);
      
      setLoadingMsg('2. Building payment transaction...');
      const tx = new TransactionBuilder(sourceAccount, {
        fee: '1000', // 0.0001 XLM base fee
        networkPassphrase: NETWORK_PASSPHRASE
      })
        .addOperation(
          Operation.payment({
            destination: recipient,
            asset: Asset.native(),
            amount: amount
          })
        )
        .setTimeout(TimeoutInfinite)
        .build();

      const txXdr = tx.toXDR();

      setLoadingMsg('3. Waiting for wallet approval...');
      const signedXdr = await signTx(walletType, txXdr, userAddress, 'TESTNET');

      setLoadingMsg('4. Submitting payment transaction to Horizon...');
      const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
      const res = await horizonServer.submitTransaction(signedTx);
      
      if (!res.successful) {
        throw new Error('Transaction submission failed');
      }

      return res.hash;
    },
    onSuccess: (hash) => {
      setTxSuccessHash(hash);
      setLoadingMsg(null);
      saveToHistory(hash, recipient, amount);
      setRecipient('');
      setAmount('');
      onRefreshBalance();
    },
    onError: (err: any) => {
      setTxError(err.message || 'Payment transaction failed');
      setLoadingMsg(null);
    }
  });

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
                <label className="block font-label-sm text-label-sm text-outline uppercase tracking-wider mb-2">Recipient Address</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full input-ledger text-sm font-mono"
                  placeholder="G..."
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm text-outline uppercase tracking-wider mb-2">Amount (XLM)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full input-ledger text-body-md"
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
                  <p className="text-xs break-all">Hash: {txSuccessHash}</p>
                </div>
              )}

              {!walletConnected ? (
                <div className="bg-error-container text-on-error-container p-4 rounded text-center">
                  Please connect your wallet first.
                </div>
              ) : (
                <button
                  onClick={() => sendXlmMutation.mutate()}
                  disabled={sendXlmMutation.isPending}
                  className="w-full bg-[#B8860B] text-on-primary font-label-md px-6 py-3 rounded uppercase hover:opacity-90 transition-opacity flex justify-center items-center gap-2"
                >
                  <span>Send XLM Payment</span>
                  <span className="material-symbols-outlined">send</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* History */}
        <div className="md:col-span-6">
          <div className="vellum-card p-8 rounded-lg min-h-[300px]">
            <h2 className="font-headline-sm text-headline-sm text-primary mb-6">Local Transaction History</h2>
            
            <div className="space-y-4">
              {history.length === 0 ? (
                <p className="text-on-surface-variant font-body-md text-sm text-center py-12">
                  No payment history recorded on this device yet.
                </p>
              ) : (
                history.map((item, idx) => (
                  <div key={idx} className="bg-surface-container-low p-4 rounded border border-outline-variant/30 flex flex-col justify-between gap-2">
                    <div className="flex justify-between items-center">
                      <span className="font-label-md text-primary">{item.amount} XLM</span>
                      <span className="text-xs text-on-surface-variant font-mono">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-xs text-on-surface-variant">
                      To: <span className="font-mono">{item.recipient.slice(0, 8)}...{item.recipient.slice(-8)}</span>
                    </div>
                    <a 
                      href={`https://stellar.expert/explorer/testnet/tx/${item.hash}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-xs font-mono underline hover:text-primary truncate"
                    >
                      Hash: {item.hash.slice(0, 16)}...
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TxUtilityPage;
