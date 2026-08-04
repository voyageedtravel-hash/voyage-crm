import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './voyage-shell.css';
import App from './App';
import { initVoyageShell } from './voyage-shell';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Mount V2 sidebar shell (feature-flagged via localStorage)
if (typeof window !== 'undefined') {
  setTimeout(() => {
    try { initVoyageShell(); } catch (e) { console.warn('[shell] init failed:', e); }
  }, 100);
}

reportWebVitals();
