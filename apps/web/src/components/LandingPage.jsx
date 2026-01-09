import { Shield, Zap, Lock, ArrowRight, CheckCircle, Users, Bot, Database } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LandingPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('user');

    return (
        <div className="min-h-screen w-full bg-[#030305] text-slate-200 selection:bg-indigo-500/30 overflow-x-hidden font-sans">
            {/* Background Gradients */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[120px]" />
            </div>

            <main className="relative z-10">
                {/* Hero Section */}
                <section className="relative pt-24 pb-10 px-6">
                    <div className="max-w-7xl mx-auto text-center relative">
                        {/* Top Left Status */}
                        <div className="absolute top-0 left-0 hidden md:flex items-center gap-4">
                            <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-center gap-2 shadow-lg shadow-black/20">
                                <div className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </div>
                                <span className="text-xs font-bold text-slate-300 tracking-wide">TELEGRAM BOT: <span className="text-emerald-400">ONLINE</span></span>
                            </div>
                        </div>



                        <div className="animate-fade-in-up">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest mb-8">
                                <Zap className="w-3 h-3" />
                                <span>Powered by Solana</span>
                            </div>

                            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-white mb-4">
                                <span className="block text-4xl sm:text-5xl md:text-7xl lg:text-8xl">Token-Gate Your</span>
                                <span className="block relative h-[1.2em]">
                                    <span className="absolute inset-x-0 top-0 flex justify-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 pb-2">
                                        <span className="whitespace-nowrap text-3xl sm:text-5xl md:text-7xl lg:text-8xl">
                                            <CyclingText />
                                        </span>
                                    </span>
                                </span>
                            </h1>



                            {/* CA COPY BLOCK */}
                            <div className="flex justify-center mb-12">
                                <div
                                    onClick={() => {
                                        navigator.clipboard.writeText('8ZQme2xv6prRKkKNA4PTn5DSXUTdY6yeoc5yDkm7pump');
                                        // Optional: Add toast here
                                    }}
                                    className="group flex items-center gap-3 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                                >
                                    <span className="text-slate-400 font-mono text-sm">CA: 8ZQme...pump</span>
                                    <div className="p-1.5 rounded-md bg-white/5 text-slate-400 group-hover:text-white transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                    </div>
                                </div>
                            </div>


                        </div>
                    </div>
                </section>

                {/* MAIN FEATURES SECTION - CONSUMER ONLY */}
                <section id="features" className="py-10 pb-20 px-6">
                    <div className="max-w-7xl mx-auto">
                        {/* Main Intro */}
                        <div className="flex flex-col items-center gap-10 mb-16">
                            <div className="space-y-8 text-center max-w-4xl mx-auto">

                                <h2 className="text-5xl md:text-7xl font-black text-white">
                                    Where Communities Build
                                </h2>
                                <p className="text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto">
                                    Verify token holders on Telegram with zero wallet connections. Community governance powered by on-chain rules and blockchain verification.
                                </p>

                                <div className="flex flex-col items-center pt-8 mb-12">
                                    <button
                                        onClick={() => window.open('https://t.me/memo_verification_bot', '_blank')}
                                        className="px-10 py-5 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold rounded-2xl hover:from-purple-500 hover:to-cyan-500 transition-all flex items-center gap-3 shadow-lg shadow-purple-500/30 mb-3 gold-glow"
                                    >
                                        Launch Telegram Bot
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                                        Supports all SPL Tokens & NFTs
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Core Features Grid */}
                        <div className="grid md:grid-cols-3 gap-6 mb-20 max-w-5xl mx-auto">
                            <div className="p-6 rounded-2xl bg-white/5 border border-purple-500/20 hover:border-purple-500/40 transition-colors">
                                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4">
                                    <Shield className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Zero-Connect Verification</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Users verify with a <strong>Magic Memo</strong> (0 SOL self-transfer). No wallet connection, no private keys shared. Just cryptographic proof.
                                </p>
                            </div>

                            <div className="p-6 rounded-2xl bg-white/5 border border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
                                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-4">
                                    <Database className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">On-Chain Rules</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Community rules stored immutably on Solana. Transparent, censorship-resistant, and verifiable by anyone.
                                </p>
                            </div>

                            <div className="p-6 rounded-2xl bg-white/5 border border-purple-500/20 hover:border-purple-500/40 transition-colors">
                                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4">
                                    <Zap className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Universal Token Gating</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Gate with ANY SPL token or NFT collection. Admins hold $MEMO, but communities can use any token on Solana.
                                </p>
                            </div>
                        </div>

                        {/* How It Works */}
                        <div className="mb-20">
                            <div className="text-center mb-12">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">
                                    <CheckCircle className="w-3 h-3" />
                                    Get Started
                                </div>
                                <h3 className="text-4xl font-bold text-white mb-8">
                                    How It Works
                                </h3>

                                {/* Toggle */}
                                <div className="flex justify-center mb-8">
                                    <div className="p-1 rounded-xl bg-white/5 border border-white/10 flex relative">
                                        <div
                                            className={`absolute inset-y-1 rounded-lg transition-all duration-300 ease-out shadow-lg bg-indigo-600
                                            ${activeTab === 'user' ? 'left-1 w-[160px]' : 'left-[164px] w-[160px]'}`}
                                        />
                                        <button
                                            onClick={() => setActiveTab('user')}
                                            className={`w-[160px] py-2.5 rounded-lg text-sm font-bold transition-colors duration-300 relative z-10
                                            ${activeTab === 'user' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            Join a Community
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('admin')}
                                            className={`w-[160px] py-2.5 rounded-lg text-sm font-bold transition-colors duration-300 relative z-10
                                            ${activeTab === 'admin' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                                        >
                                            Create a Community
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto relative min-h-[250px]">
                                <AnimatePresence mode="wait">
                                    {activeTab === 'user' ? (
                                        <motion.div
                                            key="user"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="contents"
                                        >
                                            <div className="text-center">
                                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-black text-2xl mx-auto mb-4 shadow-lg shadow-purple-500/20">
                                                    1
                                                </div>
                                                <h4 className="text-lg font-bold text-white mb-2">Request to Join</h4>
                                                <p className="text-slate-400 text-sm">
                                                    Click the group invite link. You'll see "Request to Join" and receive a DM from the bot with instructions.
                                                </p>
                                            </div>

                                            <div className="text-center">
                                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-black text-2xl mx-auto mb-4 shadow-lg shadow-purple-500/20">
                                                    2
                                                </div>
                                                <h4 className="text-lg font-bold text-white mb-2">Verify Ownership</h4>
                                                <p className="text-slate-400 text-sm">
                                                    Send a <strong>Magic Memo</strong> (0 SOL self-transfer) from your wallet to itself. Run <code className="px-1.5 py-0.5 bg-white/10 rounded text-cyan-400 font-mono text-xs">/sent</code>
                                                </p>
                                            </div>

                                            <div className="text-center">
                                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white font-black text-2xl mx-auto mb-4 shadow-lg shadow-purple-500/20">
                                                    3
                                                </div>
                                                <h4 className="text-lg font-bold text-white mb-2">Auto-Approved!</h4>
                                                <p className="text-slate-400 text-sm">
                                                    Bot verifies your token holdings on-chain and approves your join request automatically. Welcome in!
                                                </p>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="admin"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="contents"
                                        >
                                            <div className="text-center">
                                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-2xl mx-auto mb-4 shadow-lg shadow-indigo-500/20">
                                                    1
                                                </div>
                                                <h4 className="text-lg font-bold text-white mb-2">Create Community</h4>
                                                <p className="text-slate-400 text-sm">
                                                    DM the bot privately and run <code className="px-1.5 py-0.5 bg-white/10 rounded text-indigo-400 font-mono text-xs">/create</code> to register your new community on-chain.
                                                </p>
                                            </div>

                                            <div className="text-center">
                                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-2xl mx-auto mb-4 shadow-lg shadow-indigo-500/20">
                                                    2
                                                </div>
                                                <h4 className="text-lg font-bold text-white mb-2">Get Governance</h4>
                                                <p className="text-slate-400 text-sm">
                                                    Hold 50,000 <span className="text-amber-400 font-bold">$MEMO</span> to unlock the Admin Suite and anti-spam governance tools.
                                                </p>
                                            </div>

                                            <div className="text-center">
                                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-2xl mx-auto mb-4 shadow-lg shadow-indigo-500/20">
                                                    3
                                                </div>
                                                <h4 className="text-lg font-bold text-white mb-2">Link Group</h4>
                                                <p className="text-slate-400 text-sm">
                                                    Add bot to your group as Admin, then run <code className="px-1.5 py-0.5 bg-white/10 rounded text-indigo-400 font-mono text-xs">/link &lt;CA&gt;</code> to enable gating.
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
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
                                <p className="text-slate-400 mt-4">
                                    Memo bot comes packed with features for both users and admins
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                <CommandList
                                    title="User Commands"
                                    icon={<Users className="w-4 h-4" />}
                                    color="cyan"
                                    commands={[
                                        { cmd: "/verify <address>", desc: "Link your Solana wallet to your Telegram account" },
                                        { cmd: "/sent", desc: "Confirm verification transaction was sent" },
                                        { cmd: "/mystatus", desc: "Check your wallet balance and verification status" },
                                        { cmd: "/leaderboard", desc: "View top 50 token holders in the community" },
                                        { cmd: "/whales", desc: "List users meeting whale threshold" },
                                        { cmd: "/supply", desc: "See group holdings and % of total supply" },
                                        { cmd: "/flex", desc: "Generate shareable holder card with stats" },
                                        { cmd: "/referral", desc: "Get your unique referral link" }
                                    ]}
                                />
                                <CommandList
                                    title="Admin Commands"
                                    icon={<Shield className="w-4 h-4" />}
                                    color="purple"
                                    commands={[
                                        { cmd: "/create", desc: "Launch Community Creation Wizard (requires 50k $MEMO)" },
                                        { cmd: "/link <address>", desc: "Connect this group to your token community" },
                                        { cmd: "/audit", desc: "Scan members and report non-compliance without removing" },
                                        { cmd: "/kick", desc: "Remove all non-compliant members from the group" },
                                        { cmd: "/check", desc: "Check specific user status (reply to their message)" },
                                        { cmd: "/export", desc: "Export member data to CSV (sent to your DM)" },
                                        { cmd: "/poll \"Q\" \"A\" \"B\"", desc: "Create token-weighted governance poll" },
                                        { cmd: "/tally", desc: "Calculate weighted poll results (reply to poll)" },
                                        { cmd: "/top", desc: "View top 10 communities by market cap" }
                                    ]}
                                />
                            </div>
                        </div>

                        {/* Security Callout */}
                        <div className="mt-20 max-w-4xl mx-auto">
                            <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-purple-500/20">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                                        <Lock className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-2">
                                            "Don't Trust, Verify" Security Model
                                        </h3>
                                        <p className="text-slate-300 leading-relaxed mb-4">
                                            The Memo bot operates on zero-knowledge principles:
                                        </p>
                                        <ul className="space-y-2 text-slate-400">
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                                <span>Never asks for private keys or wallet connections</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                                <span>Monitors public blockchain data only</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                                <span>Self-transfer proves ownership cryptographically</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                                <span>Community rules stored on-chain (censorship-resistant)</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
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

                        <div className="grid md:grid-cols-3 gap-4 animate-fade-in">
                            <div className="p-5 rounded-2xl bg-[#0A0A0B] border border-white/5 flex flex-col hover:border-purple-500/30 transition-colors group">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                                        <Shield className="w-4 h-4" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">Governance</h3>
                                </div>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Admins must stake $MEMO to create communities. This prevents spam and aligns incentives.
                                </p>
                            </div>

                            <div className="p-5 rounded-2xl bg-[#0A0A0B] border border-white/5 flex flex-col hover:border-cyan-500/30 transition-colors group">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">Access</h3>
                                </div>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Communities can verify $MEMO holdings for entry, creating exclusive, high-value groups.
                                </p>
                            </div>

                            <div className="p-5 rounded-2xl bg-[#0A0A0B] border border-white/5 flex flex-col hover:border-purple-500/30 transition-colors group">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                                        <Zap className="w-4 h-4" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">Rewards</h3>
                                </div>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Participate in Red Packets and community events to earn $MEMO directly within the chat.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>


                {/* ROADMAP */}
                <section className="py-20 px-6 border-t border-white/5 relative overflow-hidden">
                    {/* Background Accent */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-purple-500/5 via-transparent to-cyan-500/5 rounded-full blur-[100px] -z-10" />

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
                            <SocialRoadmap />
                        </div>
                    </div>
                </section>

                {/* Footer/Socials */}
                <footer className="py-16 px-6 border-t border-white/5 bg-[#050507] relative overflow-hidden">
                    {/* Subtle gradient accent */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-t from-indigo-500/5 to-transparent blur-[80px] -z-10" />

                    <div className="max-w-7xl mx-auto">
                        <div className="grid md:grid-cols-4 gap-12 mb-16">
                            <div className="col-span-2">
                                <h1 className="text-2xl font-black text-white mb-6">Memo.</h1>
                                <p className="text-slate-400 max-w-md leading-relaxed mb-8">
                                    The decentralized communication layer for Solana. Built for communities, powered by encryption.
                                </p>
                                <div className="flex gap-4">
                                    <a href="https://twitter.com/memoprotocol" target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-12.7 12.5S.2 11.1 2 7c-2 3.4.6 9 5.8 8 2.8-1.5 5.5-2 5.5-2V4" /></svg>
                                    </a>
                                    <a href="https://t.me/memo_verification_bot" target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                                    </a>
                                    <a href="https://github.com/memo-protocol" target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
                                    </a>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-white mb-6">Resources</h3>
                                <ul className="space-y-4">
                                    <li><a href="/whitepaper" className="text-slate-400 hover:text-white transition-colors">Whitepaper</a></li>
                                    <li><a href="https://docs.memoprotocol.app" className="text-slate-400 hover:text-white transition-colors">Documentation</a></li>
                                    <li><a href="https://github.com/memo-protocol" className="text-slate-400 hover:text-white transition-colors">GitHub</a></li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-bold text-white mb-6">Legal</h3>
                                <ul className="space-y-4">
                                    <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Terms of Service</a></li>
                                    <li><a href="#" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</a></li>
                                    <li><button onClick={() => navigate('/app')} className="text-slate-500 hover:text-slate-300 transition-colors text-sm mt-4 text-left">Enterprise App Login</button></li>
                                </ul>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                            <p className="text-slate-500 text-sm">
                                © 2026 Memo Protocol. All rights reserved.
                            </p>
                            <div className="flex items-center gap-2 text-slate-600 text-sm">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>All Systems Operational</span>
                            </div>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}

const CHARS = "-_~`!@#$%^&*()+=[]{}|;:,.<>?/0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function CyclingText() {
    const [text, setText] = useState("Community");
    const phrases = ["Community", "Telegram Groups", "Token Holders", "Web3 Social"];

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
                { name: "Magic Memos", desc: "Zero-wallet-connect verification via Magic Memos (SOL self-transfer)" },
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


