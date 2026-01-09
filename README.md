# Memo Protocol

**The Immutable Communication Layer for Solana**

Memo Protocol is a decentralized messaging infrastructure that bridges casual social coordination and enterprise compliance. By leveraging the Solana blockchain, messages become immutable, verifiable on-chain records rather than ephemeral text.

---

## Overview

Memo Protocol operates on a single, secure ledger but powers two distinct ecosystems:

| Ecosystem | Purpose | Target Users |
|-----------|---------|--------------|
| **Memo Social** | Community velocity and engagement | Token communities, DAOs, NFT projects |
| **Memo Enterprise** | Business stability and compliance | Legal teams, financial services, B2B negotiations |

---

## Core Technology

### Smart Transfer Protocol

A proprietary mechanism that optimizes cost and ensures message deliverability:

- **New Connections**: Automatically detects empty wallets and attaches a rent exemption transfer (~0.001 SOL) to initialize the recipient's account
- **Existing Connections**: Sends messages with 0 SOL transfer value, incurring only the standard network fee (~0.000005 SOL)

### Zero-Knowledge Encryption

All messages are encrypted client-side using TweetNaCl (Curve25519) before transmission:

- **Asymmetric Encryption**: Messages encrypted with recipient's public key
- **Forward Secrecy**: Each session generates unique nonces
- **No Backdoors**: No admin keys or central servers store plaintext

### Immutable Storage

Messages are stored directly in transaction history via the Solana Memo Program, providing permanent, public proof of existence while keeping content private.

---

## Architecture

```
                            ┌─────────────┐       ┌─────────────┐
                            │ User Client │──────▶│  TweetNaCl  │
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
```

---

## Repository Structure

```
memo/
├── apps/
│   └── web/                    # Primary web application
│       ├── src/
│       │   ├── apps/           # Application modules
│       │   │   ├── unified/    # Main messaging interface
│       │   │   └── enterprise/ # Enterprise features
│       │   ├── components/     # UI components
│       │   └── shared/         # SDK and shared utilities
│       │       ├── hooks/      # React hooks
│       │       ├── utils/      # Encryption, compression
│       │       ├── clients/    # Solana client
│       │       └── context/    # React context providers
│       └── memo-android/       # Android build (Capacitor)
└── packages/
    └── shared/                 # Shared package exports
```

---

## SDK

The Memo Protocol SDK provides a complete toolkit for building on-chain messaging applications.

### Installation

```bash
npm install
```

### Quick Start

```javascript
import {
  MemoProvider,
  useMemoContext,
  useMemo,
  useMemoMessages,
  encryptMessage,
  decryptMessage,
} from './src/shared';

// Wrap your app with MemoProvider
<MemoProvider network="mainnet-beta" tokenMint={TOKEN_MINT}>
  <App />
</MemoProvider>
```

### Available Hooks

| Hook | Description |
|------|-------------|
| `useMemo` | Send memos with token transfers |
| `useMemoMessages` | Fetch and manage message history |
| `useCommunityMessages` | Community channel messaging |
| `useMemoTokenBalance` | Track token balances |
| `useChatTokenBalances` | Multi-wallet balance tracking |
| `useCommunityRules` | Token-gating rule management |

### Encryption Utilities

```javascript
// Encrypt a message for on-chain storage
const { encryptedData, nonce } = encryptMessageForChain(plaintext, recipientId);

// Decrypt a message from chain
const plaintext = decryptMessageFromChain(encryptedData, nonce, recipientId);

// Asymmetric encryption (Curve25519)
const { encryptedData, nonce } = encryptMessageAsymmetric(
  plaintext,
  recipientPublicKey,
  senderSecretKey
);
```

---

## Features

### Memo Social

- **Token-Gated Communities**: Restrict access to verified token holders
- **Whale Channels**: Exclusive sub-channels for top percentage holders
- **Sybil Resistance**: Native protection against bot spam
- **Encrypted DMs**: End-to-end encrypted direct messaging between wallets

### Memo Enterprise

- **On-Chain Contract Signing**: Immutable signatures timestamped on the Solana ledger
- **Audit Trails**: Complete, unalterable history of negotiations
- **PDF Generation**: Export signed contracts with cryptographic proofs
- **Regulatory Compliance**: Satisfies strict data retention requirements

---

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev:web

# Build for production
npm run build
```

### Environment Variables

Create a `.env` file in `apps/web/`:

```env
VITE_SOLANA_NETWORK=mainnet-beta
VITE_SOLANA_RPC=<your-rpc-endpoint>
VITE_TOKEN_MINT=<token-mint-address>
```

---

## Deployment

The application is configured for Vercel deployment. The `vercel.json` configuration handles routing and static asset serving.

```bash
npm run build
```

---

## Technology Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18, Vite |
| Styling | Tailwind CSS |
| Blockchain | Solana Web3.js, SPL Token |
| Encryption | TweetNaCl (Curve25519) |
| Wallet | Solana Wallet Adapter |
| Animation | Framer Motion |
| PDF | jsPDF |

---

## Security

- All encryption operations occur client-side
- Private keys never leave the user's wallet
- No centralized servers store message content
- Messages are compressed before encryption to optimize on-chain storage

---

## License

This project is proprietary software. All rights reserved.

---

## Links

- Documentation: [memoprotocol.app](https://memoprotocol.app)
