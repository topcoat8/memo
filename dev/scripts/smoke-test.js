const { initializeApp } = require('firebase/app');
const { getAuth, signInAnonymously } = require('firebase/auth');
const { getFirestore, collection, addDoc, getDocs } = require('firebase/firestore');

(async function(){
  try {
    // Use the local default config similar to the front-end
    const firebaseConfig = {
      apiKey: "local",
      authDomain: "local",
      projectId: process.env.FIREBASE_EMULATOR_PROJECT || 'local-memo',
      storageBucket: "local",
      messagingSenderId: "local",
      appId: "local",
    };
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    // Connect to emulator endpoints
    const { connectAuthEmulator } = require('firebase/auth');
    const { connectFirestoreEmulator } = require('firebase/firestore');
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);

    await signInAnonymously(auth);
    const snap = await addDoc(collection(db, 'public_memos'), { senderId: 'smoke', recipientId: 'smoke', encryptedContent: 'x', createdAt: Date.now() });
    const docs = await getDocs(collection(db, 'public_memos'));
    console.log('Smoke test docs:', docs.size);
    process.exit(0);
  } catch (e) {
    console.error('Smoke test failed', e);
    process.exit(1);
  }
})();
