import { useEffect, useState } from "react";
import { MemoProvider, useMemoContext, useMemo as useMemoProtocol, useMemoMessages } from './src/shared/index';
import UnifiedApp from './src/apps/unified/UnifiedApp';
import LandingPage from './src/components/LandingPage';
import WhitepaperPage from './src/components/WhitepaperPage';
import ConnectWalletPage from './src/components/ConnectWalletPage';
import { XCircle, AlertCircle, ArrowLeft } from 'lucide-react';

const network = import.meta.env.VITE_SOLANA_NETWORK || 'mainnet-beta';
const tokenMint = import.meta.env.VITE_TOKEN_MINT;

function MemoApp() {
  const { connection, publicKey, userId, isReady, error: contextError, wallet, tokenMint: contextTokenMint, encryptionKeys, login, logout } = useMemoContext();
  const [recipientId, setRecipientId] = useState("");
  const [message, setMessage] = useState("");
  const [globalError, setGlobalError] = useState(null);
  // Initialize state based on current URL
  const [appMode, setAppMode] = useState(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/whitepaper') {
      return 'whitepaper';
    }
    return null;
  });

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === '/whitepaper') {
        setAppMode('whitepaper');
      } else {
        setAppMode(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Wrapper to update URL when changing modes
  const handleModeChange = (mode) => {
    setAppMode(mode);
    if (mode === 'whitepaper') {
      window.history.pushState(null, '', '/whitepaper');
    } else {
      window.history.pushState(null, '', '/');
    }
  };

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

  async function handleSendMemo(messageOverride) {
    if (recipientId === "A5KKf4PVw9C84qZzgNuhEoTRYW6XcTPyhHx6xyMENXp8") {
      alert("Sending to this address is restricted.");
      return;
    }
    // Use override if provided (e.g. for contracts), otherwise use state
    const contentToSend = typeof messageOverride === 'string' ? messageOverride : message;

    const result = await sendMemoSDK({
      recipientId,
      message: contentToSend,
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

  const isWalletConnected = !!publicKey;

  if (appMode === 'whitepaper') {
    return <WhitepaperPage onBack={() => handleModeChange(null)} />;
  }

  if (!appMode) {
    return <LandingPage onSelect={handleModeChange} />;
  }

  // Removed blocking ConnectWalletPage check to allow read-only access

  return (
    <>
      {globalError ? (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 p-6 flex items-center justify-center">
          <div className="max-w-2xl w-full glass-card p-6 rounded-2xl border-red-500/30">
            <div className="flex items-center gap-3 mb-4 text-red-400">
              <XCircle className="w-6 h-6" />
              <h3 className="font-bold text-lg">Runtime Error</h3>
            </div>
            <pre className="whitespace-pre-wrap text-xs text-red-200/80 font-mono bg-black/30 p-4 rounded-lg overflow-auto max-h-[60vh]">
              {globalError.message}{globalError.stack ? '\n' + globalError.stack : null}
            </pre>
            <div className="mt-6 text-right">
              <button
                onClick={() => setGlobalError(null)}
                className="px-4 py-2 text-sm bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {contextError ? (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40 max-w-lg w-full px-4">
          <div className="rounded-xl border border-red-500/30 bg-red-900/20 backdrop-blur-md p-4 flex items-start gap-3 shadow-xl">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 font-medium">Initialization Error</p>
              <p className="text-red-300/80 text-sm mt-1">{contextError}</p>
            </div>
          </div>
        </div>
      ) : null}



      <UnifiedApp {...commonProps} isWalletConnected={isWalletConnected} />
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
