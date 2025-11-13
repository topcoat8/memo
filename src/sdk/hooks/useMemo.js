/**
 * Memo Protocol - useMemo Hook
 * 
 * Main React hook for sending memos and managing memo state.
 */

import { useState, useCallback } from 'react';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';
import { encryptMessageForChain, isValidWalletAddress } from '../utils/encryption';
import { getMessageCounterPDA, getMessageIndexPDA, getMessagePDA, getMemoMintAddress } from '../clients/solanaClient';

/**
 * Hook for sending memos and managing memo operations
 * 
 * @param {Object} options - Hook options
 * @param {Program} options.program - Anchor program instance
 * @param {Connection} options.connection - Solana connection
 * @param {PublicKey} options.publicKey - Current user's public key
 * @param {string} options.userId - Current user's wallet address
 * @param {boolean} options.isReady - Whether program is ready
 * @returns {Object} - Memo operations and state
 */
export function useMemo({ program, connection, publicKey, userId, isReady, wallet }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /**
   * Sends an encrypted memo to a recipient on-chain
   * 
   * @param {Object} params - Send parameters
   * @param {string} params.recipientId - Recipient's wallet address
   * @param {string} params.message - Plaintext message to send
   * @returns {Promise<{success: boolean, error?: string, signature?: string}>}
   */
  const sendMemo = useCallback(async ({ recipientId, message }) => {
    setError("");
    setSuccessMessage("");
    
    // Validation
    if (!program) {
      setError("Program is not initialized. Please connect your wallet.");
      return { success: false, error: "Program not initialized" };
    }
    
    if (!connection) {
      setError("Connection is not initialized. Please refresh the page.");
      return { success: false, error: "Connection not initialized" };
    }
    
    if (!isReady || !userId || !publicKey) {
      setError("Wallet is not connected. Please connect your wallet.");
      return { success: false, error: "Wallet not connected" };
    }
    
    if (!recipientId || !recipientId.trim()) {
      setError("Recipient wallet address is required.");
      return { success: false, error: "Recipient required" };
    }
    
    const trimmedRecipient = recipientId.trim();
    
    // Validate wallet address format
    if (!isValidWalletAddress(trimmedRecipient)) {
      setError("Invalid wallet address format. Please check the recipient address.");
      return { success: false, error: "Invalid recipient address" };
    }
    
    if (!message || !message.trim()) {
      setError("Message cannot be empty.");
      return { success: false, error: "Message cannot be empty" };
    }

    // Validate message length (280-500 characters)
    const messageText = message.trim();
    if (messageText.length < 1 || messageText.length > 500) {
      setError("Message must be between 1 and 500 characters.");
      return { success: false, error: "Invalid message length" };
    }
    
    // Prevent sending to self
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
      
      // Step 1: Get $MEMO token mint address
      const memoMint = await getMemoMintAddress(program);
      if (!memoMint) {
        setError("$MEMO token mint is not initialized. Please contact support.");
        return { success: false, error: "Token mint not initialized" };
      }
      
      // Step 2: Check user has $MEMO tokens (required to send)
      const senderTokenAccount = await getAssociatedTokenAddress(memoMint, publicKey);
      let senderBalance = 0;
      try {
        const accountInfo = await connection.getTokenAccountBalance(senderTokenAccount);
        senderBalance = accountInfo.value.uiAmount || 0;
      } catch (err) {
        // Token account doesn't exist, balance is 0
      }
      
      if (senderBalance < 1) {
        setError("You need at least 1 $MEMO token to send messages. Please acquire $MEMO tokens first.");
        return { success: false, error: "Insufficient $MEMO tokens" };
      }
      
      // Step 3: Encrypt and compress message
      const { encryptedData, nonce } = encryptMessageForChain(messageText, trimmedRecipient);
      
      // Step 4: Get user's message counter
      const [counterPDA] = await getMessageCounterPDA(publicKey, program.programId);
      let counterAccount;
      try {
        counterAccount = await program.account.userMessageCounter.fetch(counterPDA);
      } catch (err) {
        // Counter doesn't exist yet, will be created by the program
        counterAccount = { counter: 0 };
      }
      
      const currentCounter = counterAccount?.counter || 0;
      
      // Step 5: Derive message PDA
      const [messagePDA] = await getMessagePDA(
        publicKey,
        recipientPubkey,
        currentCounter,
        program.programId
      );
      
      // Step 6: Get index PDAs
      const [senderIndexPDA] = await getMessageIndexPDA(publicKey, program.programId);
      const [recipientIndexPDA] = await getMessageIndexPDA(recipientPubkey, program.programId);
      
      // Step 7: Get mint config PDA
      const [mintConfigPDA] = await PublicKey.findProgramAddress(
        [Buffer.from('memo'), Buffer.from('mint')],
        program.programId
      );
      
      // Step 8: Get recipient token account
      const recipientTokenAccount = await getAssociatedTokenAddress(memoMint, recipientPubkey);
      
      // Step 9: Build send_memo instruction
      const sendMemoIx = await program.methods
        .sendMemo(Array.from(encryptedData), nonce)
        .accounts({
          sender: publicKey,
          recipient: recipientPubkey,
          messageAccount: messagePDA,
          counterAccount: counterPDA,
          senderIndex: senderIndexPDA,
          recipientIndex: recipientIndexPDA,
          memoMintConfig: mintConfigPDA,
          memoMint: memoMint,
          recipientTokenAccount: recipientTokenAccount,
          tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), // SPL Token program
          systemProgram: SystemProgram.programId,
        })
        .instruction();
      
      // Step 10: Create token transfer instruction (payment for sending)
      const transferIx = createTransferInstruction(
        senderTokenAccount,
        recipientTokenAccount,
        publicKey,
        1, // Transfer 1 token (since decimals = 0)
        []
      );
      
      // Step 11: Combine both instructions into one transaction
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const transaction = new Transaction().add(sendMemoIx).add(transferIx);
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      
      // Send transaction using wallet adapter (it will handle signing)
      const signature = await wallet.sendTransaction(transaction, connection, {
        skipPreflight: false,
        maxRetries: 3,
      });
      
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');
      
      setSuccessMessage("Memo sent successfully! 1 $MEMO token paid.");
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
  }, [program, connection, publicKey, userId, isReady, wallet]);

  /**
   * Clears error and success messages
   */
  const clearMessages = useCallback(() => {
    setError("");
    setSuccessMessage("");
  }, []);

  return {
    sendMemo,
    isLoading,
    error,
    successMessage,
    clearMessages,
  };
}
