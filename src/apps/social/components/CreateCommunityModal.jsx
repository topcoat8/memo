import React, { useState, useEffect } from 'react';
import { isValidWalletAddress } from '../../../shared/utils/encryption';
import { PublicKey } from '@solana/web3.js';
import { useMemoContext, useMemo as useMemoProtocol } from '../../../shared/index';

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

    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [ruleTokenMint, setRuleTokenMint] = useState('');
    const [minBalance, setMinBalance] = useState('');
    const [whalePercentage, setWhalePercentage] = useState(0);
    const [totalSupply, setTotalSupply] = useState(null);
    const [fetchingSupply, setFetchingSupply] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [isWhalesOnly, setIsWhalesOnly] = useState(false);

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
        console.log("handleSubmit called");
        console.log("Form values:", { name, address, ruleTokenMint, isWhalesOnly, whalePercentage, minBalance });
        setError('');
        setSuccess('');

        if (!name.trim()) {
            setError('Community Name is required');
            return;
        }

        if (!address.trim() || !isValidWalletAddress(address.trim())) {
            setError('Valid Community Address is required');
            return;
        }

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
            whalePercentage: isWhalesOnly ? whalePercentage : 0
        };

        try {
            const message = JSON.stringify(rules);
            console.log("Sending memo with rules:", rules);
            console.log("sendMemo function:", sendMemo);

            const result = await sendMemo({
                recipientId: address.trim(),
                message: message, // This will be encrypted
                forceLegacy: true, // Encrypts with Community Address as key (Symmetric)
                tokenMint: null // Force System Program (0 SOL) transaction to save space
            });

            console.log("DEBUG: sendMemo result", result);

            if (result.success) {
                setSuccess('Community created! Rules saved on-chain.');
                onCreated({
                    id: address.trim(),
                    name: name.trim()
                });
                setTimeout(onClose, 2000);
            } else {
                console.error("DEBUG: sendMemo failed", result.error);
                setError(result.error || 'Failed to send memo');
            }
        } catch (err) {
            console.error("DEBUG: handleSubmit exception", err);
            setError(err.message || 'Failed to create community');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-4">Create Community</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                            Community Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Solana Degens"
                            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm p-3 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                            Community Wallet Address <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Enter address you control..."
                            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm p-3 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">
                            You must control this address to manage it effectively.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                            Token Mint Address <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={ruleTokenMint}
                            onChange={(e) => setRuleTokenMint(e.target.value)}
                            placeholder="e.g. EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v (USDC)"
                            className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm p-3 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                        />
                        {fetchingSupply && <p className="text-[10px] text-indigo-400 mt-1">Fetching token supply...</p>}
                        {totalSupply !== null && (
                            <p className="text-[10px] text-emerald-400 mt-1">
                                Total Supply: {totalSupply.toLocaleString()}
                            </p>
                        )}
                    </div>

                    <div className="pt-2 border-t border-slate-800">
                        <h3 className="text-sm font-medium text-slate-300 mb-2">Token Gating</h3>

                        <div className="space-y-3">


                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-slate-400">
                                    Whales Only (Optional)
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsWhalesOnly(!isWhalesOnly)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${isWhalesOnly ? 'bg-indigo-600' : 'bg-slate-700'
                                        }`}
                                >
                                    <span
                                        className={`${isWhalesOnly ? 'translate-x-5' : 'translate-x-1'
                                            } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
                                    />
                                </button>
                            </div>

                            {isWhalesOnly && totalSupply !== null && (
                                <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/50">
                                    <label className="block text-xs font-medium text-slate-400 mb-1 flex justify-between">
                                        <span>Minimum Holding Requirement</span>
                                        <span className="text-indigo-400">{whalePercentage}%</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        step="0.1"
                                        value={whalePercentage}
                                        onChange={(e) => setWhalePercentage(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                                        <span>1%</span>
                                        <span>10%</span>
                                    </div>
                                    {minBalance > 0 && (
                                        <p className="text-xs text-slate-300 mt-2 text-center">
                                            Requires holding <span className="font-mono text-indigo-300">{minBalance.toLocaleString()}</span> tokens
                                        </p>
                                    )}
                                </div>
                            )}

                            {isWhalesOnly && !ruleTokenMint && (
                                <div className="text-indigo-400 text-xs bg-indigo-950/30 p-2 rounded border border-indigo-900/50">
                                    Enter a Token Mint Address above to enable Whale settings.
                                </div>
                            )}

                            {isWhalesOnly && totalSupply === null && !fetchingSupply && ruleTokenMint && (
                                <div className="text-amber-400 text-xs bg-amber-950/30 p-2 rounded border border-amber-900/50">
                                    Cannot fetch total supply. "Whales Only" mode requires a valid token supply.
                                </div>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="text-rose-400 text-xs bg-rose-950/30 p-2 rounded border border-rose-900/50">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="text-emerald-400 text-xs bg-emerald-950/30 p-2 rounded border border-emerald-900/50">
                            {success}
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
                            disabled={isLoading}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg transition-colors text-sm shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                        >
                            {isLoading ? 'Creating...' : 'Create & Save Rules'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
