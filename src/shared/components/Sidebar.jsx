import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Plus, Users, Shield, LogOut, Key } from 'lucide-react';
import communityIcon from '../../../assets/pfp.jpg';

export default function Sidebar({
    isAuthReady,
    encryptionKeys,
    announceIdentity,
    logout,
    login,
    communities = [],
    activeCommunityId,
    onSelectCommunity,
    onAddCommunity,
    onCreateCommunity,
}) {
    return (
        <div className="flex flex-col h-full w-full bg-slate-900/40 backdrop-blur-xl border-r border-white/5">
            {/* Header */}
            <div className="p-6 border-b border-white/5">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Shield className="w-4 h-4 text-white" />
                    </div>
                    <h1 className="text-lg font-bold tracking-tight text-white">
                        Memo <span className="text-indigo-400">Social</span>
                    </h1>
                </div>
                <div className="flex items-center gap-2 ml-11">
                    <div className={`w-1.5 h-1.5 rounded-full ${isAuthReady ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`}></div>
                    <span className="text-xs text-slate-400 font-medium">
                        {isAuthReady ? 'Connected' : 'Disconnected'}
                    </span>
                </div>
            </div>

            {/* Security Status */}
            <div className="px-4 py-4">
                <div className="glass p-3 rounded-xl border-white/5 bg-white/5">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Key className="w-3 h-3" /> Security
                        </span>
                        {encryptionKeys ? (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                ENCRYPTED
                            </span>
                        ) : (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                UNSECURED
                            </span>
                        )}
                    </div>

                    {isAuthReady ? (
                        encryptionKeys ? (
                            <div className="space-y-2">
                                <button
                                    onClick={announceIdentity}
                                    className="w-full text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 py-2 px-3 rounded-lg transition-all text-left flex justify-between items-center group"
                                >
                                    <span className="group-hover:text-white transition-colors">Announce Key</span>
                                    <span className="text-[10px] text-slate-500 bg-black/20 px-1.5 py-0.5 rounded">On-chain</span>
                                </button>
                                <button
                                    onClick={logout}
                                    className="w-full text-xs font-medium text-slate-500 hover:text-rose-400 py-1.5 px-1 transition-colors text-left flex items-center gap-2"
                                >
                                    <LogOut className="w-3 h-3" />
                                    Lock Identity
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={login}
                                className="w-full text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 px-3 rounded-lg transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                            >
                                <Key className="w-3 h-3" />
                                Initialize Encryption
                            </button>
                        )
                    ) : (
                        <div className="opacity-50 pointer-events-none scale-95 origin-top">
                            <WalletMultiButton />
                        </div>
                    )}
                </div>
            </div>

            {/* Communities List */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 custom-scrollbar">
                <div className="flex justify-between items-center mb-4 px-1">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3 h-3" /> Communities
                    </span>
                    <div className="flex gap-1">
                        <button
                            onClick={onAddCommunity}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                            title="Join Community"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {communities.map(community => (
                    <button
                        key={community.id}
                        onClick={() => onSelectCommunity(community.id)}
                        className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 group relative overflow-hidden ${activeCommunityId === community.id
                                ? 'bg-indigo-600/20 border border-indigo-500/30 shadow-[0_0_15px_rgba(79,70,229,0.1)]'
                                : 'hover:bg-white/5 border border-transparent hover:border-white/5'
                            }`}
                    >
                        {activeCommunityId === community.id && (
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none" />
                        )}

                        <div className={`w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 transition-colors ${activeCommunityId === community.id ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-white/5 group-hover:border-white/10'
                            }`}>
                            <img src={communityIcon} alt="Community" className="w-full h-full object-cover" />
                        </div>

                        <div className="min-w-0 relative z-10">
                            <div className={`font-medium truncate transition-colors ${activeCommunityId === community.id ? 'text-white' : 'text-slate-300 group-hover:text-white'
                                }`}>
                                {community.name}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate font-mono">
                                {community.id.slice(0, 4)}...{community.id.slice(-4)}
                            </div>
                        </div>
                    </button>
                ))}

                <button
                    onClick={onCreateCommunity}
                    className="w-full mt-4 p-3 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-slate-500 hover:text-indigo-400 transition-all flex items-center justify-center gap-2 text-xs font-medium group"
                >
                    <div className="w-6 h-6 rounded-full bg-slate-800 group-hover:bg-indigo-500/20 flex items-center justify-center transition-colors">
                        <Plus className="w-3 h-3" />
                    </div>
                    Create New Community
                </button>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5 bg-black/20">
                <WalletMultiButton className="!bg-white/5 hover:!bg-white/10 !text-slate-300 hover:!text-white !font-medium !text-sm !h-11 !w-full !justify-center !rounded-xl !transition-all !border !border-white/5" />
            </div>
        </div>
    );
}
