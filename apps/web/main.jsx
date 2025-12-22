// Polyfills must be imported FIRST
import './src/polyfills.js';
import { logError } from './src/utils/logger';

// Global error handlers
window.onerror = (message, source, lineno, colno, error) => {
  logError(error || new Error(message), {
    type: 'uncaught-exception',
    source,
    lineno,
    colno
  });
};

window.onunhandledrejection = (event) => {
  logError(event.reason, { type: 'unhandled-rejection' });
};

import { createRoot } from 'react-dom/client';
import './index.css';
import App from './Memo.jsx';
import ErrorBoundary from './src/components/ErrorBoundary';

const root = createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
