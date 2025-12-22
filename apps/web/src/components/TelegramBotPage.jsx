import { Shield, Zap, Lock, Globe, MessageSquare, ArrowRight, CheckCircle, Terminal, Activity, Users, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import tgPreview from '../assets/tg.png';

export default function TelegramBotPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen w-full bg-[#030305] text-slate-200 selection:bg-sky-500/30 overflow-x-hidden font-sans">
            {/* Background Gradients */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-sky-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[120px]" />
            </div>

            <main className="relative z-10">
                {/* Navbar Placeholder (Back Button) */}
                <nav className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowRight className="w-5 h-5 rotate-180" />
                        Back to Protocol
                    </button>
                    <button
                        onClick={() => window.open('https://t.me/MemoProtocolBot', '_blank')}
                        className="px-6 py-2 bg-sky-600/20 text-sky-400 border border-sky-500/30 font-bold rounded-lg hover:bg-sky-500/30 transition-colors text-sm"
                    >
                        Start Bot
                    </button>
                </nav>

                {/* Hero Section */}
                <section className="relative pt-32 pb-20 px-6">
                    <div className="max-w-7xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold uppercase tracking-wider mb-8">
                            <Shield className="w-3 h-3" />
                            <span>Zero-Risk Verification</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white mb-8">
                            The Only Token Gate That <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
                                Respects Your Security
                            </span>
                        </h1>

                        <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-12">
                            Verify your assets without ever connecting your wallet to a website.
                            100% on-chain, non-invasive, and trustless.
                        </p>

                        <div className="flex justify-center">
                            <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#0a0a0c]">
                                <div className="absolute top-0 left-0 w-full h-8 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                                    <div className="ml-4 text-xs text-slate-500 font-mono">magic-transaction.log</div>
                                </div>
                                <div className="p-8 pt-12 text-left font-mono text-sm md:text-base overflow-x-auto">
                                    <div className="text-emerald-400 mb-2">{`> Initiating verification process...`}</div>
                                    <div className="text-slate-300 mb-2">{`> Generating secure challenge...`}</div>
                                    <div className="text-sky-400 mb-2">{`> Challenge: Send 1 $MEMO (Self-Transfer) with Memo: "VERIFY-USER-882291"`}</div>
                                    <div className="text-slate-500 mb-2">{`  ... Monitoring Solana Ledger for confirmation ...`}</div>
                                    <div className="text-emerald-400">{`> Verified! Wallet owning 15,000 $MEMO linked to user @crypto_whale based on on-chain signature.`}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How It Works: The Magic Transaction */}
                <section className="py-24 px-6 border-y border-white/5 bg-white/[0.02]">
                    <div className="max-w-5xl mx-auto">
                        <div className="grid md:grid-cols-2 gap-16 items-center">
                            <div className="space-y-8">
                                <h2 className="text-3xl font-bold text-white">The "Magic Transaction"</h2>
                                <p className="text-slate-400 leading-relaxed text-lg">
                                    Unlike traditional bots that force you to connect your Ledger to a potentially vulnerable web interface, Memo Bot uses a passive verification system centered on the MEMO token.
                                </p>

                                <div className="space-y-6">
                                    <Step
                                        number="01"
                                        title="Command Phase"
                                        desc="You type /verify in the bot. The bot gives you a unique identification string (e.g., your User ID)."
                                    />
                                    <Step
                                        number="02"
                                        title="Action Phase"
                                        desc="You perform a 'Self-Transfer' of 1 $MEMO (or any asset) and include your ID in the Memo field/instruction. Assets stay in your wallet."
                                    />
                                    <Step
                                        number="03"
                                        title="Verification Phase"
                                        desc="Our indexers detect this specific signature on the public ledger. Proving you control the private key without ever exposing it."
                                    />
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] p-8 rounded-3xl border border-white/10">
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                                    Security Comparison
                                </h3>
                                <div className="space-y-4">
                                    <ComparisonRow
                                        label="Web3 Login (Collab.land, etc)"
                                        bad={true}
                                        desc="Requires connecting wallet to dApp. Phishing risk. Signature risk."
                                    />
                                    <ComparisonRow
                                        label="Memo Protocol"
                                        bad={false}
                                        desc="No connection required. Zero permission granted. 100% Passive."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Feature Suite */}
                <section className="py-24 px-6">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Command Center Suite</h2>
                            <p className="text-slate-400">Built for high-performance communities.</p>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            <FeatureCard
                                icon={<Activity className="w-6 h-6 text-emerald-400" />}
                                title="Community Audit"
                                desc="Run /audit to instantly verify your group's health. Checks admin permissions, token gates, and bot connectivity."
                            />
                            <FeatureCard
                                icon={<Users className="w-6 h-6 text-sky-400" />}
                                title="Holder Leaderboards"
                                desc="Gamify your community with /leaderboard. Display top token holders and foster healthy competition."
                            />
                            <FeatureCard
                                icon={<Terminal className="w-6 h-6 text-purple-400" />}
                                title="Token-Gated Polls"
                                desc="Create sybil-resistant polls with /poll. Only verified token holders can vote."
                            />
                            <FeatureCard
                                icon={<Lock className="w-6 h-6 text-amber-400" />}
                                title="Locked Staking Gates"
                                desc="Reward long-term alignment. Use /locked to grant special access to users who lock their tokens."
                            />
                            <FeatureCard
                                icon={<Zap className="w-6 h-6 text-indigo-400" />}
                                title="Automated Access"
                                desc="The bot automatically approves join requests for verified hodlers and kicks those who sell below the threshold."
                            />
                            <FeatureCard
                                icon={<Globe className="w-6 h-6 text-slate-400" />}
                                title="Supply Tracking"
                                desc="Monitor your token's deflationary mechanics and circulating supply with /supply."
                            />
                        </div>
                    </div>
                </section>

                {/* Footer/CTA */}
                <section className="py-20 px-6 border-t border-white/5 bg-[#050508]">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-3xl font-bold text-white mb-6">Ready to upgrade your community?</h2>
                        <button
                            onClick={() => window.open('https://t.me/MemoProtocolBot', '_blank')}
                            className="px-10 py-4 bg-white text-black font-bold rounded-xl hover:bg-slate-200 transition-colors inline-flex items-center gap-2"
                        >
                            <Terminal className="w-5 h-5" />
                            Install Memo Bot
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
}

function Step({ number, title, desc }) {
    return (
        <div className="flex gap-6">
            <div className="flex-shrink-0 w-12 h-12 rounded-full border border-sky-500/30 flex items-center justify-center text-sky-400 font-mono font-bold">
                {number}
            </div>
            <div>
                <h4 className="text-white font-bold text-lg mb-2">{title}</h4>
                <p className="text-slate-400 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}

function ComparisonRow({ label, bad, desc }) {
    return (
        <div className={`p-4 rounded-xl border ${bad ? 'bg-red-500/5 border-red-500/10' : 'bg-green-500/5 border-green-500/10'}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-white">{label}</span>
                {bad ? <span className="text-red-400 text-xs font-bold uppercase">Risk</span> : <span className="text-emerald-400 text-xs font-bold uppercase">Secure</span>}
            </div>
            <p className="text-sm text-slate-400">{desc}</p>
        </div>
    );
}

function FeatureCard({ icon, title, desc }) {
    return (
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors">
            <div className="mb-4">{icon}</div>
            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
        </div>
    );
}
