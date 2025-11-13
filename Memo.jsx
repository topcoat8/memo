import React, { useEffect, useState } from "react";
import { MemoProvider, useMemoContext, useMemo, useMemoMessages, decryptMessage } from './src/sdk/index';
import MemoUI from './MemoUI';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Inner app component that uses the SDK
function MemoApp() {
  const { db, userId, isAuthReady, wallet, appInitError } = useMemoContext();
  const [recipientId, setRecipientId] = useState("");
  const [message, setMessage] = useState("");
  const [globalError, setGlobalError] = useState(null);

  // Use SDK hooks
  const { sendMemo: sendMemoSDK, isLoading, error, successMessage } = useMemo({
    db,
    userId,
    isAuthReady,
  });

  // Get all messages (optimized query) - only fetch when ready
  const { memos, loading: messagesLoading } = useMemoMessages({
    db: isAuthReady ? db : null, // Only fetch when auth is ready
    userId: isAuthReady ? userId : null,
    sortOrder: 'desc',
    limit: 200,
    autoDecrypt: false, // We'll decrypt manually in the UI
  });

  // Global error handler for runtime errors
  // In production, consider disabling detailed error display for security
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
    await sendMemoSDK({
      recipientId,
      message,
    });
    // Clear message on success
    if (!error) {
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
      {appInitError ? (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40 max-w-4xl w-full px-4">
          <div className="rounded-md border border-red-500/50 bg-red-900/20 p-4">
            <p className="text-red-300 font-medium">Initialization Error</p>
            <p className="text-red-300 text-sm mt-1">{appInitError}</p>
          </div>
        </div>
      ) : null}
      <MemoUI
        isAuthReady={isAuthReady}
        userId={userId}
        wallet={wallet}
        recipientId={recipientId}
        setRecipientId={setRecipientId}
        message={message}
        setMessage={setMessage}
        isLoading={isLoading || messagesLoading}
        error={error}
        successMessage={successMessage}
        sendMemo={handleSendMemo}
        memos={memos}
        decryptMessage={(encryptedContent) => decryptMessage(encryptedContent, userId)}
      />
    </>
  );
}

// Main app component with provider
export default function App() {
  return (
    <MemoProvider firebaseConfig={firebaseConfig}>
      <MemoApp />
    </MemoProvider>
  );
}
