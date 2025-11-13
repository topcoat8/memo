/**
 * Memo Protocol - useMemoMessages Hook
 * 
 * React hook for retrieving and managing memo messages from on-chain storage.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { getMessageIndexPDA } from '../clients/solanaClient';
import { decryptMessageFromChain } from '../utils/encryption';

/**
 * Filters messages for a conversation between two wallets
 */
function filterConversation(messages, wallet1, wallet2) {
  return messages.filter(msg => {
    const isFrom1To2 = msg.senderId === wallet1 && msg.recipientId === wallet2;
    const isFrom2To1 = msg.senderId === wallet2 && msg.recipientId === wallet1;
    return isFrom1To2 || isFrom2To1;
  });
}

/**
 * Hook for retrieving memo messages from on-chain storage
 * 
 * @param {Object} options - Hook options
 * @param {Program} options.program - Anchor program instance
 * @param {Connection} options.connection - Solana connection
 * @param {PublicKey} options.publicKey - Current user's public key
 * @param {string} options.userId - Current user's wallet address
 * @param {boolean} options.isReady - Whether program is ready
 * @param {string} options.recipientId - Filter by recipient (optional)
 * @param {string} options.senderId - Filter by sender (optional)
 * @param {string} options.conversationWith - Filter conversation with specific wallet (optional)
 * @param {string} options.sortOrder - Sort order: 'desc' (newest first) or 'asc' (oldest first)
 * @param {number} options.limit - Maximum number of messages to retrieve
 * @param {boolean} options.autoDecrypt - Automatically decrypt messages for current user (default: true)
 * @returns {Object} - Messages state and utilities
 */
export function useMemoMessages({
  program,
  connection,
  publicKey,
  userId,
  isReady,
  recipientId = null,
  senderId = null,
  conversationWith = null,
  sortOrder = 'desc',
  limit: limitCount = 50,
  autoDecrypt = true,
}) {
  const [memos, setMemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch messages from on-chain
  useEffect(() => {
    if (!program || !connection || !publicKey || !userId || !isReady) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    async function fetchMessages() {
      try {
        // Step 1: Get user's message index PDA
        const [indexPDA] = await getMessageIndexPDA(publicKey, program.programId);
        
        let messagePDAs = [];
        try {
          const indexAccount = await program.account.userMessageIndex.fetch(indexPDA);
          messagePDAs = indexAccount.messagePdas || [];
        } catch (err) {
          // Index doesn't exist yet, user has no messages
          console.log('No message index found for user');
        }

        // Step 2: Fetch all message accounts
        const messagePromises = messagePDAs.map(async (pda) => {
          try {
            const messageAccount = await program.account.messageAccount.fetch(pda);
            
            // Skip deleted messages
            if (messageAccount.deleted) {
              return null;
            }

            return {
              id: pda.toString(),
              senderId: messageAccount.sender.toString(),
              recipientId: messageAccount.recipient.toString(),
              encryptedContent: messageAccount.encryptedContent,
              nonce: messageAccount.nonce,
              timestamp: messageAccount.timestamp,
              createdAt: new Date(messageAccount.timestamp * 1000),
              deleted: messageAccount.deleted,
            };
          } catch (err) {
            console.warn('Failed to fetch message account:', pda.toString(), err);
            return null;
          }
        });

        const messages = (await Promise.all(messagePromises))
          .filter(msg => msg !== null);

        // Step 3: Apply filters
        let filteredMessages = messages;
        
        if (recipientId) {
          filteredMessages = filteredMessages.filter(m => m.recipientId === recipientId);
        }
        
        if (senderId) {
          filteredMessages = filteredMessages.filter(m => m.senderId === senderId);
        }
        
        if (conversationWith) {
          filteredMessages = filterConversation(filteredMessages, userId, conversationWith);
        }

        // Step 4: Sort messages
        filteredMessages.sort((a, b) => {
          const timeA = a.timestamp || 0;
          const timeB = b.timestamp || 0;
          return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
        });

        // Step 5: Apply limit
        if (limitCount > 0) {
          filteredMessages = filteredMessages.slice(0, limitCount);
        }

        // Step 6: Auto-decrypt messages for current user
        if (autoDecrypt && userId) {
          filteredMessages = filteredMessages.map(memo => {
            if (memo.recipientId === userId) {
              try {
                const decrypted = decryptMessageFromChain(
                  new Uint8Array(memo.encryptedContent),
                  memo.nonce,
                  userId
                );
                return {
                  ...memo,
                  decryptedContent: decrypted,
                  isDecrypted: true,
                };
              } catch (err) {
                console.warn('Failed to decrypt message:', err);
                return {
                  ...memo,
                  decryptedContent: '[Decryption failed]',
                  isDecrypted: false,
                };
              }
            }
            return memo;
          });
        }

        if (isMounted) {
          setMemos(filteredMessages);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
        if (isMounted) {
          setError(err?.message || 'Failed to load messages');
          setLoading(false);
        }
      }
    }

    fetchMessages();

    // Set up polling to refresh messages periodically
    const pollInterval = setInterval(() => {
      if (isMounted) {
        fetchMessages();
      }
    }, 10000); // Poll every 10 seconds

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [program, connection, publicKey, userId, isReady, recipientId, senderId, conversationWith, sortOrder, limitCount, autoDecrypt]);

  // Get messages sent to current user
  const inboxMessages = useMemo(() => {
    if (!userId) return [];
    return memos.filter(m => m.recipientId === userId && !m.deleted);
  }, [memos, userId]);

  // Get messages sent by current user
  const sentMessages = useMemo(() => {
    if (!userId) return [];
    return memos.filter(m => m.senderId === userId && !m.deleted);
  }, [memos, userId]);

  // Decrypt a specific message
  const decrypt = useCallback((memo) => {
    if (!userId || memo.recipientId !== userId) {
      return "[Cannot decrypt: Not the recipient]";
    }
    if (memo.decryptedContent) {
      return memo.decryptedContent;
    }
    try {
      return decryptMessageFromChain(
        new Uint8Array(memo.encryptedContent),
        memo.nonce,
        userId
      );
    } catch (err) {
      return `[Decryption failed: ${err.message}]`;
    }
  }, [userId]);

  return {
    memos,
    inboxMessages,
    sentMessages,
    loading,
    error,
    decrypt,
  };
}
