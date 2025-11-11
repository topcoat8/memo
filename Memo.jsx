import React, { useEffect, useMemo, useState } from "react";
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

// ===========================
// Local Firebase Config Stub
// ===========================
// IMPORTANT: Insert your Firebase project's config here for local development.
// You can find this in your Firebase console (Project Settings > Your Apps).
// Example:
// const LOCAL_FIREBASE_CONFIG = {
//   apiKey: "YOUR_API_KEY",
//   authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
//   projectId: "YOUR_PROJECT_ID",
//   storageBucket: "YOUR_PROJECT_ID.appspot.com",
//   messagingSenderId: "YOUR_SENDER_ID",
//   appId: "YOUR_APP_ID",
// };
const LOCAL_FIREBASE_CONFIG = {};

// Fallback selection: allows overriding via a global (window.FIREBASE_CONFIG) or uses LOCAL_FIREBASE_CONFIG
const firebaseConfig =
  (typeof window !== "undefined" && window.FIREBASE_CONFIG) || LOCAL_FIREBASE_CONFIG;

// Name of the public collection that represents our "public ledger"
const PUBLIC_DATA_PATH = "public_memos";

// ===========================
// Dummy, Non-Secure Crypto
// ===========================
// WARNING: This is intentionally non-secure for POC purposes ONLY.
// A simple XOR-based cipher to demonstrate end-to-end flow.
function xorCipher(text, key) {
  if (!key || key.length === 0) return text;
  const keyChars = Array.from(key);
  const out = [];
  for (let i = 0; i < text.length; i += 1) {
    const t = text.charCodeAt(i);
    const k = keyChars[i % keyChars.length].charCodeAt(0);
    out.push(String.fromCharCode(t ^ k));
  }
  return out.join("");
}

function encryptMessage(plaintext, recipientId) {
  // Use recipientId as the "key" so only the intended recipient can decrypt in this POC
  const cipher = xorCipher(plaintext, recipientId || "");
  // Store as base64 to make it visibly transportable
  return btoa(unescape(encodeURIComponent(cipher)));
}

function decryptMessage(encryptedBase64, recipientId) {
  try {
    const cipher = decodeURIComponent(escape(atob(encryptedBase64)));
    return xorCipher(cipher, recipientId || "");
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
  const [recipientId, setRecipientId] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [memos, setMemos] = useState([]);

  // Initialize Firebase app once
  const firebaseApp = useMemo(() => {
    try {
      // Basic validation hint for local dev experience
      if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
        throw new Error(
          "Missing Firebase config. Populate LOCAL_FIREBASE_CONFIG in SecureMemoToken.jsx."
        );
      }
      return initializeApp(firebaseConfig);
    } catch (err) {
      setAppInitError(err?.message || "Failed to initialize Firebase.");
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Firebase services (auth, db)
  const auth = useMemo(() => (firebaseApp ? getAuth(firebaseApp) : null), [firebaseApp]);
  const db = useMemo(() => (firebaseApp ? getFirestore(firebaseApp) : null), [firebaseApp]);

  // Anonymous auth and user state ready flag
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUserId(u.uid);
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
      const encryptedContent = encryptMessage(message, recipientId.trim());
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

  // Tailwind-driven layout and dark theme. Ensure Tailwind is loaded in your index.html via CDN for local POC.
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Solana Secure Memo ($MEMO)
          </h1>
          <p className="text-gray-400 mt-2">
            End-to-end encrypted messaging on a public ledger (POC over Firestore).
          </p>
        </header>

        {appInitError ? (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 p-4 mb-6">
            <p className="text-red-300 font-medium">Initialization Error</p>
            <p className="text-red-200 text-sm mt-1">{appInitError}</p>
          </div>
        ) : null}

        {/* Wallet ID + Warning */}
        <section className="mb-8">
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Wallet ID (Anonymous Auth)</p>
                <p className="font-mono text-sm md:text-base break-all text-gray-200">
                  {isAuthReady ? userId : "Connecting..."}
                </p>
              </div>
              <span className="inline-flex items-center text-xs px-2 py-1 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Demo-Only Crypto
              </span>
            </div>
            <p className="mt-3 text-xs text-amber-300">
              Warning: Encryption in this POC is a simple XOR placeholder and is NOT secure.
              Do not use for real secrets. It exists solely to demonstrate the end-to-end flow.
            </p>
          </div>
        </section>

        {/* Notifications */}
        {(error || successMessage) && (
          <div className="mb-6 space-y-3">
            {error ? (
              <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}
            {successMessage ? (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                {successMessage}
              </div>
            ) : null}
          </div>
        )}

        {/* Send Memo */}
        <section className="mb-10">
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <h2 className="text-lg font-medium mb-4">Send Memo</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Recipient Wallet ID</label>
                <input
                  type="text"
                  className="w-full rounded-md bg-gray-950 border border-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Paste the recipient's wallet (anonymous UID) here"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Message</label>
                <textarea
                  rows={4}
                  className="w-full rounded-md bg-gray-950 border border-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Type your memo..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={sendMemo}
                  disabled={isLoading || !isAuthReady}
                  className="inline-flex items-center justify-center rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium"
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
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <h2 className="text-lg font-medium mb-4">Public Ledger</h2>
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
                    className="rounded-md border border-gray-800 bg-gray-950 p-3 text-sm"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <span className="text-gray-400">Sender:</span>
                        <p className="font-mono break-all">{m.senderId}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Recipient:</span>
                        <p className="font-mono break-all">{m.recipientId}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Encrypted:</span>
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
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <h2 className="text-lg font-medium mb-4">Private Inbox</h2>
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
                        className="rounded-md border border-gray-800 bg-gray-950 p-3 text-sm"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div>
                            <span className="text-gray-400">From:</span>
                            <p className="font-mono break-all">{m.senderId}</p>
                          </div>
                          <div className="md:col-span-2">
                            <span className="text-gray-400">Decrypted Message:</span>
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
          Built for the Solana $MEMO POC. Tailwind styles via CDN in local setup.
        </footer>
      </div>
    </div>
  );
}