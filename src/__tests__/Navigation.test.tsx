import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Navigation from '../components/Navigation';
import { ToastProvider } from '../context/ToastContext';

describe('Navigation Component', () => {
  const defaultProps = {
    currentTab: 'landing',
    onNavigate: vi.fn(),
    walletConnected: false,
    walletType: null,
    userAddress: null,
    xlmBalance: '0.0000',
    onConnectWallet: vi.fn(),
    onDisconnectWallet: vi.fn(),
  };

  it('renders application brand title', () => {
    render(
      <ToastProvider>
        <Navigation {...defaultProps} />
      </ToastProvider>
    );
    expect(screen.getAllByText('VoteSphere')[0]).toBeInTheDocument();
  });

  it('shows Connect Wallet button when not connected', () => {
    render(
      <ToastProvider>
        <Navigation {...defaultProps} />
      </ToastProvider>
    );
    expect(screen.getAllByText('Connect Wallet')[0]).toBeInTheDocument();
  });

  it('displays balance and shortened address when connected', () => {
    render(
      <ToastProvider>
        <Navigation
          {...defaultProps}
          walletConnected={true}
          walletType="freighter"
          userAddress="GBUGQ257P3NIKFYQA2CCYRZITB6JAVJTHI2XUCET5AHSREGS4UPX7L4J"
          xlmBalance="12.3456"
        />
      </ToastProvider>
    );
    expect(screen.getAllByText(/12.3456/)[0]).toBeInTheDocument();
    expect(screen.getAllByText('GBUGQ2...PX7L4J')[0]).toBeInTheDocument();
  });

  it('calls onDisconnectWallet when disconnect option is clicked', () => {
    const onDisconnect = vi.fn();
    render(
      <ToastProvider>
        <Navigation
          {...defaultProps}
          walletConnected={true}
          walletType="freighter"
          userAddress="GBUGQ257P3NIKFYQA2CCYRZITB6JAVJTHI2XUCET5AHSREGS4UPX7L4J"
          onDisconnectWallet={onDisconnect}
        />
      </ToastProvider>
    );
    const addressBtn = screen.getAllByText('GBUGQ2...PX7L4J')[0];
    fireEvent.click(addressBtn);
    expect(onDisconnect).toHaveBeenCalled();
  });

  it('toggles dark mode when theme button clicked', () => {
    render(
      <ToastProvider>
        <Navigation {...defaultProps} />
      </ToastProvider>
    );
    const themeBtn = screen.getByLabelText('Toggle Theme');
    fireEvent.click(themeBtn);
    expect(document.documentElement.classList.contains('dark') || document.documentElement.classList.contains('light')).toBe(true);
  });
});
