import { submitTransaction } from '../stellar';
import { monitoring } from '../monitoring/monitoring-service';
import { useStore } from '../../state/store';

export type TxStatus = 'idle' | 'signing' | 'submitting' | 'pending' | 'success' | 'failed';

export interface TxRecord {
  id: string;
  action: string;
  status: TxStatus;
  hash?: string;
  error?: string;
  timestamp: number;
}

class TransactionManager {
  private history: TxRecord[] = [];
  private listeners: Set<(records: TxRecord[]) => void> = new Set();

  constructor() {
    const saved = localStorage.getItem('votesphere_tx_history');
    if (saved) {
      try {
        this.history = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse tx history:', e);
      }
    }
  }

  public getHistory(): TxRecord[] {
    return [...this.history];
  }

  public subscribe(listener: (records: TxRecord[]) => void): () => void {
    this.listeners.add(listener);
    // Initial emission
    listener([...this.history]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const records = [...this.history];
    this.listeners.forEach((l) => l(records));
  }

  private addRecord(action: string): string {
    const id = Math.random().toString(36).substring(2, 9);
    const rec: TxRecord = {
      id,
      action,
      status: 'idle',
      timestamp: Date.now()
    };
    this.history = [rec, ...this.history].slice(0, 100); // Limit history size
    this.save();
    this.notify();
    return id;
  }

  private updateRecord(id: string, updates: Partial<Omit<TxRecord, 'id' | 'action' | 'timestamp'>>) {
    this.history = this.history.map((rec) => {
      if (rec.id === id) {
        return { ...rec, ...updates };
      }
      return rec;
    });
    this.save();
    this.notify();
  }

  private save() {
    localStorage.setItem('votesphere_tx_history', JSON.stringify(this.history));
  }

  /**
   * Executes a transaction with robust retry and error handling
   */
  public async executeTx(
    actionName: string,
    buildFn: () => Promise<string>,
    signFn: (xdr: string) => Promise<string>,
    updateStatusCallback?: (status: TxStatus, error?: string) => void,
    submitFn?: (signedXdr: string) => Promise<string>
  ): Promise<string> {
    const recId = this.addRecord(actionName);
    
    const setStatus = (status: TxStatus, err?: string, hash?: string) => {
      this.updateRecord(recId, { status, error: err, hash });
      if (updateStatusCallback) {
        updateStatusCallback(status, err);
      }
    };

    try {
      setStatus('signing');
      let unsignedXdr = await buildFn();
      let signedXdr = await signFn(unsignedXdr);

      setStatus('submitting');
      
      let txHash = '';
      let retries = 3;
      let delay = 1000;
      
      while (retries > 0) {
        try {
          if (submitFn) {
            txHash = await submitFn(signedXdr);
          } else {
            txHash = await submitTransaction(signedXdr);
          }
          break;
        } catch (submitErr: any) {
          retries--;
          const errMsg = submitErr.message || '';
          
          if (retries > 0 && (
            errMsg.includes('timeout') || 
            errMsg.includes('504') || 
            errMsg.includes('congestion') || 
            errMsg.includes('500') ||
            errMsg.includes('rpc')
          )) {
            setStatus('pending', 'Network busy. Retrying...');
            await new Promise(r => setTimeout(r, delay));
            delay *= 2;
          } else {
            throw submitErr;
          }
        }
      }

      setStatus('success', undefined, txHash);
      monitoring.logInfo(`Tx execution succeeded for "${actionName}"`, { txHash, recId });

      try {
        const store = useStore.getState();
        store.trackMetric('successfulTransactions');
        if (actionName.toLowerCase().includes('create election')) {
          store.trackMetric('electionsCreated');
        } else if (actionName.toLowerCase().includes('vote') || actionName.toLowerCase().includes('cast')) {
          store.trackMetric('votesCast');
        }
      } catch (err) {
        console.warn('Failed to track success metrics:', err);
      }

      return txHash;
    } catch (e: any) {
      console.error(`Tx execution failed for action "${actionName}":`, e);
      const errorMsg = e.message || 'Transaction failed';
      setStatus('failed', errorMsg);

      try {
        useStore.getState().trackMetric('failedTransactions');
      } catch (err) {
        console.warn('Failed to track failure metrics:', err);
      }

      monitoring.logError(e, { actionName, recordId: recId });
      throw e;
    }
  }
}

export const txManager = new TransactionManager();
