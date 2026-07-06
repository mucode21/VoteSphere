import { useState } from 'react';
import { WalletType } from '../wallet/wallet-service';
import { useToast } from '../context/ToastContext';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { success: successToast } = useToast();

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark') || localStorage.getItem('votesphere_theme') === 'dark';
  });

  const toggleDarkMode = () => {
    const root = document.documentElement;
    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
      root.classList.add('light');
      setIsDarkMode(false);
      localStorage.setItem('votesphere_theme', 'light');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
      setIsDarkMode(true);
      localStorage.setItem('votesphere_theme', 'dark');
    }
  };

  const handleWalletSelect = (type: WalletType) => {
    onConnectWallet(type);
    setShowWalletModal(false);
  };

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (userAddress) {
      navigator.clipboard.writeText(userAddress);
      successToast('Wallet address copied to clipboard!');
    }
  };

  return (
    <header className="bg-surface border-b border-outline-variant/30 sticky top-0 z-50 w-full transition-all duration-300">
      <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-4 max-w-container-max mx-auto">
        <button 
          type="button"
          className="font-display-lg text-display-lg text-primary tracking-tight cursor-pointer hover:opacity-85 focus:outline-none" 
          onClick={() => onNavigate('landing')}
        >
          VoteSphere
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex gap-gutter items-center">
          <button 
            type="button"
            className={`hover:text-primary transition-colors font-body-md text-body-md cursor-pointer focus:outline-none ${
              currentTab === 'landing' ? 'text-primary font-bold' : 'text-on-surface-variant'
            }`}
            onClick={() => onNavigate('landing')}
          >
            Features
          </button>
          <button 
            type="button"
            className={`hover:text-primary transition-colors font-body-md text-body-md cursor-pointer focus:outline-none ${
              currentTab === 'explore' || currentTab === 'details' ? 'text-primary font-bold' : 'text-on-surface-variant'
            }`}
            onClick={() => onNavigate('explore')}
          >
            Elections
          </button>
          <button 
            type="button"
            className={`hover:text-primary transition-colors font-body-md text-body-md cursor-pointer focus:outline-none ${
              currentTab === 'dashboard' ? 'text-primary font-bold' : 'text-on-surface-variant'
            }`}
            onClick={() => onNavigate('dashboard')}
          >
            Governance
          </button>
          <button 
            type="button"
            className={`hover:text-primary transition-colors font-body-md text-body-md cursor-pointer focus:outline-none ${
              currentTab === 'create' ? 'text-primary font-bold' : 'text-on-surface-variant'
            }`}
            onClick={() => onNavigate('create')}
          >
            Admin Wizard
          </button>
          <button 
            type="button"
            className={`hover:text-primary transition-colors font-body-md text-body-md cursor-pointer focus:outline-none ${
              currentTab === 'tx-utility' ? 'text-primary font-bold' : 'text-on-surface-variant'
            }`}
            onClick={() => onNavigate('tx-utility')}
          >
            XLM Transfer
          </button>
        </nav>

        <div className="flex items-center gap-4">
          {/* Dark Mode toggle */}
          <button 
            type="button"
            onClick={toggleDarkMode}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity text-on-surface-variant p-2 rounded focus:outline-none"
            aria-label="Toggle Theme"
          >
            <span className="material-symbols-outlined block">
              {isDarkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* Desktop Wallet connection UI */}
          <div className="hidden md:flex items-center gap-3">
            {walletConnected && userAddress ? (
              <div className="flex items-center gap-3">
                <div className="flex flex-col text-right">
                  <span className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider">{walletType}</span>
                  <span className="text-xs text-primary font-semibold">{xlmBalance} XLM</span>
                </div>
                <div className="flex items-center border border-outline-variant/50 rounded bg-surface-container-low overflow-hidden">
                  <button 
                    type="button"
                    onClick={onDisconnectWallet}
                    className="text-on-surface px-3 py-1.5 font-label-sm text-xs font-mono hover:bg-error-container hover:text-on-error-container transition-colors focus:outline-none"
                    title="Click to Disconnect"
                  >
                    {userAddress.slice(0, 6)}...{userAddress.slice(-6)}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="border-l border-outline-variant/30 text-on-surface-variant hover:text-primary hover:bg-surface-container p-1.5 transition-colors focus:outline-none flex items-center justify-center"
                    title="Copy Address"
                  >
                    <span className="material-symbols-outlined text-[16px] block">content_copy</span>
                  </button>
                </div>
              </div>
            ) : (
              <button 
                type="button"
                onClick={() => setShowWalletModal(true)}
                className="bg-primary text-on-primary px-6 py-2 rounded font-label-md text-label-md uppercase tracking-widest hover:opacity-90 transition-opacity focus:outline-none"
              >
                Connect Wallet
              </button>
            )}
          </div>

          {/* Mobile hamburger menu trigger */}
          <button 
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden flex items-center text-on-surface-variant p-2 hover:bg-surface-container rounded focus:outline-none"
            aria-label="Open Mobile Menu"
          >
            <span className="material-symbols-outlined block">menu</span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Slide-in */}
      <div className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${isMobileMenuOpen ? 'visible' : 'invisible'}`}>
        {/* Backdrop overlay */}
        <div 
          className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`} 
          onClick={() => setIsMobileMenuOpen(false)}
        />
        {/* Slide-out Panel */}
        <div className={`absolute top-0 right-0 h-full w-[290px] bg-surface border-l border-outline-variant/30 p-6 flex flex-col justify-between transition-transform duration-300 transform ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div>
            <div className="flex justify-between items-center mb-8">
              <span className="font-display-lg text-display-lg text-primary">VoteSphere</span>
              <button 
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-on-surface-variant hover:text-primary p-1 focus:outline-none"
                aria-label="Close Mobile Menu"
              >
                <span className="material-symbols-outlined block">close</span>
              </button>
            </div>

            <nav className="flex flex-col gap-3">
              {[
                { id: 'landing', label: 'Features' },
                { id: 'explore', label: 'Elections' },
                { id: 'dashboard', label: 'Governance' },
                { id: 'create', label: 'Admin Wizard' },
                { id: 'tx-utility', label: 'XLM Transfer' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    onNavigate(tab.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`text-left py-2.5 px-3 rounded font-body-md text-body-md hover:text-primary hover:bg-surface-container-low transition-all focus:outline-none ${
                    currentTab === tab.id ? 'text-primary font-bold border-l-4 border-primary bg-surface-container-low pl-2' : 'text-on-surface-variant'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="pt-6 border-t border-outline-variant/30">
            {walletConnected && userAddress ? (
              <div className="space-y-4">
                <div className="bg-surface-container-low p-4 rounded border border-outline-variant/40">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider">{walletType}</span>
                    <button
                      type="button"
                      onClick={handleCopyAddress}
                      className="text-on-surface-variant hover:text-primary transition-colors focus:outline-none flex items-center gap-1 text-xs"
                    >
                      <span className="material-symbols-outlined text-[14px]">content_copy</span>
                      Copy
                    </button>
                  </div>
                  <span className="block text-sm text-primary font-semibold mt-1">{xlmBalance} XLM</span>
                  <span className="block text-xs text-on-surface-variant font-mono break-all mt-2">{userAddress}</span>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    onDisconnectWallet();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-error-container text-on-error-container py-3 rounded font-label-md text-sm uppercase tracking-wider hover:opacity-95 transition-opacity focus:outline-none"
                >
                  Disconnect Wallet
                </button>
              </div>
            ) : (
              <button 
                type="button"
                onClick={() => {
                  setShowWalletModal(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full bg-primary text-on-primary py-3 rounded font-label-md text-sm uppercase tracking-wider hover:opacity-95 transition-opacity focus:outline-none"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Wallet selector modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
          <div className="bg-surface border border-outline-variant/30 rounded-xl p-8 max-w-sm w-full vellum-card relative">
            <button 
              type="button"
              onClick={() => setShowWalletModal(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-primary p-1 focus:outline-none"
            >
              <span className="material-symbols-outlined block">close</span>
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
                  type="button"
                  onClick={() => handleWalletSelect(w.type)}
                  className="w-full text-left bg-surface-container-low hover:bg-surface-container border border-outline-variant/50 p-4 rounded flex items-center justify-between group transition-colors focus:outline-none"
                >
                  <div>
                    <span className="block font-label-md text-label-md font-bold text-on-surface group-hover:text-primary transition-colors">
                      {w.name}
                    </span>
                    <span className="block text-xs text-on-surface-variant mt-1 font-body-sm">
                      {w.desc}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors block">
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
