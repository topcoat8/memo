import React, { useState, useMemo, useEffect } from "react";
import { isValidWalletAddress } from '../../shared/utils/encryption';
import Sidebar from '../../shared/components/Sidebar';
import EncryptionLock from '../../shared/components/EncryptionLock';
import MessageList from '../../shared/components/MessageList';
import MessageInput from '../../shared/components/MessageInput';

export default function UnifiedApp({
    isAuthReady,
    userId,
    recipientId,
    setRecipientId,
    message,
    setMessage,
    isLoading,
    error,
    successMessage,
    sendMemo,
    memos,
    decryptMessage,
    encryptionKeys,
    login,
    logout,
    announceIdentity,
    publicKeyRegistry,
}) {
    // --- State: Navigation & Layout ---
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);

    // --- State: Direct Messages ---
    const [activeContact, setActiveContact] = useState(null);

    // --- Derived State ---
    const contacts = useMemo(() => {
        const contactSet = new Set();
        memos.forEach(m => {
            if (m.senderId !== userId) contactSet.add(m.senderId);
            if (m.recipientId !== userId) contactSet.add(m.recipientId);
        });
        return Array.from(contactSet);
    }, [memos, userId]);

    const activeMessages = useMemo(() => {
        if (!activeContact) return [];
        return memos.filter(m =>
            (m.senderId === userId && m.recipientId === activeContact) ||
            (m.senderId === activeContact && m.recipientId === userId)
        ).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    }, [memos, userId, activeContact]);

    const isValidRecipient = !recipientId || isValidWalletAddress(recipientId);

    // --- Handlers: Navigation ---
    const handleContactSelect = (contact) => {
        setActiveContact(contact);
        setRecipientId(contact);
        setMessage("");
        setShowMobileSidebar(false);
    };

    const handleNewChat = () => {
        setActiveContact(null);
        setRecipientId("");
        setMessage("");
        setShowMobileSidebar(false);
    };

    const handleBackToSidebar = () => {
        setShowMobileSidebar(true); // On mobile, "back" usually means opening the sidebar
    };

    // --- Handlers: Direct Messages ---
    const handleSignContract = async (contractData) => {
        if (!contractData || !contractData.timestamp) return;
        const signaturePayload = JSON.stringify({
            type: 'contract_signature',
            contractTimestamp: contractData.timestamp,
            timestamp: Date.now()
        });
        await sendMemo(signaturePayload);
    };

    // --- Render ---

    // Lock Screen
    if (isAuthReady && !encryptionKeys && userId) {
        return <EncryptionLock login={login} userId={userId} />;
    }

    return (
        <div className="flex h-screen w-full bg-[#030305] text-slate-200 overflow-hidden font-sans selection:bg-enterprise-accent/30 relative">
            {/* Enterprise Grid Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-enterprise-accent/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/10 rounded-full blur-[150px]" />
            </div>

            {/* Mobile Sidebar Toggle (Visible only when sidebar is hidden on mobile) */}
            <div className={`md:hidden fixed top-4 left-4 z-50 ${showMobileSidebar ? 'hidden' : 'block'}`}>
                <button
                    onClick={() => setShowMobileSidebar(true)}
                    className="p-2 glass rounded-lg text-slate-300 hover:text-white"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                </button>
            </div>

            {/* Sidebar Container */}
            <div className={`
                fixed inset-y-0 left-0 z-40 w-80 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
                ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <Sidebar
                    isAuthReady={isAuthReady}
                    encryptionKeys={encryptionKeys}
                    announceIdentity={announceIdentity}
                    logout={logout}
                    login={login}
                    // DM Props
                    contacts={contacts}
                    activeContact={activeContact}
                    handleContactSelect={handleContactSelect}
                    handleNewChat={handleNewChat}
                    publicKeyRegistry={publicKeyRegistry}

                    appName="Memo"
                    appSubtitle="Enterprise"
                />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative z-10 h-full bg-transparent">
                {/* Mobile Overlay to close sidebar */}
                {showMobileSidebar && (
                    <div
                        className="absolute inset-0 bg-black/50 z-30 md:hidden"
                        onClick={() => setShowMobileSidebar(false)}
                    />
                )}

                {/* Direct Message View */}
                <div className="flex flex-col h-full w-full">
                    {/* DM Header */}
                    <div className="h-16 border-b border-enterprise-border flex items-center justify-between px-4 md:px-6 bg-[#030305]/90 backdrop-blur-sm sticky top-0 z-10">
                        <div className="flex items-center gap-3 overflow-hidden">
                            {/* Mobile Back Button (if needed, though sidebar toggle is usually enough) */}
                            <button
                                onClick={() => setShowMobileSidebar(true)}
                                className="md:hidden p-1.5 -ml-2 text-slate-400 hover:text-slate-200"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                                </svg>
                            </button>

                            <div className="flex-1 min-w-0">
                                {activeContact ? (
                                    <div>
                                        <div className="text-sm font-medium text-slate-200 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-enterprise-success animate-pulse" />
                                            <span className="text-slate-500 font-normal hidden sm:inline">SECURE CHANNEL:</span>
                                            <span className="font-mono text-enterprise-accent tracking-wide text-xs">{activeContact}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-slate-500 text-sm font-medium tracking-wide">SECURE CHANNELS OFFLINE</div>
                                )}
                            </div>
                        </div>

                        {!activeContact && (
                            <div className="flex gap-2 ml-2 items-center">
                                <div className="relative group">
                                    <input
                                        type="text"
                                        placeholder="ENTER WALLET ADDRESS"
                                        className={`bg-slate-900/50 border text-slate-200 text-xs p-2 w-32 sm:w-80 outline-none rounded-md transition-all font-mono tracking-wide placeholder:text-slate-600 ${recipientId && !isValidRecipient
                                            ? 'border-enterprise-error focus:border-enterprise-error focus:ring-1 focus:ring-enterprise-error'
                                            : recipientId && isValidRecipient
                                                ? 'border-enterprise-success focus:border-enterprise-success focus:ring-1 focus:ring-enterprise-success'
                                                : 'border-slate-800 focus:border-enterprise-accent/50 focus:ring-1 focus:ring-enterprise-accent/50'
                                            }`}
                                        value={recipientId}
                                        onChange={(e) => setRecipientId(e.target.value)}
                                    />
                                    {recipientId && isValidRecipient && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-enterprise-success pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => {
                                        if (recipientId && isValidRecipient) {
                                            setActiveContact(recipientId);
                                        }
                                    }}
                                    disabled={!recipientId || !isValidRecipient}
                                    className="bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold px-4 py-2 hover:bg-slate-700 hover:text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                                >
                                    Connect
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Messages Area with Content or Empty State */}
                    {activeContact ? (
                        <>
                            <MessageList
                                messages={activeMessages}
                                userId={userId}
                                decryptMessage={decryptMessage}
                                onSignContract={handleSignContract}
                            />

                            <MessageInput
                                message={message}
                                setMessage={setMessage}
                                onSend={sendMemo}
                                isLoading={isLoading}
                                disabled={!activeContact || !userId}
                                error={error}
                                successMessage={successMessage}
                                readOnly={!userId}
                            />
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
                            <div className="z-10 max-w-lg w-full">
                                <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-slate-900 border border-enterprise-border flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 flex items-center justify-center border border-white/5">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-enterprise-accent">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                                        </svg>
                                    </div>
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Enterprise Secure Messaging</h2>
                                <p className="text-slate-500 mb-8 max-w-md mx-auto leading-relaxed">
                                    Select a verified contact from the sidebar or manually enter a wallet address above to establish an encrypted channel.
                                </p>

                                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                                    <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm">
                                        <div className="text-enterprise-accent text-lg font-mono font-bold mb-1">E2EE</div>
                                        <div className="text-slate-500 text-xs uppercase tracking-wide">End-to-End Encryption</div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm">
                                        <div className="text-enterprise-success text-lg font-mono font-bold mb-1">ON-CHAIN</div>
                                        <div className="text-slate-500 text-xs uppercase tracking-wide">Immutable Storage</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
