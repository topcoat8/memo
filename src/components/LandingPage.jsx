import { motion } from 'framer-motion';
import { Shield, Users, ArrowRight, Zap, Globe, FileText } from 'lucide-react';
import coinmunIcon from '../../assets/coinmun.svg';
import orcaIcon from '../../assets/Orca_Logo.webp';

export default function LandingPage({ onSelect }) {
    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-5xl w-full z-10 flex flex-col items-center gap-8 md:gap-12">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center space-y-4 md:space-y-6"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-indigo-500/30 text-indigo-300 text-sm font-medium mb-2 md:mb-4">
                        <Zap className="w-4 h-4 fill-indigo-400" />
                        <span>Powered by Solana</span>
                    </div>

                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter px-4">
                        <span className="text-white">Memo</span>
                        <span className="gradient-text ml-2 md:ml-4">Protocol</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed px-4">
                        The next generation of secure, immutable communication.
                        Choose your workspace to begin.
                    </p>
                </motion.div>

                {import.meta.env.VITE_BETA === "CLOSED" ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-2xl mx-auto glass-card p-6 md:p-8 rounded-3xl text-center border-amber-500/20 bg-amber-500/5 mx-4"
                    >
                        <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Shield className="w-8 h-8 text-amber-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Beta Access Closed</h2>
                        <p className="text-slate-400 leading-relaxed mb-6">
                            We are currently at capacity for our beta testing phase.
                            Please check back soon for the next wave of invites.
                        </p>

                        <a
                            href="https://x.com/MemoOnSol"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition-all border border-white/5 hover:border-white/10 group"
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 fill-current text-slate-400 group-hover:text-white transition-colors">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                            <span className="text-sm font-medium">Follow for Updates</span>
                        </a>
                    </motion.div>
                ) : (
                    <div className="w-full max-w-2xl mx-auto px-4">
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            onClick={() => onSelect('app')}
                            className="group relative w-full glass-card p-8 md:p-10 rounded-3xl text-left transition-all hover:scale-[1.02] hover:shadow-indigo-500/20 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
                                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform duration-300 shrink-0">
                                    <Shield className="w-8 h-8 text-indigo-400" />
                                </div>

                                <div className="flex-1">
                                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Launch Workspace</h2>
                                    <p className="text-slate-400 mb-6 leading-relaxed text-sm md:text-base">
                                        Access your unified workspace for secure communication.
                                        Connect with communities and manage private contracts in one place.
                                    </p>

                                    <div className="inline-flex items-center gap-2 text-indigo-400 font-medium group-hover:gap-4 transition-all bg-white/5 px-6 py-3 rounded-xl group-hover:bg-white/10">
                                        <span>Enter App</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </motion.button>
                    </div>
                )}

                {/* Resources & Socials */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl px-4"
                >
                    {/* X (Twitter) */}
                    <a
                        href="https://x.com/MemoOnSol"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="glass-card p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all group border-slate-800/50 hover:border-slate-700"
                    >
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="w-6 h-6 fill-slate-400 group-hover:fill-white transition-colors">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        <span className="text-sm font-medium text-slate-400 group-hover:text-white">Follow Updates</span>
                    </a>

                    {/* CoinMun */}
                    <a
                        href="https://coinmun.com/coins/memo-protocol"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="glass-card p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all group border-slate-800/50 hover:border-slate-700"
                    >
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors p-1.5">
                            <img src={coinmunIcon} alt="CoinMun" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-sm font-medium text-slate-400 group-hover:text-white">CoinMun</span>
                    </a>

                    {/* Orca */}
                    <a
                        href="https://www.orca.so/?tokenIn=So11111111111111111111111111111111111111112&tokenOut=8ZQme2xv6prRKkKNA4PTn5DSXUTdY6yeoc5yDkm7pump"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="glass-card p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all group border-slate-800/50 hover:border-slate-700"
                    >
                        <div className="w-8 h-8 rounded-full bg-yellow-400/10 flex items-center justify-center group-hover:bg-yellow-400/20 transition-colors p-1">
                            <img src={orcaIcon} alt="Orca" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-sm font-medium text-slate-400 group-hover:text-white">Buy on Orca</span>
                    </a>

                    {/* Whitepaper */}
                    <button
                        onClick={() => onSelect('whitepaper')}
                        className="glass-card p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-all group border-slate-800/50 hover:border-slate-700"
                    >
                        <FileText className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors" />
                        <span className="text-sm font-medium text-slate-400 group-hover:text-white">Whitepaper</span>
                    </button>
                </motion.div>
            </div>
        </div>
    );
}
