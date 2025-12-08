import React, { useState, useMemo, useEffect } from "react";
import { COMMUNITY_ADDRESS } from '../../shared/constants';
import { isValidWalletAddress } from '../../shared/utils/encryption';
import CommunityChat from '../social/components/CommunityChat';
import JoinCommunityModal from '../social/components/JoinCommunityModal';
import CreateCommunityModal from '../social/components/CreateCommunityModal';
import CommunityAgent from '../social/components/CommunityAgent';
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
    // viewMode: 'community' | 'dm'
    const [viewMode, setViewMode] = useState('community');
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);

    // --- State: Communities ---
    const [communities, setCommunities] = useState(() => {
        const saved = localStorage.getItem('memo_communities');
        const initial = saved ? JSON.parse(saved) : [];
        const defaultCommunity = {
            id: COMMUNITY_ADDRESS,
            name: 'Memo Community'
        };
        if (!initial.find(c => c.id === defaultCommunity.id)) {
            return [defaultCommunity, ...initial];
        }
        return initial;
    });
    const [activeCommunityId, setActiveCommunityId] = useState(COMMUNITY_ADDRESS);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // --- State: Direct Messages ---
    const [activeContact, setActiveContact] = useState(null);

    // --- Effects ---
    useEffect(() => {
        localStorage.setItem('memo_communities', JSON.stringify(communities));
    }, [communities]);

    // --- Derived State ---
    const activeCommunity = useMemo(() =>
        communities.find(c => c.id === activeCommunityId),
        [communities, activeCommunityId]
    );

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
    const handleCommunitySelect = (communityId) => {
        setActiveCommunityId(communityId);
        setViewMode('community');
        setActiveContact(null); // Clear active contact when switching to community
        setShowMobileSidebar(false);
    };

    const handleContactSelect = (contact) => {
        setActiveContact(contact);
        setRecipientId(contact);
        setViewMode('dm');
        setMessage("");
        setShowMobileSidebar(false);
    };

    const handleNewChat = () => {
        setActiveContact(null);
        setRecipientId("");
        setMessage("");
        setViewMode('dm');
        setShowMobileSidebar(false);
    };

    const handleBackToSidebar = () => {
        setShowMobileSidebar(true); // On mobile, "back" usually means opening the sidebar
    };

    // --- Handlers: Communities ---
    const handleJoinCommunity = (community) => {
        if (!communities.find(c => c.id === community.id)) {
            setCommunities([...communities, community]);
        }
        handleCommunitySelect(community.id);
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
        <div className="flex h-screen w-full bg-[#030305] text-slate-200 overflow-hidden font-sans selection:bg-cyan-500/30 relative">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/5 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/5 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '7s' }} />
                <div className="absolute top-[40%] left-[50%] w-[30%] h-[30%] bg-indigo-500/5 rounded-full blur-[100px] -translate-x-1/2" />
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
                fixed inset-y-0 left-0 z-40 w-72 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
                ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <Sidebar
                    isAuthReady={isAuthReady}
                    encryptionKeys={encryptionKeys}
                    announceIdentity={announceIdentity}
                    logout={logout}
                    login={login}
                    // Community Props
                    communities={communities}
                    activeCommunityId={viewMode === 'community' ? activeCommunityId : null}
                    onSelectCommunity={handleCommunitySelect}
                    onAddCommunity={() => setShowJoinModal(true)}
                    onCreateCommunity={() => setShowCreateModal(true)}
                    // DM Props
                    contacts={contacts}
                    activeContact={viewMode === 'dm' ? activeContact : null}
                    handleContactSelect={handleContactSelect}
                    handleNewChat={handleNewChat}
                    publicKeyRegistry={publicKeyRegistry}

                    appName="Memo"
                    appSubtitle="Unified"
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

                {viewMode === 'community' ? (
                    <>
                        <CommunityChat
                            communityAddress={activeCommunityId}
                            communityName={activeCommunity?.name}
                            readOnly={!userId}
                        />
                        <CommunityAgent
                            communityAddress={activeCommunityId}
                        />
                    </>
                ) : (
                    /* Direct Message View */
                    <div className="flex flex-col h-full w-full">
                        {/* DM Header */}
                        <div className="h-16 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
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
                                                <span className="text-slate-500 font-normal hidden sm:inline">To:</span>
                                                <span className="font-mono text-slate-300 truncate">{activeContact}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                                                {publicKeyRegistry && publicKeyRegistry[activeContact] ? '🔒 End-to-End Encrypted' : '🔓 Standard Encryption'}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-slate-500 text-sm">Select a contact or start a new chat</div>
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
                )}
            </div>

            {/* Modals */}
            <JoinCommunityModal
                isOpen={showJoinModal}
                onClose={() => setShowJoinModal(false)}
                onJoin={handleJoinCommunity}
            />

            <CreateCommunityModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreated={handleJoinCommunity}
            />
        </div>
    );
}
