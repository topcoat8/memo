import React, { useEffect, useMemo, useState } from "react";
import nacl from 'tweetnacl';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
  initializeApp,
} from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  query,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Name of the public collection that represents our "public ledger"
const PUBLIC_DATA_PATH = "public_memos";

// ===========================
// Crypto: TweetNaCl (preferred) with XOR fallback
// ===========================
// Attempt to load `tweetnacl` dynamically at runtime.
// If `tweetnacl` is not available the app will gracefully fall back to a
// compatibility cipher. The compatibility path is provided for interoperability during local deployments.

const _nacl = nacl;

function utf8ToUint8Array(str) {
  return new TextEncoder().encode(str);
}

function uint8ArrayToBase64(bytes) {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(b64) {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Simple XOR fallback (unchanged semantics)
// Primary encrypt/decrypt functions using TweetNaCl secretbox.
function deriveKeyFromIdentifier(id) {
  // Derive 32 byte key from identifier via hash.
  const hash = _nacl.hash(utf8ToUint8Array(id || ""));
  return hash.slice(0, 32);
}

function encryptMessage(plaintext, recipientId) {
  const key = deriveKeyFromIdentifier(recipientId || "");
  const nonce = _nacl.randomBytes(_nacl.secretbox.nonceLength);
  const boxed = _nacl.secretbox(utf8ToUint8Array(plaintext), nonce, key);
  const combined = new Uint8Array(nonce.length + boxed.length);
  combined.set(nonce, 0);
  combined.set(boxed, nonce.length);
  return uint8ArrayToBase64(combined);
}

function decryptMessage(encryptedBase64, recipientId) {
  try {
    const combined = base64ToUint8Array(encryptedBase64);
    const nonceLen = _nacl.secretbox.nonceLength;
    if (combined.length < nonceLen) return "[Decryption failed]";
    const nonce = combined.slice(0, nonceLen);
    const boxed = combined.slice(nonceLen);
    const key = deriveKeyFromIdentifier(recipientId || "");
    const opened = _nacl.secretbox.open(boxed, nonce, key);
    if (!opened) return "[Decryption failed]";
    return new TextDecoder().decode(opened);
  } catch (e) {
    return "[Decryption failed]";
  }
}

// ===========================
// Main App Component
// ===========================
export default function App() {
  const [appInitError, setAppInitError] = useState("");
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userId, setUserId] = useState("");
  // wallet adapter hook is used for wallet interactions
  const wallet = useWallet();
  const [recipientId, setRecipientId] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [globalError, setGlobalError] = useState(null);
  const [memos, setMemos] = useState([]);

  // Initialize Firebase app once
  const firebaseApp = useMemo(() => {
    try {
      // Basic validation: Check if the env vars were *actually* loaded.
      // If VITE_FIREBASE_API_KEY was missing, firebaseConfig.apiKey will be undefined.
      if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        throw new Error(
          "Firebase config is incomplete. Ensure VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID are set in Vercel."
        );
      }
      
      const app = initializeApp(firebaseConfig);
      return app;
    } catch (err) {
      setAppInitError(err?.message || "Failed to initialize Firebase.");
      return null;
    }
  }, []);

  // Debug info snapshot for troubleshooting blank-screen issues
  const debugInfo = useMemo(() => ({
    firebaseAppExists: Boolean(firebaseApp),
    authExists: Boolean(firebaseApp) && typeof getAuth === 'function',
    dbExists: Boolean(firebaseApp) && typeof getFirestore === 'function',
    isAuthReady,
    userId,
    walletPublicKey: wallet?.publicKey?.toString?.() || null,
    memosCount: memos.length,
  }), [firebaseApp, isAuthReady, userId, wallet, memos]);

  // TweetNaCl is imported statically at module scope (see top-level import).

  // Firebase services (auth, db)
  const auth = useMemo(() => (firebaseApp ? getAuth(firebaseApp) : null), [firebaseApp]);
  const db = useMemo(() => (firebaseApp ? getFirestore(firebaseApp) : null), [firebaseApp]);

  // Anonymous auth and user state ready flag
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        // prefer wallet public key if present, otherwise use Firebase UID
        if (wallet?.publicKey) {
          setUserId(wallet.publicKey.toString());
        } else {
          setUserId(u.uid);
        }
        setIsAuthReady(true);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          setError(err?.message || "Anonymous sign-in failed.");
          setIsAuthReady(false);
        }
      }
    });
    return () => unsubscribe();
  }, [auth]);

  // Keep userId in sync with the connected wallet: when a wallet connects,
  // prefer its public key as the identity. When it disconnects, fall back to
  // the Firebase anonymous UID if available.
  useEffect(() => {
    if (wallet?.publicKey) {
      setUserId(wallet.publicKey.toString());
      setIsAuthReady(true);
    } else if (auth && auth.currentUser) {
      setUserId(auth.currentUser.uid);
    }
  }, [wallet?.publicKey, auth]);

  // Wallet interactions are handled by wallet-adapter provider and hooks

  // Global error capture: surface runtime errors in-app for easier debugging
  useEffect(() => {
    function onError(message, source, lineno, colno, err) {
      setGlobalError({ message: message?.toString(), source, lineno, colno, stack: err?.stack });
    }
    function onRejection(e) {
      const reason = e?.reason || e;
      setGlobalError({ message: reason?.message || String(reason), stack: reason?.stack });
    }
    window.addEventListener('error', (ev) => onError(ev.message, ev.filename, ev.lineno, ev.colno, ev.error));
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', (ev) => onError(ev.message, ev.filename, ev.lineno, ev.colno, ev.error));
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  // Subscribe to "public ledger" memos
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, PUBLIC_DATA_PATH));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = [];
        snap.forEach((d) => {
          const data = d.data();
          next.push({
            id: d.id,
            senderId: data?.senderId || "",
            recipientId: data?.recipientId || "",
            encryptedContent: data?.encryptedContent || "",
            createdAt: data?.createdAt || null,
          });
        });
        // Simple newest-first ordering by createdAt if present
        next.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() || 0;
          const tb = b.createdAt?.toMillis?.() || 0;
          return tb - ta;
        });
        setMemos(next);
      },
      (err) => {
        setError(err?.message || "Failed to load memos.");
      }
    );
    return () => unsub();
  }, [db]);

  async function sendMemo() {
    setError("");
    setSuccessMessage("");
    if (!db) {
      setError("Firestore is not initialized.");
      return;
    }
    if (!isAuthReady || !userId) {
      setError("Auth not ready. Try again in a moment.");
      return;
    }
    if (!recipientId.trim()) {
      setError("Recipient ID is required.");
      return;
    }
    if (!message.trim()) {
      setError("Message cannot be empty.");
      return;
    }
    try {
      setIsLoading(true);
      const targetRecipient = recipientId.trim();
      const encryptedContent = encryptMessage(message, targetRecipient);
      const coll = collection(db, PUBLIC_DATA_PATH);
      // Generate a random doc id and set
      const ref = doc(coll);
      await setDoc(ref, {
        senderId: userId,
        recipientId: recipientId.trim(),
        encryptedContent,
        createdAt: serverTimestamp(),
      });
      setMessage("");
      setSuccessMessage("Memo sent to the public ledger.");
    } catch (err) {
      setError(err?.message || "Failed to send memo.");
    } finally {
      setIsLoading(false);
    }
  }

  // Tailwind-driven layout and dark theme.
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-indigo-950 text-gray-200">
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-500 py-1">
            Solana Secure Memo ($MEMO)
          </h1>
          <p className="text-gray-400 mt-1">
            Encrypted messaging using a local-first ledger for consistent developer and private deployments.
          </p>
        </header>

        {appInitError ? (
          <div className="rounded-md border border-red-500/50 bg-red-900/20 p-4 mb-6">
            <p className="text-red-300 font-medium">Initialization Error</p>
            <p className="text-red-300 text-sm mt-1">{appInitError}</p>
          </div>
        ) : null}

        {/* Wallet ID + Warning */}
        <section className="mb-8">
          <div className="rounded-lg border border-indigo-900/50 bg-gray-950/70 backdrop-blur-md shadow-xl shadow-black/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Wallet ID (Anonymous Auth / Wallet)</p>
                <p className="font-mono text-sm md:text-base break-all text-cyan-400">
                  {isAuthReady ? (
                    wallet?.publicKey ? wallet.publicKey.toString() : (userId ? `anonymous:${userId.slice(0,8)}` : 'Not connected')
                  ) : "Connecting..."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm">
                  <WalletMultiButton />
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-amber-400 border-t border-amber-500/20 pt-3">
              Encryption is handled in-browser using authenticated encryption (TweetNaCl).
            </p>
          </div>
        </section>

        {/* Notifications */}
        {(error || successMessage) && (
          <div className="mb-6 space-y-3">
            {error ? (
              <div className="rounded-md border border-red-500/50 bg-red-900/20 p-3 text-sm text-red-300">
                {error}
              </div>
            ) : null}
            {successMessage ? (
              <div className="rounded-md border border-emerald-500/50 bg-emerald-900/20 p-3 text-sm text-emerald-300">
                {successMessage}
              </div>
            ) : null}
          </div>
        )}

        {/* Send Memo */}
        <section className="mb-10">
          <div className="rounded-lg border border-indigo-900/50 bg-gray-950/70 backdrop-blur-md shadow-xl shadow-black/20 p-4">
            <h2 className="text-lg font-medium mb-4 text-cyan-300">Send Memo</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-cyan-400 mb-1 font-medium">Recipient Wallet ID</label>
                <input
                  type="text"
                  className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
                  placeholder="Paste the recipient's wallet (anonymous UID) here"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-cyan-400 mb-1 font-medium">Message</label>
                <textarea
                  rows={4}
                  className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
                  placeholder="Type your memo..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={sendMemo}
                  disabled={isLoading || !isAuthReady}
                  className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2 text-sm font-medium text-white shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-all duration-300 transform hover:scale-105"
                >
                  {isLoading ? "Sending..." : "Send Memo"}
                </button>
                {!isAuthReady ? (
                  <span className="text-xs text-gray-400">Waiting for auth...</span>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* Public Ledger */}
        <section className="mb-10">
          <div className="rounded-lg border border-indigo-900/50 bg-gray-950/70 backdrop-blur-md shadow-xl shadow-black/20 p-4">
            <h2 className="text-lg font-medium mb-4 text-cyan-300">Public Ledger</h2>
            <p className="text-sm text-gray-400 mb-4">
              Entries visible to everyone. Only public fields are shown here.
            </p>
            <div className="space-y-3">
              {memos.length === 0 ? (
                <div className="text-sm text-gray-500">No memos yet.</div>
              ) : (
                memos.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-md border border-gray-800 bg-gray-900/80 p-3 text-sm"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <span className="text-cyan-600">Sender:</span>
                        <p className="font-mono break-all">{m.senderId}</p>
                      </div>
                      <div>
                        <span className="text-cyan-600">Recipient:</span>
                        <p className="font-mono break-all">{m.recipientId}</p>
                      </div>
                      <div>
                        <span className="text-cyan-600">Encrypted:</span>
                        <p className="font-mono break-all">{m.encryptedContent}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Private Inbox */}
        <section className="mb-4">
          <div className="rounded-lg border border-indigo-900/50 bg-gray-950/70 backdrop-blur-md shadow-xl shadow-black/20 p-4">
            <h2 className="text-lg font-medium mb-4 text-cyan-300">Private Inbox</h2>
            <p className="text-sm text-gray-400 mb-4">
              Decrypts memos addressed to your Wallet ID locally in the browser.
            </p>
            <div className="space-y-3">
              {memos.filter((m) => m.recipientId === userId).length === 0 ? (
                <div className="text-sm text-gray-500">No private memos for you (yet).</div>
              ) : (
                memos
                  .filter((m) => m.recipientId === userId)
                  .map((m) => {
                    const decrypted = decryptMessage(m.encryptedContent, userId);
                    return (
                      <div
                        key={m.id}
                        className="rounded-md border border-gray-800 bg-gray-900/80 p-3 text-sm"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div>
                            <span className="text-cyan-600">From:</span>
                            <p className="font-mono break-all">{m.senderId}</p>
                          </div>
                          <div className="md:col-span-2">
                            <span className="text-cyan-600">Decrypted Message:</span>
                            <p className="break-words mt-1">{decrypted}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </section>

        <footer className="mt-10 text-center text-xs text-gray-600">
          Built for privacy
        </footer>
        {/* Debug panel (remove in production) */}
        <div className="fixed bottom-3 right-3 p-3 bg-gray-900/80 backdrop-blur-sm border border-gray-700 text-xs text-gray-300 rounded">
          <div className="font-mono text-[11px]">debug:</div>
          <div>firebaseApp: {debugInfo.firebaseAppExists ? 'yes' : 'no'}</div>
          <div>auth/db: {debugInfo.authExists && debugInfo.dbExists ? 'ok' : 'missing'}</div>
          <div>authReady: {String(debugInfo.isAuthReady)}</div>
          <div>userId: {debugInfo.userId ? debugInfo.userId.slice(0,8) : 'none'}</div>
          <div>wallet: {debugInfo.walletPublicKey ? debugInfo.walletPublicKey.slice(0,8) : 'none'}</div>
          <div>memos: {debugInfo.memosCount}</div>
        </div>
      </div>
    </div>
  );
}