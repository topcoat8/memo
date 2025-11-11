# $MEMO: Encrypted Communication on a Public Ledger

## Project Vision

Solana $MEMO explores a future where secure messages are themselves digital assets. Each message is stored publicly as an immutable ledger entry while its contents remain privately readable only by the intended recipient. A transferable token or receipt represents proof that a message exists on-chain; ownership of that receipt can serve as provenance, transferability, or an on-chain record linked to the off-chain encrypted payload. The design separates public metadata (sender, recipient identifiers, timestamps, and the receipt token) from encrypted content, enabling auditability and on-chain interaction without exposing message plaintext.

This repository demonstrates the core concept with a focused proof-of-concept: a browser UI that writes encrypted payloads to a public datastore and decrypts them client-side. The POC is intentionally simplified to highlight architectural trade-offs prior to hardening and on-chain implementation.

## Technology Stack (POC & Future)

| Component | POC (current) | Future (target) |
|---|---:|---|
| Blockchain | None on-chain; Firestore used as a public ledger stub | Solana (Anchor/Rust program to manage message PDAs and receipts) |
| Frontend | React (single-file POC: [Memo.jsx](Memo.jsx)), Tailwind for styles | React/Next.js + robust UI patterns; componentized codebase and design system |
| E2E Crypto | Demo XOR cipher (see [`xorCipher`](Memo.jsx), [`encryptMessage`](Memo.jsx), [`decryptMessage`](Memo.jsx)) | NaCl-based E2E (TweetNaCl.js / libsodium), proper key exchange and authenticated encryption |
| Data Storage | Firebase Firestore collection (PUBLIC_DATA_PATH used as public ledger) | On-chain PDAs for metadata; IPFS/Arweave for larger encrypted payloads; minimized on-chain state |
| Wallet Integration | Firebase anonymous auth as identity stub | Native Solana wallets via `@solana/wallet-adapter-react` and wallet-based signing for key management |

## Quick Start: Running the Local POC

This repository contains a minimal proof-of-concept UI implemented in [Memo.jsx](Memo.jsx). For a local development guide and step-by-step instructions, see the companion guide: `solana_memo_local_poc_guide.md`.

Key developer notes:
- The POC uses a local Firebase config stub (see `LOCAL_FIREBASE_CONFIG` in [Memo.jsx](Memo.jsx)). Populate your Firebase config for local runs.
- The current encryption is intentionally insecure and exists only to demonstrate the end-to-end flow. See [`encryptMessage`](Memo.jsx) and [`decryptMessage`](Memo.jsx) for the implementation used by the POC.

## Project Roadmap

### Phase 1: Proof of Concept (Completed)
Deliverables:
- Single-file React POC UI ([Memo.jsx](Memo.jsx)) that demonstrates the full message lifecycle: compose → encrypt (POC cipher) → publish to a public ledger (Firestore) → client-side decryption for the recipient.
- Anonymous identity stub via Firebase Auth to simulate wallet identifiers.
- Public ledger representation (Firestore collection `PUBLIC_DATA_PATH`) exposing non-sensitive fields (sender, recipient, encrypted payload, createdAt).
- Goal: validate UX and system-level assumptions for public-but-encrypted messaging.

### Phase 2: Wallet & Security Integration
Immediate next steps:
- Replace anonymous Firebase identities with wallet-based identities using `@solana/wallet-adapter-react`. This transition will map wallet addresses to recipient identifiers and enable on-device key management.
- Implement robust end-to-end cryptography using TweetNaCl.js (or an equivalent audited library). Introduce proper key exchange, ephemeral keys, authenticated encryption, and replay protections.
- Remove client-side storage of plaintext and design a secure flow for key pair generation, backup, and recovery tied to wallet ownership and signing.

### Phase 3: Tokenomics & On-Chain Program
Longer-term on-chain vision:
- Build an Anchor/Rust program to manage message state. Messages will be anchored using Program Derived Addresses (PDAs) storing minimal metadata and pointers to encrypted payloads.
- Introduce an SPL token ("$MEMO") minted as a receipt when a message is published on-chain. The receipt encodes provenance and optionally additional semantics (proof-of-delivery, transferability).
- Define gas-optimized PDA layouts and permission models so that encrypted payload owners and recipients can interact with message receipts without exposing plaintext.
- Design considerations: censorship resistance, storage cost minimization (e.g., off-chain payloads), and upgradeable program patterns.

### Phase 4: Feature Enhancement & UX
Stretch goals and product-grade improvements:
- User discovery and social graph features (opt-in SNS-style discovery that respects privacy by design).
- Burn / revoke feature: allow senders or token holders to mark receipts as invalid, with appropriate UX and on-chain attestations.
- Group memos and multi-recipient encryption with secure key distribution and access control.
- Analytics, moderation tooling, and enterprise integration patterns where required.

## Contribution

Contributions are welcome. This project is exploratory and intended to mature through practical iteration. Recommended contribution paths:
- Security and cryptography audits and PRs to replace the demo cipher with audited libraries and correct key management flows.
- Frontend extraction and componentization for testability and maintainability (refactor [Memo.jsx](Memo.jsx) into a composable UI).
- On-chain program proposals and Anchor skeletons that model PDAs and token receipts.

If you plan to contribute:
- Open issues describing the proposed change or RFC for on-chain design.
- Submit PRs with tests and clear migration notes where applicable.

License: See [LICENSE](LICENSE) for terms.
