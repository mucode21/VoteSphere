import albedo from 'albedo';
import { isConnected as checkFreighter, getAddress, signTransaction as signFreighterTransaction } from '@stellar/freighter-api';
import { Networks } from '@stellar/stellar-sdk';

export type WalletType = 'freighter' | 'albedo' | 'xbull';

export interface WalletState {
  connected: boolean;
  walletType: WalletType | null;
  publicKey: string | null;
  balance: string;
}

export const connectWallet = async (type: WalletType): Promise<string> => {
  if (type === 'freighter') {
    const status = await checkFreighter();
    if (!status || !status.isConnected) {
      throw new Error('Freighter wallet extension is not installed or locked');
    }
    const res = await getAddress();
    if (!res || !res.address) {
      throw new Error(res?.error || 'Could not retrieve public key from Freighter');
    }
    return res.address;
  } else if (type === 'albedo') {
    const res = await albedo.publicKey({
      token: 'VoteSphere Session'
    });
    if (!res.pubkey) {
      throw new Error('Could not retrieve public key from Albedo');
    }
    return res.pubkey;
  } else if (type === 'xbull') {
    const xBull = (window as any).xBull;
    if (!xBull) {
      throw new Error('xBull wallet extension is not installed or locked');
    }
    const pubKey = await xBull.getPublicKey();
    if (!pubKey) {
      throw new Error('Could not retrieve public key from xBull');
    }
    return pubKey;
  }
  throw new Error('Unsupported wallet type');
};

export const signTx = async (
  type: WalletType,
  xdr: string,
  publicKey: string,
  network: 'TESTNET'
): Promise<string> => {
  if (type === 'freighter') {
    const res = await signFreighterTransaction(xdr, {
      networkPassphrase: network === 'TESTNET' ? Networks.TESTNET : Networks.PUBLIC
    });
    if (!res || !res.signedTxXdr) {
      throw new Error(res?.error || 'Freighter failed to sign transaction');
    }
    return res.signedTxXdr;
  } else if (type === 'albedo') {
    const res = await albedo.tx({
      xdr,
      network: 'testnet'
    });
    if (!res.signed_envelope) {
      throw new Error('Albedo failed to sign transaction');
    }
    return res.signed_envelope;
  } else if (type === 'xbull') {
    const xBull = (window as any).xBull;
    if (!xBull) {
      throw new Error('xBull is not available');
    }
    const signedXdr = await xBull.sign({
      xdr,
      network: 'testnet',
      publicKey
    });
    if (!signedXdr) {
      throw new Error('xBull failed to sign transaction');
    }
    return signedXdr;
  }
  throw new Error('Unsupported wallet type');
};
