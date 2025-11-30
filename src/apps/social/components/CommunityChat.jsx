import React, { useState, useEffect, useRef } from "react";
import { useCommunityMessages, useMemoContext, useMemo as useMemoProtocol, useChatTokenBalances } from '../../../shared/index';
import { Send, Info, Hash, Users, Coins } from 'lucide-react';
import communityIcon from '../../../../assets/pfp.jpg';

export default function CommunityChat({ communityAddress, communityName = "Community Wall" }) {
    const { connection, publicKey, userId, isReady, wallet, tokenMint, encryptionKeys } = useMemoContext();
    const [message, setMessage] = useState("");
    const messagesEndRef = useRef(null);

    const { memos, loading, error: fetchError } = useCommunityMessages({
        connection: isReady ? connection : null,
        tokenMint,
        communityAddress,
        limit: 100,
    });

    const { sendMemo, isLoading: isSending, error: sendError, successMessage } = useMemoProtocol({
        connection,
        publicKey,
        userId,
        isReady,
        wallet,
        tokenMint,
        encryptionKeys,
    });

    // Get unique sender IDs for balance fetching
    const senderIds = React.useMemo(() => {
        if (!memos) return [];
        return [...new Set(memos.map(m => m.senderId))];
    }, [memos]);

    const { balances } = useChatTokenBalances({
        connection: isReady ? connection : null,
        tokenMint,
        userIds: senderIds
    });

    // Check for showBalances rule
    const showBalancesRule = React.useMemo(() => {
        const rulesMsg = memos.find(m => m.decryptedContent && m.decryptedContent.includes('COMMUNITY_RULES'));
        if (rulesMsg) {
            try {
                const parsed = JSON.parse(rulesMsg.decryptedContent);
                return !!parsed.showBalances;
            } catch (e) {
                return false;
            }
        }
        return false;
    }, [memos]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [memos]);

    const handleSend = async () => {
        if (!message.trim()) return;

        await sendMemo({
            recipientId: communityAddress,
            message: message,
            forceLegacy: true // Force symmetric encryption for public visibility
        });

        setMessage("");
    };

    const renderMessageContent = (text) => {
        // Try to parse as JSON rules
        try {
            if (typeof text === 'string' && text.startsWith('{') && text.includes('COMMUNITY_RULES')) {
                const parsed = JSON.parse(text);
                return (
                    <div className="bg-slate-900/60 p-4 rounded-xl border border-indigo-500/20 font-mono text-xs overflow-hidden shadow-lg">
                        <div className="font-bold text-indigo-400 mb-3 border-b border-white/5 pb-2 flex items-center gap-2">
                            <Info className="w-3 h-3" />
                            Community Rules Update
                        </div>
                        <div className="grid gap-2">
                            <div className="flex justify-between"><span className="text-slate-500">Name:</span> <span className="text-slate-300 font-medium">{parsed.name}</span></div>
                            <div className="flex flex-col gap-1">
                                <span className="text-slate-500">Mint:</span>
                                <span className="text-slate-300 break-all bg-black/20 p-1.5 rounded border border-white/5">{parsed.tokenMint}</span>
                            </div>
                            {parsed.whalePercentage > 0 && (
                                <div className="flex justify-between"><span className="text-slate-500">Whales Only:</span> <span className="text-emerald-400 font-bold">Top {parsed.whalePercentage}%</span></div>
                            )}
                            {parsed.minBalance > 0 && (
                                <div className="flex justify-between"><span className="text-slate-500">Min Balance:</span> <span className="text-slate-300">{parsed.minBalance}</span></div>
                            )}
                            {parsed.minBalance > 0 && (
                                <div className="flex justify-between"><span className="text-slate-500">Min Balance:</span> <span className="text-slate-300">{parsed.minBalance}</span></div>
                            )}
                            <div className="flex justify-between"><span className="text-slate-500">Show Balances:</span> <span className={parsed.showBalances ? "text-emerald-400" : "text-slate-500"}>{parsed.showBalances ? "Enabled" : "Disabled"}</span></div>
                        </div>
                    </div>
                );
            }
        } catch (e) {
            // Not JSON or invalid, render as text
        }
        return text;
    };

    if (!communityAddress || communityAddress === "INSERT_COMMUNITY_ADDRESS_HERE") {
        return (
            <div className="flex-1 flex items-center justify-center text-slate-500 p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-900/5 pointer-events-none" />
                <div className="relative z-10 max-w-md">
                    <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-2xl rotate-3">
                        <Users className="w-10 h-10 text-slate-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">Select a Community</h3>
                    <p className="text-slate-400 leading-relaxed">
                        Choose a community from the sidebar to start chatting, or create your own token-gated group.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full relative w-full">
            {/* Header */}
            <div className="h-24 border-b border-white/5 flex items-center justify-between px-6 bg-slate-900/40 backdrop-blur-xl sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 shadow-lg shadow-indigo-500/10">
                        <img src={communityIcon} alt="Community" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="font-bold text-lg text-white tracking-tight">
                                {communityName}
                            </h2>
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(communityAddress);
                                }}
                                className="text-[10px] font-mono text-slate-500 hover:text-indigo-300 transition-colors flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-md border border-white/5 hover:border-indigo-500/30 group"
                                title="Click to Copy Address"
                            >
                                <Hash className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                                {communityAddress}
                            </button>
                        </div>

                        <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                            <Users className="w-3 h-3" />
                            {memos.length} Messages
                        </div>
                    </div>
                </div>
            </div>

            {/* Pinned Rules - Static at top */}
            {
                memos.find(m => m.decryptedContent && m.decryptedContent.includes('COMMUNITY_RULES')) && (
                    <div className="bg-indigo-900/10 border-b border-indigo-500/10 p-3 flex items-start gap-3 backdrop-blur-md z-10 shrink-0">
                        <div className="text-indigo-400 mt-0.5 bg-indigo-500/10 p-1.5 rounded-lg">
                            <Info className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-indigo-300 mb-1">Community Rules</div>
                            <div className="text-xs text-slate-400 line-clamp-2">
                                {renderMessageContent(memos.find(m => m.decryptedContent && m.decryptedContent.includes('COMMUNITY_RULES')).decryptedContent)}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 min-h-0 custom-scrollbar flex flex-col">
                {loading && memos.length === 0 ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent"></div>
                    </div>
                ) : (
                    // Reverse memos to show Oldest -> Newest (Top -> Bottom)
                    [...memos]
                        .reverse()
                        .filter(m => !m.decryptedContent || !m.decryptedContent.includes('COMMUNITY_RULES'))
                        .map((msg) => {
                            const isMe = msg.senderId === userId;
                            const content = msg.decryptedContent || "[Encrypted]";

                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                                    <div className={`max-w-[85%] md:max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                        <div className="text-[10px] text-slate-500 mb-1.5 flex items-center gap-2 px-1">
                                            <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${isMe ? 'bg-indigo-500/10 text-indigo-300' : 'bg-slate-800 text-slate-400'}`}>
                                                {msg.senderId.slice(0, 4)}...{msg.senderId.slice(-4)}
                                            </span>
                                            {showBalancesRule && balances[msg.senderId] !== undefined && (
                                                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                                    <Coins className="w-2 h-2" />
                                                    {(balances[msg.senderId] / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1, minimumFractionDigits: 0 })}M
                                                </span>
                                            )}
                                            <span className="opacity-50">•</span>
                                            <span className="opacity-70">{msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div
                                            className={`p-4 rounded-2xl shadow-sm backdrop-blur-sm border transition-all ${isMe
                                                ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-br-sm border-indigo-500/50 shadow-indigo-500/20'
                                                : 'bg-slate-800/80 text-slate-200 rounded-bl-sm border-white/5 hover:border-white/10'
                                                }`}
                                        >
                                            <div className="text-sm break-all whitespace-pre-wrap leading-relaxed">
                                                {renderMessageContent(content)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/5 bg-slate-900/60 backdrop-blur-xl">
                {(sendError || fetchError || successMessage) && (
                    <div className="mb-3 text-xs px-1">
                        {(sendError || fetchError) && (
                            <div className="flex items-center gap-2 text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                                <Info className="w-3 h-3" />
                                {sendError || fetchError}
                            </div>
                        )}
                        {successMessage && (
                            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                                <Info className="w-3 h-3" />
                                {successMessage}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex gap-3 items-end">
                    <div className="flex-1 relative group">
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder={isReady ? `Message #${communityName}...` : "Connect wallet to chat"}
                            disabled={!isReady || isSending}
                            className="w-full bg-slate-900/50 border border-slate-700/50 text-slate-200 p-4 pr-12 text-sm focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 outline-none resize-none h-[52px] disabled:opacity-50 rounded-xl transition-all placeholder:text-slate-600 focus:bg-slate-900"
                        />
                        <div className="absolute right-3 bottom-3 text-slate-600 pointer-events-none group-focus-within:text-indigo-500/50 transition-colors">
                            <Hash className="w-4 h-4" />
                        </div>
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!isReady || isSending || !message.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white p-3.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-xl shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95"
                    >
                        {isSending ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </div>
                <div className="mt-2 text-[10px] text-slate-500 flex justify-end px-1 font-medium">
                    <span className="opacity-70">Markdown Supported</span>
                </div>
            </div>
        </div>
    );
}
