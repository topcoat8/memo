/**
 * Memo Protocol - useMemoMessages Hook
 *
 * React hook for retrieving memo messages from on-chain transactions.
 * Queries RPC for token transfers and parses attached memos.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { decryptMessageFromChain, decryptMessageAsymmetric, base64ToUint8Array } from '../utils/encryption';

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

        const tokenAccount = await getAssociatedTokenAddress(
          TOKEN_MINT,
          publicKey
        );

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

        const signatures = await connection.getSignaturesForAddress(
          tokenAccount,
          { limit: limitCount * 2 }
        );

        const txPromises = signatures.map(async (sigInfo) => {
          try {
            const tx = await connection.getParsedTransaction(sigInfo.signature, {
              maxSupportedTransactionVersion: 0,
            });

            if (!tx || !tx.meta || tx.meta.err) {
              return null;
            }

            let memoInstruction = tx.transaction.message.instructions.find(
              (ix) => {
                if (ix.programId?.toString() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr') {
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
                id: sigInfo.signature,
                senderId: tx.transaction.message.accountKeys[0].pubkey.toString(),
                type: 'IDENTITY',
                identityKey: parsedMemo.publicKey,
                timestamp: tx.blockTime || 0,
                createdAt: new Date((tx.blockTime || 0) * 1000),
              };
            }

            return {
              id: sigInfo.signature,
              senderId: tx.transaction.message.accountKeys[0].pubkey.toString(),
              recipientId: parsedMemo.recipient,
              encryptedContent: new Uint8Array(parsedMemo.encrypted),
              nonce: new Uint8Array(parsedMemo.nonce),
              isAsymmetric: !!parsedMemo.isAsymmetric,
              timestamp: tx.blockTime || 0,
              createdAt: new Date((tx.blockTime || 0) * 1000),
              signature: sigInfo.signature,
            };
          } catch (err) {
            return null;
          }
        });

        const rawMessages = (await Promise.all(txPromises)).filter(msg => msg !== null);

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
            if (memo.recipientId === userId) {
              try {
                let decrypted;

                if (memo.isAsymmetric) {
                  if (encryptionKeys && registry[memo.senderId]) {
                    const senderPub = base64ToUint8Array(registry[memo.senderId]);
                    decrypted = decryptMessageAsymmetric(
                      memo.encryptedContent,
                      memo.nonce,
                      senderPub,
                      encryptionKeys.secretKey
                    );
                  } else {
                    decrypted = "[Encrypted Message - Login to View]";
                  }
                } else {
                  decrypted = decryptMessageFromChain(
                    memo.encryptedContent,
                    memo.nonce,
                    userId
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
  }, [connection, publicKey, userId, isReady, tokenMint, recipientId, senderId, conversationWith, sortOrder, limitCount, autoDecrypt, encryptionKeys]);

  const inboxMessages = useMemo(() => {
    if (!userId) return [];
    return memos.filter(m => m.recipientId === userId);
  }, [memos, userId]);

  const sentMessages = useMemo(() => {
    if (!userId) return [];
    return memos.filter(m => m.senderId === userId);
  }, [memos, userId]);

  const decrypt = useCallback((memo) => {
    if (!userId || memo.recipientId !== userId) {
      return "[Cannot decrypt: Not the recipient]";
    }
    if (memo.decryptedContent) {
      return memo.decryptedContent;
    }
    try {
      if (memo.isAsymmetric) {
        if (!encryptionKeys) return "[Login required to decrypt]";
        const senderIdentityKey = publicKeyRegistry[memo.senderId];
        if (!senderIdentityKey) return "[Unknown Sender Identity]";

        const senderPub = base64ToUint8Array(senderIdentityKey);
        return decryptMessageAsymmetric(
          memo.encryptedContent,
          memo.nonce,
          senderPub,
          encryptionKeys.secretKey
        );
      } else {
        return decryptMessageFromChain(
          new Uint8Array(memo.encryptedContent),
          memo.nonce,
          userId
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
