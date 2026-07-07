import { useEffect } from 'react';
import { useStore } from '../state/store';
import Button from './Button';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OnboardingModal = ({ isOpen, onClose }: OnboardingModalProps) => {
  const { onboardingCompleted, setOnboardingCompleted } = useStore();

  // Keyboard accessibility
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleComplete = () => {
    setOnboardingCompleted(true);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="vellum-card max-w-2xl w-full p-6 md:p-10 rounded-lg shadow-2xl relative border border-outline-variant max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface p-2 focus:outline-none"
          aria-label="Close onboarding tour"
        >
          <span className="material-symbols-outlined block">close</span>
        </button>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-primary animate-bounce">how_to_vote</span>
            <div>
              <h1 id="onboarding-title" className="font-headline-md text-headline-md text-on-surface">
                Welcome to VoteSphere
              </h1>
              <p className="text-sm font-label-sm text-outline uppercase tracking-wider">
                Decentralized Blockchain Governance
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="p-4 rounded bg-surface-container border border-outline-variant/30">
              <h3 className="font-title-sm text-title-sm text-primary mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">shield</span>
                What is VoteSphere?
              </h3>
              <p className="text-body-sm text-on-surface-variant leading-relaxed">
                VoteSphere is a decentralized voting and governance platform running on Stellar's Soroban smart contract framework. It makes all election parameters, candidates, ballots, and results completely tamper-proof and verifiable.
              </p>
            </div>

            <div className="p-4 rounded bg-surface-container border border-outline-variant/30">
              <h3 className="font-title-sm text-title-sm text-primary mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                How to Get Started
              </h3>
              <p className="text-body-sm text-on-surface-variant leading-relaxed">
                To vote or create elections on the Stellar Testnet, you need a compatible non-custodial browser wallet with Testnet access enabled.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-outline-variant/30">
            <h3 className="font-title-sm text-title-sm text-on-surface">Guided Wallet Setup</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 rounded border border-outline-variant/30 bg-surface-container-low text-center">
                <span className="font-bold text-sm block mb-1 text-primary">Freighter</span>
                <p className="text-xs text-on-surface-variant">Install extension, enable experimental features, and toggle network to Testnet.</p>
              </div>
              <div className="p-3 rounded border border-outline-variant/30 bg-surface-container-low text-center">
                <span className="font-bold text-sm block mb-1 text-primary">Albedo</span>
                <p className="text-xs text-on-surface-variant">Simple browser-based keys. Prompts automatically configure network context.</p>
              </div>
              <div className="p-3 rounded border border-outline-variant/30 bg-surface-container-low text-center">
                <span className="font-bold text-sm block mb-1 text-primary">xBull</span>
                <p className="text-xs text-on-surface-variant">Advanced control. Add Stellar Testnet node custom configurations manually.</p>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer font-label-md text-label-md text-on-surface-variant">
              <input 
                type="checkbox"
                checked={onboardingCompleted}
                onChange={(e) => setOnboardingCompleted(e.target.checked)}
                className="rounded border-outline bg-surface-container focus:ring-primary focus:ring-offset-background"
              />
              Do not show this tour again on startup
            </label>
            <Button
              type="button"
              onClick={handleComplete}
              className="btn-primary px-8 py-3 rounded font-label-sm text-label-sm uppercase focus:outline-none"
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
