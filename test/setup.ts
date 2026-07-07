import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true,
});

// Mock LocalStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock Stellar SDK and Wallet Kit
vi.mock('@stellar/stellar-sdk', () => ({
  TransactionBuilder: {
    fromXDR: vi.fn(() => ({
      build: vi.fn(),
      toXDR: vi.fn(() => 'mocked_xdr'),
    })),
  },
  Networks: {
    TESTNET: 'Test SDF Network ; September 2015',
  },
  Address: {
    fromString: vi.fn((addr) => ({
      toScVal: vi.fn(),
    })),
  },
  scValToNative: vi.fn(),
  Contract: vi.fn(() => ({
    call: vi.fn(),
  })),
  xdr: {
    ScVal: {
      scvU32: vi.fn(),
      scvString: vi.fn(),
      scvVec: vi.fn(),
      scvU64: vi.fn(),
    },
    Uint64: vi.fn(),
  },
  TimeoutInfinite: 0,
  Horizon: {
    Server: vi.fn(() => ({
      submitTransaction: vi.fn(() => Promise.resolve({ successful: true, hash: 'mocked_horizon_hash' })),
    })),
  },
  rpc: {
    Server: vi.fn(() => ({
      getAccount: vi.fn(() => Promise.resolve({
        sequenceNumber: '1',
        id: vi.fn(() => 'GBUGQ257P3NIKFYQA2CCYRZITB6JAVJTHI2XUCET5AHSREGS4UPX7L4J'),
      })),
      getTransaction: vi.fn(),
      getEvents: vi.fn(() => Promise.resolve({
        events: [],
      })),
    })),
  },
  Account: vi.fn(() => ({
    sequenceNumber: '1',
  })),
  Operation: {
    payment: vi.fn(),
  },
  Asset: {
    native: vi.fn(),
  },
}));

vi.mock('@creit.tech/stellar-wallets-kit', () => {
  return {
    StellarWalletsKit: {
      init: vi.fn(),
      setWallet: vi.fn(),
      setNetwork: vi.fn(),
      fetchAddress: vi.fn(() => Promise.resolve({ address: 'GBUGQ257P3NIKFYQA2CCYRZITB6JAVJTHI2XUCET5AHSREGS4UPX7L4J' })),
      disconnect: vi.fn(() => Promise.resolve()),
      signTransaction: vi.fn(() => Promise.resolve({ signedTxXdr: 'mocked_signed_xdr' })),
      getAddress: vi.fn(() => Promise.resolve({ address: 'GBUGQ257P3NIKFYQA2CCYRZITB6JAVJTHI2XUCET5AHSREGS4UPX7L4J' })),
    },
    FreighterModule: vi.fn(),
    AlbedoModule: vi.fn(),
    xBullModule: vi.fn(),
    ALBEDO_ID: 'albedo',
    FREIGHTER_ID: 'freighter',
    XBULL_ID: 'xbull',
    Networks: {
      TESTNET: 'TESTNET',
    },
  };
});

vi.mock('@creit.tech/stellar-wallets-kit/modules/albedo', () => ({
  AlbedoModule: vi.fn(),
  ALBEDO_ID: 'albedo',
}));

vi.mock('@creit.tech/stellar-wallets-kit/modules/freighter', () => ({
  FreighterModule: vi.fn(),
  FREIGHTER_ID: 'freighter',
}));

vi.mock('@creit.tech/stellar-wallets-kit/modules/xbull', () => ({
  xBullModule: vi.fn(),
  XBULL_ID: 'xbull',
}));

vi.mock('@creit.tech/stellar-wallets-kit/types', () => ({
  Networks: {
    TESTNET: 'TESTNET',
  },
}));

// Mock Sentry
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));
