import { submitTransaction } from '../stellar';

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
        this.history = [];
      }
    }
  }

  public getHistory(): TxRecord[] {
    return this.history;
  }

  public subscribe(cb: (records: TxRecord[]) => void): () => void {
    this.listeners.add(cb);
    cb(this.history);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    localStorage.setItem('votesphere_tx_history', JSON.stringify(this.history));
    this.listeners.forEach(cb => cb(this.history));
  }

  public addRecord(action: string): string {
    const id = Math.random().toString(36).substring(2, 9);
    this.history.unshift({
      id,
      action,
      status: 'idle',
      timestamp: Date.now()
    });
    this.notify();
    return id;
  }

  public updateRecord(id: string, updates: Partial<TxRecord>) {
    this.history = this.history.map(rec => {
      if (rec.id === id) {
        return { ...rec, ...updates };
      }
      return rec;
    });
    this.notify();
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
      return txHash;
    } catch (e: any) {
      console.error(`Tx execution failed for action "${actionName}":`, e);
      const errorMsg = e.message || 'Transaction failed';
      setStatus('failed', errorMsg);
      throw e;
    }
  }
}

export const txManager = new TransactionManager();
