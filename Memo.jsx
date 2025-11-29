import { useEffect, useState } from "react";
import { MemoProvider, useMemoContext, useMemo as useMemoProtocol, useMemoMessages } from './src/shared/index';
import SocialApp from './src/apps/social/SocialApp';
import EnterpriseApp from './src/apps/enterprise/EnterpriseApp';

const network = import.meta.env.VITE_SOLANA_NETWORK || 'mainnet-beta';
const tokenMint = import.meta.env.VITE_TOKEN_MINT;

function LandingPage({ onSelect }) {
  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 items-center justify-center p-4">
      <div className="max-w-2xl w-full grid md:grid-cols-2 gap-6">
        <button
          onClick={() => onSelect('enterprise')}
          className="group relative bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-8 text-left transition-all hover:shadow-2xl hover:shadow-indigo-500/10"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
          <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-indigo-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Memo Enterprise</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Secure, compliant communication for high-stakes business environments.
            Immutable records, legal admissibility, and strict access control.
          </p>
        </button>

        <button
          onClick={() => onSelect('social')}
          className="group relative bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-8 text-left transition-all hover:shadow-2xl hover:shadow-emerald-500/10"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
          <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-emerald-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Memo Social</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            The native communication hub for Solana. Connect with communities,
            token-gated chats, and seamless wallet integration.
          </p>
        </button>
      </div>
    </div>
  );
}

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

function ConnectWalletPage() {
  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 text-center shadow-2xl">
        <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-indigo-400">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Welcome to Memo</h1>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          Connect your Solana wallet to access secure, immutable communication and token-gated communities.
        </p>
        <div className="flex justify-center">
          <WalletMultiButton className="!bg-indigo-600 hover:!bg-indigo-500 !transition-colors !rounded-lg !font-medium" />
        </div>
      </div>
    </div>
  );
}

function MemoApp() {
  const { connection, publicKey, userId, isReady, error: contextError, wallet, tokenMint: contextTokenMint, encryptionKeys, login, logout } = useMemoContext();
  const [recipientId, setRecipientId] = useState("");
  const [message, setMessage] = useState("");
  const [globalError, setGlobalError] = useState(null);
  const [appMode, setAppMode] = useState(null); // 'social' | 'enterprise' | null

  const { memos, loading: messagesLoading, publicKeyRegistry, decrypt } = useMemoMessages({
    connection: isReady ? connection : null,
    publicKey,
    userId: isReady ? userId : null,
    isReady,
    tokenMint: contextTokenMint,
    encryptionKeys,
    sortOrder: 'desc',
    limit: 200,
    autoDecrypt: true,
  });

  const { sendMemo: sendMemoSDK, announceIdentity, isLoading, error, successMessage } = useMemoProtocol({
    connection,
    publicKey,
    userId,
    isReady,
    wallet,
    tokenMint: contextTokenMint,
    encryptionKeys,
    publicKeyRegistry,
  });

  useEffect(() => {
    function handleError(message, source, lineno, colno, error) {
      setGlobalError({
        message: message?.toString(),
        source,
        lineno,
        colno,
        stack: error?.stack
      });
    }
    function handleRejection(event) {
      const reason = event?.reason || event;
      setGlobalError({
        message: reason?.message || String(reason),
        stack: reason?.stack
      });
    }
    window.addEventListener('error', (event) =>
      handleError(event.message, event.filename, event.lineno, event.colno, event.error)
    );
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', (event) =>
        handleError(event.message, event.filename, event.lineno, event.colno, event.error)
      );
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  async function handleSendMemo() {
    if (recipientId === "A5KKf4PVw9C84qZzgNuhEoTRYW6XcTPyhHx6xyMENXp8") {
      alert("Sending to this address is restricted.");
      return;
    }
    const result = await sendMemoSDK({
      recipientId,
      message,
    });
    if (result?.success) {
      setMessage("");
    }
  }

  const commonProps = {
    isAuthReady: isReady,
    userId,
    wallet: null,
    recipientId,
    setRecipientId,
    message,
    setMessage,
    isLoading: isLoading || messagesLoading,
    error,
    successMessage,
    sendMemo: handleSendMemo,
    memos,
    decryptMessage: decrypt,
    encryptionKeys,
    login,
    logout,
    announceIdentity,
    publicKeyRegistry,
  };

  if (!appMode) {
    return <LandingPage onSelect={setAppMode} />;
  }

  if (!publicKey) {
    return <ConnectWalletPage />;
  }

  return (
    <>
      {globalError ? (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 p-6">
          <div className="max-w-4xl mx-auto bg-gray-900 p-4 rounded-lg border border-red-600 text-sm text-red-200 shadow-2xl shadow-red-500/20">
            <h3 className="font-medium text-lg text-red-300">Runtime Error</h3>
            <pre className="mt-2 whitespace-pre-wrap text-xs">{globalError.message}{globalError.stack ? '\n' + globalError.stack : null}</pre>
            <div className="mt-3 text-right">
              <button onClick={() => setGlobalError(null)} className="px-3 py-1 text-sm bg-gray-800 rounded">Dismiss</button>
            </div>
          </div>
        </div>
      ) : null}
      {contextError ? (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40 max-w-4xl w-full px-4">
          <div className="rounded-md border border-red-500/50 bg-red-900/20 p-4">
            <p className="text-red-300 font-medium">Initialization Error</p>
            <p className="text-red-300 text-sm mt-1">{contextError}</p>
          </div>
        </div>
      ) : null}

      {/* Back to Home Button (Dev/Demo purpose) */}
      <button
        onClick={() => setAppMode(null)}
        className="fixed bottom-4 right-4 z-50 bg-slate-800 text-slate-400 hover:text-white p-2 rounded-full shadow-lg border border-slate-700 text-xs"
        title="Switch App Mode"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      </button>

      {appMode === 'social' ? (
        <SocialApp {...commonProps} />
      ) : (
        <EnterpriseApp {...commonProps} />
      )}
    </>
  );
}

export default function App() {
  return (
    <MemoProvider network={network} tokenMint={tokenMint}>
      <MemoApp />
    </MemoProvider>
  );
}
