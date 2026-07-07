import { create } from 'zustand';
import { WalletType, connectWallet as connectService, disconnectWallet as disconnectService, verifySession } from '../wallet/wallet-service';
import { getXlmBalance } from '../services/stellar';
import { ContractEvent } from '../services/event-stream';
import { TxRecord } from '../services/transactions/tx-manager';
import { monitoring } from '../services/monitoring/monitoring-service';

export interface FeedbackItem {
  id: string;
  rating: number;
  category: string;
  comments: string;
  timestamp: string;
}

export interface AppAnalytics {
  electionsCreated: number;
  votesCast: number;
  walletConnections: number;
  failedTransactions: number;
  successfulTransactions: number;
}

interface VoteSphereState {
  walletConnected: boolean;
  walletType: WalletType | null;
  userAddress: string | null;
  xlmBalance: string;
  transactions: TxRecord[];
  events: ContractEvent[];
  theme: 'light' | 'dark';
  onboardingCompleted: boolean;
  feedbackList: FeedbackItem[];
  analytics: AppAnalytics;
  
  // Actions
  initializeStore: () => Promise<void>;
  connect: (type: WalletType) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  addEvent: (event: ContractEvent) => void;
  setTransactions: (txs: TxRecord[]) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setOnboardingCompleted: (val: boolean) => void;
  addFeedback: (rating: number, category: string, comments: string) => void;
  trackMetric: (metric: keyof AppAnalytics) => void;
}

export const useStore = create<VoteSphereState>((set, get) => ({
  walletConnected: false,
  walletType: null,
  userAddress: null,
  xlmBalance: '0.0000',
  transactions: [],
  events: [],
  theme: (document.documentElement.classList.contains('dark') ? 'dark' : 'light') as 'light' | 'dark',
  onboardingCompleted: false,
  feedbackList: [],
  analytics: {
    electionsCreated: 0,
    votesCast: 0,
    walletConnections: 0,
    failedTransactions: 0,
    successfulTransactions: 0
  },

  initializeStore: async () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    set({ theme: savedTheme as 'light' | 'dark' });
    
    const savedOnboarding = localStorage.getItem('votesphere_onboarding_completed') === 'true';
    const savedFeedback = JSON.parse(localStorage.getItem('votesphere_feedback_list') || '[]');
    const savedAnalytics = JSON.parse(localStorage.getItem('votesphere_analytics') || JSON.stringify({
      electionsCreated: 0,
      votesCast: 0,
      walletConnections: 0,
      failedTransactions: 0,
      successfulTransactions: 0
    }));

    set({
      onboardingCompleted: savedOnboarding,
      feedbackList: savedFeedback,
      analytics: savedAnalytics
    });

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
        monitoring.setUserContext(cachedAddr);
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
    monitoring.setUserContext(address);
    monitoring.logInfo('Wallet session established', { walletType: type, userAddress: address });
    get().trackMetric('walletConnections');
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
    monitoring.clearUserContext();
    monitoring.logInfo('Wallet session closed');
  },

  refreshBalance: async () => {
    const { userAddress } = get();
    if (userAddress) {
      try {
        const balance = await getXlmBalance(userAddress);
        set({ xlmBalance: balance });
      } catch (e) {
        monitoring.logError(e, { context: 'Store refreshBalance', userAddress });
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
  },

  setOnboardingCompleted: (val: boolean) => {
    set({ onboardingCompleted: val });
    localStorage.setItem('votesphere_onboarding_completed', String(val));
  },

  addFeedback: (rating: number, category: string, comments: string) => {
    const newItem: FeedbackItem = {
      id: Math.random().toString(36).substring(2, 9),
      rating,
      category,
      comments,
      timestamp: new Date().toISOString()
    };
    set(state => {
      const updated = [newItem, ...state.feedbackList];
      localStorage.setItem('votesphere_feedback_list', JSON.stringify(updated));
      return { feedbackList: updated };
    });
  },

  trackMetric: (metric: keyof AppAnalytics) => {
    set(state => {
      const updated = {
        ...state.analytics,
        [metric]: (state.analytics[metric] || 0) + 1
      };
      localStorage.setItem('votesphere_analytics', JSON.stringify(updated));
      return { analytics: updated };
    });
  }
}));
