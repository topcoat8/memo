import React, { useState, useEffect } from 'react';
import { isValidWalletAddress } from '../../../shared/utils/encryption';
import { useMemoContext, useCommunityRules } from '../../../shared/index';
import { PublicKey } from '@solana/web3.js';

export default function JoinCommunityModal({ isOpen, onClose, onJoin }) {
    const { connection, publicKey } = useMemoContext();
    const [address, setAddress] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [checkingRules, setCheckingRules] = useState(false);

    // Fetch rules for the entered address
    // We only pass a valid address to the hook to avoid unnecessary calls
    const validAddress = isValidWalletAddress(address) ? address : null;
    const { rules, loading: rulesLoading } = useCommunityRules({
        connection,
        communityAddress: validAddress
    });

    useEffect(() => {
        if (rules) {
            console.log("Found community rules:", rules);
        }
    }, [rules]);

    if (!isOpen) return null;

    const checkBalance = async (mint, minAmount) => {
        if (!publicKey || !connection) return 0;
        try {
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
                mint: new PublicKey(mint),
            });
            if (tokenAccounts.value.length > 0) {
                return tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount || 0;
            }
            return 0;
        } catch (e) {
            console.error("Failed to check balance:", e);
            return 0;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setCheckingRules(true);

        if (!address.trim()) {
            setError('Wallet address is required');
            setCheckingRules(false);
            return;
        }

        if (!isValidWalletAddress(address.trim())) {
            setError('Invalid wallet address');
            setCheckingRules(false);
            return;
        }

        // Check Rules
        if (rules && rules.tokenMint) {
            let requiredAmount = rules.minBalance || 0;

            // specific check for whale percentage
            if (rules.whalePercentage > 0) {
                try {
                    const mintPubkey = new PublicKey(rules.tokenMint);
                    const supplyInfo = await connection.getTokenSupply(mintPubkey);
                    const supply = supplyInfo.value.uiAmount;
                    if (supply) {
                        const calculated = (supply * (rules.whalePercentage / 100));
                        // Use the greater of minBalance or calculated percentage
                        requiredAmount = Math.max(requiredAmount, calculated);
                    }
                } catch (err) {
                    console.error("Failed to fetch supply for whale check:", err);
                    // Fallback to minBalance if supply fetch fails
                }
            }

            if (requiredAmount > 0) {
                const balance = await checkBalance(rules.tokenMint, requiredAmount);
                if (balance < requiredAmount) {
                    setError(`Access Denied: You need at least ${requiredAmount.toLocaleString()} tokens (${rules.whalePercentage ? `Top ${rules.whalePercentage}%` : 'Minimum Balance'}) to join this community.`);
                    setCheckingRules(false);
                    return;
                }
            }
        }

        const communityName = name.trim() || (rules && rules.name) || `Community ${address.slice(0, 4)}...${address.slice(-4)}`;

        onJoin({
            id: address.trim(),
            name: communityName,
        });

        setAddress('');
        setName('');
        setCheckingRules(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-4">Join Community</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                            Community Wallet Address
                        </label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Enter Solana address..."
                            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm p-3 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                            autoFocus
                        />
                        {rulesLoading && <p className="text-[10px] text-indigo-400 mt-1">Checking community rules...</p>}
                        {rules && (
                            <div className="mt-2 p-2 bg-indigo-900/20 border border-indigo-500/30 rounded text-xs text-indigo-200">
                                <p className="font-semibold">Community Rules Found:</p>
                                {rules.name && <p>Name: {rules.name}</p>}
                                {rules.minBalance > 0 && <p>Requires {rules.minBalance} tokens</p>}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                            Community Name (Optional)
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={rules?.name || "e.g. My Token Group"}
                            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm p-3 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                        />
                    </div>

                    {error && (
                        <div className="text-rose-400 text-xs bg-rose-950/30 p-2 rounded border border-rose-900/50">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 rounded-lg transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={checkingRules || rulesLoading}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition-colors text-sm shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                        >
                            {checkingRules ? 'Checking...' : 'Join'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
