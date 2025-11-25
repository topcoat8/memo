import React, { useState, useEffect, useRef } from "react";
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function MemoUI({
  isAuthReady,
  userId,
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
  encryptionKeys,
  login,
  logout,
  announceIdentity,
  publicKeyRegistry,
}) {
  const [activeContact, setActiveContact] = useState(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [memos, activeContact]);

  const contacts = React.useMemo(() => {
    const contactSet = new Set();
    memos.forEach(m => {
      if (m.senderId !== userId) contactSet.add(m.senderId);
      if (m.recipientId !== userId) contactSet.add(m.recipientId);
    });
    return Array.from(contactSet);
  }, [memos, userId]);

  const activeMessages = React.useMemo(() => {
    if (!activeContact) return [];
    return memos.filter(m =>
      (m.senderId === userId && m.recipientId === activeContact) ||
      (m.senderId === activeContact && m.recipientId === userId)
    ).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }, [memos, userId, activeContact]);

  const handleContactSelect = (contact) => {
    setActiveContact(contact);
    setRecipientId(contact);
    setShowMobileChat(true);
  };

  const handleBackToContacts = () => {
    setShowMobileChat(false);
    setActiveContact(null);
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    await sendMemo();
  };

  const renderMessageContent = (text) => {
    const imgRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))/i;
    const match = text.match(imgRegex);

    if (match) {
      const parts = text.split(match[0]);
      return (
        <div>
          {parts[0]}
          <div className="mt-2 mb-2">
            <img src={match[0]} alt="Embedded content" className="max-w-full h-auto rounded-lg border border-slate-700 max-h-64 object-contain" />
          </div>
          {parts[1]}
        </div>
      );
    }
    return text;
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/30">
      <div className={`${showMobileChat ? 'hidden' : 'flex'} md:flex w-full md:w-80 border-r border-slate-800 flex-col bg-slate-900/50`}>
        <div className="p-4 border-b border-slate-800">
          <h1 className="text-lg font-semibold tracking-tight text-white">
            Memo Protocol
          </h1>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
            <div className={`w-2 h-2 rounded-full ${isAuthReady ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
            {isAuthReady ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        <div className="p-4 border-b border-slate-800 bg-slate-900/30">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Security</span>
            {encryptionKeys ? (
              <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-900/50">Encrypted</span>
            ) : (
              <span className="text-[10px] font-medium text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-900/50">Unsecured</span>
            )}
          </div>

          {isAuthReady ? (
            encryptionKeys ? (
              <div className="space-y-2">
                <button
                  onClick={announceIdentity}
                  className="w-full text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-3 rounded-md transition-colors text-left flex justify-between items-center"
                >
                  <span>Announce Public Key</span>
                  <span className="text-[10px] text-slate-500">On-chain</span>
                </button>
                <button
                  onClick={logout}
                  className="w-full text-xs font-medium text-slate-500 hover:text-rose-400 py-1.5 px-1 transition-colors text-left"
                >
                  Lock Identity
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                className="w-full text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-3 rounded-md transition-all shadow-sm shadow-indigo-500/20"
              >
                Initialize Encryption
              </button>
            )
          ) : (
            <div className="opacity-50 pointer-events-none">
              <WalletMultiButton />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 px-2 mt-2">Contacts</div>
          {contacts.map(contact => (
            <button
              key={contact}
              onClick={() => handleContactSelect(contact)}
              className={`w-full text-left p-2.5 text-sm rounded-md transition-all ${activeContact === contact
                ? 'bg-indigo-500/10 text-indigo-300'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
            >
              <div className="truncate font-mono text-xs">{contact}</div>
              {publicKeyRegistry && publicKeyRegistry[contact] && (
                <div className="text-[10px] text-emerald-500/80 mt-0.5 flex items-center gap-1">
                  <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                  Secure
                </div>
              )}
            </button>
          ))}
          {contacts.length === 0 && (
            <div className="p-4 text-xs text-slate-600 text-center italic">
              No contacts yet
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-800">
          <WalletMultiButton className="!bg-slate-800 hover:!bg-slate-700 !text-slate-200 !font-medium !text-sm !h-10 !w-full !justify-center !rounded-md !transition-colors" />
        </div>
      </div>

      <div className={`${showMobileChat ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-slate-950 relative w-full`}>
        <div className="h-16 border-b border-slate-800 flex items-center justify-between px-4 md:px-6 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3 overflow-hidden">
            {activeContact && (
              <button
                onClick={handleBackToContacts}
                className="md:hidden p-1.5 -ml-2 text-slate-400 hover:text-slate-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
            )}

            <div className="flex-1 min-w-0">
              {activeContact ? (
                <div>
                  <div className="text-sm font-medium text-slate-200 flex items-center gap-2">
                    <span className="text-slate-500 font-normal hidden sm:inline">To:</span>
                    <span className="font-mono text-slate-300 truncate">{activeContact}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                    {publicKeyRegistry && publicKeyRegistry[activeContact] ? '🔒 End-to-End Encrypted' : '🔓 Standard Encryption'}
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-sm">Select a contact</div>
              )}
            </div>
          </div>

          {!activeContact && (
            <div className="flex gap-2 ml-2">
              <input
                type="text"
                placeholder="Wallet Address"
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs p-2 w-32 sm:w-64 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none rounded-md transition-all"
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
              />
              <button
                onClick={() => {
                  if (recipientId) {
                    setActiveContact(recipientId);
                    setShowMobileChat(true);
                  }
                }}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-xs px-3 hover:bg-slate-700 rounded-md transition-colors"
              >
                Start
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 min-h-0">
          {activeMessages.map((msg) => {
            const isMe = msg.senderId === userId;
            const decrypted = decryptMessage(msg);

            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] md:max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className="text-[10px] text-slate-500 mb-1">
                    {isMe ? 'You' : msg.senderId.slice(0, 8)} • {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div
                    className={`p-3.5 rounded-2xl shadow-sm ${isMe
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-slate-800 text-slate-200 rounded-bl-sm'
                      }`}
                  >
                    <div className="text-sm break-words whitespace-pre-wrap leading-relaxed">
                      {renderMessageContent(decrypted)}
                    </div>
                  </div>
                  {msg.isAsymmetric && (
                    <div className="mt-1 text-[9px] text-emerald-500/70 flex items-center justify-end gap-1">
                      <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                      Encrypted
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950">
          {(error || successMessage) && (
            <div className="mb-3 text-xs px-1">
              {error && <span className="text-rose-400">Error: {error}</span>}
              {successMessage && <span className="text-emerald-400">Success: {successMessage}</span>}
            </div>
          )}
          <div className="flex gap-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={activeContact ? "Type a message..." : "Select a contact first"}
              disabled={!activeContact || isLoading}
              className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 p-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none h-12 disabled:opacity-50 rounded-lg transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!activeContact || isLoading || !message.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 md:px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all rounded-lg text-sm shadow-lg shadow-indigo-500/20"
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </div>
          <div className="mt-2 text-[10px] text-slate-600 flex justify-between px-1">
            <span>Memo Protocol v2</span>
            <span>Fee: ~0.000005 SOL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
