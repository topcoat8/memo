/**
 * Memo Protocol - MemoProvider Component
 *
 * React context provider for Memo Protocol SDK.
 * Manages Solana connection and wallet integration.
 */

import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
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
    }
  }, [connection, wallet, wallet?.publicKey]);

  // Get user ID from wallet public key
  const userId = useMemo(() => {
    return wallet?.publicKey?.toString() || '';
  }, [wallet?.publicKey]);

  const value = useMemo(() => ({
    connection,
    wallet,
    publicKey: wallet?.publicKey || null,
    userId,
    isReady,
    error,
    tokenMint,
  }), [connection, wallet, userId, isReady, error, tokenMint]);

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
export function useMemoContext() {
  const context = useContext(MemoContext);
  if (!context) {
    throw new Error('useMemoContext must be used within a MemoProvider');
  }
  return context;
}
