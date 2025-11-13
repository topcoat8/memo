/**
 * Memo Protocol - MemoProvider Component
 * 
 * React context provider for Memo Protocol SDK.
 * Manages Firebase initialization, authentication, and wallet integration.
 */

import React, { createContext, useContext, useMemo, useEffect, useState, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const MemoContext = createContext(null);

/**
 * MemoProvider component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.firebaseConfig - Firebase configuration object
 * @param {React.ReactNode} props.children - Child components
 */
export function MemoProvider({ firebaseConfig, children }) {
  const [appInitError, setAppInitError] = useState("");
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userId, setUserId] = useState("");
  const wallet = useWallet();

  // Check if we're in development mode (using emulators)
  const isDevelopment = useMemo(() => {
    return import.meta.env.DEV || 
           firebaseConfig?.authDomain?.includes('localhost') ||
           firebaseConfig?.projectId === 'demo-project';
  }, [firebaseConfig]);

  // Initialize Firebase app
  const firebaseApp = useMemo(() => {
    try {
      // For development with emulators, we can use minimal config
      if (isDevelopment) {
        // Use demo-project for emulators or require minimal config
        const emulatorConfig = {
          apiKey: firebaseConfig?.apiKey || 'demo-api-key',
          authDomain: firebaseConfig?.authDomain || 'localhost:9099',
          projectId: firebaseConfig?.projectId || 'demo-project',
          storageBucket: firebaseConfig?.storageBucket || 'demo-project.appspot.com',
          messagingSenderId: firebaseConfig?.messagingSenderId || '123456789',
          appId: firebaseConfig?.appId || '1:123456789:web:abcdef',
        };
        const app = initializeApp(emulatorConfig);
        return app;
      }
      
      // For production, require full config
      if (!firebaseConfig?.apiKey || !firebaseConfig?.projectId) {
        throw new Error(
          "Firebase configuration is incomplete. Please ensure apiKey and projectId are set. " +
          "For development, make sure Firebase emulators are running (npm run emulators)."
        );
      }
      
      const app = initializeApp(firebaseConfig);
      return app;
    } catch (err) {
      setAppInitError(err?.message || "Failed to initialize Firebase.");
      return null;
    }
  }, [firebaseConfig, isDevelopment]);

  // Track if emulators have been connected (to avoid reconnecting)
  const emulatorsConnected = useRef({ auth: false, firestore: false });

  // Initialize Firebase services (non-blocking)
  const auth = useMemo(() => {
    if (!firebaseApp) return null;
    const authInstance = getAuth(firebaseApp);
    
    // Connect to emulator in development mode (only once, non-blocking)
    if (isDevelopment && !emulatorsConnected.current.auth) {
      // Use setTimeout to avoid blocking the initial render
      setTimeout(() => {
        try {
          connectAuthEmulator(authInstance, 'http://localhost:9099', { disableWarnings: true });
          emulatorsConnected.current.auth = true;
        } catch (err) {
          // Emulator already connected or connection failed
          // This is expected if emulator was already connected
          if (!err.message?.includes('already been initialized')) {
            // Only log in dev mode, don't block
            if (import.meta.env.DEV) {
              console.warn('Auth emulator connection:', err.message);
            }
          }
          emulatorsConnected.current.auth = true; // Mark as attempted
        }
      }, 0);
    }
    
    return authInstance;
  }, [firebaseApp, isDevelopment]);

  const db = useMemo(() => {
    if (!firebaseApp) return null;
    const dbInstance = getFirestore(firebaseApp);
    
    // Connect to emulator in development mode (only once, non-blocking)
    if (isDevelopment && !emulatorsConnected.current.firestore) {
      // Use setTimeout to avoid blocking the initial render
      setTimeout(() => {
        try {
          connectFirestoreEmulator(dbInstance, 'localhost', 8080);
          emulatorsConnected.current.firestore = true;
        } catch (err) {
          // Emulator already connected or connection failed
          // This is expected if emulator was already connected
          if (!err.message?.includes('already been initialized')) {
            // Only log in dev mode, don't block
            if (import.meta.env.DEV) {
              console.warn('Firestore emulator connection:', err.message);
            }
          }
          emulatorsConnected.current.firestore = true; // Mark as attempted
        }
      }, 0);
    }
    
    return dbInstance;
  }, [firebaseApp, isDevelopment]);

  // Initialize anonymous authentication and user identity
  useEffect(() => {
    if (!auth) return;
    
    let isMounted = true;
    
    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;
      
      if (user) {
        // Prefer wallet public key as identity if connected, otherwise use Firebase UID
        if (wallet?.publicKey) {
          setUserId(wallet.publicKey.toString());
        } else {
          setUserId(user.uid);
        }
        setIsAuthReady(true);
      } else {
        // Try to sign in anonymously, but don't block the UI
        signInAnonymously(auth).catch((error) => {
          if (isMounted) {
            // Only set error if emulator connection fails after a delay
            // This allows the app to start even if emulators aren't ready yet
            console.warn('Anonymous auth failed (emulators may not be ready):', error.message);
            // Don't set error immediately - give emulators time to start
            setTimeout(() => {
              if (isMounted && !auth.currentUser) {
                setAppInitError("Authentication failed. Make sure Firebase emulators are running.");
              }
            }, 3000);
          }
        });
      }
    });
    
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [auth, wallet?.publicKey]);

  // Synchronize user identity with wallet connection state
  useEffect(() => {
    if (wallet?.publicKey) {
      setUserId(wallet.publicKey.toString());
      setIsAuthReady(true);
    } else if (auth?.currentUser) {
      setUserId(auth.currentUser.uid);
    }
  }, [wallet?.publicKey, auth]);

  const value = useMemo(() => ({
    db,
    auth,
    userId,
    isAuthReady,
    wallet,
    appInitError,
  }), [db, auth, userId, isAuthReady, wallet, appInitError]);

  return (
    <MemoContext.Provider value={value}>
      {children}
    </MemoContext.Provider>
  );
}

/**
 * Hook to access Memo context
 * 
 * @returns {Object} - Memo context value
 */
export function useMemoContext() {
  const context = useContext(MemoContext);
  if (!context) {
    throw new Error('useMemoContext must be used within a MemoProvider');
  }
  return context;
}

