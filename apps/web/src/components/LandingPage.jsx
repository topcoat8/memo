import { Shield, Zap, Lock, Globe, MessageSquare, ArrowRight, CheckCircle, Users, Building2, Smartphone, Bot, FileCheck, Database, Link as LinkIcon, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import coinmunIcon from '../../assets/coinmun.svg';
import orcaIcon from '../../assets/Orca_Logo.webp';
import tgPreview from '../assets/tg.png';
import webPreview from '../assets/web.png';

export default function LandingPage() {
    const navigate = useNavigate();
    const [activeStream, setActiveStream] = useState('enterprise');

    return (
        <div className="min-h-screen w-full bg-[#030305] text-slate-200 selection:bg-indigo-500/30 overflow-x-hidden font-sans">
            {/* Background Gradients */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-sky-600/10 rounded-full blur-[120px]" />
            </div>

            <main className="relative z-10">
                {/* Hero Section */}
                <section className="relative pt-24 pb-10 px-6">
                    <div className="max-w-7xl mx-auto text-center relative">
                        {/* Top Left Status */}
                        <div className="absolute top-0 left-0 hidden md:flex items-center gap-4">
                            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-center gap-4 shadow-lg shadow-black/20">
                                <div className="flex items-center gap-2">
                                    <div className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </div>
                                    <span className="text-xs font-bold text-slate-300 tracking-wide">ENTERPRISE: <span className="text-emerald-400">ONLINE</span></span>
                                </div>
                                <div className="w-px h-3 bg-white/10" />
                                <div className="flex items-center gap-2">
                                    <div className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </div>
                                    <span className="text-xs font-bold text-slate-300 tracking-wide">BOT: <span className="text-emerald-400">ONLINE</span></span>
                                </div>
                            </div>
                        </div>

                        {/* Top Right Actions */}
                        <div className="absolute top-0 right-0 hidden md:block">
                            <button
                                onClick={() => navigate('/whitepaper')}
                                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold text-white transition-colors border border-white/10 backdrop-blur-sm"
                            >
                                Whitepaper
                            </button>
                        </div>

                        <div className="animate-fade-in-up">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-8">
                                <Zap className="w-3 h-3" />
                                <span>Powered by Solana</span>
                            </div>

                            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-white mb-8">
                                <span className="block text-4xl sm:text-5xl md:text-7xl lg:text-8xl">The First Immutable</span>
                                <span className="block relative h-[1.2em]">
                                    <span className="absolute inset-x-0 top-0 flex justify-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-400 to-indigo-400 pb-2">
                                        <span className="whitespace-nowrap text-3xl sm:text-5xl md:text-7xl lg:text-8xl">
                                            <CyclingText />
                                        </span>
                                    </span>
                                </span>
                            </h1>

                            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-12">
                                Memo Protocol is the decentralized infrastructure for secure communication and community governance. Two powerful streams, one immutable ledger.
                            </p>


                        </div>
                    </div>
                </section>

                {/* THE TWO STREAMS */}
                <section id="streams" className="py-10 pb-20 px-6">
                    <div className="max-w-7xl mx-auto">


                        {/* STREAMS TOGGLE SECTION */}
                        <div className="flex flex-col items-center mb-10">
                            <StreamToggle activeStream={activeStream} onToggle={setActiveStream} />
                        </div>

                        {/* DYNAMIC STREAM CONTENT */}
                        <div className="min-h-[400px]">
                            <AnimatePresence mode="wait">
                                {activeStream === 'enterprise' ? (
                                    <motion.div
                                        key="enterprise"
                                        initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                        exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                                        transition={{ duration: 0.4, ease: "easeInOut" }}
                                    >
                                        <div className="animate-fade-in">
                                            {/* MEMO ENTERPRISE CONTENT */}
                                            <div className="text-center mb-12">
                                                <div className="inline-flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-widest text-sm mb-6">
                                                    <Building2 className="w-4 h-4" />
                                                    <span>Memo Enterprise</span>
                                                </div>
                                                <h2 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tight">
                                                    The Transparency Paradox
                                                </h2>
                                                <p className="text-xl md:text-3xl text-slate-400 max-w-4xl mx-auto leading-relaxed font-light">
                                                    Blockchain transparency is a feature until <span className="text-white font-medium">you need to do business</span>.
                                                </p>
                                            </div>

                                            {/* The Problem/Solution Grid */}
                                            <div className="grid md:grid-cols-2 gap-4 mb-16 max-w-6xl mx-auto">
                                                {[
                                                    {
                                                        title: "Disputable Delivery",
                                                        prob: "I never received that contract.",
                                                        sol: "Cryptographic proof of delivery that holds up in court.",
                                                        icon: <FileCheck className="w-5 h-5" />
                                                    },
                                                    {
                                                        title: "Impermanent History",
                                                        prob: "Centralized platforms delete logs or go offline.",
                                                        sol: "An immutable audit trail that lasts forever.",
                                                        icon: <Database className="w-5 h-5" />
                                                    },
                                                    {
                                                        title: "Broken Context",
                                                        prob: "Payments separated from data cause accounting nightmares.",
                                                        sol: "Value and data sent in one atomic transaction.",
                                                        icon: <LinkIcon className="w-5 h-5" />
                                                    },
                                                    {
                                                        title: "Counterparty Trust",
                                                        prob: "Trusting a third party to verify the deal happened.",
                                                        sol: "The blockchain itself is the unbribable witness.",
                                                        icon: <Scale className="w-5 h-5" />
                                                    }
                                                ].map((item, i) => (
                                                    <div key={i} className="flex flex-col md:flex-row items-stretch rounded-2xl overflow-hidden border border-white/5 bg-[#0A0A0B]">
                                                        {/* Problem Side */}
                                                        <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-white/5 bg-red-500/[0.02]">
                                                            <div className="flex items-center gap-2 mb-2 text-red-400/80 text-xs font-bold uppercase tracking-wider">
                                                                <Shield className="w-3 h-3" />
                                                                The Risk
                                                            </div>
                                                            <p className="text-slate-400 text-sm leading-relaxed">
                                                                "{item.prob}"
                                                            </p>
                                                        </div>

                                                        {/* Solution Side */}
                                                        <div className="flex-1 p-6 bg-indigo-500/[0.05] relative overflow-hidden group">
                                                            <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                            <div className="relative z-10">
                                                                <div className="flex items-center gap-2 mb-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                                                                    {item.icon}
                                                                    Memo's Answer
                                                                </div>
                                                                <p className="text-slate-200 font-medium text-sm leading-relaxed">
                                                                    {item.sol}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* The Solution Section */}
                                            <div className="relative mb-20">
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px] -z-10" />

                                                <div className="text-center mb-10">
                                                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                                                        Memo Protocol Resolves This
                                                    </h2>
                                                    <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
                                                        For the first time, you can have <strong className="text-indigo-400">cryptographically verifiable private communication</strong> tied directly to wallet identities.
                                                    </p>
                                                </div>

                                                <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                                                    <FeatureCard
                                                        icon={<MessageSquare className="w-5 h-5" />}
                                                        title="Encrypted Context"
                                                        desc="Attach private data to public transactions."
                                                    />
                                                    <FeatureCard
                                                        icon={<Shield className="w-5 h-5" />}
                                                        title="Verifiable Identity"
                                                        desc="Your wallet is your only login."
                                                    />
                                                    <FeatureCard
                                                        icon={<Zap className="w-5 h-5" />}
                                                        title="Permanent Storage"
                                                        desc="History that lasts as long as the chain."
                                                    />
                                                </div>

                                                <div className="mt-12 flex justify-center">
                                                    <button
                                                        onClick={() => navigate('/app')}
                                                        className="px-10 py-5 bg-white text-black font-bold rounded-2xl hover:bg-slate-200 transition-colors flex items-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]"
                                                    >
                                                        Launch Enterprise App
                                                        <ArrowRight className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>


                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="social"
                                        initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                        exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                                        transition={{ duration: 0.4, ease: "easeInOut" }}
                                    >
                                        <div className="animate-fade-in">
                                            {/* MEMO SOCIAL CONTENT */}
                                            <div className="flex flex-col items-center gap-10 mb-16">
                                                <div className="space-y-8 text-center max-w-4xl mx-auto">
                                                    <div className="inline-flex items-center gap-2 text-sky-400 font-bold uppercase tracking-widest text-sm justify-center">
                                                        <Users className="w-4 h-4" />
                                                        <span>Memo Social</span>
                                                    </div>
                                                    <h2 className="text-5xl md:text-7xl font-black text-white">
                                                        Where Communities Build
                                                    </h2>
                                                    <p className="text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto">
                                                        The social stream manages governance and access. Token-gate your community with <strong>with Solana token</strong> (SPL) or NFT collection.
                                                    </p>

                                                    <div className="grid md:grid-cols-3 gap-6 pt-12 text-left">
                                                        <FeaturePoint
                                                            title="On-Chain Rules"
                                                            description="Community rules and permissions are stored on-chain in a Memo. They are immutable and transparent."
                                                        />
                                                        <FeaturePoint
                                                            title="Universal Gating"
                                                            description="Admins hold $MEMO to unlock the bot, but can gate their communities with ANY token on Solana."
                                                        />
                                                        <FeaturePoint
                                                            title="Zero-Connect Verification"
                                                            description="Users verify via 'Magic Transactions' (0 MEMO transfers). No wallet connection to a website is ever required."
                                                        />
                                                    </div>

                                                    <div className="flex flex-col items-center pt-8 mb-12">
                                                        <button
                                                            onClick={() => window.open('https://t.me/memo_verification_bot', '_blank')}
                                                            className="px-10 py-5 bg-sky-600 text-white font-bold rounded-2xl hover:bg-sky-500 transition-colors flex items-center gap-3 shadow-lg shadow-sky-500/20 mb-3"
                                                        >
                                                            Use Telegram Bot
                                                            <ArrowRight className="w-5 h-5" />
                                                        </button>
                                                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                                            Supports all SPL Tokens
                                                        </span>
                                                    </div>

                                                    {/* Command Reference */}
                                                    <div className="max-w-5xl mx-auto w-full text-left">
                                                        <div className="text-center mb-12">
                                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">
                                                                <Bot className="w-3 h-3" />
                                                                Command Reference
                                                            </div>
                                                            <h3 className="text-3xl font-bold text-white">
                                                                Powerful Tools at Your Fingertips
                                                            </h3>
                                                        </div>

                                                        <div className="grid md:grid-cols-2 gap-8">
                                                            <CommandList
                                                                title="User Commands"
                                                                icon={<Users className="w-4 h-4" />}
                                                                color="sky"
                                                                commands={[
                                                                    { cmd: "/verify", desc: "Link your wallet to your account" },
                                                                    { cmd: "/mystatus", desc: "Check your current verification status" },
                                                                    { cmd: "/leaderboard", desc: "View top token holders in this group" },
                                                                    { cmd: "/locked", desc: "View any locked community funds" },
                                                                    { cmd: "/supply", desc: "View total token supply of the community" },
                                                                    { cmd: '/poll "Q" "O1" "O2"', desc: "Create a poll" }
                                                                ]}
                                                            />
                                                            <CommandList
                                                                title="Admin Commands"
                                                                icon={<Shield className="w-4 h-4" />}
                                                                color="purple"
                                                                commands={[
                                                                    { cmd: "/create", desc: "Launch a new Token Gated community" },
                                                                    { cmd: "/link <address>", desc: "Connect this group to your community" },
                                                                    { cmd: "/rules", desc: "View current community rules" },
                                                                    { cmd: "/audit", desc: "Check all members for compliance" },
                                                                    { cmd: "/kick", desc: "Remove users who no longer hold tokens" },
                                                                    { cmd: "/check", desc: "Check a specific user's status (Reply)" },
                                                                    { cmd: "/tally", desc: "Tally poll weights (Reply to poll)" },
                                                                    { cmd: "/addlocked", desc: "Register locked funds" },
                                                                    { cmd: "/export", desc: "Export member list as CSV" }
                                                                ]}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </section>

                {/* TOKENOMICS */}
                <section className="py-12 px-6 bg-white/[0.02] border-t border-white/5">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
                            <div className="text-left">
                                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">The $MEMO Token</h2>
                                <p className="text-slate-400 max-w-xl">
                                    Powering the ecosystem with distinct utility for each stream.
                                </p>
                            </div>
                            <a href="https://dexscreener.com/solana/f8fgmfzyvv57bbkjrqv3f7cty34ictkoaw3gwaukvee1" target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-slate-300 transition-colors border border-white/10">
                                View Chart
                            </a>
                        </div>

                        {activeStream === 'enterprise' ? (
                            <div className="grid md:grid-cols-3 gap-4 animate-fade-in">
                                <div className="p-5 rounded-2xl bg-[#0A0A0B] border border-white/5 flex flex-col hover:border-indigo-500/30 transition-colors group">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                            <Zap className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white">Transmission</h3>
                                    </div>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        $MEMO acts as the carrier wave for value. Attach payments directly to encrypted messages for seamless settlement.
                                    </p>
                                </div>

                                <div className="p-5 rounded-2xl bg-[#0A0A0B] border border-white/5 flex flex-col hover:border-indigo-500/30 transition-colors group">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                            <Lock className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white">Utility</h3>
                                    </div>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        Pay for premium enterprise features, permanent storage, and high-bandwidth encrypted channels.
                                    </p>
                                </div>

                                <div className="p-5 rounded-2xl bg-[#0A0A0B] border border-white/5 flex flex-col hover:border-indigo-500/30 transition-colors group">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                                            <Shield className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white">Security</h3>
                                    </div>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        Future update: Staked nodes will secure the decentralized delivery network and earn yield.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid md:grid-cols-3 gap-4 animate-fade-in">
                                <div className="p-5 rounded-2xl bg-[#0A0A0B] border border-white/5 flex flex-col hover:border-sky-500/30 transition-colors group">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                                            <Shield className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white">Governance</h3>
                                    </div>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        Admins must stake $MEMO to create communities. This prevents spam and aligns incentives.
                                    </p>
                                </div>

                                <div className="p-5 rounded-2xl bg-[#0A0A0B] border border-white/5 flex flex-col hover:border-sky-500/30 transition-colors group">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                                            <Lock className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white">Access</h3>
                                    </div>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        Communities can verify $MEMO holdings for entry, creating exclusive, high-value groups.
                                    </p>
                                </div>

                                <div className="p-5 rounded-2xl bg-[#0A0A0B] border border-white/5 flex flex-col hover:border-sky-500/30 transition-colors group">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                                            <Zap className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white">Rewards</h3>
                                    </div>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        Participate in Red Packets and community events to earn $MEMO directly within the chat.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* ROADMAP */}
                <section className="py-16 px-6 border-t border-white/5 relative overflow-hidden">
                    {/* Background Accent */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-indigo-500/5 via-transparent to-sky-500/5 rounded-full blur-[100px] -z-10" />

                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-10">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">
                                <Zap className="w-3 h-3" />
                                <span>Development Roadmap</span>
                            </div>
                            <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
                                Building the Future
                            </h2>
                            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                                Two parallel streams. One unified vision. Watch us ship.
                            </p>
                        </div>

                        <div className="max-w-4xl mx-auto relative">
                            {/* SOCIAL ROADMAP - Premium 3-Phase Design */}
                            {activeStream === 'social' && (
                                <SocialRoadmap />
                            )}

                            {/* ENTERPRISE ROADMAP - Premium 3-Phase Design */}
                            {activeStream === 'enterprise' && (
                                <EnterpriseRoadmap />
                            )}
                        </div>
                    </div>
                </section>

                {/* Footer/Socials */}
                <footer className="py-16 px-6 border-t border-white/5 bg-[#050507] relative overflow-hidden">
                    {/* Subtle gradient accent */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-t from-indigo-500/5 to-transparent blur-[80px] -z-10" />

                    <div className="max-w-7xl mx-auto">
                        {/* Main Footer Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                            {/* Brand Column */}
                            <div className="md:col-span-2">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center">
                                        <MessageSquare className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="text-xl font-black text-white tracking-tight">MEMO</span>
                                </div>
                                <p className="text-slate-400 text-sm leading-relaxed max-w-sm mb-6">
                                    The decentralized infrastructure for secure communication and community governance on Solana.
                                </p>
                                <div className="flex items-center gap-3">
                                    <a
                                        href="https://x.com/MemoOnSol"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all hover:scale-105"
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                        </svg>
                                    </a>
                                    <a
                                        href="https://t.me/memo_verification_bot"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all hover:scale-105"
                                    >
                                        <Bot className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>

                            {/* Quick Links */}
                            <div>
                                <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Product</h4>
                                <ul className="space-y-3">
                                    <li>
                                        <button onClick={() => navigate('/app')} className="text-slate-400 hover:text-white transition-colors text-sm">
                                            Enterprise App
                                        </button>
                                    </li>
                                    <li>
                                        <a href="https://t.me/memo_verification_bot" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors text-sm">
                                            Telegram Bot
                                        </a>
                                    </li>
                                    <li>
                                        <button onClick={() => navigate('/whitepaper')} className="text-slate-400 hover:text-white transition-colors text-sm">
                                            Whitepaper
                                        </button>
                                    </li>
                                </ul>
                            </div>

                            {/* Community */}
                            <div>
                                <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Community</h4>
                                <ul className="space-y-3">
                                    <li>
                                        <a href="https://x.com/MemoOnSol" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors text-sm">
                                            Twitter / X
                                        </a>
                                    </li>
                                    <li>
                                        <a href="https://coinmun.com/coins/memo-protocol" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors text-sm">
                                            CoinMun
                                        </a>
                                    </li>
                                    <li>
                                        <a href="https://dexscreener.com/solana/f8fgmfzyvv57bbkjrqv3f7cty34ictkoaw3gwaukvee1" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors text-sm">
                                            DexScreener
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Bottom Bar */}
                        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-slate-500 text-sm">
                                © 2025 Memo Protocol. All rights reserved.
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500 text-xs">Powered by</span>
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10">
                                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-[#9945FF] to-[#14F195]" />
                                    <span className="text-xs font-bold text-slate-300">Solana</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </footer>
            </main>
        </div >
    );
}

function FeaturePoint({ title, description }) {
    return (
        <div className="flex gap-4">
            <div className="mt-1 w-2 h-2 rounded-full bg-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.5)] shrink-0" />
            <div>
                <h4 className="text-lg font-bold text-white mb-1">{title}</h4>
                <p className="text-slate-400 leading-relaxed text-sm">{description}</p>
            </div>
        </div>
    );
}

function RoadmapItem({ phase, title, items, status, isSocial }) {
    const isCompleted = status === 'completed';
    const isCurrent = status === 'current';

    // Theme colors based on stream type
    const activeColorClass = isSocial ? 'text-sky-400' : 'text-indigo-400';
    const activeBgClass = isSocial ? 'bg-sky-500/10 border-sky-500/50' : 'bg-indigo-500/10 border-indigo-500/50';
    const glowClass = isSocial ? 'shadow-[0_0_50px_rgba(14,165,233,0.15)]' : 'shadow-[0_0_50px_rgba(99,102,241,0.15)]';

    return (
        <div className={`relative p-8 rounded-3xl border transition-all duration-300 backdrop-blur-sm bg-[#0A0A0B]/80 
            ${isCurrent ? `${activeBgClass} ${glowClass} scale-105 border-opacity-100 ring-1 ring-white/10` : 'border-white/5 hover:border-white/10'}`}>

            {/* Status Pill */}
            <div className="flex justify-center mb-6">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border
                    ${isCurrent
                        ? (isSocial ? 'bg-sky-500/10 border-sky-500 text-sky-400' : 'bg-indigo-500/10 border-indigo-500 text-indigo-400')
                        : 'bg-white/5 border-white/10 text-slate-500'}`}>
                    {isCurrent && <div className={`w-1.5 h-1.5 rounded-full ${isSocial ? 'bg-sky-400' : 'bg-indigo-400'} animate-pulse`} />}
                    {phase}
                </div>
            </div>

            <div className="text-center mb-8">
                <h3 className={`text-2xl font-bold mb-2 ${isCompleted ? 'text-slate-400' : 'text-white'}`}>{title}</h3>
                {isCompleted && <div className="text-xs font-medium text-emerald-500 uppercase tracking-wider flex items-center justify-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Completed
                </div>}
            </div>

            <div className="grid md:grid-cols-2 gap-x-8 gap-y-3 max-w-2xl mx-auto">
                {items.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 text-left">
                        <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${isCompleted ? 'bg-slate-700' : isCurrent ? (isSocial ? 'bg-sky-400' : 'bg-indigo-400') : 'bg-slate-700'}`} />
                        <span className={`text-sm leading-relaxed ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-300'}`}>{item}</span>
                    </div>
                ))}
            </div>
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

const CHARS = "-_~`!@#$%^&*()+=[]{}|;:,.<>?/0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function CyclingText() {
    const [text, setText] = useState("Social Graph");
    const phrases = ["Social Graph", "Communication Layer", "Community Engine", "Identity Protocol"];

    useEffect(() => {
        let currentIndex = 0;

        const interval = setInterval(() => {
            currentIndex = (currentIndex + 1) % phrases.length;
            const target = phrases[currentIndex];
            let iterations = 0;

            const scrambleTimer = setInterval(() => {
                setText(prev =>
                    target.split("")
                        .map((letter, index) => {
                            if (index < iterations) {
                                return target[index];
                            }
                            return CHARS[Math.floor(Math.random() * CHARS.length)];
                        })
                        .join("")
                );

                if (iterations >= target.length) {
                    clearInterval(scrambleTimer);
                }

                iterations += 1 / 3;
            }, 30);

        }, 4000);

        return () => clearInterval(interval);
    }, []);

    return <span className="font-mono">{text}</span>;
}


function FeatureCard({ icon, title, desc }) {
    return (
        <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="text-indigo-400 shrink-0 mt-1">{icon}</div>
            <div>
                <h4 className="font-bold text-white text-base">{title}</h4>
                <p className="text-slate-400 text-sm leading-snug">{desc}</p>
            </div>
        </div>
    );
}

function StreamToggle({ activeStream, onToggle }) {
    return (
        <div className="p-1 rounded-full bg-white/5 border border-white/10 flex relative w-fit">
            <div
                className={`absolute inset-y-1 rounded-full transition-all duration-300 ease-out shadow-lg
                ${activeStream === 'enterprise' ? 'left-1 w-[140px] bg-indigo-600' : 'left-[144px] w-[140px] bg-sky-600'}`}
            />
            <button
                onClick={() => onToggle('enterprise')}
                className={`w-[140px] py-3 rounded-full text-sm font-bold uppercase tracking-wider relative z-10 transition-colors duration-300
                ${activeStream === 'enterprise' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
            >
                Enterprise
            </button>
            <button
                onClick={() => onToggle('social')}
                className={`w-[140px] py-3 rounded-full text-sm font-bold uppercase tracking-wider relative z-10 transition-colors duration-300
                ${activeStream === 'social' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
            >
                Social
            </button>
        </div>
    );
}

function SocialRoadmap() {
    const [activePhase, setActivePhase] = useState('expansion');

    const phases = {
        foundation: {
            title: "Foundation",
            subtitle: "Community Infrastructure",
            status: "completed",
            progress: 100,
            items: [
                { name: "Telegram Bot Launch", desc: "The first token-gating bot powered by on-chain verification" },
                { name: "Magic Transactions", desc: "Zero-wallet-connect verification via 0 MEMO transfers" },
                { name: "Universal Token Gating", desc: "Gate communities with ANY SPL token or NFT collection" },
                { name: "Admin Command Suite", desc: "Full control: /audit, /kick, /export, /poll and more" },
                { name: "Leaderboards & Stats", desc: "Real-time holder rankings and community analytics" },
            ]
        },
        expansion: {
            title: "Expansion",
            subtitle: "Viral Growth Tools",
            status: "current",
            progress: 65,
            items: [
                { name: "Discord Bot", desc: "Bring token-gating to the #1 crypto community platform", isNew: false },
                { name: "Red Packets", desc: "Viral token distribution that spreads like wildfire", isNew: true },
                { name: "Weighted Voting", desc: "Governance polls where token holdings = voting power", isNew: true, completed: true },
                { name: "Community Wallets", desc: "Shared treasuries with transparent on-chain tracking", isNew: false },
                { name: "Referral System", desc: "Reward members who grow your community", isNew: true },
            ]
        },
        ecosystem: {
            title: "Ecosystem",
            subtitle: "The Social Layer of Web3",
            status: "upcoming",
            progress: 0,
            items: [
                { name: "Cross-Platform Identity", desc: "One verification across Telegram, Discord, and beyond" },
                { name: "Social Graph API", desc: "Query holder relationships and community connections" },
                { name: "Governance DAO", desc: "Community-owned protocol with on-chain proposals" },
                { name: "Reputation Scores", desc: "Portable reputation based on on-chain activity" },
                { name: "White-Label Bot", desc: "Deploy custom-branded bots for your community" },
            ]
        }
    };

    const currentPhase = phases[activePhase];

    return (
        <div className="w-full">
            {/* Phase Selector - Sky blue theme */}
            <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3 mb-8">
                {Object.entries(phases).map(([key, phase]) => {
                    const isActive = activePhase === key;
                    const isCompleted = phase.status === 'completed';
                    const isCurrent = phase.status === 'current';

                    return (
                        <button
                            key={key}
                            onClick={() => setActivePhase(key)}
                            className={`relative px-4 sm:px-6 py-3 sm:py-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center sm:justify-start gap-3 border
                                ${isActive
                                    ? 'bg-sky-600/20 border-sky-500/50 text-white shadow-lg shadow-sky-500/20'
                                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            <div className={`w-2 h-2 rounded-full shrink-0 ${isCompleted ? 'bg-emerald-500' :
                                isCurrent ? 'bg-sky-400 animate-pulse' :
                                    'bg-slate-600'
                                }`} />

                            <span>{phase.title}</span>

                            {isCompleted && (
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                            )}
                            {isCurrent && (
                                <span className="text-[10px] font-bold bg-sky-500/30 text-sky-300 px-2 py-0.5 rounded-full">
                                    NOW
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Active Phase Card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activePhase}
                    initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -20, filter: 'blur(8px)' }}
                    transition={{ duration: 0.3 }}
                    className={`relative rounded-3xl border backdrop-blur-sm overflow-hidden
                        ${currentPhase.status === 'current'
                            ? 'bg-sky-500/5 border-sky-500/30 shadow-[0_0_60px_rgba(14,165,233,0.1)]'
                            : 'bg-[#0A0A0B]/80 border-white/10'
                        }`}
                >
                    {/* Header */}
                    <div className="px-6 sm:px-8 py-6 border-b border-white/5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-2xl sm:text-3xl font-bold text-white">{currentPhase.title}</h3>
                                    {currentPhase.status === 'completed' && (
                                        <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" />
                                            COMPLETE
                                        </span>
                                    )}
                                    {currentPhase.status === 'current' && (
                                        <span className="text-xs font-bold bg-sky-500/20 text-sky-400 px-3 py-1 rounded-full flex items-center gap-1">
                                            <Zap className="w-3 h-3" />
                                            BUILDING
                                        </span>
                                    )}
                                    {currentPhase.status === 'upcoming' && (
                                        <span className="text-xs font-bold bg-slate-500/20 text-slate-400 px-3 py-1 rounded-full">
                                            COMING SOON
                                        </span>
                                    )}
                                </div>
                                <p className="text-slate-400 text-sm sm:text-base">{currentPhase.subtitle}</p>
                            </div>

                            {/* Progress Bar */}
                            {(currentPhase.status === 'current' || currentPhase.status === 'completed') && (
                                <div className="w-full sm:w-48">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-500">Progress</span>
                                        <span className="text-sky-400 font-bold">{currentPhase.progress}%</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-500"
                                            style={{ width: `${currentPhase.progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Features Grid */}
                    <div className="p-4 sm:p-6">
                        <div className="grid gap-3">
                            {currentPhase.items.map((item, i) => (
                                <div
                                    key={i}
                                    className={`group p-4 sm:p-5 rounded-2xl border transition-all duration-300 hover:scale-[1.01]
                                        ${currentPhase.status === 'completed'
                                            ? 'bg-white/[0.02] border-white/5'
                                            : 'bg-white/[0.03] border-white/10 hover:border-sky-500/30 hover:bg-sky-500/5'
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center
                                            ${currentPhase.status === 'completed' || item.completed
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : 'bg-sky-500/20 text-sky-400'
                                            }`}
                                        >
                                            {currentPhase.status === 'completed' || item.completed ? (
                                                <CheckCircle className="w-3 h-3" />
                                            ) : (
                                                <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <h4 className={`font-bold text-sm sm:text-base ${currentPhase.status === 'completed' || item.completed ? 'text-slate-400' : 'text-white'
                                                    }`}>
                                                    {item.name}
                                                </h4>
                                                {item.isNew && (
                                                    <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full uppercase">
                                                        New
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                                                {item.desc}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

function EnterpriseRoadmap() {
    const [activePhase, setActivePhase] = useState('expansion');

    const phases = {
        foundation: {
            title: "Foundation",
            subtitle: "Core Infrastructure",
            status: "completed",
            progress: 100,
            items: [
                { name: "Launch Memo Enterprise", desc: "The first immutable messaging protocol goes live on Solana" },
                { name: "Rich Media & Formatting", desc: "More than text—communicate like professionals" },
                { name: "Burn-Upon-Read", desc: "Self-destructing messages with cryptographic proof of delivery" },
                { name: "PDF & Contract Exports", desc: "Court-ready documentation at the click of a button" },
                { name: "Security Audits", desc: "Battle-tested and enterprise-hardened from day one" },
            ]
        },
        expansion: {
            title: "Expansion",
            subtitle: "Supercharging Enterprise",
            status: "current",
            progress: 35,
            items: [
                { name: "Solana Blinks & Actions", desc: "Execute on-chain actions directly inside conversations", isNew: false },
                { name: "Contact Nicknames & Labels", desc: "Tag wallets with names, notes, and categories for easy reference", isNew: true },
                { name: "Scheduled & Recurring Memos", desc: "Pre-compose messages that send automatically at future times", isNew: true },
                { name: "Message Templates", desc: "Save and reuse common formats for invoices, agreements, and more", isNew: true },
                { name: "Multi-Wallet Support", desc: "Connect multiple wallets and switch between them seamlessly", isNew: true },
            ]
        },
        ecosystem: {
            title: "Ecosystem",
            subtitle: "Global Communication Standard",
            status: "upcoming",
            progress: 0,
            items: [
                { name: "Public Key Directory", desc: "On-chain registry for discovering contacts by wallet address" },
                { name: "Webhook Notifications", desc: "Get HTTP callbacks when you receive a memo—integrate anywhere" },
                { name: "Enterprise API & SDK", desc: "Let any application embed verifiable, encrypted messaging" },
                { name: "Memo Domains", desc: "Human-readable names (e.g., acme.memo) mapped to wallets" },
                { name: "Audit Log Dashboard", desc: "Visual interface to browse all historical memos with powerful filters" },
            ]
        }
    };

    const currentPhase = phases[activePhase];

    return (
        <div className="w-full">
            {/* Phase Selector - Horizontal on desktop, full-width on mobile */}
            <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3 mb-8">
                {Object.entries(phases).map(([key, phase]) => {
                    const isActive = activePhase === key;
                    const isCompleted = phase.status === 'completed';
                    const isCurrent = phase.status === 'current';

                    return (
                        <button
                            key={key}
                            onClick={() => setActivePhase(key)}
                            className={`relative px-4 sm:px-6 py-3 sm:py-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center sm:justify-start gap-3 border
                                ${isActive
                                    ? 'bg-indigo-600/20 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/20'
                                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            {/* Status Indicator */}
                            <div className={`w-2 h-2 rounded-full shrink-0 ${isCompleted ? 'bg-emerald-500' :
                                isCurrent ? 'bg-indigo-400 animate-pulse' :
                                    'bg-slate-600'
                                }`} />

                            <span>{phase.title}</span>

                            {isCompleted && (
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                            )}
                            {isCurrent && (
                                <span className="text-[10px] font-bold bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full">
                                    NOW
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Active Phase Card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activePhase}
                    initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -20, filter: 'blur(8px)' }}
                    transition={{ duration: 0.3 }}
                    className={`relative rounded-3xl border backdrop-blur-sm overflow-hidden
                        ${currentPhase.status === 'current'
                            ? 'bg-indigo-500/5 border-indigo-500/30 shadow-[0_0_60px_rgba(99,102,241,0.1)]'
                            : 'bg-[#0A0A0B]/80 border-white/10'
                        }`}
                >
                    {/* Header */}
                    <div className="px-6 sm:px-8 py-6 border-b border-white/5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-2xl sm:text-3xl font-bold text-white">{currentPhase.title}</h3>
                                    {currentPhase.status === 'completed' && (
                                        <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" />
                                            COMPLETE
                                        </span>
                                    )}
                                    {currentPhase.status === 'current' && (
                                        <span className="text-xs font-bold bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full flex items-center gap-1">
                                            <Zap className="w-3 h-3" />
                                            BUILDING
                                        </span>
                                    )}
                                    {currentPhase.status === 'upcoming' && (
                                        <span className="text-xs font-bold bg-slate-500/20 text-slate-400 px-3 py-1 rounded-full">
                                            COMING SOON
                                        </span>
                                    )}
                                </div>
                                <p className="text-slate-400 text-sm sm:text-base">{currentPhase.subtitle}</p>
                            </div>

                            {/* Progress Bar - only for current/completed */}
                            {(currentPhase.status === 'current' || currentPhase.status === 'completed') && (
                                <div className="w-full sm:w-48">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-500">Progress</span>
                                        <span className="text-indigo-400 font-bold">{currentPhase.progress}%</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-500 transition-all duration-500"
                                            style={{ width: `${currentPhase.progress}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Features Grid */}
                    <div className="p-4 sm:p-6">
                        <div className="grid gap-3">
                            {currentPhase.items.map((item, i) => (
                                <div
                                    key={i}
                                    className={`group p-4 sm:p-5 rounded-2xl border transition-all duration-300 hover:scale-[1.01]
                                        ${currentPhase.status === 'completed'
                                            ? 'bg-white/[0.02] border-white/5'
                                            : 'bg-white/[0.03] border-white/10 hover:border-indigo-500/30 hover:bg-indigo-500/5'
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Status Icon */}
                                        <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center
                                            ${currentPhase.status === 'completed'
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : 'bg-indigo-500/20 text-indigo-400'
                                            }`}
                                        >
                                            {currentPhase.status === 'completed' ? (
                                                <CheckCircle className="w-3 h-3" />
                                            ) : (
                                                <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <h4 className={`font-bold text-sm sm:text-base ${currentPhase.status === 'completed' ? 'text-slate-400' : 'text-white'
                                                    }`}>
                                                    {item.name}
                                                </h4>
                                                {item.isNew && (
                                                    <span className="text-[10px] font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full uppercase">
                                                        New
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                                                {item.desc}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

function CommandList({ title, icon, color, commands }) {
    const isSky = color === 'sky';
    const borderColor = isSky ? 'border-sky-500/20' : 'border-purple-500/20';
    const bgColor = isSky ? 'bg-sky-500/5' : 'bg-purple-500/5';
    const textColor = isSky ? 'text-sky-400' : 'text-purple-400';

    return (
        <div className={`rounded-3xl border ${borderColor} ${bgColor} overflow-hidden`}>
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3 bg-white/5">
                <div className={`w-8 h-8 rounded-lg ${isSky ? 'bg-sky-500/10' : 'bg-purple-500/10'} flex items-center justify-center ${textColor}`}>
                    {icon}
                </div>
                <h4 className="font-bold text-white transition-colors">{title}</h4>
            </div>
            <div className="p-2">
                <div className="bg-[#0A0A0B] rounded-2xl p-4 font-mono text-sm space-y-3">
                    {commands.map((item, i) => (
                        <div key={i} className="flex gap-3">
                            <span className={`${textColor} shrink-0`}>{item.cmd}</span>
                            <span className="text-slate-500">-</span>
                            <span className="text-slate-400">{item.desc}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}


