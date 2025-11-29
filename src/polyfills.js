// Polyfills that must run before any other client code
import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
  // Polyfill Buffer
  if (!window.Buffer) {
    window.Buffer = Buffer;
  }

  // Polyfill global
  if (!window.global) {
    window.global = window;
  }

  // Polyfill process
  if (!window.process) {
    window.process = { env: {} };
  }
}

// Prevent crashes from libs trying to access window.ethereum when it doesn't exist
if (typeof window !== 'undefined' && typeof window.ethereum === 'undefined') {
  window.ethereum = {};
}
