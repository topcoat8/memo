import React from 'react';

export default function EncryptionLock({ login, userId }) {
    // If no userId (not connected), we don't show the lock screen
    if (!userId) return null;

    return (
        <div className="flex h-screen w-full bg-slate-950 text-slate-200 items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 text-center shadow-2xl">
                <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-indigo-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Secure Your Messages</h2>
                <p className="text-slate-400 mb-8 text-sm leading-relaxed">
                    Memo Protocol uses end-to-end encryption to protect your conversations.
                    You must initialize your encryption keys to view and send messages.
                </p>
                <button
                    onClick={login}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    Initialize Encryption
                </button>
                <div className="mt-6 text-xs text-slate-600">
                    This will ask your wallet to sign a message to derive your keys.
                </div>
            </div>
        </div>
    );
}
