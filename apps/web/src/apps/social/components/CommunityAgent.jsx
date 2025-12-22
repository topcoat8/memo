import React, { useState } from 'react';
import { Bot, X, RefreshCw, TrendingUp, Activity, Moon, Zap, AlertCircle } from 'lucide-react';
import { useCommunityAgent } from '../../../shared/hooks/useCommunityAgent';
import { useMemoContext } from '../../../shared/index';

export default function CommunityAgent({ communityAddress }) {
    const { connection, tokenMint } = useMemoContext();
    const [isOpen, setIsOpen] = useState(false);
    const { insights, loading, refresh } = useCommunityAgent({
        connection,
        tokenMint,
        communityAddress
    });

    if (!tokenMint && !communityAddress) return null;

    return (
        <div className="fixed bottom-24 right-6 z-50">
            {/* Agent Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    p-4 rounded-full shadow-lg transition-all duration-300
                    ${isOpen ? 'bg-indigo-500 rotate-12' : 'bg-slate-800 hover:bg-slate-700 hover:scale-110'}
                    border border-indigo-500/30 text-white
                `}
                title="Community Agent"
            >
                <Bot className={`w-6 h-6 ${loading ? 'animate-pulse' : ''}`} />
                {/* Notification dot if we have insights and not open */}
                {!isOpen && insights.length > 0 && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a0a0f]" />
                )}
            </button>

            {/* Agent Popup */}
            {isOpen && (
                <div className="absolute bottom-20 right-0 w-80 md:w-96 bg-[#0f111a] border border-indigo-500/20 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in slide-in-from-bottom-5 fade-in duration-200">
                    {/* Header */}
                    <div className="p-4 border-b border-white/5 bg-indigo-500/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-indigo-400" />
                            <h3 className="font-bold text-slate-200">Agent Insights</h3>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={refresh}
                                disabled={loading}
                                className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-3">
                        {loading && insights.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-slate-500 space-y-3">
                                <Bot className="w-8 h-8 animate-bounce text-indigo-500/50" />
                                <p className="text-sm">Analyzing on-chain data...</p>
                            </div>
                        ) : insights.length > 0 ? (
                            insights.map((insight, idx) => (
                                <div
                                    key={idx}
                                    className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-colors"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1">
                                            {insight.type === 'trending' && <TrendingUp className="w-5 h-5 text-orange-400" />}
                                            {insight.type === 'normal' && <Activity className="w-5 h-5 text-blue-400" />}
                                            {insight.type === 'quiet' && <Moon className="w-5 h-5 text-slate-400" />}
                                            {insight.type === 'whale' && <span className="text-xl">🐋</span>}
                                            {insight.type === 'growth' && <Zap className="w-5 h-5 text-green-400" />}
                                            {insight.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400" />}
                                        </div>
                                        <div>
                                            {insight.title && (
                                                <h4 className="text-sm font-semibold text-slate-200 mb-1">{insight.title}</h4>
                                            )}
                                            <p className="text-sm text-slate-400 leading-relaxed">
                                                {insight.message}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                <p>No insights found.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 bg-black/20 text-[10px] text-slate-600 text-center border-t border-white/5">
                        Powered by Local Agent • Not Financial Advice
                    </div>
                </div>
            )}
        </div>
    );
}
