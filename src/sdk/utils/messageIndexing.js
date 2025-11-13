/**
 * Memo Protocol - Message Indexing Utilities
 * 
 * Optimized message retrieval and indexing for efficient querying.
 * Supports filtering by sender, recipient, and timestamp ranges.
 */

import { query, collection, where, orderBy, limit, startAfter, Timestamp } from 'firebase/firestore';

/**
 * Message query options
 */
export const MessageQueryOptions = {
  // Filter options
  FILTER_BY_RECIPIENT: 'recipient',
  FILTER_BY_SENDER: 'sender',
  FILTER_BY_CONVERSATION: 'conversation', // Messages between two specific wallets
  
  // Sort options
  SORT_NEWEST_FIRST: 'desc',
  SORT_OLDEST_FIRST: 'asc',
  
  // Default limits
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 200,
};

/**
 * Creates an optimized Firestore query for messages
 * 
 * @param {Firestore} db - Firestore database instance
 * @param {string} collectionPath - Collection path (default: 'public_memos')
 * @param {Object} options - Query options
 * @param {string} options.recipientId - Filter by recipient wallet address
 * @param {string} options.senderId - Filter by sender wallet address
 * @param {string} options.conversationWith - Filter conversation between current user and another wallet
 * @param {string} options.currentUserId - Current user's wallet address (required for conversation filter)
 * @param {string} options.sortOrder - 'desc' (newest first) or 'asc' (oldest first)
 * @param {number} options.limit - Maximum number of messages to return
 * @param {DocumentSnapshot} options.startAfter - Document to start after (for pagination)
 * @returns {Query} - Firestore query
 */
export function createMessageQuery(db, collectionPath = 'public_memos', options = {}) {
  const {
    recipientId,
    senderId,
    conversationWith,
    currentUserId,
    sortOrder = MessageQueryOptions.SORT_NEWEST_FIRST,
    limitCount = MessageQueryOptions.DEFAULT_LIMIT,
    startAfterDoc = null,
  } = options;

  let q = collection(db, collectionPath);

  // Build query with filters
  if (conversationWith && currentUserId) {
    // Conversation query: messages where (sender=currentUser AND recipient=other) OR (sender=other AND recipient=currentUser)
    // Note: Firestore doesn't support OR queries directly, so we'll need to handle this client-side
    // For now, we'll query by recipient and filter client-side
    q = query(q, where('recipientId', 'in', [currentUserId, conversationWith]));
  } else if (recipientId) {
    q = query(q, where('recipientId', '==', recipientId));
  } else if (senderId) {
    q = query(q, where('senderId', '==', senderId));
  }

  // Add ordering
  q = query(q, orderBy('createdAt', sortOrder));

  // Add limit
  const safeLimit = Math.min(limitCount, MessageQueryOptions.MAX_LIMIT);
  q = query(q, limit(safeLimit));

  // Add pagination cursor
  if (startAfterDoc) {
    q = query(q, startAfter(startAfterDoc));
  }

  return q;
}

/**
 * Filters messages for a conversation between two wallets
 * 
 * @param {Array} messages - Array of message objects
 * @param {string} wallet1 - First wallet address
 * @param {string} wallet2 - Second wallet address
 * @returns {Array} - Filtered messages
 */
export function filterConversation(messages, wallet1, wallet2) {
  return messages.filter(msg => {
    const isFrom1To2 = msg.senderId === wallet1 && msg.recipientId === wallet2;
    const isFrom2To1 = msg.senderId === wallet2 && msg.recipientId === wallet1;
    return isFrom1To2 || isFrom2To1;
  });
}

/**
 * Groups messages by conversation partner
 * 
 * @param {Array} messages - Array of message objects
 * @param {string} currentUserId - Current user's wallet address
 * @returns {Object} - Messages grouped by conversation partner
 */
export function groupByConversation(messages, currentUserId) {
  const conversations = {};
  
  messages.forEach(msg => {
    const partnerId = msg.senderId === currentUserId ? msg.recipientId : msg.senderId;
    if (!conversations[partnerId]) {
      conversations[partnerId] = {
        partnerId,
        messages: [],
        lastMessage: null,
        unreadCount: 0,
      };
    }
    conversations[partnerId].messages.push(msg);
    
    // Track most recent message
    if (!conversations[partnerId].lastMessage || 
        (msg.createdAt?.toMillis?.() || 0) > (conversations[partnerId].lastMessage?.createdAt?.toMillis?.() || 0)) {
      conversations[partnerId].lastMessage = msg;
    }
    
    // Count unread (messages sent to current user that haven't been read)
    if (msg.recipientId === currentUserId) {
      conversations[partnerId].unreadCount++;
    }
  });
  
  // Sort conversations by last message time
  return Object.values(conversations).sort((a, b) => {
    const timeA = a.lastMessage?.createdAt?.toMillis?.() || 0;
    const timeB = b.lastMessage?.createdAt?.toMillis?.() || 0;
    return timeB - timeA;
  });
}

/**
 * Creates Firestore composite index configuration
 * Returns the index configuration needed for efficient queries
 * 
 * @returns {Object} - Index configuration for firestore.indexes.json
 */
export function getRequiredIndexes() {
  return {
    indexes: [
      {
        collectionGroup: 'public_memos',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'recipientId', order: 'ASCENDING' },
          { fieldPath: 'createdAt', order: 'DESCENDING' },
        ],
      },
      {
        collectionGroup: 'public_memos',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'senderId', order: 'ASCENDING' },
          { fieldPath: 'createdAt', order: 'DESCENDING' },
        ],
      },
      {
        collectionGroup: 'public_memos',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'createdAt', order: 'DESCENDING' },
        ],
      },
    ],
  };
}

