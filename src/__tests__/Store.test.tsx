import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../state/store';

describe('Zustand Global Store', () => {
  beforeEach(async () => {
    // Reset state before each test
    const store = useStore.getState();
    await store.disconnect();
    store.setTransactions([]);
  });

  it('initializes with disconnected wallet status', () => {
    const state = useStore.getState();
    expect(state.walletConnected).toBe(false);
    expect(state.walletType).toBeNull();
    expect(state.userAddress).toBeNull();
    expect(state.xlmBalance).toBe('0.0000');
  });

  it('updates state when connect is invoked', async () => {
    const store = useStore.getState();
    await store.connect('freighter');

    const state = useStore.getState();
    expect(state.walletConnected).toBe(true);
    expect(state.walletType).toBe('freighter');
    expect(state.userAddress).toBe('GBUGQ257P3NIKFYQA2CCYRZITB6JAVJTHI2XUCET5AHSREGS4UPX7L4J');
  });

  it('clears state on disconnect', async () => {
    const store = useStore.getState();
    await store.connect('freighter');
    await store.disconnect();

    const state = useStore.getState();
    expect(state.walletConnected).toBe(false);
    expect(state.walletType).toBeNull();
    expect(state.userAddress).toBeNull();
  });

  it('registers transactions and status transitions correctly', () => {
    const store = useStore.getState();
    
    // Add transaction
    const mockTxs = [
      { id: 'tx_id_1', action: 'Test Vote Casting', status: 'pending' as const, timestamp: Date.now() }
    ];
    store.setTransactions(mockTxs);
    let state = useStore.getState();
    expect(state.transactions.length).toBe(1);
    expect(state.transactions[0].id).toBe('tx_id_1');
    expect(state.transactions[0].status).toBe('pending');
  });
});
