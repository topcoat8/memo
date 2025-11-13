/**
 * Memo Protocol - MemoProvider Component
 * 
 * React context provider for Memo Protocol SDK.
 * Manages Solana connection, Anchor program, and wallet integration.
 */

import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { initConnection, initProgram } from './clients/solanaClient';

const MemoContext = createContext(null);

/**
 * MemoProvider component
 * 
 * @param {Object} props - Component props
 * @param {string} props.network - Solana network: 'devnet', 'mainnet-beta', or RPC URL (default: 'devnet')
 * @param {React.ReactNode} props.children - Child components
 */
export function MemoProvider({ network = 'devnet', children }) {
  const [connection, setConnection] = useState(null);
  const [program, setProgram] = useState(null);
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

  // Initialize Anchor program when wallet is connected
  useEffect(() => {
    if (!connection || !wallet || !wallet.publicKey) {
      setProgram(null);
      setIsReady(false);
      return;
    }

    let isMounted = true;
    
    initProgram(connection, wallet)
      .then((prog) => {
        if (isMounted) {
          setProgram(prog);
          setIsReady(true);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message || 'Failed to initialize Anchor program');
          console.error('Program initialization error:', err);
          setIsReady(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [connection, wallet, wallet?.publicKey]);

  // Get user ID from wallet public key
  const userId = useMemo(() => {
    return wallet?.publicKey?.toString() || '';
  }, [wallet?.publicKey]);

  const value = useMemo(() => ({
    connection,
    program,
    wallet,
    publicKey: wallet?.publicKey || null,
    userId,
    isReady,
    error,
  }), [connection, program, wallet, userId, isReady, error]);

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
