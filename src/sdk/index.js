/**
 * Memo Protocol SDK
 * 
 * Main entry point for the Memo Protocol SDK.
 * Export all public APIs for easy integration.
 */

// Provider and Context
export { MemoProvider, useMemoContext } from './MemoProvider';

// Hooks
export { useMemo } from './hooks/useMemo';
export { useMemoMessages } from './hooks/useMemoMessages';

// Utilities
export {
  encryptMessage,
  decryptMessage,
  deriveKeyFromIdentifier,
  isValidWalletAddress,
  utf8ToUint8Array,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from './utils/encryption';

export {
  createMessageQuery,
  filterConversation,
  groupByConversation,
  getRequiredIndexes,
  MessageQueryOptions,
} from './utils/messageIndexing';

