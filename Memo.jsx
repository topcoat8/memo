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
// Encryption: TweetNaCl Secretbox
// ===========================
// Client-side encryption using TweetNaCl's authenticated encryption (secretbox).
// Messages are encrypted with a key derived from the recipient's identifier.

const naclInstance = nacl;

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

/**
 * Derives a 32-byte encryption key from a recipient identifier.
 * Uses SHA-512 hash of the identifier, truncated to 32 bytes.
 */
function deriveKeyFromIdentifier(id) {
  const hash = naclInstance.hash(utf8ToUint8Array(id || ""));
  return hash.slice(0, 32);
}

/**
 * Encrypts a plaintext message for a specific recipient.
 * Uses TweetNaCl secretbox with a random nonce.
 * Returns base64-encoded ciphertext (nonce + encrypted data).
 */
function encryptMessage(plaintext, recipientId) {
  const key = deriveKeyFromIdentifier(recipientId || "");
  const nonce = naclInstance.randomBytes(naclInstance.secretbox.nonceLength);
  const boxed = naclInstance.secretbox(utf8ToUint8Array(plaintext), nonce, key);
  const combined = new Uint8Array(nonce.length + boxed.length);
  combined.set(nonce, 0);
  combined.set(boxed, nonce.length);
  return uint8ArrayToBase64(combined);
}

/**
 * Decrypts a message encrypted for a specific recipient.
 * Returns the plaintext if decryption succeeds, or an error message if it fails.
 */
function decryptMessage(encryptedBase64, recipientId) {
  try {
    const combined = base64ToUint8Array(encryptedBase64);
    const nonceLen = naclInstance.secretbox.nonceLength;
    if (combined.length < nonceLen) {
      return "[Decryption failed: Invalid ciphertext]";
    }
    const nonce = combined.slice(0, nonceLen);
    const boxed = combined.slice(nonceLen);
    const key = deriveKeyFromIdentifier(recipientId || "");
    const opened = naclInstance.secretbox.open(boxed, nonce, key);
    if (!opened) {
      return "[Decryption failed: Authentication failed]";
    }
    return new TextDecoder().decode(opened);
  } catch (error) {
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
      // Validate that required environment variables are present
      if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        throw new Error(
          "Firebase configuration is incomplete. Please ensure VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID are set."
        );
      }
      
      const app = initializeApp(firebaseConfig);
      return app;
    } catch (err) {
      setAppInitError(err?.message || "Failed to initialize Firebase.");
      return null;
    }
  }, []);


  // Initialize Firebase services
  const auth = useMemo(() => (firebaseApp ? getAuth(firebaseApp) : null), [firebaseApp]);
  const db = useMemo(() => (firebaseApp ? getFirestore(firebaseApp) : null), [firebaseApp]);

  // Initialize anonymous authentication and user identity
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Prefer wallet public key as identity if connected, otherwise use Firebase UID
        if (wallet?.publicKey) {
          setUserId(wallet.publicKey.toString());
        } else {
          setUserId(user.uid);
        }
        setIsAuthReady(true);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (error) {
          setError(error?.message || "Authentication failed. Please try again.");
          setIsAuthReady(false);
        }
      }
    });
    return () => unsubscribe();
  }, [auth, wallet?.publicKey]);

  // Synchronize user identity with wallet connection state
  // When a wallet connects, use its public key as the identity.
  // When disconnected, fall back to Firebase anonymous UID if available.
  useEffect(() => {
    if (wallet?.publicKey) {
      setUserId(wallet.publicKey.toString());
      setIsAuthReady(true);
    } else if (auth?.currentUser) {
      setUserId(auth.currentUser.uid);
    }
  }, [wallet?.publicKey, auth]);

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

  // Subscribe to public ledger memos
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, PUBLIC_DATA_PATH));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const memosList = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          memosList.push({
            id: doc.id,
            senderId: data?.senderId || "",
            recipientId: data?.recipientId || "",
            encryptedContent: data?.encryptedContent || "",
            createdAt: data?.createdAt || null,
          });
        });
        // Sort by creation time, newest first
        memosList.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
        setMemos(memosList);
      },
      (error) => {
        setError(error?.message || "Failed to load memos from the ledger.");
      }
    );
    return () => unsubscribe();
  }, [db]);

  async function sendMemo() {
    setError("");
    setSuccessMessage("");
    
    if (!db) {
      setError("Database is not initialized. Please refresh the page.");
      return;
    }
    if (!isAuthReady || !userId) {
      setError("Authentication is not ready. Please wait a moment and try again.");
      return;
    }
    if (!recipientId.trim()) {
      setError("Recipient wallet address is required.");
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
      const memosCollection = collection(db, PUBLIC_DATA_PATH);
      const docRef = doc(memosCollection);
      await setDoc(docRef, {
        senderId: userId,
        recipientId: targetRecipient,
        encryptedContent,
        createdAt: serverTimestamp(),
      });
      setMessage("");
      setSuccessMessage("Memo sent successfully to the public ledger.");
    } catch (error) {
      setError(error?.message || "Failed to send memo. Please try again.");
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