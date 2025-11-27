import { useEffect, useState } from "react";
import { MemoProvider, useMemoContext, useMemo as useMemoProtocol, useMemoMessages } from './src/sdk/index';
import MemoUI from './MemoUI';

const network = import.meta.env.VITE_SOLANA_NETWORK || 'mainnet-beta';
const tokenMint = import.meta.env.VITE_TOKEN_MINT;

function MemoApp() {
  const { connection, publicKey, userId, isReady, error: contextError, wallet, tokenMint: contextTokenMint, encryptionKeys, login, logout } = useMemoContext();
  const [recipientId, setRecipientId] = useState("");
  const [message, setMessage] = useState("");
  const [globalError, setGlobalError] = useState(null);

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
      <MemoUI
        isAuthReady={isReady}
        userId={userId}
        wallet={null}
        recipientId={recipientId}
        setRecipientId={setRecipientId}
        message={message}
        setMessage={setMessage}
        isLoading={isLoading || messagesLoading}
        error={error}
        successMessage={successMessage}
        sendMemo={handleSendMemo}
        memos={memos}
        decryptMessage={decrypt}
        encryptionKeys={encryptionKeys}
        login={login}
        logout={logout}
        announceIdentity={announceIdentity}
        publicKeyRegistry={publicKeyRegistry}
      />
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
