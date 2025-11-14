/**
 * Memo Protocol - Solana Client
 * 
 * Initializes Anchor program client and provides utilities for Solana operations.
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';

// Import IDL directly
import idlJson from '../idl/memo.json';

// IDL for the Memo program
const idl = idlJson;

// Load IDL synchronously
async function loadIdl() {
  return idl;
}

// Program ID - will be set after deployment
const PROGRAM_ID = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');

/**
 * Initialize Solana connection
 *
 * @param {string} network - Network: 'devnet', 'mainnet-beta', or RPC URL
 * @returns {Connection} - Solana connection instance
 */
export function initConnection(network = 'mainnet-beta') {
  let rpcUrl;

  if (network === 'devnet') {
    rpcUrl = 'https://api.devnet.solana.com';
  } else if (network === 'mainnet-beta') {
    rpcUrl = 'https://mainnet.helius-rpc.com/?api-key=c32f1ad1-fdec-4254-bf8a-1d216158d467';
  } else {
    rpcUrl = network; // Assume it's a custom RPC URL
  }

  return new Connection(rpcUrl, 'confirmed');
}

/**
 * Initialize Anchor program
 *
 * @param {Connection} connection - Solana connection
 * @param {Wallet} wallet - Wallet adapter wallet
 * @returns {Program} - Anchor program instance
 */
export async function initProgram(connection, wallet) {
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const loadedIdl = await loadIdl();
  if (!loadedIdl) {
    throw new Error('IDL not found. Please build the program first: npm run anchor:build');
  }

  try {
    // Check if program exists on-chain
    const accountInfo = await connection.getAccountInfo(PROGRAM_ID);
    if (!accountInfo) {
      throw new Error(`Program not deployed. Deploy the program to mainnet first. Program ID: ${PROGRAM_ID.toString()}`);
    }

    const provider = new AnchorProvider(
      connection,
      wallet,
      { commitment: 'confirmed' }
    );

    return new Program(loadedIdl, PROGRAM_ID, provider);
  } catch (err) {
    console.error('Program initialization error:', err);
    throw err;
  }
}

/**
 * Derive PDA for user message counter
 * 
 * @param {PublicKey} userPubkey - User's public key
 * @param {PublicKey} programId - Program ID
 * @returns {Promise<[PublicKey, number]>} - [PDA, bump]
 */
export async function getMessageCounterPDA(userPubkey, programId = PROGRAM_ID) {
  const [pda, bump] = await PublicKey.findProgramAddress(
    [
      Buffer.from('memo'),
      Buffer.from('counter'),
      userPubkey.toBuffer(),
    ],
    programId
  );
  return [pda, bump];
}

/**
 * Derive PDA for user message index
 * 
 * @param {PublicKey} userPubkey - User's public key
 * @param {PublicKey} programId - Program ID
 * @returns {Promise<[PublicKey, number]>} - [PDA, bump]
 */
export async function getMessageIndexPDA(userPubkey, programId = PROGRAM_ID) {
  const [pda, bump] = await PublicKey.findProgramAddress(
    [
      Buffer.from('memo'),
      Buffer.from('index'),
      userPubkey.toBuffer(),
    ],
    programId
  );
  return [pda, bump];
}

/**
 * Derive PDA for message account
 * 
 * @param {PublicKey} senderPubkey - Sender's public key
 * @param {PublicKey} recipientPubkey - Recipient's public key
 * @param {number} counter - Message counter value
 * @param {PublicKey} programId - Program ID
 * @returns {Promise<[PublicKey, number]>} - [PDA, bump]
 */
export async function getMessagePDA(
  senderPubkey,
  recipientPubkey,
  counter,
  programId = PROGRAM_ID
) {
  const counterBuffer = Buffer.allocUnsafe(8);
  counterBuffer.writeBigUInt64LE(BigInt(counter), 0);

  const [pda, bump] = await PublicKey.findProgramAddress(
    [
      Buffer.from('memo'),
      senderPubkey.toBuffer(),
      recipientPubkey.toBuffer(),
      counterBuffer,
    ],
    programId
  );
  return [pda, bump];
}


