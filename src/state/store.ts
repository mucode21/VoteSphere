import { create } from 'zustand';
import { WalletType, connectWallet as connectService, disconnectWallet as disconnectService, verifySession } from '../wallet/wallet-service';
import { getXlmBalance } from '../services/stellar';
import { ContractEvent } from '../services/event-stream';
import { TxRecord } from '../services/transactions/tx-manager';

interface VoteSphereState {
  walletConnected: boolean;
  walletType: WalletType | null;
  userAddress: string | null;
  xlmBalance: string;
  transactions: TxRecord[];
  events: ContractEvent[];
  theme: 'light' | 'dark';
  
  // Actions
  initializeStore: () => Promise<void>;
  connect: (type: WalletType) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  addEvent: (event: ContractEvent) => void;
  setTransactions: (txs: TxRecord[]) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useStore = create<VoteSphereState>((set, get) => ({
  walletConnected: false,
  walletType: null,
  userAddress: null,
  xlmBalance: '0.0000',
  transactions: [],
  events: [],
  theme: (document.documentElement.classList.contains('dark') ? 'dark' : 'light') as 'light' | 'dark',

  initializeStore: async () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    set({ theme: savedTheme as 'light' | 'dark' });
    
    const cachedType = localStorage.getItem('votesphere_wallet_type') as WalletType | null;
    const cachedAddr = localStorage.getItem('votesphere_wallet_address');
    if (cachedType && cachedAddr) {
      const isValid = await verifySession(cachedType, cachedAddr);
      if (isValid) {
        set({
          walletConnected: true,
          walletType: cachedType,
          userAddress: cachedAddr
        });
        await get().refreshBalance();
      } else {
        localStorage.removeItem('votesphere_wallet_type');
        localStorage.removeItem('votesphere_wallet_address');
      }
    }
  },

  connect: async (type: WalletType) => {
    const address = await connectService(type);
    set({
      walletConnected: true,
      walletType: type,
      userAddress: address
    });
    localStorage.setItem('votesphere_wallet_type', type);
    localStorage.setItem('votesphere_wallet_address', address);
    await get().refreshBalance();
  },

  disconnect: async () => {
    await disconnectService();
    set({
      walletConnected: false,
      walletType: null,
      userAddress: null,
      xlmBalance: '0.0000'
    });
    localStorage.removeItem('votesphere_wallet_type');
    localStorage.removeItem('votesphere_wallet_address');
  },

  refreshBalance: async () => {
    const { userAddress } = get();
    if (userAddress) {
      try {
        const balance = await getXlmBalance(userAddress);
        set({ xlmBalance: balance });
      } catch (e) {
        console.error('Failed refreshing balance in store:', e);
      }
    }
  },

  addEvent: (event: ContractEvent) => {
    set(state => {
      const exists = state.events.some(e => e.id === event.id);
      if (exists) return state;
      const updated = [event, ...state.events];
      if (updated.length > 50) updated.pop();
      return { events: updated };
    });
  },

  setTransactions: (txs: TxRecord[]) => {
    set({ transactions: txs });
  },

  setTheme: (theme: 'light' | 'dark') => {
    set({ theme });
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}));
