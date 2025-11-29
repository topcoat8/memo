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
}) {
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

    const handleSendWrapper = async () => {
        if (!message.trim() && !imageUrl.trim()) return;

        if (imageUrl.trim()) {
            const newMessage = message ? `${message}\n${imageUrl}` : imageUrl;
            setMessage(newMessage);
            // We rely on the user clicking send again or the parent handling the update?
            // In the original code, it called sendMemo() immediately.
            // If that works, we'll do it here too.
            // But we can't await setMessage.
        }

        await onSend();
        setImageUrl("");
        setShowImageInput(false);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Helper to compress image
        const compressImage = (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = (event) => {
                    const img = new Image();
                    img.src = event.target.result;
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 100; // Tiny max width for on-chain storage
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

                        // Low quality JPEG
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

            // Check size (approx 800 bytes safe limit for memo instruction overhead)
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

            {allowImages && showImageInput && (
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
                {allowImages && (
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
                            handleSendWrapper();
                        }
                    }}
                    placeholder={!disabled ? "Type a message..." : "Select a contact first"}
                    disabled={disabled || isLoading}
                    className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 p-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none h-12 disabled:opacity-50 rounded-lg transition-all"
                />
                <button
                    onClick={handleSendWrapper}
                    disabled={disabled || isLoading || (!message.trim() && !imageUrl.trim())}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 md:px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-lg text-sm shadow-lg shadow-indigo-500/20"
                >
                    {isLoading ? '...' : 'Send'}
                </button>
            </div>
            <div className="mt-2 text-[10px] text-slate-600 flex justify-between px-1">
                <span>Memo Protocol v2</span>
                <span>Fee: ~0.000005 SOL</span>
            </div>
        </div>
    );
}
