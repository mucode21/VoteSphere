import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TxUtilityPage from '../pages/TxUtilityPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../context/ToastContext';

// Mock functions
vi.mock('../services/stellar', () => ({
  rpcServer: {
    getAccount: vi.fn(() => Promise.resolve({
      sequenceNumber: '1',
    })),
  },
  horizonServer: {
    submitTransaction: vi.fn(() => Promise.resolve({
      successful: true,
      hash: 'mocked_horizon_hash',
    })),
  },
  NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
}));

vi.mock('../wallet/wallet-service', () => ({
  signTx: vi.fn(() => Promise.resolve('mocked_signed_xdr')),
}));

vi.mock('../services/transactions/tx-manager', () => ({
  txManager: {
    executeTx: vi.fn((_name, _buildFn, _signFn, statusCb, _submitFn) => {
      statusCb('signing');
      statusCb('submitting');
      statusCb('success', undefined);
      return Promise.resolve('mocked_hash_value');
    }),
  },
}));

vi.mock('../state/store', () => ({
  useStore: () => ({
    transactions: [
      { id: '1', action: 'XLM Payment: 10 XLM to G...', status: 'success', hash: 'hash1', timestamp: Date.now() }
    ],
  }),
}));

const queryClient = new QueryClient();

describe('TxUtilityPage Component', () => {
  const defaultProps = {
    walletConnected: true,
    walletType: 'freighter' as const,
    userAddress: 'GBUGQ257P3NIKFYQA2CCYRZITB6JAVJTHI2XUCET5AHSREGS4UPX7L4J',
    xlmBalance: '100.0000',
    onRefreshBalance: vi.fn(),
  };

  it('renders input fields for payment transfer', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <TxUtilityPage {...defaultProps} />
        </ToastProvider>
      </QueryClientProvider>
    );

    expect(screen.getByPlaceholderText('G...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
  });

  it('displays transaction history records', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <TxUtilityPage {...defaultProps} />
        </ToastProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText('XLM Payment: 10 XLM to G...')).toBeInTheDocument();
  });
});
