import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';
import { AlbedoModule, ALBEDO_ID } from '@creit.tech/stellar-wallets-kit/modules/albedo';
import { FreighterModule, FREIGHTER_ID } from '@creit.tech/stellar-wallets-kit/modules/freighter';
import { xBullModule, XBULL_ID } from '@creit.tech/stellar-wallets-kit/modules/xbull';
import { Networks } from '@creit.tech/stellar-wallets-kit/types';

export type WalletType = 'freighter' | 'albedo' | 'xbull';

export interface WalletState {
  connected: boolean;
  walletType: WalletType | null;
  publicKey: string | null;
  balance: string;
}

// Initialize StellarWalletsKit static configuration exactly once
if (!(globalThis as any).__stellar_wallets_kit_initialized__) {
  StellarWalletsKit.init({
    modules: [
      new FreighterModule(),
      new AlbedoModule(),
      new xBullModule()
    ],
    network: Networks.TESTNET
  });
  (globalThis as any).__stellar_wallets_kit_initialized__ = true;
}

/**
 * Maps our custom wallet identifier string to Creit-Tech Kit IDs
 */
function getKitWalletId(type: WalletType): string {
  switch (type) {
    case 'freighter':
      return FREIGHTER_ID;
    case 'albedo':
      return ALBEDO_ID;
    case 'xbull':
      return XBULL_ID;
    default:
      throw new Error(`Unsupported wallet type: ${type}`);
  }
}

/**
 * Connects to a wallet extension, requests authorization/address, and returns public key
 */
export const connectWallet = async (type: WalletType): Promise<string> => {
  const walletId = getKitWalletId(type);
  
  try {
    StellarWalletsKit.setWallet(walletId);
    StellarWalletsKit.setNetwork(Networks.TESTNET);

    // Call fetchAddress which prompts connection/permissions
    const { address } = await StellarWalletsKit.fetchAddress();
    if (!address) {
      throw new Error('No address was returned from the wallet module.');
    }

    // Persist session
    localStorage.setItem('connected_wallet_type', type);
    localStorage.setItem('connected_wallet_address', address);

    return address;
  } catch (err: any) {
    console.error('Wallet connection failed:', err);
    
    // Parse error string to provide friendly message
    const msg = err.message || '';
    if (msg.includes('User reject') || msg.includes('cancelled') || msg.includes('declined')) {
      throw new Error('Wallet connection request was rejected by the user.');
    } else if (msg.includes('not installed') || msg.includes('missing')) {
      throw new Error(`The selected wallet extension (${type}) is not installed or enabled.`);
    } else if (msg.includes('locked') || msg.includes('unlock')) {
      throw new Error('The wallet is locked. Please unlock it and try again.');
    }
    
    throw new Error(err.message || 'An unexpected error occurred during wallet connection.');
  }
};

/**
 * Disconnects the wallet and clears persisted session state
 */
export const disconnectWallet = async (): Promise<void> => {
  try {
    await StellarWalletsKit.disconnect();
  } catch (e) {
    console.warn('StellarWalletsKit disconnect failed:', e);
  }
  localStorage.removeItem('connected_wallet_type');
  localStorage.removeItem('connected_wallet_address');
};

/**
 * Recovers connected wallet session from storage if it exists
 */
export const tryAutoConnect = async (): Promise<{ type: WalletType; address: string } | null> => {
  const savedType = localStorage.getItem('connected_wallet_type') as WalletType | null;
  const savedAddress = localStorage.getItem('connected_wallet_address');
  
  if (savedType && savedAddress) {
    try {
      const address = await connectWallet(savedType);
      if (address === savedAddress) {
        return { type: savedType, address };
      }
    } catch (e) {
      console.warn('Session auto-connect recovery failed:', e);
      // Clean stale session
      localStorage.removeItem('connected_wallet_type');
      localStorage.removeItem('connected_wallet_address');
    }
  }
  return null;
};

/**
 * Signs a transaction XDR string using the selected wallet
 */
export const signTx = async (
  type: WalletType,
  xdr: string,
  publicKey: string,
  _network: 'TESTNET'
): Promise<string> => {
  const walletId = getKitWalletId(type);
  
  try {
    StellarWalletsKit.setWallet(walletId);
    StellarWalletsKit.setNetwork(Networks.TESTNET);

    const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
      address: publicKey,
      networkPassphrase: Networks.TESTNET
    });

    if (!signedTxXdr) {
      throw new Error('The wallet returned an empty signed XDR.');
    }
    return signedTxXdr;
  } catch (err: any) {
    console.error('Signing transaction failed:', err);
    
    const msg = err.message || '';
    if (msg.includes('reject') || msg.includes('cancel') || msg.includes('declined')) {
      throw new Error('Transaction signing was rejected by the user.');
    }
    throw new Error(err.message || 'Failed to sign transaction.');
  }
};

/**
 * Verifies if the wallet session matches the expected address
 */
export const verifySession = async (type: WalletType, expectedAddress: string): Promise<boolean> => {
  try {
    const walletId = getKitWalletId(type);
    StellarWalletsKit.setWallet(walletId);
    StellarWalletsKit.setNetwork(Networks.TESTNET);

    const { address } = await StellarWalletsKit.getAddress();
    return address === expectedAddress;
  } catch (e) {
    console.error('Session verification failed:', e);
    return false;
  }
};
