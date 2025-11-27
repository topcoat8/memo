/**
 * Memo Protocol - MemoProvider Component
 *
 * React context provider for Memo Protocol SDK.
 * Manages Solana connection and wallet integration.
 */

import { createContext, useContext, useMemo, useEffect, useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { initConnection } from './clients/solanaClient';

const MemoContext = createContext(null);

/**
 * MemoProvider component
 *
 * @param {Object} props - Component props
 * @param {string} props.network - Solana network: 'devnet', 'mainnet-beta', or RPC URL (default: 'mainnet-beta')
 * @param {string} props.tokenMint - Token mint address for your pump.fun memecoin
 * @param {React.ReactNode} props.children - Child components
 */
export function MemoProvider({ network = 'mainnet-beta', tokenMint, children }) {
  const [connection, setConnection] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const wallet = useWallet();

  const [encryptionKeys, setEncryptionKeys] = useState(null);

  // Initialize Solana connection
  useEffect(() => {
    try {
      const conn = initConnection(network);
      setConnection(conn);
      setError(null);
    } catch (err) {
      setError(err?.message || 'Failed to initialize Solana connection');
      console.error('Connection initialization error:', err);
    }
  }, [network]);

  // Set ready when wallet is connected
  useEffect(() => {
    if (connection && wallet && wallet.publicKey) {
      setIsReady(true);
    } else {
      setIsReady(false);
      setEncryptionKeys(null); // Reset keys on disconnect
    }
  }, [connection, wallet, wallet?.publicKey]);

  // Get user ID from wallet public key
  const userId = useMemo(() => {
    return wallet?.publicKey?.toString() || '';
  }, [wallet?.publicKey]);

  // Login: Sign message to derive encryption keys
  const login = useCallback(async () => {
    if (!wallet || !wallet.signMessage) {
      throw new Error("Wallet does not support message signing");
    }

    try {
      const message = new TextEncoder().encode("Login to Memo Protocol");
      const signature = await wallet.signMessage(message);

      // Dynamically import to avoid circular dependencies if any
      const { deriveKeyPairFromSignature } = await import('./utils/encryption');
      const keys = deriveKeyPairFromSignature(signature);

      setEncryptionKeys(keys);
      return keys;
    } catch (err) {
      console.error("Login failed:", err);
      throw err;
    }
  }, [wallet]);

  const logout = useCallback(() => {
    setEncryptionKeys(null);
  }, []);

  const value = useMemo(() => ({
    connection,
    wallet,
    publicKey: wallet?.publicKey || null,
    userId,
    isReady,
    error,
    tokenMint,
    encryptionKeys,
    login,
    logout,
  }), [connection, wallet, userId, isReady, error, tokenMint, encryptionKeys, login, logout]);

  return (
    <MemoContext.Provider value={value}>
      {children}
    </MemoContext.Provider>
  );
}

/**
 * Hook to access Memo context
 * 
 * @returns {Object} - Memo context value
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useMemoContext() {
  const context = useContext(MemoContext);
  if (!context) {
    throw new Error('useMemoContext must be used within a MemoProvider');
  }
  return context;
}
