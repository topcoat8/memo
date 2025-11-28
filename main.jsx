// Polyfills must be imported FIRST
import './src/polyfills.js';
import { logError } from './src/utils/logger';

// Global error handlers
window.onerror = (message, source, lineno, colno, error) => {
  logError(error || new Error(message), {
    type: 'uncaught-exception',
    source,
    lineno,
    colno
  });
};

window.onunhandledrejection = (event) => {
  logError(event.reason, { type: 'unhandled-rejection' });
};

import { createRoot } from 'react-dom/client';
import './index.css';
import App from './Memo.jsx';

// Solana wallet adapter providers
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

const wallets = [];

import ErrorBoundary from './src/components/ErrorBoundary';

const root = createRoot(document.getElementById('root'));
root.render(
  <ConnectionProvider endpoint={import.meta.env.VITE_SOLANA_RPC || 'https://api.mainnet-beta.solana.com'}>
    <WalletProvider wallets={wallets} autoConnect={false}>
      <WalletModalProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </WalletModalProvider>
    </WalletProvider>
  </ConnectionProvider>
);
