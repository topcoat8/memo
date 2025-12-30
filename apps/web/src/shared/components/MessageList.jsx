import React, { useEffect, useRef, useMemo } from 'react';
import { generateContractPDF, generateHistoryPDF } from '../utils/pdfGenerator';

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
                        <div className="flex items-center gap-2">
                            {isSigned && (
                                <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-emerald-400">
                                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-[10px] font-bold text-emerald-400">SIGNED</span>
                                </div>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    generateContractPDF(data.title, data.content, isSigned ? signature : null);
                                }}
                                className="text-indigo-400 hover:text-indigo-300 transition-colors p-1 hover:bg-indigo-500/10 rounded"
                                title="Download PDF"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.965 3.129V2.75z" />
                                    <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                                </svg>
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const contactId = senderId === userId ? msg.recipientId : senderId;
                                    generateHistoryPDF(processedMessages, userId, contactId);
                                }}
                                className="text-indigo-400 hover:text-indigo-300 transition-colors p-1 hover:bg-indigo-500/10 rounded"
                                title="Export Full History"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm4.75 6.75a.75.75 0 011.5 0v2.546l.943-1.048a.75.75 0 011.114 1.004l-2.25 2.5a.75.75 0 01-1.114 0l-2.25-2.5a.75.75 0 111.114-1.004l.943 1.048V8.75z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
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

        // Burn Upon Read Logic
        if (data && data.type === 'burn_on_read') {
            const burnedKey = `burned_${data.timestamp}_${data.content.length}`; // Simple unique key
            const isBurned = localStorage.getItem(burnedKey);
            const [isViewing, setIsViewing] = React.useState(false);
            const [timeLeft, setTimeLeft] = React.useState(60);

            React.useEffect(() => {
                let timer;
                if (isViewing && timeLeft > 0) {
                    timer = setInterval(() => {
                        setTimeLeft((prev) => prev - 1);
                    }, 1000);
                } else if (timeLeft === 0) {
                    localStorage.setItem(burnedKey, 'true');
                    setIsViewing(false);
                }
                return () => clearInterval(timer);
            }, [isViewing, timeLeft, burnedKey]);

            if (isBurned) {
                return (
                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 flex items-center gap-2 italic text-slate-600 select-none">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.75 9.25a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
                        </svg>
                        <span>Message burned</span>
                    </div>
                );
            }

            if (!isViewing) {
                return (
                    <button
                        onClick={() => setIsViewing(true)}
                        className="bg-orange-950/30 p-4 rounded-xl border border-orange-500/30 w-full max-w-sm flex items-center justify-between gap-4 group hover:bg-orange-950/50 transition-all cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500 group-hover:text-orange-400 group-hover:scale-110 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                    <path fillRule="evenodd" d="M13.5 4.938a7 7 0 11-9.006 1.737c.202-.257.59-.218.793.039.031.04.07.105.112.186.208.399.552 1.07.953 1.838a6.38 6.38 0 011.082 3.132c0 .54-.251 1.05-.689 1.407a.75.75 0 00.416 1.346c.79-.115 1.776-.328 2.508-1.298.502-.665.688-1.488.665-2.275a20.142 20.142 0 01-.004-.159c.004-.711.23-1.405.626-1.983.333-.486.276-1.353-.199-2.072-.255-.386-.484-.798-.676-1.229a.75.75 0 00-1.294 0c-.57.962-.733 2.086-.347 3.016.142.341.013.682-.365.682-.245 0-.488-.046-.716-.13-.762-.284-1.742-1.258-1.638-2.613zM6.92 5.066a5.501 5.501 0 018.667-2.67c.365.25.756.544 1.13 1.05.513.696.58 1.564.12 2.261-.433.656-.632 1.543-.628 2.39a18.648 18.648 0 00.005.176c.033 1.127-.245 2.155-.838 2.94-.962 1.275-2.27 1.724-3.486 1.996a2.25 2.25 0 01-1.39-4.223 5.38 5.38 0 00-.547-2.296c-.464-.954-.91-1.782-1.164-2.278-.292-.572-.738-1.225-1.127-1.72-.178-.226-.339-.408-.475-.544a.75.75 0 01-.267-.082z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-bold text-orange-400">Hidden Message</div>
                                <div className="text-xs text-orange-500/60">Tap to view (Burns in 60s)</div>
                            </div>
                        </div>
                        <div className="text-orange-500/40">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                                <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </button>
                );
            }

            // Viewing State
            return (
                <div className="bg-orange-950/20 border border-orange-500/30 rounded-xl overflow-hidden min-w-[200px] max-w-md animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-orange-900/40 p-2 flex items-center justify-between border-b border-orange-500/20">
                        <div className="flex items-center gap-2 text-xs font-bold text-orange-400">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 animate-pulse">
                                <path fillRule="evenodd" d="M13.5 4.938a7 7 0 11-9.006 1.737c.202-.257.59-.218.793.039.031.04.07.105.112.186.208.399.552 1.07.953 1.838a6.38 6.38 0 011.082 3.132c0 .54-.251 1.05-.689 1.407a.75.75 0 00.416 1.346c.79-.115 1.776-.328 2.508-1.298.502-.665.688-1.488.665-2.275a20.142 20.142 0 01-.004-.159c.004-.711.23-1.405.626-1.983.333-.486.276-1.353-.199-2.072-.255-.386-.484-.798-.676-1.229a.75.75 0 00-1.294 0c-.57.962-.733 2.086-.347 3.016.142.341.013.682-.365.682-.245 0-.488-.046-.716-.13-.762-.284-1.742-1.258-1.638-2.613zM6.92 5.066a5.501 5.501 0 018.667-2.67c.365.25.756.544 1.13 1.05.513.696.58 1.564.12 2.261-.433.656-.632 1.543-.628 2.39a18.648 18.648 0 00.005.176c.033 1.127-.245 2.155-.838 2.94-.962 1.275-2.27 1.724-3.486 1.996a2.25 2.25 0 01-1.39-4.223 5.38 5.38 0 00-.547-2.296c-.464-.954-.91-1.782-1.164-2.278-.292-.572-.738-1.225-1.127-1.72-.178-.226-.339-.408-.475-.544a.75.75 0 01-.267-.082z" clipRule="evenodd" />
                            </svg>
                            Self-Destructing
                        </div>
                        <div className="text-xs font-mono text-orange-300 font-bold tabular-nums">
                            {timeLeft}s
                        </div>
                    </div>
                    <div className="p-4 bg-black/20 text-slate-200">
                        {data.content}
                    </div>
                    <div className="h-1 bg-orange-950 w-full">
                        <div
                            className="h-full bg-orange-500 transition-all duration-1000 ease-linear"
                            style={{ width: `${(timeLeft / 60) * 100}%` }}
                        />
                    </div>
                </div>
            );
        }

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
