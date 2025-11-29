import React, { useState, useEffect } from 'react';
import { isValidWalletAddress } from '../../../shared/utils/encryption';
import { useMemoContext, useCommunityRules } from '../../../shared/index';
import { PublicKey } from '@solana/web3.js';
import { X, Users, Wallet, Search, AlertCircle, CheckCircle2, Shield } from 'lucide-react';

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <div className="bg-slate-900/90 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-400" />
                            Join Community
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">
                                Community Wallet Address
                            </label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Enter Solana address..."
                                    className="w-full bg-black/20 border border-white/10 text-slate-200 text-sm p-3 pl-10 rounded-xl focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-slate-600"
                                    autoFocus
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-indigo-500/50 transition-colors" />
                            </div>
                            {rulesLoading && <p className="text-[10px] text-indigo-400 mt-1.5 ml-1 animate-pulse">Checking community rules...</p>}
                            {rules && (
                                <div className="mt-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-200">
                                    <p className="font-bold flex items-center gap-1.5 mb-1 text-indigo-300">
                                        <Shield className="w-3 h-3" />
                                        Community Rules Found
                                    </p>
                                    {rules.name && <p className="ml-4.5 mb-0.5 opacity-80">Name: {rules.name}</p>}
                                    {rules.minBalance > 0 && <p className="ml-4.5 opacity-80">Requires {rules.minBalance.toLocaleString()} tokens</p>}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">
                                Community Name (Optional)
                            </label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={rules?.name || "e.g. My Token Group"}
                                    className="w-full bg-black/20 border border-white/10 text-slate-200 text-sm p-3 pl-10 rounded-xl focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-slate-600"
                                />
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-indigo-500/50 transition-colors" />
                            </div>
                        </div>

                        {error && (
                            <div className="text-rose-300 text-xs bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3 mt-6 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 font-medium py-3 rounded-xl transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={checkingRules || rulesLoading}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-all text-sm shadow-lg shadow-indigo-500/20 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {checkingRules ? 'Checking...' : 'Join'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
