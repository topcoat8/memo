import { motion } from 'framer-motion';
import { Wallet, ArrowLeft, Shield, Lock, Eye } from 'lucide-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function ConnectWalletPage({ onBack }) {
    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[20%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[20%] w-[50%] h-[50%] bg-cyan-600/10 rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="max-w-md w-full relative z-10"
            >
                <button
                    onClick={onBack}
                    className="absolute -top-12 left-0 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                </button>

                <div className="glass-card p-8 rounded-3xl text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-white/5">
                        <Wallet className="w-10 h-10 text-indigo-400" />
                    </div>

                    <h1 className="text-3xl font-bold text-white mb-4">Connect Wallet</h1>
                    <p className="text-slate-400 mb-8 leading-relaxed">
                        Connect your Solana wallet to access secure, immutable communication and token-gated communities.
                    </p>

                    <div className="flex justify-center">
                        <div className="p-1 rounded-xl bg-gradient-to-r from-indigo-500/50 to-purple-500/50">
                            <div className="bg-slate-900 rounded-[10px]">
                                <WalletMultiButton className="!bg-transparent hover:!bg-white/5 !transition-all !rounded-[10px] !h-12 !px-8 !font-medium !text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-left">
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 mb-1 text-emerald-400">
                                <Eye className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Read-Only</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed">
                                We only read your public address. We cannot access your private keys.
                            </p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 mb-1 text-indigo-400">
                                <Shield className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Non-Custodial</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed">
                                Your funds stay in your wallet. We cannot move or touch your assets.
                            </p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 mb-1 text-purple-400">
                                <Lock className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Encrypted</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed">
                                Messages are end-to-end encrypted. Only you and the recipient can read them.
                            </p>
                        </div>
                    </div>

                    <p className="mt-4 text-xs text-slate-500">
                        By connecting, you agree to the Terms of Service and Privacy Policy.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
