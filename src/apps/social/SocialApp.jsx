import React, { useState, useMemo, useEffect } from "react";
import { COMMUNITY_ADDRESS } from '../../shared/constants';
import CommunityChat from './components/CommunityChat';
import JoinCommunityModal from './components/JoinCommunityModal';
import CreateCommunityModal from './components/CreateCommunityModal';
import Sidebar from '../../shared/components/Sidebar';
import EncryptionLock from '../../shared/components/EncryptionLock';
import CommunityAgent from './components/CommunityAgent';

export default function SocialApp({
    isAuthReady,
    userId,
    encryptionKeys,
    login,
    logout,
    announceIdentity,
}) {
    // Community State
    const [communities, setCommunities] = useState(() => {
        const saved = localStorage.getItem('memo_communities');
        const initial = saved ? JSON.parse(saved) : [];
        const defaultCommunity = {
            id: COMMUNITY_ADDRESS,
            name: 'Memo Community'
        };

        // Ensure default community exists
        if (!initial.find(c => c.id === defaultCommunity.id)) {
            return [defaultCommunity, ...initial];
        }
        return initial;
    });
    const [activeCommunityId, setActiveCommunityId] = useState(COMMUNITY_ADDRESS);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);

    useEffect(() => {
        localStorage.setItem('memo_communities', JSON.stringify(communities));
    }, [communities]);

    const activeCommunity = useMemo(() =>
        communities.find(c => c.id === activeCommunityId),
        [communities, activeCommunityId]
    );

    const handleCommunitySelect = (communityId) => {
        setActiveCommunityId(communityId);
        setShowMobileSidebar(false);
    };

    const handleJoinCommunity = (community) => {
        if (!communities.find(c => c.id === community.id)) {
            setCommunities([...communities, community]);
        }
        handleCommunitySelect(community.id);
    };

    // Lock Screen
    if (isAuthReady && !encryptionKeys && userId) {
        return <EncryptionLock login={login} userId={userId} />;
    }

    return (
        <div className="flex h-screen w-full bg-[#0a0a0f] text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/30 relative">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px]" />
            </div>

            {/* Mobile Sidebar Toggle */}
            <div className="md:hidden fixed top-4 left-4 z-50">
                <button
                    onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                    className="p-2 glass rounded-lg text-slate-300 hover:text-white"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                </button>
            </div>

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
                    communities={communities}
                    activeCommunityId={activeCommunityId}
                    onSelectCommunity={handleCommunitySelect}
                    onAddCommunity={() => setShowJoinModal(true)}
                    onCreateCommunity={() => setShowCreateModal(true)}
                />
            </div>

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

            <div className="flex-1 flex flex-col relative z-10 h-full">
                <CommunityChat
                    communityAddress={activeCommunityId}
                    communityName={activeCommunity?.name}
                    readOnly={!userId}
                />
                <CommunityAgent
                    communityAddress={activeCommunityId}
                />
            </div>
        </div>
    );
}
