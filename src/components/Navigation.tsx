import { useState } from 'react';
import { WalletType } from '../wallet/wallet-service';

interface NavigationProps {
  currentTab: string;
  onNavigate: (tab: string, params?: any) => void;
  walletConnected: boolean;
  walletType: WalletType | null;
  userAddress: string | null;
  xlmBalance: string;
  onConnectWallet: (type: WalletType) => void;
  onDisconnectWallet: () => void;
}

const Navigation = ({
  currentTab,
  onNavigate,
  walletConnected,
  walletType,
  userAddress,
  xlmBalance,
  onConnectWallet,
  onDisconnectWallet
}: NavigationProps) => {
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleDarkMode = () => {
    const root = document.documentElement;
    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
      setIsDarkMode(false);
    } else {
      root.classList.add('dark');
      setIsDarkMode(true);
    }
  };

  const handleWalletSelect = (type: WalletType) => {
    onConnectWallet(type);
    setShowWalletModal(false);
  };

  return (
    <header className="bg-surface border-b border-outline-variant/30 sticky top-0 z-50 w-full transition-all duration-300">
      <div className="flex justify-between items-center px-margin-desktop py-4 max-w-container-max mx-auto">
        <a 
          className="font-display-lg text-display-lg text-primary tracking-tight cursor-pointer" 
          onClick={() => onNavigate('landing')}
        >
          VoteSphere
        </a>
        <nav className="hidden md:flex gap-gutter items-center">
          <a 
            className={`hover:text-primary transition-colors font-body-md text-body-md cursor-pointer ${
              currentTab === 'landing' ? 'text-primary font-bold' : 'text-on-surface-variant'
            }`}
            onClick={() => onNavigate('landing')}
          >
            Features
          </a>
          <a 
            className={`hover:text-primary transition-colors font-body-md text-body-md cursor-pointer ${
              currentTab === 'explore' || currentTab === 'details' ? 'text-primary font-bold' : 'text-on-surface-variant'
            }`}
            onClick={() => onNavigate('explore')}
          >
            Elections
          </a>
          <a 
            className={`hover:text-primary transition-colors font-body-md text-body-md cursor-pointer ${
              currentTab === 'dashboard' ? 'text-primary font-bold' : 'text-on-surface-variant'
            }`}
            onClick={() => onNavigate('dashboard')}
          >
            Governance
          </a>
          <a 
            className={`hover:text-primary transition-colors font-body-md text-body-md cursor-pointer ${
              currentTab === 'create' ? 'text-primary font-bold' : 'text-on-surface-variant'
            }`}
            onClick={() => onNavigate('create')}
          >
            Admin Wizard
          </a>
          <a 
            className={`hover:text-primary transition-colors font-body-md text-body-md cursor-pointer ${
              currentTab === 'tx-utility' ? 'text-primary font-bold' : 'text-on-surface-variant'
            }`}
            onClick={() => onNavigate('tx-utility')}
          >
            XLM Transfer
          </a>
        </nav>

        <div className="flex items-center gap-4">
          {/* Dark Mode toggle */}
          <button 
            onClick={toggleDarkMode}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity text-on-surface-variant"
          >
            <span className="material-symbols-outlined">
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* Wallet connection button */}
          {walletConnected && userAddress ? (
            <div className="flex items-center gap-3">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs text-on-surface-variant font-mono uppercase tracking-wider">{walletType}</span>
                <span className="text-xs text-primary font-semibold">{xlmBalance} XLM</span>
              </div>
              <button 
                onClick={onDisconnectWallet}
                className="bg-surface-container border border-outline-variant text-on-surface px-4 py-2 rounded font-label-sm text-xs font-mono hover:bg-error-container hover:text-on-error-container transition-colors"
                title="Click to Disconnect"
              >
                {userAddress.slice(0, 6)}...{userAddress.slice(-6)}
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowWalletModal(true)}
              className="bg-primary text-on-primary px-6 py-2 rounded font-label-md text-label-md uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      {/* Wallet selector modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-outline-variant/30 rounded-xl p-8 max-w-sm w-full vellum-card relative">
            <button 
              onClick={() => setShowWalletModal(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-primary"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <h3 className="font-headline-sm text-headline-sm text-primary mb-6 text-center">Connect Wallet</h3>
            <p className="font-body-md text-sm text-on-surface-variant mb-6 text-center">
              Select your preferred Stellar/Soroban credentials manager.
            </p>

            <div className="space-y-4">
              {[
                { type: 'freighter' as WalletType, name: 'Freighter', desc: 'Official Stellar Browser Wallet' },
                { type: 'albedo' as WalletType, name: 'Albedo', desc: 'Secure Web & Extension Bridge' },
                { type: 'xbull' as WalletType, name: 'xBull', desc: 'Developer-First Credential Vault' }
              ].map(w => (
                <button
                  key={w.type}
                  onClick={() => handleWalletSelect(w.type)}
                  className="w-full text-left bg-surface-container-low hover:bg-surface-container border border-outline-variant/50 p-4 rounded flex items-center justify-between group transition-colors"
                >
                  <div>
                    <span className="block font-label-md text-label-md font-bold text-on-surface group-hover:text-primary transition-colors">
                      {w.name}
                    </span>
                    <span className="block text-xs text-on-surface-variant mt-1">
                      {w.desc}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">
                    chevron_right
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navigation;
