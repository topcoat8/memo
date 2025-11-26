/**
 * Memo Protocol - useMemoMessages Hook
 *
 * React hook for retrieving memo messages from on-chain transactions.
 * Queries RPC for token transfers and parses attached memos.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PublicKey } from '@solana/web3.js';
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
        // We now fetch signatures for the main wallet address, as we are using SystemProgram transfers
        const signatures = await connection.getSignaturesForAddress(
          publicKey,
          { limit: limitCount * 2 }
        );

        // Batch fetch parsed transactions to reduce RPC roundtrips
        // getParsedTransactions accepts an array of signatures
        const signatureList = signatures.map(s => s.signature);

        // Split into chunks of 100 to avoid hitting RPC limits if limitCount is large
        const chunkSize = 100;
        const chunks = [];
        for (let i = 0; i < signatureList.length; i += chunkSize) {
          chunks.push(signatureList.slice(i, i + chunkSize));
        }

        const allTransactions = [];
        for (const chunk of chunks) {
          const txs = await connection.getParsedTransactions(chunk, {
            maxSupportedTransactionVersion: 0,
          });
          allTransactions.push(...txs);
        }

        // Map transactions back to their signatures for ID consistency
        const rawMessages = allTransactions.map((tx, index) => {
          if (!tx || !tx.meta || tx.meta.err) {
            return null;
          }

          const signature = signatureList[index];

          try {
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

                  if (encryptionKeysRef.current && registry[otherPartyId]) {
                    const otherPub = base64ToUint8Array(registry[otherPartyId]);
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
                  // Legacy symmetric encryption (only works if recipient is me, or if I am sender I can't decrypt it unless I stored it specially, which we don't)
                  // Actually, legacy encryptMessageForChain uses deriveKeyFromIdentifier(recipientId).
                  // So if I am sender, I can derive the key from recipientId too!
                  // encryptMessageForChain uses: key = deriveKeyFromIdentifier(recipientId)
                  // decryptMessageFromChain uses: key = deriveKeyFromIdentifier(recipientId)
                  // So yes, sender can decrypt legacy messages too if they know recipientId.

                  decrypted = decryptMessageFromChain(
                    memo.encryptedContent,
                    memo.nonce,
                    memo.recipientId // Always use recipientId to derive key
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
        const otherIdentityKey = publicKeyRegistry[otherPartyId];

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
