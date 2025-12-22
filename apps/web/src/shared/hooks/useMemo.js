/**
 * Memo Protocol - useMemo Hook
 *
 * Simple token transfer + memo approach using native Solana programs.
 */

import { useState, useCallback } from 'react';
import { PublicKey, Transaction, TransactionInstruction, SystemProgram, ComputeBudgetProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountIdempotentInstruction, createTransferInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { Buffer } from 'buffer';
import { encryptMessageForChain, isValidWalletAddress, encryptMessageAsymmetric, uint8ArrayToBase64, base64ToUint8Array } from '../utils/encryption';
import { MEMO_PROGRAM_ID } from '../constants';

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
   * @param {boolean} [params.forceLegacy] - Force legacy symmetric encryption (for public chats)
   * @returns {Promise<{success: boolean, error?: string, signature?: string}>}
   */
  const sendMemo = useCallback(async ({ recipientId, message, forceLegacy = false, tokenMint: overrideTokenMint }) => {
    // Determine which token mint to use (if any)
    // If overrideTokenMint is explicitly passed (even null), use it. Otherwise fallback to context tokenMint.
    const effectiveTokenMint = overrideTokenMint !== undefined ? overrideTokenMint : tokenMint;
    setError("");
    setSuccessMessage("");
    console.log("DEBUG: sendMemo called", { recipientId, message, forceLegacy });

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
      console.log("DEBUG: Starting transaction build");

      let memoDataObj;

      const recipientIdentityKey = publicKeyRegistry ? publicKeyRegistry[trimmedRecipient] : null;

      // If forceLegacy is true, we skip asymmetric encryption even if keys are available.
      // This is used for public community chats where we want the message to be decryptable by anyone who knows the address.
      if (!forceLegacy && encryptionKeys && recipientIdentityKey) {
        const recipientPub = base64ToUint8Array(recipientIdentityKey);
        const { encryptedData, nonce } = encryptMessageAsymmetric(
          messageText,
          recipientPub,
          encryptionKeys.secretKey
        );

        memoDataObj = {
          encrypted: uint8ArrayToBase64(encryptedData),
          nonce: uint8ArrayToBase64(nonce),
          recipient: trimmedRecipient,
          isAsymmetric: true,
          senderPublicKey: uint8ArrayToBase64(encryptionKeys.publicKey),
        };
      } else {
        const { encryptedData, nonce } = encryptMessageForChain(messageText, trimmedRecipient);

        memoDataObj = {
          encrypted: uint8ArrayToBase64(encryptedData),
          nonce: uint8ArrayToBase64(nonce),
          recipient: trimmedRecipient,
          isAsymmetric: false
        };
      }

      const memoData = JSON.stringify(memoDataObj);
      console.log("DEBUG: Memo data prepared", memoData);

      const transaction = new Transaction();

      // Add Compute Budget instructions for better reliability
      const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1000
      });
      const computeLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
        units: 200000
      });
      transaction.add(priorityFeeIx);
      transaction.add(computeLimitIx);

      if (effectiveTokenMint) {
        console.log("DEBUG: Using token mint", effectiveTokenMint);
        const mintPubkey = new PublicKey(effectiveTokenMint);

        // Use Token-2022 Program ID directly as requested
        const tokenProgramId = TOKEN_2022_PROGRAM_ID;

        const senderATA = await getAssociatedTokenAddress(
          mintPubkey,
          publicKey,
          false,
          tokenProgramId
        );

        console.log('Debug - Token Mint:', effectiveTokenMint);
        console.log('Debug - Sender Public Key:', publicKey.toString());
        console.log('Debug - Derived Sender ATA:', senderATA.toString());
        console.log('Debug - Token Program ID:', tokenProgramId.toString());

        const recipientATA = await getAssociatedTokenAddress(
          mintPubkey,
          recipientPubkey,
          false,
          tokenProgramId
        );

        // Always add the idempotent ATA creation instruction.
        // 1. It ensures the recipient's Main Wallet address is included in the transaction keys (as the owner).
        //    This guarantees the transaction is indexed for the recipient and visible in their inbox.
        // 2. It handles ATA creation if it doesn't exist.
        // Always add the idempotent ATA creation instruction to ensure visibility
        const createATAIx = createAssociatedTokenAccountIdempotentInstruction(
          publicKey,
          recipientATA,
          recipientPubkey,
          mintPubkey,
          tokenProgramId,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        transaction.add(createATAIx);
        const amount = 1;

        const transferIx = createTransferInstruction(
          senderATA,
          recipientATA,
          publicKey,
          amount,
          [],
          tokenProgramId
        );
        transaction.add(transferIx);

      } else {
        const minRent = await connection.getMinimumBalanceForRentExemption(0);
        const recipientAccountInfo = await connection.getAccountInfo(recipientPubkey);

        let lamports = 0;
        if (!recipientAccountInfo) {
          lamports = minRent;
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

      console.log("DEBUG: Requesting wallet signature...");
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
      console.log("DEBUG: sendMemo caught error", err);
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
