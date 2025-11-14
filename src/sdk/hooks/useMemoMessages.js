/**
 * Memo Protocol - useMemoMessages Hook
 *
 * React hook for retrieving memo messages from on-chain transactions.
 * Queries RPC for token transfers and parses attached memos.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
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
 * Hook for retrieving memo messages from on-chain transactions
 *
 * @param {Object} options - Hook options
 * @param {Connection} options.connection - Solana connection
 * @param {PublicKey} options.publicKey - Current user's public key
 * @param {string} options.userId - Current user's wallet address
 * @param {boolean} options.isReady - Whether wallet is connected
 * @param {string} options.tokenMint - Token mint address to query
 * @param {string} options.recipientId - Filter by recipient (optional)
 * @param {string} options.senderId - Filter by sender (optional)
 * @param {string} options.conversationWith - Filter conversation with specific wallet (optional)
 * @param {string} options.sortOrder - Sort order: 'desc' (newest first) or 'asc' (oldest first)
 * @param {number} options.limit - Maximum number of messages to retrieve
 * @param {boolean} options.autoDecrypt - Automatically decrypt messages for current user (default: true)
 * @returns {Object} - Messages state and utilities
 */
export function useMemoMessages({
  connection,
  publicKey,
  userId,
  isReady,
  tokenMint,
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

  // Fetch messages from on-chain transactions
  useEffect(() => {
    if (!connection || !publicKey || !userId || !isReady || !tokenMint) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    async function fetchMessages() {
      try {
        const TOKEN_MINT = new PublicKey(tokenMint);

        // Step 1: Get user's token account
        const tokenAccount = await getAssociatedTokenAddress(
          TOKEN_MINT,
          publicKey
        );

        // Check if token account exists
        try {
          const accountInfo = await connection.getAccountInfo(tokenAccount);
          if (!accountInfo) {
            if (isMounted) {
              setMemos([]);
              setLoading(false);
            }
            return;
          }
        } catch (err) {
          // Token account doesn't exist yet
        }

        // Step 2: Get transaction signatures for this token account
        const signatures = await connection.getSignaturesForAddress(
          tokenAccount,
          { limit: limitCount * 2 } // Get extra to account for filtering
        );

        // Step 3: Fetch and parse transactions
        const txPromises = signatures.map(async (sigInfo) => {
          try {
            const tx = await connection.getParsedTransaction(sigInfo.signature, {
              maxSupportedTransactionVersion: 0,
            });

            if (!tx || !tx.meta || tx.meta.err) {
              return null;
            }

            // Find memo instruction - check both parsed and raw
            let memoInstruction = tx.transaction.message.instructions.find(
              (ix) => {
                // For parsed instructions
                if (ix.programId?.toString() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr') {
                  return true;
                }
                // For raw instructions
                if (ix.program === 'spl-memo') {
                  return true;
                }
                return false;
              }
            );

            if (!memoInstruction) {
              return null;
            }

            // Parse memo data - handle both formats
            let memoData;
            if (memoInstruction.parsed) {
              // Parsed format
              memoData = memoInstruction.parsed;
            } else if (memoInstruction.data) {
              // Base64 format
              memoData = Buffer.from(memoInstruction.data, 'base64').toString('utf-8');
            } else {
              return null;
            }

            let parsedMemo;
            try {
              parsedMemo = typeof memoData === 'string' ? JSON.parse(memoData) : memoData;
            } catch (err) {
              return null; // Not our format
            }

            // Find token transfer to get sender/recipient
            const tokenTransfer = tx.meta.postTokenBalances?.find(
              (bal) => bal.mint === TOKEN_MINT.toString()
            );

            return {
              id: sigInfo.signature,
              senderId: tx.transaction.message.accountKeys[0].pubkey.toString(),
              recipientId: parsedMemo.recipient,
              encryptedContent: new Uint8Array(parsedMemo.encrypted),
              nonce: new Uint8Array(parsedMemo.nonce),
              timestamp: tx.blockTime || 0,
              createdAt: new Date((tx.blockTime || 0) * 1000),
              signature: sigInfo.signature,
            };
          } catch (err) {
            return null;
          }
        });

        const messages = (await Promise.all(txPromises)).filter(msg => msg !== null);

        // Step 4: Apply filters
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

        // Step 5: Sort messages
        filteredMessages.sort((a, b) => {
          const timeA = a.timestamp || 0;
          const timeB = b.timestamp || 0;
          return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
        });

        // Step 6: Apply limit
        if (limitCount > 0) {
          filteredMessages = filteredMessages.slice(0, limitCount);
        }

        // Step 7: Auto-decrypt messages for current user
        if (autoDecrypt && userId) {
          filteredMessages = filteredMessages.map(memo => {
            if (memo.recipientId === userId) {
              try {
                const decrypted = decryptMessageFromChain(
                  memo.encryptedContent,
                  memo.nonce,
                  userId
                );
                return {
                  ...memo,
                  decryptedContent: decrypted,
                  isDecrypted: true,
                };
              } catch (err) {
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
  }, [connection, publicKey, userId, isReady, tokenMint, recipientId, senderId, conversationWith, sortOrder, limitCount, autoDecrypt]);

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
