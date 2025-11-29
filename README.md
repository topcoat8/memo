# Memo Protocol

![Memo Protocol Banner](assets/banner.jpg)

### Verifiable, Encrypted Communication on Solana

[![Solana](https://img.shields.io/badge/Solana-Mainnet-purple)]() [![License](https://img.shields.io/badge/License-MIT-green)]()

**Memo Protocol enables verifiable, encrypted communication tied to blockchain transactions.** We solve problems traditional messaging apps fundamentally can't: immutable legal records, uncensorable whistleblowing, timestamped financial signals, and unforgeable business documentation.

> *"When your message can't afford to disappear, it lives on-chain."*

---

## The Dual-Track Strategy

Memo Protocol is built on a single, immutable ledger, but it serves two distinct markets with fundamentally different requirements. To maximize execution speed without compromising security, we have decoupled our roadmap into two parallel streams:

### 1. Memo Enterprise (The "Stability" Track)
**Mission:** To provide the first immutable, legally compliant communication layer for high-stakes business and regulatory environments.
*   **Focus:** Legal adherence, rigid security standards, and B2B utility.
*   **Cadence:** Methodical release cycle to ensure zero-failure compliance.

### 2. Memo Social (The "Velocity" Track)
**Mission:** To become the native communication hub for the Solana ecosystem, turning holders into active communities.
*   **Focus:** Consumer engagement, virality, and community management.
*   **Cadence:** High-velocity, iterative cycle (shipping daily/weekly).

---

## Roadmap

![Roadmap Visualization](assets/roadmap.jpg)

### Memo Enterprise Roadmap
*   **Phase 1: The Compliance Core** - Solving the Privacy Paradox with GDPR Compliance Modules and Identity/Admissibility features.
*   **Phase 2: Business Utility & Workflow** - Immutable Contract Negotiation and Secure Attachments.
*   **Phase 3: Enterprise Infrastructure** - Cross-Chain Verification and Immutable Group Protocols.

### Memo Social Roadmap
*   **Phase 1: Velocity & User Experience** - Frictionless Onboarding, Human-Readable Fees, and Interface Polish.
*   **Phase 2: Community & Engagement Tools** - Token-Gated Access (Holder Chats, Whale Channels) and Project Broadcasts.
*   **Phase 3: Growth & Retention** - Native Phantom Integration (Blinks & Actions) and Client-Side Read Receipts.

---

## Core Technology

### 1. Smart Transfer Protocol
Memo Protocol utilizes a unique **Smart Transfer** mechanism to ensure reliable delivery while optimizing costs:
-   **New Connections**: Automatically detects empty wallets and attaches a **Rent Exemption** transfer (~0.001 SOL) to initialize the recipient's account on-chain.
-   **Existing Connections**: Sends messages with **0 SOL** transfer value, incurring only the network fee (~0.000005 SOL).

### 2. Zero-Knowledge Encryption
All messages are encrypted **client-side** using **TweetNaCl (Curve25519)** before they ever touch the network.
-   **Asymmetric Encryption**: Messages are encrypted with the recipient's public key.
-   **Forward Secrecy**: Each session generates unique nonces.
-   **No Backdoors**: The protocol has no "admin keys".

### 3. Immutable Storage
Messages are stored directly in the transaction history via the **Solana Memo Program**, providing permanent, public proof of existence while keeping content private.

---

## Architecture

```
┌─────────────┐       ┌─────────────┐
│ User Client │──────►│  TweetNaCl  │
└─────────────┘       └─────────────┘
       │                     │
       ▼                     ▼
┌───────────────────────────────────┐
│       Smart Transfer Logic        │
└───────────────────────────────────┘
       │                     │
       │ (New Wallet)        │ (Existing)
       ▼                     ▼
┌────────────────┐    ┌─────────────┐
│ Attach Rent    │    │ Attach 0    │
│ (~0.001 SOL)   │    │ SOL         │
└────────────────┘    └─────────────┘
       │                     │
       ▼                     ▼
┌───────────────────────────────────┐
│          Solana Network           │
└───────────────────────────────────┘
                 │
                 ▼
        ┌─────────────────┐
        │  Memo Program   │
        └─────────────────┘
                 │
                 ▼
        ┌─────────────────┐
        │ On-Chain Ledger │
        └─────────────────┘
                 │
                 ▼
        ┌─────────────────┐
        │ Recipient Inbox │
        └─────────────────┘
```

---

**Built by the Memo Protocol Team**

*Making verifiable private communication on public blockchains a reality.*