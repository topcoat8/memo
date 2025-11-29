import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import communityIcon from '../../../assets/pfp.jpg';

export default function Sidebar({
    isAuthReady,
    handleNewChat,
    encryptionKeys,
    announceIdentity,
    logout,
    login,
    handleCommunitySelect,
    viewMode,
    contacts,
    handleContactSelect,
    activeContact,
    publicKeyRegistry,
    showMobileChat,
    showCommunity = true,
    communities = [],
    activeCommunityId,
    onSelectCommunity,
    onAddCommunity,
    onCreateCommunity,
}) {
    return (
        <div className={`${showMobileChat ? 'hidden' : 'flex'} md:flex w-full md:w-80 border-r border-slate-800 flex-col bg-slate-900/50`}>
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <div>
                    <h1 className="text-lg font-semibold tracking-tight text-white">
                        Memo Protocol
                    </h1>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
                        <div className={`w-2 h-2 rounded-full ${isAuthReady ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                        {isAuthReady ? 'Connected' : 'Disconnected'}
                    </div>
                </div>
                <button
                    onClick={handleNewChat}
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors shadow-lg shadow-indigo-500/20"
                    title="New Chat"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                </button>
            </div>

            <div className="p-4 border-b border-slate-800 bg-slate-900/30">
                <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Security</span>
                    {encryptionKeys ? (
                        <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-900/50">Encrypted</span>
                    ) : (
                        <span className="text-[10px] font-medium text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-900/50">Unsecured</span>
                    )}
                </div>

                {isAuthReady ? (
                    encryptionKeys ? (
                        <div className="space-y-2">
                            <button
                                onClick={announceIdentity}
                                className="w-full text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-3 rounded-md transition-colors text-left flex justify-between items-center"
                            >
                                <span>Announce Public Key</span>
                                <span className="text-[10px] text-slate-500">On-chain</span>
                            </button>
                            <button
                                onClick={logout}
                                className="w-full text-xs font-medium text-slate-500 hover:text-rose-400 py-1.5 px-1 transition-colors text-left"
                            >
                                Lock Identity
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={login}
                            className="w-full text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-3 rounded-md transition-all shadow-sm shadow-indigo-500/20"
                        >
                            Initialize Encryption
                        </button>
                    )
                ) : (
                    <div className="opacity-50 pointer-events-none">
                        <WalletMultiButton />
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {showCommunity && (
                    <div className="px-2 mb-2 mt-2">
                        <div className="flex justify-between items-center px-2 mb-2">
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Communities</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={onCreateCommunity}
                                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    Create
                                </button>
                                <button
                                    onClick={onAddCommunity}
                                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    Join
                                </button>
                            </div>
                        </div>

                        {communities && communities.length > 0 ? (
                            communities.map(community => (
                                <button
                                    key={community.id}
                                    onClick={() => onSelectCommunity(community.id)}
                                    className={`w-full text-left p-2.5 text-sm rounded-md transition-all flex items-center gap-3 mb-1 ${activeCommunityId === community.id && viewMode === 'community'
                                        ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                                        }`}
                                >
                                    <div className="w-8 h-8 rounded-full overflow-hidden shadow-lg shadow-indigo-500/20 border border-indigo-500/30 shrink-0">
                                        <img src={communityIcon} alt="Community" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-medium text-slate-200 truncate">{community.name}</div>
                                        <div className="text-[10px] text-slate-500 truncate">{community.id.slice(0, 4)}...{community.id.slice(-4)}</div>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="p-3 text-xs text-slate-600 text-center italic bg-slate-900/30 rounded-lg border border-slate-800/50 mb-2">
                                No communities joined
                            </div>
                        )}
                    </div>
                )}
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 px-2 mt-4">Contacts</div>
                {contacts.map(contact => (
                    <button
                        key={contact}
                        onClick={() => handleContactSelect(contact)}
                        className={`w-full text-left p-2.5 text-sm rounded-md transition-all ${activeContact === contact
                            ? 'bg-indigo-500/10 text-indigo-300'
                            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                            }`}
                    >
                        <div className="truncate font-mono text-xs">{contact}</div>
                        {publicKeyRegistry && publicKeyRegistry[contact] && (
                            <div className="text-[10px] text-emerald-500/80 mt-0.5 flex items-center gap-1">
                                <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                                Secure
                            </div>
                        )}
                    </button>
                ))}
                {contacts.length === 0 && (
                    <div className="p-4 text-xs text-slate-600 text-center italic">
                        No contacts yet
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-slate-800">
                <WalletMultiButton className="!bg-slate-800 hover:!bg-slate-700 !text-slate-200 !font-medium !text-sm !h-10 !w-full !justify-center !rounded-md !transition-colors" />
            </div>
        </div>
    );
}
