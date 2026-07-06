import { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import LandingPage from './pages/LandingPage';
import ExplorePage from './pages/ExplorePage';
import ElectionDetailsPage from './pages/ElectionDetailsPage';
import CreateElectionPage from './pages/CreateElectionPage';
import TxUtilityPage from './pages/TxUtilityPage';
import DashboardPage from './pages/DashboardPage';

import { connectWallet, WalletType } from './wallet/wallet-service';
import { getXlmBalance } from './services/stellar';
import { eventStreamService, ContractEvent } from './services/event-stream';

const App = () => {
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [tabParams, setTabParams] = useState<any>(null);

  // Wallet State
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [xlmBalance, setXlmBalance] = useState('0.0000');

  // Real-time notification toast state
  const [notification, setNotification] = useState<string | null>(null);

  // Load wallet connection from local storage (Auto-connect feature)
  useEffect(() => {
    const cachedType = localStorage.getItem('votesphere_wallet_type') as WalletType;
    const cachedAddr = localStorage.getItem('votesphere_wallet_address');
    if (cachedType && cachedAddr) {
      handleConnect(cachedType);
    }
  }, []);

  // Update balance when address changes or on demand
  useEffect(() => {
    if (userAddress) {
      refreshBalance();
      // Periodically refresh balance
      const interval = setInterval(refreshBalance, 10000);
      return () => clearInterval(interval);
    }
  }, [userAddress]);

  // Subscribe to Soroban event streams to trigger real-time UI notification banners
  useEffect(() => {
    const unsubscribe = eventStreamService.subscribe((event: ContractEvent) => {
      let message = '';
      if (event.type === 'election_created') {
        message = `🎉 New Election Created: "${event.data.title}"`;
      } else if (event.type === 'vote_cast') {
        message = `🗳️ Vote Cast! Voter ${event.data.voter.slice(0, 6)}... voted for Candidate #${event.data.candidateIdx + 1}`;
      } else if (event.type === 'results_updated') {
        message = `📊 Election #${event.data.electionId} results computed! Winner is Candidate #${event.data.winnerIdx + 1}`;
      } else if (event.type === 'results_finalized') {
        message = `🔒 Election #${event.data.electionId} has been finalized on-chain.`;
      }

      if (message) {
        setNotification(message);
        // Automatically close toast after 5 seconds
        setTimeout(() => {
          setNotification(null);
        }, 5000);
      }
    });

    return () => unsubscribe();
  }, []);

  const refreshBalance = async () => {
    if (userAddress) {
      const balance = await getXlmBalance(userAddress);
      setXlmBalance(balance);
    }
  };

  const handleConnect = async (type: WalletType) => {
    try {
      const pubKey = await connectWallet(type);
      setUserAddress(pubKey);
      setWalletType(type);
      setWalletConnected(true);
      
      // Cache details
      localStorage.setItem('votesphere_wallet_type', type);
      localStorage.setItem('votesphere_wallet_address', pubKey);
    } catch (e: any) {
      console.error(e);
      alert(e.message || 'Failed to connect wallet');
    }
  };

  const handleDisconnect = () => {
    setUserAddress(null);
    setWalletType(null);
    setWalletConnected(false);
    setXlmBalance('0.0000');
    localStorage.removeItem('votesphere_wallet_type');
    localStorage.removeItem('votesphere_wallet_address');
  };

  const handleNavigate = (tab: string, params?: any) => {
    setCurrentTab(tab);
    setTabParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Real-time Global Event Toast Banner */}
      {notification && (
        <div className="fixed bottom-6 right-6 bg-inverse-surface text-inverse-on-surface px-6 py-4 rounded-xl shadow-2xl z-[100] border border-outline-variant/30 animate-bounce flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-fixed-dim">notifications_active</span>
          <span className="font-label-md text-sm">{notification}</span>
          <button onClick={() => setNotification(null)} className="ml-4 hover:opacity-80">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

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
            onRefreshBalance={refreshBalance}
          />
        )}

        {currentTab === 'dashboard' && (
          <DashboardPage />
        )}
      </main>

      {/* Global Footer */}
      <footer className="bg-surface border-t border-outline-variant/30 py-8 px-margin-desktop mt-12">
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
