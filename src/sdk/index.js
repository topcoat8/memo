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
export { useMemoTokenBalance } from './hooks/useMemoTokenBalance';

// Utilities
export {
  encryptMessage,
  encryptMessageForChain,
  decryptMessage,
  decryptMessageFromChain,
  deriveKeyFromIdentifier,
  isValidWalletAddress,
  utf8ToUint8Array,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from './utils/encryption';

export {
  compressMessage,
  decompressMessage,
  getCompressedSize,
} from './utils/compression';

// Solana Client
export {
  initConnection,
  initProgram,
  getMessageCounterPDA,
  getMessageIndexPDA,
  getMessagePDA,
} from './clients/solanaClient';
