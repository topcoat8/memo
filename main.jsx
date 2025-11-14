// Polyfills must be imported FIRST
import './src/polyfills.js';

import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './Memo.jsx';

// Solana wallet adapter providers
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

const wallets = [new PhantomWalletAdapter()];

const root = createRoot(document.getElementById('root'));
root.render(
  <ConnectionProvider endpoint={import.meta.env.VITE_SOLANA_RPC || 'https://api.mainnet-beta.solana.com'}>
    <WalletProvider wallets={wallets} autoConnect={false}>
      <WalletModalProvider>
        <App />
      </WalletModalProvider>
    </WalletProvider>
  </ConnectionProvider>
);
