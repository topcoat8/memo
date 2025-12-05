import React, { useState, useMemo } from "react";
import { isValidWalletAddress } from '../../shared/utils/encryption';
import Sidebar from '../../shared/components/Sidebar';
import MessageList from '../../shared/components/MessageList';
import MessageInput from '../../shared/components/MessageInput';
import EncryptionLock from '../../shared/components/EncryptionLock';

export default function EnterpriseApp({
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
    const [activeContact, setActiveContact] = useState(null);
    const [showMobileChat, setShowMobileChat] = useState(false);
    // Enterprise app currently only supports personal/direct messages
    const viewMode = 'personal';

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

    const handleContactSelect = (contact) => {
        setActiveContact(contact);
        setRecipientId(contact);
        setShowMobileChat(true);
        setMessage("");
    };

    const handleBackToContacts = () => {
        setShowMobileChat(false);
        setActiveContact(null);
        setMessage("");
    };

    const handleNewChat = () => {
        setActiveContact(null);
        setRecipientId("");
        setMessage("");
        setShowMobileChat(true);
    };

    const isValidRecipient = !recipientId || isValidWalletAddress(recipientId);

    // Lock Screen
    if (isAuthReady && !encryptionKeys && userId) {
        return <EncryptionLock login={login} userId={userId} />;
    }

    const handleSignContract = async (contractData) => {
        if (!contractData || !contractData.timestamp) return;

        const signaturePayload = JSON.stringify({
            type: 'contract_signature',
            contractTimestamp: contractData.timestamp,
            timestamp: Date.now()
        });

        await sendMemo(signaturePayload);
    };

    return (
        <div className="flex h-screen w-full bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/30">
            <div className={`${showMobileChat ? 'hidden' : 'flex'} md:flex w-full md:w-80 flex-col h-full`}>
                <Sidebar
                    isAuthReady={isAuthReady}
                    handleNewChat={handleNewChat}
                    encryptionKeys={encryptionKeys}
                    announceIdentity={announceIdentity}
                    logout={logout}
                    login={login}
                    handleCommunitySelect={() => { }} // No-op for enterprise
                    viewMode={viewMode}
                    contacts={contacts}
                    handleContactSelect={handleContactSelect}
                    activeContact={activeContact}
                    publicKeyRegistry={publicKeyRegistry}
                    showMobileChat={showMobileChat}
                    showCommunity={false}
                    appSubtitle="Enterprise"
                />
            </div>

            <div className={`${showMobileChat ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-slate-950 relative w-full`}>
                <div className="h-16 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <button
                            onClick={handleBackToContacts}
                            className="md:hidden p-1.5 -ml-2 text-slate-400 hover:text-slate-200"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                            </svg>
                        </button>

                        <div className="flex-1 min-w-0">
                            {activeContact ? (
                                <div>
                                    <div className="text-sm font-medium text-slate-200 flex items-center gap-2">
                                        <span className="text-slate-500 font-normal hidden sm:inline">To:</span>
                                        <span className="font-mono text-slate-300 truncate">{activeContact}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                                        {publicKeyRegistry && publicKeyRegistry[activeContact] ? '🔒 End-to-End Encrypted' : '🔓 Standard Encryption'}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-slate-500 text-sm">Select a contact</div>
                            )}
                        </div>
                    </div>

                    {!activeContact && (
                        <div className="flex gap-2 ml-2 items-center">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Wallet Address"
                                    className={`bg-slate-900 border text-slate-200 text-xs p-2 w-32 sm:w-64 outline-none rounded-md transition-all ${recipientId && !isValidRecipient
                                        ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                                        : recipientId && isValidRecipient
                                            ? 'border-emerald-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                                            : 'border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                                        }`}
                                    value={recipientId}
                                    onChange={(e) => setRecipientId(e.target.value)}
                                />
                                {recipientId && isValidRecipient && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none">
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
                                        setShowMobileChat(true);
                                    }
                                }}
                                disabled={!recipientId || !isValidRecipient}
                                className="bg-slate-800 border border-slate-700 text-slate-300 text-xs px-3 hover:bg-slate-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Start
                            </button>
                        </div>
                    )}
                </div>

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
            </div>
        </div>
    );
}
