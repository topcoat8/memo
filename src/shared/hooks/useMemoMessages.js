/**
 * Memo Protocol - useMemoMessages Hook
 *
 * React hook for retrieving memo messages from on-chain transactions.
 * Queries RPC for token transfers and parses attached memos.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { Buffer } from 'buffer';
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
    setError(null);

    async function fetchMessages() {
      try {
        // 1. Main Wallet Signatures
        const mainSignatures = await connection.getSignaturesForAddress(
          new PublicKey(publicKey),
          { limit: 50 },
          'confirmed'
        );

        // 2. ATA Signatures
        let ataSignatures = [];
        if (tokenMint) {
          try {
            const ataAddress = await getAssociatedTokenAddress(
              new PublicKey(tokenMint),
              new PublicKey(publicKey),
              false,
              TOKEN_2022_PROGRAM_ID
            );
            ataSignatures = await connection.getSignaturesForAddress(
              ataAddress,
              { limit: 50 },
              'confirmed'
            );
          } catch (e) {
            console.warn("Failed to fetch ATA signatures:", e);
          }
        }

        // 3. Merge and Deduplicate
        const allSignatures = [...mainSignatures, ...ataSignatures];
        const uniqueSignaturesMap = new Map();

        allSignatures.forEach(sig => {
          uniqueSignaturesMap.set(sig.signature, sig);
        });

        const uniqueSignatures = Array.from(uniqueSignaturesMap.values());

        // 4. Sort by blockTime desc
        uniqueSignatures.sort((a, b) => (b.blockTime || 0) - (a.blockTime || 0));

        // 5. Filter by time (3 days)
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const cutoffTime = nowInSeconds - THREE_DAYS_IN_SECONDS;

        const recentSignatures = [];
        for (const sig of uniqueSignatures) {
          if (sig.blockTime && sig.blockTime > cutoffTime) {
            recentSignatures.push(sig);
          } else if (sig.blockTime && sig.blockTime <= cutoffTime) {
            // Since it's sorted, we can stop early
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

        const allTransactions = [];

        for (const sigInfo of recentSignatures) {
          try {
            // Check local cache first
            const cacheKey = `memo_tx_${sigInfo.signature}`;
            const cachedTx = localStorage.getItem(cacheKey);

            if (cachedTx) {
              try {
                const parsedTx = JSON.parse(cachedTx);
                allTransactions.push({ tx: parsedTx, signature: sigInfo.signature });
                continue; // Skip RPC call
              } catch (e) {
                localStorage.removeItem(cacheKey); // Clear invalid cache
              }
            }

            // Increase delay to 1000ms to stay well under 10 req/s limit
            await new Promise(resolve => setTimeout(resolve, 1000));

            const tx = await connection.getParsedTransaction(sigInfo.signature, {
              maxSupportedTransactionVersion: 0,
            });

            if (tx && tx.meta && !tx.meta.err) {
              // Cache the successful transaction
              try {
                localStorage.setItem(cacheKey, JSON.stringify(tx));
              } catch (e) {
                console.warn('Failed to cache transaction:', e);
              }
              allTransactions.push({ tx, signature: sigInfo.signature });
            }
          } catch (err) {
            console.error(`Failed to fetch transaction ${sigInfo.signature}:`, err);
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
              encryptedContent: typeof parsedMemo.encrypted === 'string' ? base64ToUint8Array(parsedMemo.encrypted) : new Uint8Array(parsedMemo.encrypted),
              nonce: typeof parsedMemo.nonce === 'string' ? base64ToUint8Array(parsedMemo.nonce) : new Uint8Array(parsedMemo.nonce),
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

    // Poll every 30 seconds + random jitter (0-10s)
    const getPollInterval = () => 30000 + Math.random() * 10000;

    let timeoutId;
    const schedulePoll = () => {
      timeoutId = setTimeout(() => {
        if (isMounted) {
          fetchMessages().then(() => {
            if (isMounted) schedulePoll();
          });
        }
      }, getPollInterval());
    };

    schedulePoll();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
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
          typeof memo.encryptedContent === 'string' ? base64ToUint8Array(memo.encryptedContent) : new Uint8Array(memo.encryptedContent),
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
