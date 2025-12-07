import React from 'react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, Shield, Zap, Lock, Cpu, Globe } from 'lucide-react';

const markdownContent = `
# Memo Protocol: The Immutable Communication Layer for the Solana Ecosystem

**Version:** 1.0  
**Date:** December 2025  
**Status:** Mainnet Beta

## Abstract

The internet promised open communication. Yet today, digital interactions remain trapped in siloed, centralized servers. These platforms are ephemeral, censorable, and disconnected from value. Memo Protocol introduces a decentralized, immutable communication layer built directly on the Solana blockchain. We treat messages as on-chain transactions to bridge the gap between social coordination and enterprise compliance. To ensure long-term stability and trust, 5% of the total token supply is locked by the developer. This paper outlines the technical architecture of the Memo Protocol, our dual-engine ecosystem, and the Smart Transfer mechanism that makes on-chain messaging economically viable.

## 1. Introduction: The Problem with Off-Chain Communication

Value moves on-chain in the current Web3 landscape. However, communication happens off-chain on Discord, Telegram, or X. This disconnect creates a hostile environment with three specific flaws:

* **Trust is Fragile:** Scams and impersonations are rampant because communication identities are decoupled from on-chain assets.
* **History is Mutable:** Messages can be deleted, edited, or lost. This makes them unsuitable for high-stakes agreements.
* **Data is Siloed:** Community insights remain locked within proprietary platforms. They are inaccessible to the protocols that need them.

Memo Protocol solves this by rooting communication in the blockchain itself.

## 2. Core Architecture

Memo Protocol operates as a protocol layer rather than a traditional dApp. It uses the Solana network as its database and settlement engine.

### 2.1 The Smart Transfer Protocol

At the heart of Memo is the Smart Transfer mechanism. This proprietary logic optimizes cost and ensures deliverability.

* **New Connections:** When a user messages a new wallet, the protocol automatically detects the empty state. It attaches a Rent Exemption transfer of approximately 0.001 SOL. This initializes the recipient's account on-chain and effectively pays for the postage to guarantee the message inbox exists.
* **Existing Connections:** Established connections switch to a 0 SOL transfer value. This incurs only the standard Solana network fee of roughly 0.000005 SOL.

This dynamic switching ensures Memo works as both a user-onboarding tool and a high-frequency messaging layer.

### 2.2 Zero-Knowledge Encryption

Privacy is the default setting.

* **Client-Side Encryption:** We encrypt all messages locally using TweetNaCl (Curve25519) before they touch the network.
* **Asymmetric Key Exchange:** Messages use the recipient's public key. Only the intended holder can decrypt the content.
* **No Admin Access:** There are no admin keys. Unlike Web2 platforms, the Memo team cannot read user messages.

### 2.3 The Memo Program as Storage

We utilize the Solana Memo Program to attach encrypted JSON payloads directly to transactions. This provides two benefits:

* **Permanence:** Messages are stored in the ledger's history. They are immutable and resistant to censorship.
* **Public Proof, Private Content:** The existence of the communication is public and verifiable. The content remains private.

## 3. Memo Social: The Community Engine

Memo Social turns passive token holders into active participants.

### 3.1 True Token-Gating

Current token-gated chats are often superficial wrappers around Web2 APIs. Memo enables native gating.

* **Proof-of-Ownership:** A user cannot send a message to a community channel without holding the required asset. The blockchain enforces this rule.
* **Sybil Resistance:** Requiring on-chain assets prices out spam bots.

### 3.2 The AI Sentinel

Memo integrates a local AI agent to monitor chain data in real time. This protects communities from bad actors.

* **Whale Alerts:** The agent scans block activity for transactions exceeding 10 SOL. It flags these movements to the community immediately.
* **Activity Analysis:** Algorithms analyze transaction velocity to categorize community health. We define High Activity as over 20 transactions per day and Steady Traffic as over 5 transactions per day.
* **Farmer Detection:** This beta feature identifies wash-trading patterns to filter out airdrop farmers.

## 4. Memo Enterprise: The Business Standard

Screenshots of direct messages are not a viable legal strategy for high-stakes negotiations. Memo Enterprise provides a regulatory-grade environment.

### 4.1 Immutable Contract Signing

* **On-Chain Signatures:** When a deal is agreed upon, the signature becomes a transaction on the Solana ledger. It is timestamped, cryptographically signed, and impossible to forge.
* **Audit Trails:** The entire negotiation history is preserved on-chain. This creates an unalterable audit trail for legal discovery.

### 4.2 Client-Side PDF Generation

The protocol includes a PDF generator. It compiles the negotiation history and signed contract into a professional document branded with the enterprise's identity. This file is ready for off-chain legal filing.

## 5. Tokenomics & Utility ($MEMO)

The $MEMO token serves as the access key to advanced features.

* **Developer Lock:** 5% of the total token supply is locked by the developer team. This aligns incentives with the long-term success of the protocol.
* **Community Creation:** Creating a new token-gated community requires holding 500,000 $MEMO. This ensures only committed project founders can establish official channels.
* **Governance:** Future updates will allow $MEMO holders to vote on protocol upgrades and fee structures.

## 6. Conclusion

Memo Protocol is building the communication standard for the decentralized web. We anchor messages to the blockchain to create a world where communication is valuable, verifiable, and permanent.

We believe every agreement, community, and critical message belongs on Solana.
`;

export default function WhitepaperPage({ onBack }) {
    return (
        <div className="min-h-screen w-full bg-[#0a0a0f] text-slate-300 relative overflow-hidden font-sans selection:bg-indigo-500/30">

            {/* Background Ambient Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[150px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[150px]" />
                <div className="absolute top-[40%] left-[50%] transform -translate-x-1/2 w-[60%] h-[60%] bg-cyan-500/5 rounded-full blur-[180px]" />
            </div>

            {/* Grid Pattern Overlay */}
            <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>

            {/* Floating $MEMO Watermark */}
            <div className="fixed bottom-10 right-10 z-0 opacity-5 pointer-events-none">
                <h1 className="text-[12rem] font-black leading-none text-white tracking-tighter">$MEMO</h1>
            </div>

            {/* Navigation Header */}
            <div className="fixed top-0 left-0 right-0 z-50 h-20 flex items-center px-6 md:px-12 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
                >
                    <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 border border-white/5 transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium tracking-wide">Back to Home</span>
                </button>
                <div className="ml-auto flex items-center gap-4">
                    <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                        v1.0 // MAINNET BETA
                    </span>
                </div>
            </div>

            {/* Main Content */}
            <main className="relative z-10 pt-32 pb-24 px-4 md:px-12 max-w-5xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <ReactMarkdown
                        components={{
                            h1: ({ node, ...props }) => (
                                <div className="mb-12 pb-8 border-b border-white/10">
                                    <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400" {...props} />
                                    <div className="flex items-center gap-2 text-slate-500 text-sm font-mono mt-4">
                                        <FileText className="w-4 h-4" />
                                        <span>TECHNICAL WHITEPAPER</span>
                                        <span className="mx-2">•</span>
                                        <span>$MEMO PROTOCOL</span>
                                    </div>
                                </div>
                            ),
                            h2: ({ node, ...props }) => (
                                <div className="mt-16 mb-8 flex items-center gap-4">
                                    <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/50 to-transparent" />
                                    <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight" {...props} />
                                    <div className="h-px flex-1 bg-gradient-to-l from-indigo-500/50 to-transparent" />
                                </div>
                            ),
                            h3: ({ node, ...props }) => (
                                <h3 className="text-xl font-semibold text-indigo-300 mt-10 mb-4 flex items-center gap-2" {...props}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                    {props.children}
                                </h3>
                            ),
                            p: ({ node, ...props }) => (
                                <p className="text-slate-400 leading-relaxed mb-6 text-lg font-light" {...props} />
                            ),
                            ul: ({ node, ...props }) => (
                                <ul className="space-y-4 mb-8" {...props} />
                            ),
                            li: ({ node, ...props }) => (
                                <li className="flex items-start gap-3 text-slate-300 bg-white/5 p-4 rounded-xl border border-white/5 hover:border-indigo-500/30 transition-colors">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                                    <span className="flex-1">{props.children}</span>
                                </li>
                            ),
                            strong: ({ node, ...props }) => (
                                <strong className="font-semibold text-white" {...props} />
                            ),
                            blockquote: ({ node, ...props }) => (
                                <blockquote className="border-l-4 border-indigo-500 pl-6 py-2 my-8 bg-indigo-500/5 rounded-r-xl italic text-slate-300" {...props} />
                            )
                        }}
                    >
                        {markdownContent}
                    </ReactMarkdown>
                </motion.div>

                {/* Footer Signature */}
                <div className="mt-24 pt-12 border-t border-white/10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-sm font-mono text-slate-400">OPERATIONAL ON SOLANA MAINNET</span>
                    </div>
                    <p className="mt-8 text-slate-600 text-sm">
                        © 2025 Memo Protocol. All rights reserved.
                    </p>
                </div>
            </main>
        </div>
    );
}
