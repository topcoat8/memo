// Polyfills that must run before any other client code
import { Buffer } from 'buffer';
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer;
}

// Provide a minimal process.env for libs that read it
if (typeof window !== 'undefined' && !window.process) {
  window.process = { env: {} };
}
