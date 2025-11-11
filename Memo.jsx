import React, { useEffect, useMemo, useState } from "react";
import nacl from 'tweetnacl';
import { useWallet } from '@solana/wallet-adapter-react';
import MemoUI from './MemoUI';
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
        isLoading={isLoading}
        error={error}
        successMessage={successMessage}
        sendMemo={sendMemo}
        memos={memos}
        decryptMessage={decryptMessage}
      />
    </>
  );
}