import React, { useEffect, useState } from "react";
import { MemoProvider, useMemoContext, useMemo, useMemoMessages, decryptMessageFromChain } from './src/sdk/index';
import { useMemoTokenBalance } from './src/sdk/hooks/useMemoTokenBalance';
import { getMemoMintAddress } from './src/sdk/clients/solanaClient';
import MemoUI from './MemoUI';

// Solana network configuration
const network = import.meta.env.VITE_SOLANA_NETWORK || 'devnet';

// Inner app component that uses the SDK
function MemoApp() {
  const { connection, program, publicKey, userId, isReady, error: contextError, wallet } = useMemoContext();
  const [recipientId, setRecipientId] = useState("");
  const [message, setMessage] = useState("");
  const [globalError, setGlobalError] = useState(null);

  // Use SDK hooks
  const { sendMemo: sendMemoSDK, isLoading, error, successMessage } = useMemo({
    program,
    connection,
    publicKey,
    userId,
    isReady,
    wallet,
  });

  // Get all messages - only fetch when ready
  const { memos, loading: messagesLoading } = useMemoMessages({
    program: isReady ? program : null,
    connection: isReady ? connection : null,
    publicKey,
    userId: isReady ? userId : null,
    isReady,
    sortOrder: 'desc',
    limit: 200,
    autoDecrypt: false, // We'll decrypt manually in the UI
  });

  // Get $MEMO token mint and balance
  const [memoMint, setMemoMint] = useState(null);
  useEffect(() => {
    if (program && isReady) {
      getMemoMintAddress(program).then(setMemoMint).catch(console.error);
    }
  }, [program, isReady]);

  const { balance: tokenBalance, loading: balanceLoading } = useMemoTokenBalance({
    connection,
    publicKey,
    memoMint,
    isReady: isReady && !!memoMint,
  });

  // Global error handler for runtime errors
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

  // Wrapper for sendMemo that matches the UI's expected signature
  async function handleSendMemo() {
    const result = await sendMemoSDK({
      recipientId,
      message,
    });
    // Clear message on success
    if (result?.success) {
      setMessage("");
    }
  }

  // Decrypt message helper for UI
  function decryptMessageHelper(memo) {
    if (!memo || !userId) return "[Not available]";
    if (memo.decryptedContent) return memo.decryptedContent;
    if (memo.recipientId !== userId) return "[Cannot decrypt: Not the recipient]";
    if (!memo.encryptedContent || !memo.nonce) return "[Invalid message data]";
    
    try {
      return decryptMessageFromChain(
        new Uint8Array(memo.encryptedContent),
        memo.nonce,
        userId
      );
    } catch (err) {
      return `[Decryption failed: ${err.message}]`;
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
        wallet={null} // Wallet is now in context
        recipientId={recipientId}
        setRecipientId={setRecipientId}
        message={message}
        setMessage={setMessage}
        isLoading={isLoading || messagesLoading}
        error={error}
        successMessage={successMessage}
        sendMemo={handleSendMemo}
        memos={memos}
        decryptMessage={decryptMessageHelper}
        tokenBalance={tokenBalance}
        balanceLoading={balanceLoading}
      />
    </>
  );
}

// Main app component with provider
export default function App() {
  return (
    <MemoProvider network={network}>
      <MemoApp />
    </MemoProvider>
  );
}
