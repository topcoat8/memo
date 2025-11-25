/**
 * Memo Protocol - useMemo Hook
 *
 * Simple token transfer + memo approach using native Solana programs.
 */

import { useState, useCallback } from 'react';
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
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

      if (!tokenMint) {
        setError("Token mint not configured. Please set VITE_TOKEN_MINT in your environment.");
        return { success: false, error: "Token mint not configured" };
      }

      const TOKEN_MINT = new PublicKey(tokenMint);

      const senderTokenAccount = await getAssociatedTokenAddress(
        TOKEN_MINT,
        publicKey
      );

      let senderBalance = 0;
      try {
        const accountInfo = await connection.getTokenAccountBalance(senderTokenAccount);
        senderBalance = accountInfo.value.uiAmount || 0;
      } catch (err) {
        setError("You don't have any tokens. Please acquire some tokens first.");
        return { success: false, error: "No token account found" };
      }

      if (senderBalance < 1) {
        setError(`Insufficient balance. You have ${senderBalance} tokens, need at least 1.`);
        return { success: false, error: "Insufficient tokens" };
      }

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
          isAsymmetric: true
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

      const recipientTokenAccount = await getAssociatedTokenAddress(
        TOKEN_MINT,
        recipientPubkey
      );

      const transaction = new Transaction();

      try {
        await connection.getTokenAccountBalance(recipientTokenAccount);
      } catch (err) {
        const createAtaIx = createAssociatedTokenAccountInstruction(
          publicKey,
          recipientTokenAccount,
          recipientPubkey,
          TOKEN_MINT
        );
        transaction.add(createAtaIx);
      }

      const transferIx = createTransferInstruction(
        senderTokenAccount,
        recipientTokenAccount,
        publicKey,
        1,
        []
      );
      transaction.add(transferIx);

      const memoIx = new TransactionInstruction({
        keys: [],
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

      setSuccessMessage("Message sent successfully with 1 token transfer!");
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
  }, [connection, publicKey, userId, isReady, wallet, tokenMint, encryptionKeys, publicKeyRegistry]);

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
