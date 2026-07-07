import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CreateElectionPage from '../pages/CreateElectionPage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../context/ToastContext';

// Mock the services
vi.mock('../services/stellar', () => ({
  getElections: vi.fn(() => Promise.resolve([])),
  buildCreateElectionTx: vi.fn(() => Promise.resolve('mocked_create_tx')),
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

describe('CreateElectionPage Component', () => {
  const defaultProps = {
    walletConnected: true,
    walletType: 'freighter' as const,
    userAddress: 'GBUGQ257P3NIKFYQA2CCYRZITB6JAVJTHI2XUCET5AHSREGS4UPX7L4J',
    onNavigate: vi.fn(),
  };

  it('renders the creation header', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <CreateElectionPage {...defaultProps} />
        </ToastProvider>
      </QueryClientProvider>
    );
    expect(screen.getByRole('heading', { name: 'Basic Information' })).toBeInTheDocument();
  });

  it('validates basic form inputs', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <CreateElectionPage {...defaultProps} />
        </ToastProvider>
      </QueryClientProvider>
    );
    
    const nextBtn = screen.getByText('Next');
    // Click next without filling details
    fireEvent.click(nextBtn);
    // Should stay on basic information
    expect(screen.getByRole('heading', { name: 'Basic Information' })).toBeInTheDocument();
  });

  it('allows filling title and description and going to step 2', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <CreateElectionPage {...defaultProps} />
        </ToastProvider>
      </QueryClientProvider>
    );

    const titleInput = screen.getByPlaceholderText('e.g. Protocol Upgrade Proposal Q4');
    const descInput = screen.getByPlaceholderText('Provide details about the election, voting criteria, and implications...');

    fireEvent.change(titleInput, { target: { value: 'New Test Proposal' } });
    fireEvent.change(descInput, { target: { value: 'Detailed description of test proposal' } });

    const nextBtn = screen.getByText('Next');
    fireEvent.click(nextBtn);

    // Should now show step 2: Candidates
    expect(screen.getByText('Candidates & Nominees')).toBeInTheDocument();
  });
});
