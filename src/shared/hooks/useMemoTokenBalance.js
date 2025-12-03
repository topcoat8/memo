/**
 * Memo Protocol - useMemoTokenBalance Hook
 * 
 * Hook for fetching and managing $MEMO token balance.
 */

import { useState, useEffect, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';

/**
 * Hook for getting user's $MEMO token balance
 * 
 * @param {Object} options - Hook options
 * @param {Connection} options.connection - Solana connection
 * @param {PublicKey} options.publicKey - User's public key
 * @param {PublicKey} options.memoMint - $MEMO token mint address
 * @param {boolean} options.isReady - Whether connection is ready
 * @returns {Object} - Token balance state
 */
export function useMemoTokenBalance({ connection, publicKey, memoMint, isReady }) {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tokenAccount, setTokenAccount] = useState(null);

  // Fetch token balance
  const fetchBalance = useCallback(async () => {
    if (!connection || !publicKey || !memoMint || !isReady) {
      setBalance(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Find the associated token account
      const mintKey = typeof memoMint === 'string' ? new PublicKey(memoMint) : memoMint;
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        mint: mintKey,
      });

      if (tokenAccounts.value.length > 0) {
        const account = tokenAccounts.value[0];
        const balance = account.account.data.parsed.info.tokenAmount.uiAmount;
        setBalance(balance || 0);
        setTokenAccount(new PublicKey(account.pubkey));
      } else {
        setBalance(0);
        setTokenAccount(null);
      }
    } catch (err) {
      console.error('Failed to fetch token balance:', err);
      setError(err?.message || 'Failed to fetch balance');
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, memoMint, isReady]);

  // Fetch balance on mount and when dependencies change
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Refresh balance
  const refresh = useCallback(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    loading,
    error,
    tokenAccount,
    refresh,
  };
}

