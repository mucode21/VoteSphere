import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ElectionDetailsPage from '../pages/ElectionDetailsPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../context/ToastContext';

const mockElection = {
  id: 1,
  title: 'Test Election',
  description: 'Should we build this?',
  candidates: ['Option A', 'Option B'],
  end_time: Math.floor(Date.now() / 1000) + 3600,
  closed: false,
  result_contract: 'CADRSVZOA3KQQD6ZA5OJ2DFDI6TRQRC6LW4TXFZQ6YKPJZBU4DJBWIDH',
};

// Mock the services
vi.mock('../services/stellar', () => ({
  getElection: vi.fn(() => Promise.resolve(mockElection)),
  hasVoted: vi.fn(() => Promise.resolve(false)),
  getElectionResults: vi.fn(() => Promise.resolve([0, 0])),
  getElectionWinner: vi.fn(() => Promise.resolve(0)),
  buildCastVoteTx: vi.fn(() => Promise.resolve('mocked_cast_tx')),
  CONTRACT_REGISTRY_ID: 'CDDB4SGVCZVYNA2VOY4KTLWGR5VY6KFUVWD4S7A23NA4COQBP4QPH74M',
  CONTRACT_VOTING_ID: 'CD2QP33BUWEMLWTEYV6XTDE56P5TJQC2VMGUN5C36OL3BHMLL6EZSILD',
  CONTRACT_RESULTS_ID: 'CADRSVZOA3KQQD6ZA5OJ2DFDI6TRQRC6LW4TXFZQ6YKPJZBU4DJBWIDH',
}));

vi.mock('../wallet/wallet-service', () => ({
  signTx: vi.fn(() => Promise.resolve('mocked_signed_tx')),
}));

vi.mock('../services/transactions/tx-manager', () => ({
  txManager: {
    executeTx: vi.fn(() => Promise.resolve('mocked_hash')),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('ElectionDetailsPage Component', () => {
  const defaultProps = {
    electionId: 1,
    walletConnected: true,
    walletType: 'freighter' as const,
    userAddress: 'GBUGQ257P3NIKFYQA2CCYRZITB6JAVJTHI2XUCET5AHSREGS4UPX7L4J',
    onNavigate: vi.fn(),
  };

  it('renders election title and candidates list', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ElectionDetailsPage {...defaultProps} />
        </ToastProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Election')).toBeInTheDocument();
      expect(screen.getByText('Should we build this?')).toBeInTheDocument();
    });

    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
  });

  it('renders voting buttons when wallet connected', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ElectionDetailsPage {...defaultProps} />
        </ToastProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Vote for Candidate 1')).toBeInTheDocument();
    });
  });
});
