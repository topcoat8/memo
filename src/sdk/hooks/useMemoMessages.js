/**
 * Memo Protocol - useMemoMessages Hook
 *
 * React hook for retrieving memo messages from on-chain transactions.
 * Queries RPC for token transfers and parses attached memos.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { decryptMessageFromChain, decryptMessageAsymmetric, base64ToUint8Array } from '../utils/encryption';
import { MEMO_PROGRAM_ID, THREE_DAYS_IN_SECONDS } from '../constants';

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
 * Logic:
 * 1. Gets user's token account.
 * 2. Fetches transaction signatures for the token account.
 * 3. Fetches and parses each transaction to find Memo instructions.
 * 4. Extracts Identity announcements and builds a Public Key Registry.
 * 5. Filters messages (by recipient, sender, conversation).
 * 6. Sorts messages by timestamp.
 * 7. Auto-decrypts messages if encryption keys are available.
 * 8. Sets up polling to refresh messages.
 *
 * @param {Object} options - Hook options
 * @param {Connection} options.connection - Solana connection
 * @param {PublicKey} options.publicKey - Current user's public key
 * @param {string} options.userId - Current user's wallet address
 * @param {boolean} options.isReady - Whether wallet is connected
 * @param {string} options.tokenMint - Token mint address to query
 * @param {Object} options.encryptionKeys - User's Curve25519 keypair (optional)
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
  encryptionKeys = null,
  recipientId = null,
  senderId = null,
  conversationWith = null,
  sortOrder = 'desc',
  limit: limitCount = 50,
  autoDecrypt = true,
}) {
  const [memos, setMemos] = useState([]);
  const [publicKeyRegistry, setPublicKeyRegistry] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const encryptionKeysRef = useRef(encryptionKeys);

  useEffect(() => {
    encryptionKeysRef.current = encryptionKeys;
  }, [encryptionKeys]);

  useEffect(() => {
    if (!connection || !publicKey || !userId || !isReady || !tokenMint) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    // Don't reset loading to true on every dependency change to avoid flashing
    // setLoading(true); 
    setError(null);

    async function fetchMessages() {
      try {
        // Fetch signatures for the user's main wallet address
        // Optimization: We fetch up to 50 signatures but strictly filter them by time (3 days)
        // before fetching transaction details. This saves RPC resources by avoiding 
        // unnecessary getParsedTransaction calls for old history.
        const signatures = await connection.getSignaturesForAddress(
          publicKey,
          { limit: 50 },
          'confirmed'
        );

        if (signatures.length === 0) {
          if (isMounted) {
            setMemos([]);
            setLoading(false);
          }
          return;
        }

        // Filter signatures older than 3 days
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const cutoffTime = nowInSeconds - THREE_DAYS_IN_SECONDS;

        // Stop processing as soon as we hit the time limit (since signatures are ordered new -> old)
        const recentSignatures = [];
        for (const sig of signatures) {
          if (sig.blockTime && sig.blockTime > cutoffTime) {
            recentSignatures.push(sig);
          } else if (sig.blockTime && sig.blockTime <= cutoffTime) {
            // Optimization: Stop searching once we hit a transaction older than 3 days
            break;
          }
        }

        if (recentSignatures.length === 0) {
          if (isMounted) {
            setMemos([]);
            setLoading(false);
          }
          return;
        }

        // Fetch transactions sequentially with delays to avoid hitting RPC rate limits (429)
        // and to avoid using batch requests which are not supported on free tier (403).
        const allTransactions = [];

        for (const sigInfo of recentSignatures) {
          try {
            // Add a delay before each request to respect rate limits
            // 250ms delay = ~4 requests per second max
            await new Promise(resolve => setTimeout(resolve, 250));

            const tx = await connection.getParsedTransaction(sigInfo.signature, {
              maxSupportedTransactionVersion: 0,
            });

            if (tx && tx.meta && !tx.meta.err) {
              allTransactions.push({ tx, signature: sigInfo.signature });
            }
          } catch (err) {
            console.error(`Failed to fetch transaction ${sigInfo.signature}:`, err);
            // Continue with other transactions
          }
        }

        // Map transactions back to their signatures for ID consistency
        const rawMessages = allTransactions.map(({ tx, signature }) => {
          if (!tx || !tx.meta || tx.meta.err) {
            return null;
          }

          try {
            let memoInstruction = tx.transaction.message.instructions.find(
              (ix) => {
                if (ix.programId?.toString() === MEMO_PROGRAM_ID.toString()) {
                  return true;
                }
                if (ix.program === 'spl-memo') {
                  return true;
                }
                return false;
              }
            );

            if (!memoInstruction) {
              return null;
            }

            let memoData;
            if (memoInstruction.parsed) {
              memoData = memoInstruction.parsed;
            } else if (memoInstruction.data) {
              memoData = Buffer.from(memoInstruction.data, 'base64').toString('utf-8');
            } else {
              return null;
            }

            let parsedMemo;
            try {
              parsedMemo = typeof memoData === 'string' ? JSON.parse(memoData) : memoData;
            } catch (err) {
              return null;
            }

            if (parsedMemo.type === 'IDENTITY' && parsedMemo.publicKey) {
              return {
                id: signature,
                senderId: tx.transaction.message.accountKeys[0].pubkey.toString(),
                type: 'IDENTITY',
                identityKey: parsedMemo.publicKey,
                timestamp: tx.blockTime || 0,
                createdAt: new Date((tx.blockTime || 0) * 1000),
              };
            }

            return {
              id: signature,
              senderId: tx.transaction.message.accountKeys[0].pubkey.toString(),
              recipientId: parsedMemo.recipient,
              encryptedContent: new Uint8Array(parsedMemo.encrypted),
              nonce: new Uint8Array(parsedMemo.nonce),
              isAsymmetric: !!parsedMemo.isAsymmetric,
              senderPublicKey: parsedMemo.senderPublicKey, // Extract embedded key
              timestamp: tx.blockTime || 0,
              createdAt: new Date((tx.blockTime || 0) * 1000),
              signature: signature,
            };
          } catch (err) {
            return null;
          }
        }).filter(msg => msg !== null);

        const registry = {};
        rawMessages.forEach(msg => {
          if (msg.type === 'IDENTITY' && msg.senderId && msg.identityKey) {
            if (!registry[msg.senderId]) {
              registry[msg.senderId] = msg.identityKey;
            }
          }
        });

        if (isMounted) {
          setPublicKeyRegistry(registry);
        }

        const messages = rawMessages.filter(msg => msg.type !== 'IDENTITY');

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

        filteredMessages.sort((a, b) => {
          const timeA = a.timestamp || 0;
          const timeB = b.timestamp || 0;
          return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
        });

        if (limitCount > 0) {
          filteredMessages = filteredMessages.slice(0, limitCount);
        }

        if (autoDecrypt && userId) {
          filteredMessages = filteredMessages.map(memo => {
            const isRecipient = memo.recipientId === userId;
            const isSender = memo.senderId === userId;

            if (isRecipient || isSender) {
              try {
                let decrypted;

                if (memo.isAsymmetric) {
                  const otherPartyId = isSender ? memo.recipientId : memo.senderId;

                  // Use embedded key if available (for new messages), otherwise fallback to registry
                  const otherIdentityKey = memo.senderPublicKey || registry[otherPartyId];

                  if (encryptionKeysRef.current && otherIdentityKey) {
                    const otherPub = base64ToUint8Array(otherIdentityKey);
                    decrypted = decryptMessageAsymmetric(
                      memo.encryptedContent,
                      memo.nonce,
                      otherPub,
                      encryptionKeysRef.current.secretKey
                    );
                  } else {
                    decrypted = "[Encrypted Message - Key Not Found]";
                  }
                } else {
                  // Legacy symmetric encryption
                  decrypted = decryptMessageFromChain(
                    memo.encryptedContent,
                    memo.nonce,
                    memo.recipientId
                  );
                }

                return {
                  ...memo,
                  decryptedContent: decrypted,
                  isDecrypted: true,
                };
              } catch (err) {
                return {
                  ...memo,
                  decryptedContent: `[Decryption failed: ${err.message}]`,
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

    const pollInterval = setInterval(() => {
      if (isMounted) {
        fetchMessages();
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection, publicKey, userId, isReady, tokenMint, recipientId, senderId, conversationWith, sortOrder, limitCount, autoDecrypt]);

  const inboxMessages = useMemo(() => {
    if (!userId) return [];
    return memos.filter(m => m.recipientId === userId);
  }, [memos, userId]);

  const sentMessages = useMemo(() => {
    if (!userId) return [];
    return memos.filter(m => m.senderId === userId);
  }, [memos, userId]);

  const decrypt = useCallback((memo) => {
    if (!userId || (memo.recipientId !== userId && memo.senderId !== userId)) {
      return "[Cannot decrypt: Not involved]";
    }
    if (memo.decryptedContent) {
      return memo.decryptedContent;
    }

    const isSender = memo.senderId === userId;

    try {
      if (memo.isAsymmetric) {
        if (!encryptionKeys) return "[Login required to decrypt]";

        const otherPartyId = isSender ? memo.recipientId : memo.senderId;

        // Use embedded key if available, otherwise fallback to registry
        const otherIdentityKey = memo.senderPublicKey || publicKeyRegistry[otherPartyId];

        if (!otherIdentityKey) return "[Unknown Identity Key]";

        const otherPub = base64ToUint8Array(otherIdentityKey);
        return decryptMessageAsymmetric(
          memo.encryptedContent,
          memo.nonce,
          otherPub,
          encryptionKeys.secretKey
        );
      } else {
        return decryptMessageFromChain(
          new Uint8Array(memo.encryptedContent),
          memo.nonce,
          memo.recipientId
        );
      }
    } catch (err) {
      return `[Decryption failed: ${err.message}]`;
    }
  }, [userId, encryptionKeys, publicKeyRegistry]);

  return {
    memos,
    inboxMessages,
    sentMessages,
    publicKeyRegistry,
    loading,
    error,
    decrypt,
  };
}
