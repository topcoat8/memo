/**
 * Memo Protocol - useMemoMessages Hook
 * 
 * React hook for retrieving and managing memo messages with optimized queries.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { createMessageQuery, filterConversation } from '../utils/messageIndexing';
import { decryptMessage } from '../utils/encryption';

/**
 * Hook for retrieving memo messages with optimized queries
 * 
 * @param {Object} options - Hook options
 * @param {Firestore} options.db - Firestore database instance
 * @param {string} options.userId - Current user's wallet address
 * @param {string} options.recipientId - Filter by recipient (optional)
 * @param {string} options.senderId - Filter by sender (optional)
 * @param {string} options.conversationWith - Filter conversation with specific wallet (optional)
 * @param {string} options.sortOrder - Sort order: 'desc' (newest first) or 'asc' (oldest first)
 * @param {number} options.limit - Maximum number of messages to retrieve
 * @param {boolean} options.autoDecrypt - Automatically decrypt messages for current user (default: true)
 * @returns {Object} - Messages state and utilities
 */
export function useMemoMessages({
  db,
  userId,
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

  // Create optimized query
  const messageQuery = useMemo(() => {
    if (!db) return null;
    
    return createMessageQuery(db, 'public_memos', {
      recipientId,
      senderId,
      conversationWith,
      currentUserId: userId,
      sortOrder,
      limitCount,
    });
  }, [db, recipientId, senderId, conversationWith, userId, sortOrder, limitCount]);

  // Subscribe to messages (only when db and userId are ready)
  useEffect(() => {
    if (!messageQuery || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      messageQuery,
      (snapshot) => {
        try {
          const memosList = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            memosList.push({
              id: doc.id,
              senderId: data?.senderId || "",
              recipientId: data?.recipientId || "",
              encryptedContent: data?.encryptedContent || "",
              createdAt: data?.createdAt || null,
            });
          });

          // If conversation filter is active, filter client-side
          let filteredMemos = memosList;
          if (conversationWith && userId) {
            filteredMemos = filterConversation(memosList, userId, conversationWith);
          }

          // Auto-decrypt messages for current user
          if (autoDecrypt && userId) {
            filteredMemos = filteredMemos.map(memo => {
              if (memo.recipientId === userId) {
                return {
                  ...memo,
                  decryptedContent: decryptMessage(memo.encryptedContent, userId),
                  isDecrypted: true,
                };
              }
              return memo;
            });
          }

          setMemos(filteredMemos);
          setLoading(false);
        } catch (err) {
          setError(err?.message || 'Failed to process messages');
          setLoading(false);
        }
      },
      (err) => {
        setError(err?.message || 'Failed to load messages');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [messageQuery, userId, conversationWith, autoDecrypt]);

  // Get messages sent to current user
  const inboxMessages = useMemo(() => {
    if (!userId) return [];
    return memos.filter(m => m.recipientId === userId);
  }, [memos, userId]);

  // Get messages sent by current user
  const sentMessages = useMemo(() => {
    if (!userId) return [];
    return memos.filter(m => m.senderId === userId);
  }, [memos, userId]);

  // Decrypt a specific message
  const decrypt = useCallback((memo) => {
    if (!userId || memo.recipientId !== userId) {
      return "[Cannot decrypt: Not the recipient]";
    }
    if (memo.decryptedContent) {
      return memo.decryptedContent;
    }
    return decryptMessage(memo.encryptedContent, userId);
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

