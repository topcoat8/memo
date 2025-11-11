# Memo Protocol

## Private Communication on a Public Ledger

**Current Status:** Phase 2 (In Progress)

This repository contains the functional dApp for Memo Protocol, currently in active development.

✅ **Phase 1 (Completed):** Local-only POC validated.

➡️ **Phase 2 (Current):** Integrating live Solana wallets (`@solana/wallet-adapter-react`) and production-grade encryption (TweetNaCl).

**Next:** Phase 3: On-Chain Program (Anchor/Rust).

---

## The Vision: Solving the Transparency Paradox

Public ledgers are built for transparency. This is a feature, not a bug. But it creates a critical barrier for real-world business: how do you handle confidential data?

How do you:
- Attach a private invoice to a public payment?
- Include confidential contract terms with a token transfer?
- Send a personal, token-bound message with an NFT gift?

Right now, you can't. The moment it's on-chain, it's public. If it's off-chain, it's not verifiable.

Memo Protocol solves this. It is the missing privacy layer for public blockchains, enabling end-to-end encrypted communication tied directly to wallet identities.

---

## Core Concepts

Memo Protocol separates the metadata from the data. It creates a new primitive that is simultaneously publicly verifiable and privately confidential.

- **Public Verifiability:** Anyone on the public ledger can audit the act of communication. They can prove that Wallet A sent a Memo to Wallet B at a specific time.
- **Private Confidentiality:** Only the owner of Wallet B (using their private key) can decrypt and read the content of that Memo.

This allows you to conduct private business on a public ledger for the first time.

---

## Technology Stack

| Component   | Technology                      | Purpose                                                        |
|------------|----------------------------------|----------------------------------------------------------------|
| Blockchain  | Solana                          | Public key identity, consensus, and (in Phase 3) the on-chain program. |
| Frontend    | React (Vite) & Tailwind CSS     | A clean, responsive UI for demonstrating the protocol's functionality. |
| Wallet      | @solana/wallet-adapter-react    | Handles connection to all major Solana wallets (Phantom, Solflare, etc.). |
| Encryption  | TweetNaCl                       | Production-grade, audited library for client-side E2E encryption (secretbox). |
| Data (POC)  | Firebase Firestore              | Simulates the public, readable ledger for storing encrypted payloads. |

---

## Project Roadmap

We are building in the open. This roadmap outlines our path from a functional POC to a fully decentralized protocol.

### ✅ Phase 1: Proof of Concept (Completed)
**Goal:** Validate the core UX and system assumptions for public-but-encrypted messaging.
**Deliverables:**
- Single-file React UI demonstrating the full message lifecycle.
- Anonymous identity via Firebase Auth to simulate wallet identifiers.
- Public ledger (Firestore) exposing sender, recipient, and encrypted payload.

### ➡️ Phase 2: Security & Wallet Integration (Current)
**Goal:** Replace dummy logic with real Solana identity and production-grade cryptography.
**Deliverables:**
- Full integration with `@solana/wallet-adapter-react` to use the public key as the primary identity.
- Replaced dummy crypto with TweetNaCl for authenticated, client-side encryption.
- Hardened identity logic that always prefers the connected wallet.

### Phase 3: On-Chain Protocol (Future)
**Goal:** Decentralize the protocol and introduce the $MEMO token receipt.
**Deliverables:**
- Develop an Anchor/Rust program to manage message state on Solana.
- Use Program Derived Addresses (PDAs) for minimal, gas-efficient on-chain metadata.
- Mint an SPL token ($MEMO) as a "receipt" when a message is published, encoding provenance and making the message itself a tradable or composable asset.

### Phase 4: Ecosystem & Features (Future)
**Goal:** Expand protocol utility and drive adoption.
**Deliverables:**
- User discovery and social graph features (opt-in, privacy-respecting).
- "Burn" or "Revoke" features for message receipts.
- Group memos and multi-recipient encryption with secure key distribution.
- Analytics, moderation tooling, and enterprise integration patterns.

---

## Contribution

We are building the privacy layer we want to use. We welcome contributions from the community, especially in the areas of:
- Security & Cryptography (e.g., formalizing the E2E key exchange)
- On-Chain Program Design (Anchor/Rust)
- Frontend Componentization & UX
- Gas & Storage Optimization

Feel free to open an issue or submit a pull request.

---

**License:** Licensed under the MIT License. See LICENSE for terms.
