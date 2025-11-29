import { PublicKey } from '@solana/web3.js';

// Memo Program v2
export const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

// RPC Configuration
// RPC Configuration
export const DEFAULT_RPC_URL = import.meta.env.VITE_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
export const DEVNET_RPC_URL = 'https://api.devnet.solana.com';

// Time Constants
export const THREE_DAYS_IN_SECONDS = 3 * 24 * 60 * 60;

export const COMMUNITY_ADDRESS = "2MrU8dyXkPay3cUy134no7u7dqj9Ftssf1nuYcBx7B37";
