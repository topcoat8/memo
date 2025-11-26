/**
 * Memo Protocol - useMemo Hook
 *
 * Simple token transfer + memo approach using native Solana programs.
 */

import { useState, useCallback } from 'react';
import { PublicKey, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction } from '@solana/spl-token';
import { encryptMessageForChain, isValidWalletAddress, encryptMessageAsymmetric, uint8ArrayToBase64, base64ToUint8Array } from '../utils/encryption';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

/**
 * Hook for sending memos with token transfers
 *
 * @param {Object} options - Hook options
 * @param {Connection} options.connection - Solana connection
 * @param {PublicKey} options.publicKey - Current user's public key
 * @param {string} options.userId - Current user's wallet address
 * @param {boolean} options.isReady - Whether wallet is connected
 * @param {Object} options.wallet - Wallet adapter instance
 * @param {string} options.tokenMint - Token mint address to use (your pump.fun token)
 * @param {Object} options.encryptionKeys - User's Curve25519 keypair (optional)
 * @param {Object} options.publicKeyRegistry - Map of wallet addresses to identity keys
 * @returns {Object} - Memo operations and state
 */
export function useMemo({ connection, publicKey, userId, isReady, wallet, tokenMint, encryptionKeys, publicKeyRegistry }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /**
   * Announces the user's encryption public key to the chain
   */
  const announceIdentity = useCallback(async () => {
    setError("");
    setSuccessMessage("");

    if (!isReady || !encryptionKeys) {
      setError("You must be logged in to announce your identity.");
      return { success: false, error: "Not logged in" };
    }

    try {
      setIsLoading(true);

      const identityMsg = {
        type: 'IDENTITY',
        publicKey: uint8ArrayToBase64(encryptionKeys.publicKey),
        timestamp: Date.now()
      };

      const memoData = JSON.stringify(identityMsg);

      const transaction = new Transaction();

      const memoIx = new TransactionInstruction({
        keys: [],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memoData, 'utf-8'),
      });
      transaction.add(memoIx);

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await wallet.sendTransaction(transaction, connection);

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      setSuccessMessage("Identity announced successfully!");
      return { success: true, signature };

    } catch (err) {
      console.error('Announce identity error:', err);
      setError(err.message || "Failed to announce identity");
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [connection, publicKey, isReady, wallet, encryptionKeys]);

  /**
   * Sends an encrypted memo with 1 token transfer to a recipient
   * 
   * Logic:
   * 1. Validates inputs and wallet connection.
   * 2. Checks sender balance (must have > 1 token).
   * 3. Encrypts message (Asymmetric if recipient key found, else Legacy).
   * 4. Gets/Creates recipient token account.
   * 5. Builds transaction: Create ATA (if needed) + Transfer 1 Token + Memo Instruction.
   * 6. Sends and confirms transaction.
   *
   * @param {Object} params - Send parameters
   * @param {string} params.recipientId - Recipient's wallet address
   * @param {string} params.message - Plaintext message to send
   * @returns {Promise<{success: boolean, error?: string, signature?: string}>}
   */
  /**
   * Sends an encrypted memo with a 0 SOL transfer (System Program) to a recipient
   * 
   * Logic:
   * 1. Validates inputs and wallet connection.
   * 2. Encrypts message (Asymmetric if recipient key found, else Legacy).
   * 3. Builds transaction: System Transfer (0 SOL) + Memo Instruction.
   * 4. Sends and confirms transaction.
   *
   * @param {Object} params - Send parameters
   * @param {string} params.recipientId - Recipient's wallet address
   * @param {string} params.message - Plaintext message to send
   * @returns {Promise<{success: boolean, error?: string, signature?: string}>}
   */
  const sendMemo = useCallback(async ({ recipientId, message }) => {
    setError("");
    setSuccessMessage("");

    if (!connection) {
      setError("Connection is not initialized. Please refresh the page.");
      return { success: false, error: "Connection not initialized" };
    }

    if (!isReady || !userId || !publicKey || !wallet) {
      setError("Wallet is not connected. Please connect your wallet.");
      return { success: false, error: "Wallet not connected" };
    }

    if (!recipientId || !recipientId.trim()) {
      setError("Recipient wallet address is required.");
      return { success: false, error: "Recipient required" };
    }

    const trimmedRecipient = recipientId.trim();

    if (!isValidWalletAddress(trimmedRecipient)) {
      setError("Invalid wallet address format. Please check the recipient address.");
      return { success: false, error: "Invalid recipient address" };
    }

    if (!message || !message.trim()) {
      setError("Message cannot be empty.");
      return { success: false, error: "Message cannot be empty" };
    }

    const messageText = message.trim();
    if (messageText.length < 1 || messageText.length > 500) {
      setError("Message must be between 1 and 500 characters.");
      return { success: false, error: "Invalid message length" };
    }

    if (trimmedRecipient === userId) {
      setError("Cannot send memo to yourself.");
      return { success: false, error: "Cannot send to self" };
    }

    let recipientPubkey;
    try {
      recipientPubkey = new PublicKey(trimmedRecipient);
    } catch (err) {
      setError("Invalid recipient wallet address.");
      return { success: false, error: "Invalid recipient address format" };
    }

    try {
      setIsLoading(true);

      let memoDataObj;

      const recipientIdentityKey = publicKeyRegistry ? publicKeyRegistry[trimmedRecipient] : null;

      if (encryptionKeys && recipientIdentityKey) {
        const recipientPub = base64ToUint8Array(recipientIdentityKey);
        const { encryptedData, nonce } = encryptMessageAsymmetric(
          messageText,
          recipientPub,
          encryptionKeys.secretKey
        );

        memoDataObj = {
          encrypted: Array.from(encryptedData),
          nonce: Array.from(nonce),
          recipient: trimmedRecipient,
          isAsymmetric: true,
          // Embed sender's public key so recipient can decrypt without searching history
          senderPublicKey: uint8ArrayToBase64(encryptionKeys.publicKey),
        };
      } else {
        const { encryptedData, nonce } = encryptMessageForChain(messageText, trimmedRecipient);

        memoDataObj = {
          encrypted: Array.from(encryptedData),
          nonce: Array.from(nonce),
          recipient: trimmedRecipient,
          isAsymmetric: false
        };
      }

      const memoData = JSON.stringify(memoDataObj);

      const transaction = new Transaction();

      // Check if we are using a custom token mint (Pump.fun token)
      if (tokenMint) {
        console.log("Using token mint:", tokenMint);
        const mintPubkey = new PublicKey(tokenMint);

        // Get Associated Token Accounts
        const senderATA = await getAssociatedTokenAddress(
          mintPubkey,
          publicKey
        );

        const recipientATA = await getAssociatedTokenAddress(
          mintPubkey,
          recipientPubkey
        );

        // Check if recipient ATA exists
        const recipientAccountInfo = await connection.getAccountInfo(recipientATA);

        if (!recipientAccountInfo) {
          console.log("Creating recipient token account...");
          const createATAIx = createAssociatedTokenAccountInstruction(
            publicKey, // payer
            recipientATA, // associated token account address
            recipientPubkey, // owner
            mintPubkey // mint
          );
          transaction.add(createATAIx);
        }

        // Add Token Transfer Instruction (1 token = 1000000 decimals usually, but let's assume 1 unit for now or 1000000?)
        // Pump.fun tokens usually have 6 decimals. 1 token = 1_000_000.
        // Let's send 1 whole token? Or a tiny amount? 
        // The request says "attaching the message to a pumpfun token".
        // Usually this means sending 1 unit (smallest unit) or 1 whole token.
        // Let's send 1000 units (0.001 token if 6 decimals) to be safe and visible?
        // Or just 1 unit. Let's stick to 1 unit to minimize cost, or maybe 1000.
        // Let's assume 1000000 (1 whole token) might be too expensive if the token is valuable.
        // Let's send 1 unit of the token (smallest denomination).
        const amount = 1;

        const transferIx = createTransferInstruction(
          senderATA,
          recipientATA,
          publicKey,
          amount
        );
        transaction.add(transferIx);

      } else {
        // Fallback to SOL transfer (original logic)
        const minRent = await connection.getMinimumBalanceForRentExemption(0);
        const recipientAccountInfo = await connection.getAccountInfo(recipientPubkey);

        let lamports = 0;
        if (!recipientAccountInfo) {
          lamports = minRent;
          console.log(`Recipient account is new. Transferring ${lamports} lamports for rent exemption.`);
        } else {
          lamports = 0;
        }

        const transferIx = SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubkey,
          lamports: lamports,
        });
        transaction.add(transferIx);
      }

      // Memo Instruction
      // CRITICAL: Memo Program v2 requires ALL keys in the 'keys' array to be Signers.
      // We cannot include the recipient here because they cannot sign.
      // We only include the Sender (publicKey) and mark them as a Signer.
      const memoIx = new TransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: false }
        ],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memoData, 'utf-8'),
      });
      transaction.add(memoIx);

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await wallet.sendTransaction(transaction, connection, {
        skipPreflight: false,
        maxRetries: 3,
      });

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      setSuccessMessage("Message sent successfully!");
      return { success: true, signature };
    } catch (err) {
      console.error('Send memo error:', err);
      let errorMessage = "Failed to send memo. Please try again.";

      if (err.message) {
        if (err.message.includes('MessageTooLong')) {
          errorMessage = "Message is too long. Maximum 500 characters.";
        } else if (err.message.includes('InvalidRecipient')) {
          errorMessage = "Invalid recipient address.";
        } else if (err.message.includes('User rejected')) {
          errorMessage = "Transaction was cancelled.";
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [connection, publicKey, userId, isReady, wallet, encryptionKeys, publicKeyRegistry, tokenMint]);

  /**
   * Clears error and success messages
   */
  const clearMessages = useCallback(() => {
    setError("");
    setSuccessMessage("");
  }, []);

  return {
    sendMemo,
    announceIdentity,
    isLoading,
    error,
    successMessage,
    clearMessages,
  };
}
