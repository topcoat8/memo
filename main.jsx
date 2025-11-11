import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './Memo.jsx'

// Wallet adapter providers
import {
	ConnectionProvider,
	WalletProvider,
} from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

const wallets = [new PhantomWalletAdapter()];

const root = createRoot(document.getElementById('root'))
root.render(
	<ConnectionProvider endpoint={import.meta.env.VITE_SOLANA_RPC || 'https://api.devnet.solana.com'}>
		<WalletProvider wallets={wallets} autoConnect={false}>
			<WalletModalProvider>
				<App />
			</WalletModalProvider>
		</WalletProvider>
	</ConnectionProvider>
)
