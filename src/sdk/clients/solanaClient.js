/**
 * Memo Protocol - Solana Client
 * 
 * Initializes Anchor program client and provides utilities for Solana operations.
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { PublicKey as AnchorPublicKey } from '@coral-xyz/anchor';

// IDL will be generated when program is built
// We'll use a dynamic import that can fail gracefully
// The IDL should be copied to src/sdk/idl/ after building, or accessed from target/
let idl = null;

// Try to load IDL - this will be set up after program build
// In production, the IDL should be bundled or loaded dynamically
async function loadIdl() {
  if (idl) return idl;
  
  try {
    // Try to import from target directory (development)
    const idlModule = await import('../../../../target/idl/memo.json');
    idl = idlModule.default || idlModule;
    return idl;
  } catch (err) {
    console.warn('IDL not found. Make sure to build the program first: npm run anchor:build');
    return null;
  }
}

// Program ID - will be set after deployment
const PROGRAM_ID = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');

/**
 * Get the $MEMO token mint address from the program
 * This should be set after initialize_mint is called
 * 
 * @param {Program} program - Anchor program instance
 * @returns {Promise<PublicKey|null>} - Memo mint address or null if not initialized
 */
export async function getMemoMintAddress(program) {
  try {
    const [mintConfigPDA] = await PublicKey.findProgramAddress(
      [Buffer.from('memo'), Buffer.from('mint')],
      program.programId
    );
    
    const mintConfig = await program.account.memoTokenMint.fetch(mintConfigPDA);
    
    if (mintConfig.initialized) {
      return new PublicKey(mintConfig.mint);
    }
    
    return null;
  } catch (err) {
    console.warn('Failed to fetch memo mint:', err);
    return null;
  }
}

/**
 * Initialize Solana connection
 * 
 * @param {string} network - Network: 'devnet', 'mainnet-beta', or RPC URL
 * @returns {Connection} - Solana connection instance
 */
export function initConnection(network = 'devnet') {
  const rpcUrl = network === 'devnet' 
    ? 'https://api.devnet.solana.com'
    : network === 'mainnet-beta'
    ? 'https://api.mainnet-beta.solana.com'
    : network; // Assume it's a custom RPC URL
  
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

  const provider = new AnchorProvider(
    connection,
    wallet,
    { commitment: 'confirmed' }
  );

  return new Program(loadedIdl, PROGRAM_ID, provider);
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

/**
 * Convert Anchor PublicKey to Solana PublicKey
 */
export function anchorToSolanaPubkey(anchorPubkey) {
  if (anchorPubkey instanceof PublicKey) {
    return anchorPubkey;
  }
  return new PublicKey(anchorPubkey.toBase58());
}

/**
 * Convert Solana PublicKey to Anchor PublicKey
 */
export function solanaToAnchorPubkey(solanaPubkey) {
  if (solanaPubkey instanceof AnchorPublicKey) {
    return solanaPubkey;
  }
  return new AnchorPublicKey(solanaPubkey.toBase58());
}

