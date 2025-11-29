import React, { useEffect, useRef } from 'react';

export default function MessageList({ messages, userId, decryptMessage, allowImages = true }) {
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
    }, [messages]);

    const renderMessageContent = (text) => {
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
