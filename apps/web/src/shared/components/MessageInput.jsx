import React, { useState, useRef } from 'react';

export default function MessageInput({
    message,
    setMessage,
    onSend,
    isLoading,
    disabled,
    error,
    successMessage,
    allowImages = true,
    readOnly = false,
}) {
    const [isContractMode, setIsContractMode] = useState(false);
    const [contractTitle, setContractTitle] = useState("");
    const [showImageInput, setShowImageInput] = useState(false);
    const [imageUrl, setImageUrl] = useState("");
    const fileInputRef = useRef(null);

    const handleAddImage = () => {
        if (!imageUrl.trim()) return;
        const newMessage = message ? `${message}\n${imageUrl}` : imageUrl;
        setMessage(newMessage);
        setImageUrl("");
        setShowImageInput(false);
    };

    const handleSendClick = async () => {
        if (!isContractMode && !message.trim() && !imageUrl.trim()) return;
        if (isContractMode && (!contractTitle.trim() || !message.trim())) return;

        let finalPayload = message;

        if (isContractMode) {
            finalPayload = JSON.stringify({
                type: 'contract',
                title: contractTitle.trim(),
                content: message.trim(),
                timestamp: Date.now()
            });
        } else if (imageUrl.trim()) {
            finalPayload = message ? `${message}\n${imageUrl}` : imageUrl;
        }

        await onSend(finalPayload);

        setImageUrl("");
        setShowImageInput(false);
        if (isContractMode) {
            setIsContractMode(false);
            setContractTitle("");
        }
        setMessage("");
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const compressImage = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = (event) => {
                    const img = new Image();
                    img.src = event.target.result;
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 100;
                        const MAX_HEIGHT = 100;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                        resolve(dataUrl);
                    };
                    img.onerror = (err) => reject(err);
                };
                reader.onerror = (err) => reject(err);
            });
        };

        try {
            const compressedDataUrl = await compressImage(file);
            if (compressedDataUrl.length > 800) {
                alert("Image is too complex to fit on-chain even after compression. Please use a simpler image or a URL.");
                return;
            }
            setImageUrl(compressedDataUrl);
        } catch (err) {
            console.error("Image compression failed", err);
            alert("Failed to process image.");
        }
    };

    return (
        <div className="p-4 border-t border-slate-800 bg-slate-950">
            {(error || successMessage) && (
                <div className="mb-3 text-xs px-1">
                    {error && <span className="text-rose-400">Error: {error}</span>}
                    {successMessage && <span className="text-emerald-400">Success: {successMessage}</span>}
                </div>
            )}

            {isContractMode && (
                <div className="mb-3 p-3 bg-indigo-900/20 border border-indigo-500/30 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
                            </svg>
                            New Contract
                        </span>
                        <button
                            onClick={() => setIsContractMode(false)}
                            className="text-indigo-400 hover:text-indigo-300"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                            </svg>
                        </button>
                    </div>
                    <input
                        type="text"
                        placeholder="Contract Title (e.g., NDA, Service Agreement)"
                        className="w-full bg-slate-900/50 border border-indigo-500/30 text-indigo-100 text-sm p-2 rounded-md focus:border-indigo-500 outline-none placeholder:text-indigo-400/50"
                        value={contractTitle}
                        onChange={(e) => setContractTitle(e.target.value)}
                        autoFocus
                    />
                </div>
            )}

            {allowImages && showImageInput && !isContractMode && (
                <div className="mb-3 p-3 bg-slate-900 rounded-lg border border-slate-800 flex gap-2 animate-in fade-in slide-in-from-bottom-2 items-center">
                    <input
                        type="text"
                        placeholder="Paste image URL..."
                        className="flex-1 bg-slate-950 border border-slate-700 text-slate-200 text-xs p-2 rounded-md focus:border-indigo-500 outline-none"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        autoFocus
                    />
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileUpload}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-2 rounded-md font-medium border border-slate-700"
                        title="Upload File"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                    </button>
                    <button
                        onClick={handleAddImage}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-2 rounded-md font-medium"
                    >
                        Add
                    </button>
                    <button
                        onClick={() => setShowImageInput(false)}
                        className="text-slate-500 hover:text-slate-300 p-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}

            <div className="flex gap-3">
                <button
                    onClick={() => {
                        setIsContractMode(!isContractMode);
                        setShowImageInput(false);
                    }}
                    className={`p-2 rounded-lg transition-colors ${isContractMode ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/50' : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                    title="Create Contract"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                </button>

                {allowImages && !isContractMode && (
                    <button
                        onClick={() => setShowImageInput(!showImageInput)}
                        className={`p-2 rounded-lg transition-colors ${showImageInput ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                        title="Add Image"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                    </button>
                )}
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendClick();
                        }
                    }}
                    placeholder={!disabled ? (isContractMode ? "Enter contract details..." : "Type a message...") : (readOnly ? "Connect wallet to send messages" : "Select a contact first")}
                    disabled={disabled || isLoading}
                    className={`flex-1 bg-slate-900 border text-slate-200 p-3 text-sm focus:ring-1 outline-none resize-none h-12 disabled:opacity-50 rounded-lg transition-all ${isContractMode ? 'border-indigo-500/50 focus:border-indigo-500 focus:ring-indigo-500' : 'border-slate-700 focus:border-indigo-500 focus:ring-indigo-500'}`}
                />
                <button
                    onClick={handleSendClick}
                    disabled={disabled || isLoading || (!message.trim() && !imageUrl.trim() && !isContractMode)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 md:px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-lg text-sm shadow-lg shadow-indigo-500/20"
                >
                    {isLoading ? '...' : (isContractMode ? 'Sign' : 'Send')}
                </button>
            </div>
            <div className="mt-2 text-[10px] text-slate-600 flex justify-between px-1">
                <span>Memo Protocol v2</span>
                <span>Fee: ~0.000005 SOL</span>
            </div>
        </div>
    );
}
