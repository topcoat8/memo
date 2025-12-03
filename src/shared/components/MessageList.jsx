import React, { useEffect, useRef, useMemo } from 'react';

export default function MessageList({ messages, userId, decryptMessage, allowImages = true, onSignContract }) {
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [messages]);

    // Pre-process messages to handle decryption and identify signatures
    const { processedMessages, signatureMap } = useMemo(() => {
        const processed = messages.map(msg => {
            const decrypted = decryptMessage(msg);
            let data = null;
            try {
                if (decrypted.trim().startsWith('{') && decrypted.trim().endsWith('}')) {
                    data = JSON.parse(decrypted);
                }
            } catch (e) { /* ignore */ }
            return { ...msg, decrypted, data };
        });

        const sigMap = {};
        processed.forEach(msg => {
            if (msg.data && msg.data.type === 'contract_signature') {
                sigMap[msg.data.contractTimestamp] = {
                    signerId: msg.senderId,
                    timestamp: msg.data.timestamp
                };
            }
        });

        return { processedMessages: processed, signatureMap: sigMap };
    }, [messages, decryptMessage]);

    const renderMessageContent = (msg) => {
        const { decrypted, data, senderId } = msg;

        // Check for contract JSON
        if (data && data.type === 'contract') {
            const signature = signatureMap[data.timestamp];
            const isSigned = !!signature;
            const isRecipient = senderId !== userId;

            return (
                <div className="bg-slate-950/50 rounded-lg border border-indigo-500/30 overflow-hidden min-w-[200px] max-w-md">
                    <div className="bg-indigo-900/20 p-3 border-b border-indigo-500/20 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-indigo-400">
                                <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Contract</span>
                        </div>
                        {isSigned && (
                            <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-emerald-400">
                                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                </svg>
                                <span className="text-[10px] font-bold text-emerald-400">SIGNED</span>
                            </div>
                        )}
                    </div>
                    <div className="p-4">
                        <h4 className="font-bold text-slate-200 mb-2 text-lg">{data.title}</h4>
                        <div className="text-sm text-slate-300 whitespace-pre-wrap font-mono bg-black/20 p-3 rounded border border-slate-800/50 max-h-60 overflow-y-auto custom-scrollbar">
                            {data.content}
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[10px] text-emerald-400">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                                </svg>
                                Verified on Chain
                            </div>

                            {!isSigned && isRecipient && onSignContract && (
                                <button
                                    onClick={() => onSignContract(data)}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-md transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-1"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                        <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                                    </svg>
                                    Sign Contract
                                </button>
                            )}
                        </div>

                        {isSigned && (
                            <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-slate-500 font-mono">
                                Signed by {signature.signerId.slice(0, 6)}...{signature.signerId.slice(-4)} at {new Date(signature.timestamp).toLocaleString()}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // Hide signature messages from the main flow
        if (data && data.type === 'contract_signature') {
            return null;
        }

        if (!allowImages) return decrypted;

        // Updated regex to include data:image URIs
        const imgRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp)|data:image\/[a-zA-Z]+;base64,[^\s]+)/i;
        const match = decrypted.match(imgRegex);

        if (match) {
            const parts = decrypted.split(match[0]);
            return (
                <div>
                    {parts[0]}
                    <div className="mt-2 mb-2">
                        <img src={match[0]} alt="Embedded content" className="max-w-full h-auto rounded-lg border border-slate-700 max-h-64 object-contain" />
                    </div>
                    {parts[1]}
                </div>
            );
        }
        return decrypted;
    };

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 min-h-0">
            {processedMessages.map((msg) => {
                const isMe = msg.senderId === userId;
                const content = renderMessageContent(msg);

                // If content is null (e.g. hidden signature), don't render the bubble
                if (content === null) return null;

                return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] md:max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                            <div className="text-[10px] text-slate-500 mb-1">
                                {isMe ? 'You' : msg.senderId.slice(0, 8)} • {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div
                                className={`p-3.5 rounded-2xl shadow-sm ${isMe
                                    ? 'bg-indigo-600 text-white rounded-br-sm'
                                    : 'bg-slate-800 text-slate-200 rounded-bl-sm'
                                    }`}
                            >
                                <div className="text-sm break-words whitespace-pre-wrap leading-relaxed">
                                    {content}
                                </div>
                            </div>
                            {msg.isAsymmetric && (
                                <div className="mt-1 text-[9px] text-emerald-500/70 flex items-center justify-end gap-1">
                                    <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                                    Encrypted
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </div>
    );
}
