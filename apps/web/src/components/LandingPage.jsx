import { Shield, Zap, Lock, Globe, MessageSquare, ArrowRight, CheckCircle, Users, Building2, Smartphone, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import coinmunIcon from '../../assets/coinmun.svg';
import orcaIcon from '../../assets/Orca_Logo.webp';
import tgPreview from '../assets/tg.png';
import webPreview from '../assets/web.png';

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen w-full bg-[#030305] text-slate-200 selection:bg-indigo-500/30 overflow-x-hidden font-sans">
            {/* Background Gradients */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]" />
            </div>

            <main className="relative z-10">
                {/* Hero Section */}
                <section className="relative pt-32 pb-20 px-6">
                    <div className="max-w-7xl mx-auto text-center">
                        <div className="animate-fade-in-up">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-8">
                                <Zap className="w-3 h-3" />
                                <span>Powered by Solana</span>
                            </div>

                            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-white mb-8">
                                <span className="block">The Immutable</span>
                                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 pb-2">
                                    Communication Layer
                                </span>
                            </h1>

                            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-12">
                                Memo Protocol is the decentralized infrastructure for secure, wallet-to-wallet messaging and community governance.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <button
                                    onClick={() => document.getElementById('social').scrollIntoView({ behavior: 'smooth' })}
                                    className="px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2"
                                >
                                    Explore Ecosystem
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => navigate('/whitepaper')}
                                    className="px-8 py-4 bg-white/5 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors border border-white/10"
                                >
                                    Read Whitepaper
                                </button>
                            </div>
                        </div>
                    </div>
                </section>



                {/* MEMO SOCIAL (Telegram Bot) */}
                <section id="social" className="py-32 px-6">
                    <div className="max-w-7xl mx-auto mb-24">
                        <div className="flex flex-col md:flex-row items-center gap-12">
                            <div className="flex-1 space-y-8">
                                <div className="inline-flex items-center gap-2 text-sky-400 font-semibold uppercase tracking-wider text-sm">
                                    <Users className="w-4 h-4" />
                                    <span>Memo Social</span>
                                </div>
                                <h2 className="text-4xl md:text-5xl font-bold text-white">
                                    The Telegram Bot
                                </h2>
                                <p className="text-xl text-slate-400 leading-relaxed">
                                    The ultimate community management tool. Token-gate your groups without forcing members to connect their wallets to a website.
                                </p>

                                <div className="space-y-4">
                                    <CheckItem title="Zero Wallet Connect" description="Users verify assets via a safe, non-invasive 'Magic Transaction' (self-transfer) on the public ledger. No risk to hot wallets." />
                                    <CheckItem title="Volume Tracking" description="Monitor community trading volume and engagement in real-time." />
                                    <CheckItem title="Private Group Access" description="Automatically manage invite links based on token holdings." />
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => window.open('https://t.me/memo_verification_bot', '_blank')}
                                        className="px-8 py-4 bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold rounded-xl hover:bg-sky-500/20 transition-colors flex items-center gap-2"
                                    >
                                        Add to Telegram
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => navigate('/telegram-bot-details')}
                                        className="px-8 py-4 bg-white/5 text-white border border-white/10 font-semibold rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2"
                                    >
                                        Learn More
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 w-full max-w-md aspect-square flex items-center justify-center p-4">
                                <img
                                    src={tgPreview}
                                    alt="Memo Telegram Bot Interface"
                                    className="w-full h-full object-contain drop-shadow-2xl rounded-2xl hover:scale-[1.02] transition-transform duration-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* MEMO ENTERPRISE (Web App) */}
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row-reverse items-center gap-12">
                            <div className="flex-1 space-y-8">
                                <div className="inline-flex items-center gap-2 text-indigo-400 font-semibold uppercase tracking-wider text-sm">
                                    <Building2 className="w-4 h-4" />
                                    <span>Memo Enterprise</span>
                                </div>
                                <h2 className="text-4xl md:text-5xl font-bold text-white">
                                    The Web App
                                </h2>
                                <p className="text-xl text-slate-400 leading-relaxed">
                                    A full-featured decentralized messaging suite. Manage your on-chain identity and communicate securely.
                                </p>

                                <div className="space-y-4">
                                    <CheckItem title="End-to-End Encryption" description="Send private, encrypted messages using TweetNaCl. Only you and the recipient hold the keys." />
                                    <CheckItem title="Immutable History" description="Your communications are secured by Solana, ensuring absolute data permanence and integrity." />
                                    <CheckItem title="Professional UI" description="A modern, responsive experience designed for the professional web3 user." />
                                    <CheckItem title="Wallet Connection Required" description="Your wallet is required to sign transactions and decrypt messages. Keys never stick around." />
                                </div>

                                <button
                                    onClick={() => navigate('/app')}
                                    className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                                >
                                    Launch Enterprise App
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex-1 w-full max-w-md aspect-square flex items-center justify-center p-4">
                                <img
                                    src={webPreview}
                                    alt="Memo Web App Dashboard"
                                    className="w-full h-full object-contain drop-shadow-2xl rounded-2xl hover:scale-[1.02] transition-transform duration-500"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* COMPARISON: Choose Your Stream */}
                <section className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Choose Your Stream</h2>
                            <p className="text-slate-400">Two powerful interfaces, one immutable protocol.</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Social Card */}
                            <div className="p-8 rounded-3xl bg-[#0A0A0B] border border-white/5 hover:border-sky-500/30 transition-colors group">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white">Memo Social</h3>
                                        <div className="text-sky-400 text-sm font-medium">Community & Growth</div>
                                    </div>
                                </div>
                                <ul className="space-y-4 mb-8">
                                    <li className="flex items-start gap-3 text-slate-400">
                                        <Bot className="w-5 h-5 text-sky-500 shrink-0" />
                                        <span>Automated Telegram Management</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-slate-400">
                                        <Shield className="w-5 h-5 text-sky-500 shrink-0" />
                                        <span>Token-Gating without Wallet Connect</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-slate-400">
                                        <Users className="w-5 h-5 text-sky-500 shrink-0" />
                                        <span>Mass Adoption & Onboarding</span>
                                    </li>
                                </ul>
                                <button
                                    onClick={() => window.open('https://t.me/memo_verification_bot', '_blank')}
                                    className="w-full py-3 bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold rounded-xl hover:bg-sky-500/20 transition-colors"
                                >
                                    Start Building Community
                                </button>
                            </div>

                            {/* Enterprise Card */}
                            <div className="p-8 rounded-3xl bg-[#0A0A0B] border border-white/5 hover:border-indigo-500/30 transition-colors group">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white">Memo Enterprise</h3>
                                        <div className="text-indigo-400 text-sm font-medium">Security & Infrastructure</div>
                                    </div>
                                </div>
                                <ul className="space-y-4 mb-8">
                                    <li className="flex items-start gap-3 text-slate-400">
                                        <Lock className="w-5 h-5 text-indigo-500 shrink-0" />
                                        <span>Full End-to-End Encryption</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-slate-400">
                                        <Zap className="w-5 h-5 text-indigo-500 shrink-0" />
                                        <span>Identity & Wallet Management</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-slate-400">
                                        <MessageSquare className="w-5 h-5 text-indigo-500 shrink-0" />
                                        <span>Client-Side Message Signing</span>
                                    </li>
                                </ul>
                                <button
                                    onClick={() => navigate('/app')}
                                    className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-colors"
                                >
                                    Access Enterprise Suite
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How it Works */}
                <section className="py-24 px-6 border-t border-white/5">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How it Works</h2>
                            <p className="text-slate-400">The technical mechanism behind the protocol.</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8">
                            <StepCard
                                number="01"
                                title="Identity Verification"
                                description="The protocol verifies your wallet ownership on-chain via a self-transfer or signature, establishing a secure session without exposing private keys."
                            />
                            <StepCard
                                number="02"
                                title="Message Encryption"
                                description="Messages are encrypted client-side using the recipient's public key (Diffie-Hellman key exchange) before ever leaving your device."
                            />
                            <StepCard
                                number="03"
                                title="On-Chain Storage"
                                description="Encrypted data relies on the blockchain for storage and retrieval, ensuring that only the intended recipient can ever decrypt and read the content."
                            />
                        </div>
                    </div>
                </section>

                {/* Footer/Socials */}
                <footer className="py-12 px-6 border-t border-white/5">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-slate-500 text-sm">
                            © 2024 Memo Protocol. All rights reserved.
                        </div>
                        <div className="flex items-center gap-6">
                            <SocialLink href="https://x.com/MemoOnSol" label="Twitter/X" />
                            <SocialLink href="https://coinmun.com/coins/memo-protocol" label="CoinMun" />
                            <SocialLink href="https://www.orca.so" label="Buy on Orca" />
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}

function Feature({ icon, title, description }) {
    return (
        <div className="space-y-4">
            <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <p className="text-slate-400 leading-relaxed">{description}</p>
        </div>
    );
}

function CheckItem({ title, description }) {
    return (
        <div className="flex gap-4">
            <CheckCircle className="w-6 h-6 text-indigo-400 shrink-0 mt-1" />
            <div>
                <h4 className="text-lg font-semibold text-white">{title}</h4>
                <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
            </div>
        </div>
    );
}

function StepCard({ number, title, description }) {
    return (
        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5">
            <div className="text-4xl font-black text-white/10 mb-6">{number}</div>
            <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
            <p className="text-slate-400 leading-relaxed">{description}</p>
        </div>
    );
}

function SocialLink({ href, label }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white transition-colors text-sm font-medium">
            {label}
        </a>
    );
}
