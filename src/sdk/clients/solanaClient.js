/**
 * Memo Protocol - Solana Client
 * 
 * Initializes Solana connection and provides utilities for interacting with 
 * Solana's native Memo program for encrypted message storage.
 */

import { Connection, TransactionInstruction, Transaction } from '@solana/web3.js';
import { MEMO_PROGRAM_ID, DEFAULT_RPC_URL, DEVNET_RPC_URL } from '../constants';

/**
 * Initialize Solana connection
 *
 * @param {string} network - Network: 'devnet', 'mainnet-beta', or RPC URL
 * @returns {Connection} - Solana connection instance
 */
export function initConnection(network = 'mainnet-beta') {
  let rpcUrl;

  if (network === 'devnet') {
    rpcUrl = DEVNET_RPC_URL;
  } else if (network === 'mainnet-beta') {
    rpcUrl = DEFAULT_RPC_URL;
  } else {
    rpcUrl = network; // Assume it's a custom RPC URL
  }

  return new Connection(rpcUrl, 'confirmed');
}

/**
 * Send encrypted memo on-chain using Solana's native Memo program
 *
 * @param {Connection} connection - Solana connection
 * @param {Keypair} payer - Payer keypair
 * @param {string} encryptedData - Base64 encoded encrypted message
 * @returns {Promise<string>} - Transaction signature
 */
export async function sendMemoTransaction(connection, payer, encryptedData) {
  if (!payer) {
    throw new Error('Payer keypair required');
  }

  try {
    // Create memo instruction with encrypted data
    const memoInstruction = new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(encryptedData, 'utf-8'),
    });

    // Create transaction
    const transaction = new Transaction().add(memoInstruction);

    // Set recent blockhash
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer.publicKey;

    // Sign transaction
    transaction.sign(payer);

    // Send transaction
    const signature = await connection.sendRawTransaction(transaction.serialize());

    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');

    return signature;
  } catch (err) {
    console.error('Error sending memo transaction:', err);
    throw err;
  }
}

/**
 * Get memo transactions for a wallet
 *
 * @param {Connection} connection - Solana connection
 * @param {PublicKey} walletPubkey - Wallet public key
 * @param {number} limit - Number of transactions to fetch
 * @returns {Promise<Array>} - Array of memo transactions
 */
export async function getMemoTransactions(connection, walletPubkey, limit = 100) {
  try {
    const signatures = await connection.getSignaturesForAddress(walletPubkey, { limit });

    const transactions = await Promise.all(
      signatures.map(async (sig) => {
        const tx = await connection.getTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });
        return tx;
      })
    );

    // Filter for memo program transactions
    return transactions.filter(tx =>
      tx && tx.transaction.message.instructions.some(
        ix => ix.programId.toString() === MEMO_PROGRAM_ID.toString()
      )
    );
  } catch (err) {
    console.error('Error fetching memo transactions:', err);
    throw err;
  }
}


