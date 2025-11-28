import React, { useState, useEffect, useRef } from "react";
import { useCommunityMessages, useMemoContext, useMemo as useMemoProtocol } from '../sdk/index';
import { COMMUNITY_ADDRESS } from '../sdk/constants';
import communityIcon from '../../assets/pfp.jpg';

export default function CommunityChat() {
    const { connection, publicKey, userId, isReady, wallet, tokenMint, encryptionKeys } = useMemoContext();
    const [message, setMessage] = useState("");
    const messagesEndRef = useRef(null);

    const { memos, loading, error: fetchError } = useCommunityMessages({
        connection: isReady ? connection : null,
        tokenMint,
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

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [memos]);

    const handleSend = async () => {
        if (!message.trim()) return;

        await sendMemo({
            recipientId: COMMUNITY_ADDRESS,
            message: message,
            forceLegacy: true // Force symmetric encryption for public visibility
        });

        setMessage("");
    };

    const renderMessageContent = (text) => {
        // Basic URL linking, but NO image embedding as per requirements
        return text;
    };

    if (COMMUNITY_ADDRESS === "INSERT_COMMUNITY_ADDRESS_HERE") {
        return (
            <div className="flex-1 flex items-center justify-center text-slate-500 p-8 text-center">
                <div>
                    <h3 className="text-lg font-medium text-slate-300 mb-2">Community Chat Unavailable</h3>
                    <p>The community address has not been configured yet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-950 relative w-full">
            {/* Header */}
            <div className="h-16 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-indigo-500/30">
                        <img src={communityIcon} alt="Community" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <div className="text-sm font-medium text-slate-200 flex items-center gap-2">
                            <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                                Community Wall
                            </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                            Public • Text Only • {memos.length} Messages
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 min-h-0">
                {loading && memos.length === 0 ? (
                    <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                    </div>
                ) : (
                    memos.map((msg) => {
                        const isMe = msg.senderId === userId;
                        // Use decrypted content if available, otherwise show placeholder
                        const content = msg.decryptedContent || "[Encrypted]";

                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] md:max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                    <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-2">
                                        <span className="font-mono text-[9px] opacity-70">{msg.senderId.slice(0, 4)}...{msg.senderId.slice(-4)}</span>
                                        <span>•</span>
                                        {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div
                                        className={`p-3.5 rounded-2xl shadow-sm ${isMe
                                            ? 'bg-indigo-600 text-white rounded-br-sm'
                                            : 'bg-slate-800 text-slate-200 rounded-bl-sm'
                                            }`}
                                    >
                                        <div className="text-sm break-words whitespace-pre-wrap leading-relaxed">
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
            <div className="p-4 border-t border-slate-800 bg-slate-950">
                {(sendError || fetchError || successMessage) && (
                    <div className="mb-3 text-xs px-1">
                        {(sendError || fetchError) && <span className="text-rose-400">Error: {sendError || fetchError}</span>}
                        {successMessage && <span className="text-emerald-400">Success: {successMessage}</span>}
                    </div>
                )}

                <div className="flex gap-3">
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder={isReady ? "Type a message to the community..." : "Connect wallet to chat"}
                        disabled={!isReady || isSending}
                        className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 p-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none h-12 disabled:opacity-50 rounded-lg transition-all"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!isReady || isSending || !message.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 md:px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-lg text-sm shadow-lg shadow-indigo-500/20"
                    >
                        {isSending ? '...' : 'Send'}
                    </button>
                </div>
                <div className="mt-2 text-[10px] text-slate-600 flex justify-between px-1">
                    <span>Public Message</span>
                    <span>No Images Allowed</span>
                </div>
            </div>
        </div>
    );
}
