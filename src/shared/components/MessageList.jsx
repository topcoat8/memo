import React, { useEffect, useRef } from 'react';

export default function MessageList({ messages, userId, decryptMessage, allowImages = true }) {
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [messages]);

    const renderMessageContent = (text) => {
        // Check for contract JSON
        try {
            if (text.trim().startsWith('{') && text.trim().endsWith('}')) {
                const data = JSON.parse(text);
                if (data.type === 'contract') {
                    return (
                        <div className="bg-slate-950/50 rounded-lg border border-indigo-500/30 overflow-hidden min-w-[200px]">
                            <div className="bg-indigo-900/20 p-3 border-b border-indigo-500/20 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-indigo-400">
                                    <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Contract</span>
                            </div>
                            <div className="p-4">
                                <h4 className="font-bold text-slate-200 mb-2 text-lg">{data.title}</h4>
                                <div className="text-sm text-slate-300 whitespace-pre-wrap font-mono bg-black/20 p-3 rounded border border-slate-800/50">
                                    {data.content}
                                </div>
                                <div className="mt-3 flex items-center gap-2 text-[10px] text-emerald-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                                    </svg>
                                    Verified on Chain
                                </div>
                            </div>
                        </div>
                    );
                }
            }
        } catch (e) {
            // Not JSON or failed to parse, treat as normal text
        }

        if (!allowImages) return text;

        // Updated regex to include data:image URIs
        const imgRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp)|data:image\/[a-zA-Z]+;base64,[^\s]+)/i;
        const match = text.match(imgRegex);

        if (match) {
            const parts = text.split(match[0]);
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
        return text;
    };

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 min-h-0">
            {messages.map((msg) => {
                const isMe = msg.senderId === userId;
                const decrypted = decryptMessage(msg);

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
                                    {renderMessageContent(decrypted)}
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
