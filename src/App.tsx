import { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import LandingPage from './pages/LandingPage';
import ExplorePage from './pages/ExplorePage';
import ElectionDetailsPage from './pages/ElectionDetailsPage';
import CreateElectionPage from './pages/CreateElectionPage';
import TxUtilityPage from './pages/TxUtilityPage';
import DashboardPage from './pages/DashboardPage';

import { WalletType } from './wallet/wallet-service';
import { eventStreamService, ContractEvent } from './services/event-stream';
import { txManager } from './services/transactions/tx-manager';
import { useStore } from './state/store';
import { useToast } from './context/ToastContext';

const App = () => {
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [tabParams, setTabParams] = useState<any>(null);
  const toast = useToast();

  // central store hooks
  const {
    walletConnected,
    walletType,
    userAddress,
    xlmBalance,
    initializeStore,
    connect,
    disconnect,
    refreshBalance,
    addEvent,
    setTransactions
  } = useStore();

  // Initialize store and recover active session on mount
  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  // Balance polling every 30 seconds
  useEffect(() => {
    if (userAddress) {
      refreshBalance();
      const interval = setInterval(refreshBalance, 30000);
      return () => clearInterval(interval);
    }
  }, [userAddress, refreshBalance]);

  // Sync transaction records with store
  useEffect(() => {
    const unsubscribe = txManager.subscribe((records) => {
      setTransactions(records);
    });
    return () => unsubscribe();
  }, [setTransactions]);

  // Sync contract events with store and toast notification service
  useEffect(() => {
    const unsubscribe = eventStreamService.subscribe((event: ContractEvent) => {
      addEvent(event);
      
      if (event.type === 'election_created') {
        toast.info(`🎉 New Election Created: "${event.data.title}"`);
      } else if (event.type === 'vote_cast') {
        toast.success(`🗳️ Vote Cast! Voter ${event.data.voter.slice(0, 6)}... voted for Candidate #${event.data.candidateIdx + 1}`);
      } else if (event.type === 'results_updated') {
        toast.info(`📊 Election #${event.data.electionId} results computed! Winner is Candidate #${event.data.winnerIdx + 1}`);
      } else if (event.type === 'results_finalized') {
        toast.warning(`🔒 Election #${event.data.electionId} has been finalized on-chain.`);
      }
    });

    return () => unsubscribe();
  }, [addEvent, toast]);

  const handleConnect = async (type: WalletType) => {
    try {
      await connect(type);
      toast.success(`Connected to ${type.toUpperCase()} wallet successfully!`);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to connect wallet');
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    toast.info('Wallet disconnected.');
  };

  const handleNavigate = (tab: string, params?: any) => {
    setCurrentTab(tab);
    setTabParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-surface">
      {/* Global Navigation */}
      <Navigation
        currentTab={currentTab}
        onNavigate={handleNavigate}
        walletConnected={walletConnected}
        walletType={walletType}
        userAddress={userAddress}
        xlmBalance={xlmBalance}
        onConnectWallet={handleConnect}
        onDisconnectWallet={handleDisconnect}
      />

      {/* Page Content Canvas */}
      <main className="flex-grow">
        {currentTab === 'landing' && (
          <LandingPage onNavigate={handleNavigate} />
        )}
        
        {currentTab === 'explore' && (
          <ExplorePage onNavigate={handleNavigate} />
        )}
        
        {currentTab === 'details' && tabParams?.id !== undefined && (
          <ElectionDetailsPage
            electionId={Number(tabParams.id)}
            walletConnected={walletConnected}
            walletType={walletType}
            userAddress={userAddress}
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'create' && (
          <CreateElectionPage
            walletConnected={walletConnected}
            walletType={walletType}
            userAddress={userAddress}
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'tx-utility' && (
          <TxUtilityPage
            walletConnected={walletConnected}
            walletType={walletType}
            userAddress={userAddress}
            xlmBalance={xlmBalance}
            onRefreshBalance={refreshBalance}
          />
        )}

        {currentTab === 'dashboard' && (
          <DashboardPage />
        )}
      </main>

      {/* Global Footer */}
      <footer className="bg-surface border-t border-outline-variant/30 py-8 px-margin-mobile md:px-margin-desktop mt-12">
        <div className="max-w-container-max mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-on-surface-variant text-sm">
          <div className="font-display-lg text-primary text-lg">VoteSphere</div>
          <div>© {new Date().getFullYear()} VoteSphere. Built securely on Stellar Soroban.</div>
          <div className="flex gap-4 font-label-sm text-xs uppercase tracking-wider">
            <a href="#" className="hover:text-primary">Protocol</a>
            <a href="#" className="hover:text-primary">Ledger</a>
            <a href="#" className="hover:text-primary">Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
