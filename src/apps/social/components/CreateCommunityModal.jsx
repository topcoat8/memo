import React, { useState, useEffect } from 'react';
import { isValidWalletAddress } from '../../../shared/utils/encryption';
import { PublicKey, Keypair } from '@solana/web3.js';
import { useMemoContext, useMemo as useMemoProtocol, useMemoTokenBalance } from '../../../shared/index';
import { X, Users, Wallet, Coins, Shield, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

export default function CreateCommunityModal({ isOpen, onClose, onCreated }) {
    const { connection, publicKey, userId, isReady, wallet, tokenMint, encryptionKeys } = useMemoContext();
    const { sendMemo, isLoading } = useMemoProtocol({
        connection,
        publicKey,
        userId,
        isReady,
        wallet,
        tokenMint,
        encryptionKeys
    });

    // Fetch MEMO balance
    const { balance: memoBalance, loading: balanceLoading } = useMemoTokenBalance({
        connection,
        publicKey,
        memoMint: tokenMint,
        isReady
    });

    const MIN_REQUIRED_MEMO = 500000;
    const hasEnoughMemo = memoBalance >= MIN_REQUIRED_MEMO;

    const [name, setName] = useState('');
    // Address is now automatically generated
    const [ruleTokenMint, setRuleTokenMint] = useState('');
    const [minBalance, setMinBalance] = useState('');
    const [whalePercentage, setWhalePercentage] = useState(0);
    const [totalSupply, setTotalSupply] = useState(null);
    const [fetchingSupply, setFetchingSupply] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [isWhalesOnly, setIsWhalesOnly] = useState(false);
    const [showBalances, setShowBalances] = useState(false);
    const [retentionPeriod, setRetentionPeriod] = useState(3 * 24 * 60 * 60); // Default 3 days

    // Fetch Token Supply when mint changes
    useEffect(() => {
        if (!ruleTokenMint || !isValidWalletAddress(ruleTokenMint) || !connection) {
            setTotalSupply(null);
            return;
        }

        const fetchSupply = async () => {
            setFetchingSupply(true);
            try {
                const mintPubkey = new PublicKey(ruleTokenMint);
                const supplyInfo = await connection.getTokenSupply(mintPubkey);
                setTotalSupply(supplyInfo.value.uiAmount);
            } catch (err) {
                console.error("Failed to fetch supply:", err);
                setTotalSupply(null);
            } finally {
                setFetchingSupply(false);
            }
        };

        const timeoutId = setTimeout(fetchSupply, 500); // Debounce
        return () => clearTimeout(timeoutId);
    }, [ruleTokenMint, connection]);

    // Update minBalance when slider changes or toggle changes
    useEffect(() => {
        if (!isWhalesOnly) {
            setMinBalance('');
            return;
        }

        if (totalSupply !== null && whalePercentage > 0) {
            const calculated = (totalSupply * (whalePercentage / 100));
            setMinBalance(calculated);
        }
    }, [whalePercentage, totalSupply, isWhalesOnly]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!name.trim()) {
            setError('Community Name is required');
            return;
        }

        if (!hasEnoughMemo) {
            setError(`You need at least ${MIN_REQUIRED_MEMO.toLocaleString()} MEMO to create a community.`);
            return;
        }

        // Generate a fresh keypair for the community
        const communityKeypair = Keypair.generate();
        const communityAddress = communityKeypair.publicKey.toString();

        if (!ruleTokenMint.trim() || !isValidWalletAddress(ruleTokenMint.trim())) {
            setError('Valid Token Mint Address is required');
            return;
        }

        // Prepare Rules Object
        const rules = {
            type: 'COMMUNITY_RULES',
            name: name.trim(),
            tokenMint: ruleTokenMint.trim(),
            minBalance: minBalance ? parseFloat(minBalance) : 0,
            whalePercentage: isWhalesOnly ? whalePercentage : 0,
            showBalances: showBalances,
            retentionPeriod: retentionPeriod
        };

        try {
            const message = JSON.stringify(rules);
            const result = await sendMemo({
                recipientId: communityAddress,
                message: message, // This will be encrypted
                forceLegacy: true, // Encrypts with Community Address as key (Symmetric)
                tokenMint: null // Force System Program (0 SOL) transaction to save space
            });

            if (result.success) {
                setSuccess('Community created! Rules saved on-chain.');
                onCreated({
                    id: communityAddress,
                    name: name.trim()
                });
                setTimeout(onClose, 2000);
            } else {
                setError(result.error || 'Failed to send memo');
            }
        } catch (err) {
            setError(err.message || 'Failed to create community');
        }
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
                            Create Community
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {!balanceLoading && (
                        <div className={`mb-6 p-3 rounded-xl border ${hasEnoughMemo ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'} flex items-center justify-between`}>
                            <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg ${hasEnoughMemo ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                    <Shield className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className={`text-xs font-medium ${hasEnoughMemo ? 'text-emerald-300' : 'text-rose-300'}`}>
                                        {hasEnoughMemo ? 'Requirement Met' : 'Insufficient Balance'}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                        Requires {MIN_REQUIRED_MEMO.toLocaleString()} MEMO
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-white">{memoBalance.toLocaleString()}</p>
                                <p className="text-[10px] text-slate-500">Your Balance</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">
                                Community Name <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Solana Degens"
                                    className="w-full bg-black/20 border border-white/10 text-slate-200 text-sm p-3 pl-10 rounded-xl focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-slate-600"
                                    autoFocus
                                />
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-indigo-500/50 transition-colors" />
                            </div>
                        </div>



                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">
                                Token Mint Address <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={ruleTokenMint}
                                    onChange={(e) => setRuleTokenMint(e.target.value)}
                                    placeholder="e.g. EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
                                    className="w-full bg-black/20 border border-white/10 text-slate-200 text-sm p-3 pl-10 rounded-xl focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-slate-600"
                                />
                                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-indigo-500/50 transition-colors" />
                            </div>
                            {fetchingSupply && <p className="text-[10px] text-indigo-400 mt-1.5 ml-1 animate-pulse">Fetching token supply...</p>}
                            {totalSupply !== null && (
                                <p className="text-[10px] text-emerald-400 mt-1.5 ml-1 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Total Supply: {totalSupply.toLocaleString()}
                                </p>
                            )}
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-indigo-400" />
                                    <h3 className="text-sm font-medium text-slate-300">Token Gating</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">Whales Only</span>
                                    <button
                                        type="button"
                                        onClick={() => setIsWhalesOnly(!isWhalesOnly)}
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${isWhalesOnly ? 'bg-indigo-600' : 'bg-slate-700'}`}
                                    >
                                        <span className={`${isWhalesOnly ? 'translate-x-5' : 'translate-x-1'} inline-block h-3 w-3 transform rounded-full bg-white transition-transform`} />
                                    </button>
                                </div>
                            </div>

                            {isWhalesOnly && totalSupply !== null && (
                                <div className="bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/20">
                                    <label className="block text-xs font-medium text-slate-400 mb-2 flex justify-between">
                                        <span>Minimum Holding Requirement</span>
                                        <span className="text-indigo-300 font-bold">{whalePercentage}%</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        step="0.1"
                                        value={whalePercentage}
                                        onChange={(e) => setWhalePercentage(parseFloat(e.target.value))}
                                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-mono">
                                        <span>1%</span>
                                        <span>10%</span>
                                    </div>
                                    {minBalance > 0 && (
                                        <p className="text-xs text-slate-300 mt-3 text-center bg-black/20 p-2 rounded-lg border border-white/5">
                                            Requires holding <span className="font-mono text-indigo-300 font-bold">{minBalance.toLocaleString()}</span> tokens
                                        </p>
                                    )}
                                </div>
                            )}

                            {isWhalesOnly && !ruleTokenMint && (
                                <div className="text-indigo-300 text-xs bg-indigo-500/10 p-3 rounded-xl border border-indigo-500/20 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    Enter a Token Mint Address above to enable Whale settings.
                                </div>
                            )}

                            {isWhalesOnly && totalSupply === null && !fetchingSupply && ruleTokenMint && (
                                <div className="text-amber-300 text-xs bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    Cannot fetch total supply. "Whales Only" mode requires a valid token supply.
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Coins className="w-4 h-4 text-indigo-400" />
                                    <h3 className="text-sm font-medium text-slate-300">Display Settings</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">Show Member Balances</span>
                                    <button
                                        type="button"
                                        onClick={() => setShowBalances(!showBalances)}
                                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${showBalances ? 'bg-indigo-600' : 'bg-slate-700'}`}
                                    >
                                        <span className={`${showBalances ? 'translate-x-5' : 'translate-x-1'} inline-block h-3 w-3 transform rounded-full bg-white transition-transform`} />
                                    </button>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2 ml-6">
                                If enabled, everyone in the chat will see each other's token balances. This cannot be changed later.
                            </p>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-indigo-400" />
                                    <h3 className="text-sm font-medium text-slate-300">Message Retention</h3>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { label: '24 Hours', value: 24 * 60 * 60 },
                                    { label: '3 Days', value: 3 * 24 * 60 * 60 },
                                    { label: '7 Days', value: 7 * 24 * 60 * 60 },
                                    { label: 'Forever', value: 0 }
                                ].map((option) => (
                                    <button
                                        key={option.label}
                                        type="button"
                                        onClick={() => setRetentionPeriod(option.value)}
                                        className={`p-2 rounded-lg text-xs font-medium border transition-all ${retentionPeriod === option.value
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2">
                                Messages older than this limit will not be loaded for users. "Forever" means no limit (up to 7 days due to RPC constraints).
                            </p>
                        </div>

                        {error && (
                            <div className="text-rose-300 text-xs bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="text-emerald-300 text-xs bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                                {success}
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
                                disabled={isLoading || !hasEnoughMemo}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-all text-sm shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {isLoading ? 'Creating...' : 'Create & Save Rules'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
