import React, { useState } from "react";
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function MemoUI({
  isAuthReady,
  userId,
  wallet,
  recipientId,
  setRecipientId,
  message,
  setMessage,
  isLoading,
  error,
  successMessage,
  sendMemo,
  memos,
  decryptMessage,
}) {
  const [activeTab, setActiveTab] = useState("send");

  const tabs = [
    { id: "send", label: "Send Memo" },
    { id: "public", label: "Public Ledger" },
    { id: "private", label: "Private Inbox" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-indigo-950 text-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-500 py-1">
            Memo Protocol (POC)
          </h1>
          <p className="text-gray-400 mt-1">
            Send tokens with encrypted messages. Powered by Solana and TweetNaCl encryption.
          </p>
        </header>

        {/* Wallet ID + Warning */}
        <section className="mb-8">
          <div className="rounded-lg border border-indigo-900/50 bg-gray-950/70 backdrop-blur-md shadow-xl shadow-black/20 p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-400">Wallet ID</p>
                <p className="font-mono text-sm md:text-base break-all text-cyan-400">
                  {isAuthReady ? (
                    wallet?.publicKey ? wallet.publicKey.toString() : (userId ? `anonymous:${userId.slice(0,8)}` : 'Not connected')
                  ) : "Connecting..."}
                </p>
              </div>
              <div className="text-sm">
                <WalletMultiButton />
              </div>
            </div>
            <p className="mt-3 text-xs text-amber-400 border-t border-amber-500/20 pt-3">
              Encryption is handled in-browser using TweetNaCl. Messages are stored on-chain with 1 token transfer per message.
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

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 border-b border-gray-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? "text-cyan-400 border-b-2 border-cyan-400"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="rounded-lg border border-indigo-900/50 bg-gray-950/70 backdrop-blur-md shadow-xl shadow-black/20 p-4">
          {/* Send Memo Tab */}
          {activeTab === "send" && (
            <div>
              <h2 className="text-lg font-medium mb-4 text-cyan-300">Send Memo</h2>
              <div className="mb-4 p-4 bg-indigo-950/30 border border-indigo-800/50 rounded-md">
                <p className="text-sm text-gray-300 leading-relaxed">
                  Send 1 token with an encrypted message to any Solana wallet. Messages are encrypted
                  using TweetNaCl before being stored on-chain. Only the recipient can decrypt your message.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-cyan-400 mb-1 font-medium">Recipient Wallet ID</label>
                  <input
                    type="text"
                    className="w-full rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-300"
                    placeholder="Paste the recipient's Solana wallet address here"
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
                    {isLoading ? "Sending..." : "Send Memo + 1 Token"}
                  </button>
                  {!isAuthReady ? (
                    <span className="text-xs text-gray-400">Connect wallet to send</span>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* Public Ledger Tab */}
          {activeTab === "public" && (
            <div>
              <h2 className="text-lg font-medium mb-4 text-cyan-300">Public Ledger</h2>
              <p className="text-sm text-gray-400 mb-4">
                All messages on the ledger (encrypted). Transaction details are public, content is private.
              </p>
              <div className="space-y-3">
                {memos.length === 0 ? (
                  <div className="text-sm text-gray-500">No memos found.</div>
                ) : (
                  memos.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-md border border-gray-800 bg-gray-900/80 p-3 text-sm"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <span className="text-cyan-600">Sender:</span>
                          <p className="font-mono text-xs break-all">{m.senderId}</p>
                        </div>
                        <div>
                          <span className="text-cyan-600">Recipient:</span>
                          <p className="font-mono text-xs break-all">{m.recipientId}</p>
                        </div>
                        <div>
                          <span className="text-cyan-600">Status:</span>
                          <p className="text-emerald-400">Encrypted</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Private Inbox Tab */}
          {activeTab === "private" && (
            <div>
              <h2 className="text-lg font-medium mb-4 text-cyan-300">Private Inbox</h2>
              <p className="text-sm text-gray-400 mb-4">
                Decrypts memos addressed to your wallet locally in the browser.
              </p>
              <div className="space-y-3">
                {memos.filter((m) => m.recipientId === userId).length === 0 ? (
                  <div className="text-sm text-gray-500">No private memos found.</div>
                ) : (
                  memos
                    .filter((m) => m.recipientId === userId)
                    .map((m) => {
                      const decrypted = decryptMessage(m);
                      const handleReply = () => {
                        setRecipientId(m.senderId);
                        setActiveTab("send");
                      };
                      return (
                        <div
                          key={m.id}
                          className="rounded-md border border-gray-800 bg-gray-900/80 p-3 text-sm"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div>
                              <span className="text-cyan-600">From:</span>
                              <p className="font-mono text-xs break-all">{m.senderId}</p>
                            </div>
                            <div className="md:col-span-2">
                              <span className="text-cyan-600">Decrypted Message:</span>
                              <p className="break-words mt-1">{decrypted}</p>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-700">
                            <button
                              onClick={handleReply}
                              className="inline-flex items-center justify-center rounded-md bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 px-4 py-1.5 text-xs font-medium text-white shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 transition-all duration-300 transform hover:scale-105"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="mt-10 text-center text-xs text-gray-600">
          Privacy-first encrypted messaging on Solana • Proof of Concept
        </footer>
      </div>
    </div>
  );
}
