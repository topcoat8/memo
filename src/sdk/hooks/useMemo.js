/**
 * Memo Protocol - useMemo Hook
 * 
 * Main React hook for sending memos and managing memo state.
 */

import { useState, useCallback } from 'react';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { encryptMessage, isValidWalletAddress } from '../utils/encryption';

/**
 * Hook for sending memos and managing memo operations
 * 
 * @param {Object} options - Hook options
 * @param {Firestore} options.db - Firestore database instance
 * @param {string} options.userId - Current user's wallet address
 * @param {boolean} options.isAuthReady - Whether authentication is ready
 * @returns {Object} - Memo operations and state
 */
export function useMemo({ db, userId, isAuthReady }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /**
   * Sends an encrypted memo to a recipient
   * 
   * @param {Object} params - Send parameters
   * @param {string} params.recipientId - Recipient's wallet address
   * @param {string} params.message - Plaintext message to send
   * @returns {Promise<void>}
   */
  const sendMemo = useCallback(async ({ recipientId, message }) => {
    setError("");
    setSuccessMessage("");
    
    // Validation
    if (!db) {
      setError("Database is not initialized. Please refresh the page.");
      return;
    }
    
    if (!isAuthReady || !userId) {
      setError("Authentication is not ready. Please wait a moment and try again.");
      return;
    }
    
    if (!recipientId || !recipientId.trim()) {
      setError("Recipient wallet address is required.");
      return;
    }
    
    const trimmedRecipient = recipientId.trim();
    
    // Validate wallet address format
    if (!isValidWalletAddress(trimmedRecipient)) {
      setError("Invalid wallet address format. Please check the recipient address.");
      return;
    }
    
    if (!message || !message.trim()) {
      setError("Message cannot be empty.");
      return;
    }
    
    // Prevent sending to self
    if (trimmedRecipient === userId) {
      setError("Cannot send memo to yourself.");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Encrypt message for recipient
      const encryptedContent = encryptMessage(message.trim(), trimmedRecipient);
      
      // Store in public ledger
      const memosCollection = collection(db, 'public_memos');
      const docRef = doc(memosCollection);
      
      await setDoc(docRef, {
        senderId: userId,
        recipientId: trimmedRecipient,
        encryptedContent,
        createdAt: serverTimestamp(),
      });
      
      setSuccessMessage("Memo sent successfully!");
      return { success: true };
    } catch (err) {
      const errorMessage = err?.message || "Failed to send memo. Please try again.";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [db, userId, isAuthReady]);

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

