// Polyfills that must run before any other client code
import { Buffer } from 'buffer';
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer;
}

// Provide a minimal process.env for libs that read it
if (typeof window !== 'undefined' && !window.process) {
  window.process = { env: {} };
}

// Prevent crashes from libs trying to access window.ethereum when it doesn't exist
if (typeof window !== 'undefined' && typeof window.ethereum === 'undefined') {
  window.ethereum = {};
}
