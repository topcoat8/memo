import React, { useState, useEffect, useRef } from "react";
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { isValidWalletAddress } from './src/sdk/utils/encryption';
import CommunityChat from './src/components/CommunityChat';
import communityIcon from './assets/pfp.jpg';

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
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [viewMode, setViewMode] = useState('personal'); // 'personal' | 'community'
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

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
    setShowImageInput(false);
    setImageUrl("");
    setMessage("");
    setViewMode('personal');
  };

  const handleBackToContacts = () => {
    setShowMobileChat(false);
    setActiveContact(null);
    setShowImageInput(false);
    setImageUrl("");
    setMessage("");
  };

  const handleNewChat = () => {
    setActiveContact(null);
    setRecipientId("");
    setMessage("");
    setImageUrl("");
    setShowImageInput(false);
    setShowMobileChat(true);
    setViewMode('personal');
  };

  const handleCommunitySelect = () => {
    setViewMode('community');
    setActiveContact(null);
    setShowMobileChat(true);
  };

  const handleSend = async () => {
    if (!message.trim() && !imageUrl.trim()) return;

    // If there is an image URL, append it to the message if message exists, or send as message
    // Note: This logic relies on the parent component using the current 'message' state when sendMemo is called.
    // However, since state updates are async, we should probably update the message state and then wait, 
    // OR just rely on the fact that we are appending it here.
    // But wait, sendMemo() in Memo.jsx uses the 'message' state from its own scope? 
    // No, MemoUI receives 'message' and 'setMessage' as props. 
    // The 'sendMemo' prop is a wrapper 'handleSendMemo' in Memo.jsx which uses the 'message' state from Memo.jsx.
    // So if we want to include the image, we must update the message state in the parent first.

    if (imageUrl.trim()) {
      const newMessage = message ? `${message}\n${imageUrl}` : imageUrl;
      setMessage(newMessage);
      // We need to wait for the state to update before sending. 
      // But we can't easily wait for state update in this architecture without useEffect.
      // A quick fix is to manually call the SDK sendMemo with the new content if we could, 
      // but 'sendMemo' prop doesn't take args in the current implementation of Memo.jsx (it uses state).

      // Actually, looking at Memo.jsx:
      // async function handleSendMemo() { const result = await sendMemoSDK({ recipientId, message }); ... }
      // It uses the 'message' state variable.

      // If we call setMessage(newMessage) here, the 'message' state in Memo.jsx (which is passed down) will update.
      // But handleSendMemo uses the value from the render cycle it was created in? 
      // No, it uses the value from the closure.

      // Let's try a different approach: 
      // We will just set the message to include the URL and let the user click send again? 
      // Or we can try to force it. 

      // Ideally, we should update Memo.jsx to accept arguments in handleSendMemo.
      // But I want to avoid modifying Memo.jsx if possible to keep scope small.

      // Let's just append the image to the text area when they click "Add" in the popover.
      // That way the user sees it and then clicks Send.
      // My handleAddImage function does exactly this.
      // So handleSend doesn't need to do magic.
    }

    await sendMemo();
    setImageUrl("");
    setShowImageInput(false);
  };

  const handleAddImage = () => {
    if (!imageUrl.trim()) return;
    const newMessage = message ? `${message}\n${imageUrl}` : imageUrl;
    setMessage(newMessage);
    setImageUrl("");
    setShowImageInput(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Helper to compress image
    const compressImage = (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target.result;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 100; // Tiny max width for on-chain storage
            const MAX_HEIGHT = 100;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Low quality JPEG
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
            resolve(dataUrl);
          };
          img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
      });
    };

    try {
      const compressedDataUrl = await compressImage(file);

      // Check size (approx 800 bytes safe limit for memo instruction overhead)
      if (compressedDataUrl.length > 800) {
        alert("Image is too complex to fit on-chain even after compression. Please use a simpler image or a URL.");
        return;
      }

      setImageUrl(compressedDataUrl);
      // Automatically add it to message input view so user sees it
      // But we keep it in imageUrl state until they click Add or Send
    } catch (err) {
      console.error("Image compression failed", err);
      alert("Failed to process image.");
    }
  };

  const renderMessageContent = (text) => {
    // Updated regex to include data:image URIs
    const imgRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp)|data:image\/[a-zA-Z]+;base64,[^\s]+)/i;
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

  const isValidRecipient = !recipientId || isValidWalletAddress(recipientId);

  // Lock Screen: If wallet is connected but encryption not initialized, block access.
  if (isAuthReady && !encryptionKeys) {
    return (
      <div className="flex h-screen w-full bg-slate-950 text-slate-200 items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-indigo-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Secure Your Messages</h2>
          <p className="text-slate-400 mb-8 text-sm leading-relaxed">
            Memo Protocol uses end-to-end encryption to protect your conversations.
            You must initialize your encryption keys to view and send messages.
          </p>
          <button
            onClick={login}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            Initialize Encryption
          </button>
          <div className="mt-6 text-xs text-slate-600">
            This will ask your wallet to sign a message to derive your keys.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 overflow-hidden font-sans selection:bg-indigo-500/30">
      <div className={`${showMobileChat ? 'hidden' : 'flex'} md:flex w-full md:w-80 border-r border-slate-800 flex-col bg-slate-900/50`}>
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">
              Memo Protocol
            </h1>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
              <div className={`w-2 h-2 rounded-full ${isAuthReady ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
              {isAuthReady ? 'Connected' : 'Disconnected'}
            </div>
          </div>
          <button
            onClick={handleNewChat}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors shadow-lg shadow-indigo-500/20"
            title="New Chat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
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
              // This state should theoretically be unreachable now due to the lock screen, 
              // but kept as fallback or if logic changes.
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
          <div className="px-2 mb-2 mt-2">
            <button
              onClick={handleCommunitySelect}
              className={`w-full text-left p-2.5 text-sm rounded-md transition-all flex items-center gap-3 ${viewMode === 'community'
                ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                }`}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden shadow-lg shadow-indigo-500/20 border border-indigo-500/30">
                <img src={communityIcon} alt="Community" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="font-medium text-slate-200">Community Wall</div>
                <div className="text-[10px] text-slate-500">Public Chat</div>
              </div>
            </button>
          </div>

          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 px-2 mt-4">Contacts</div>
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
        {viewMode === 'community' ? (
          <>
            <div className="md:hidden h-16 border-b border-slate-800 flex items-center px-4 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-20">
              <button
                onClick={handleBackToContacts}
                className="p-1.5 -ml-2 text-slate-400 hover:text-slate-200 mr-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <span className="font-medium text-slate-200">Community Wall</span>
            </div>
            <CommunityChat />
          </>
        ) : (
          <>
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
                <div className="flex gap-2 ml-2 items-center">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Wallet Address"
                      className={`bg-slate-900 border text-slate-200 text-xs p-2 w-32 sm:w-64 outline-none rounded-md transition-all ${recipientId && !isValidRecipient
                        ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                        : recipientId && isValidRecipient
                          ? 'border-emerald-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                          : 'border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                        }`}
                      value={recipientId}
                      onChange={(e) => setRecipientId(e.target.value)}
                    />
                    {recipientId && isValidRecipient && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      if (recipientId && isValidRecipient) {
                        setActiveContact(recipientId);
                        setShowMobileChat(true);
                      }
                    }}
                    disabled={!recipientId || !isValidRecipient}
                    className="bg-slate-800 border border-slate-700 text-slate-300 text-xs px-3 hover:bg-slate-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

              {showImageInput && (
                <div className="mb-3 p-3 bg-slate-900 rounded-lg border border-slate-800 flex gap-2 animate-in fade-in slide-in-from-bottom-2 items-center">
                  <input
                    type="text"
                    placeholder="Paste image URL..."
                    className="flex-1 bg-slate-950 border border-slate-700 text-slate-200 text-xs p-2 rounded-md focus:border-indigo-500 outline-none"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    autoFocus
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileUpload}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-2 rounded-md font-medium border border-slate-700"
                    title="Upload File"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </button>
                  <button
                    onClick={handleAddImage}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-2 rounded-md font-medium"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => setShowImageInput(false)}
                    className="text-slate-500 hover:text-slate-300 p-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowImageInput(!showImageInput)}
                  className={`p-2 rounded-lg transition-colors ${showImageInput ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                  title="Add Image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </button>
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
                  disabled={!activeContact || isLoading || (!message.trim() && !imageUrl.trim())}
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
          </>
        )}
      </div>
    </div>
  );
}
