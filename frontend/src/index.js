import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './voyage-shell.css';
import './v2/voyage-v2-pages.css';
import App from './App';
import V2Pages from './v2/V2Pages';
import { initVoyageShell } from './voyage-shell';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/**
 * Mount the V2 sidebar + optional V2 pages overlay.
 *
 * Feature flags:
 *   localStorage 'voyage:layout' = 'v2' (default) → sidebar visible
 *   localStorage 'voyage:layout' = 'v1' → sidebar hidden
 *   localStorage 'voyage:v2pages' = 'on' → V2 pages replace V1 UI
 *   localStorage 'voyage:v2pages' = 'off' (default) → V1 UI visible
 *
 * The V2 pages overlay mounts on top of V1 with position:fixed.
 * When 'off', V1 shows through normally.
 */
if (typeof window !== 'undefined') {
  setTimeout(() => {
    try { initVoyageShell(); } catch (e) { console.warn('[shell] init failed:', e); }
    try { initVoyagePages(); } catch (e) { console.warn('[v2pages] init failed:', e); }
  }, 100);
}

function initVoyagePages() {
  // Only mount if logged in (token exists) — else V1 login screen shows
  const isV2Pages = () => localStorage.getItem('voyage:v2pages') === 'on';

  const container = document.createElement('div');
  container.id = 'voyage-v2pages-root';
  container.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:50;overflow:auto;background:#f4f6fb;display:none';
  document.body.appendChild(container);

  const pagesRoot = ReactDOM.createRoot(container);

  const togglePages = document.createElement('button');
  togglePages.textContent = isV2Pages() ? '◈ V2 Pages ON' : '◇ V2 Pages OFF';
  togglePages.style.cssText = 'position:fixed;bottom:20px;right:180px;background:#c9a84c;color:#0d1b3e;border:none;border-radius:999px;padding:10px 18px;font-size:11px;font-weight:700;letter-spacing:1px;cursor:pointer;z-index:200;box-shadow:0 8px 24px rgba(15,35,80,.25);font-family:Inter,sans-serif;text-transform:uppercase';
  togglePages.onclick = () => {
    const on = isV2Pages();
    localStorage.setItem('voyage:v2pages', on ? 'off' : 'on');
    // Force a full reload on every toggle, not just a re-render.
    //
    // V2 Pages is an overlay mounted on top of V1's already-running React
    // app (V1 never unmounts — this container just shows/hides on top of
    // it). That meant switching V2 -> V1 left V1 showing whatever it had
    // in memory from when the page first loaded, completely ignoring any
    // changes just made in V2 (a payment recorded, a component added,
    // etc.) until the person happened to hit a manual browser refresh.
    // V1 and V2 read/write the SAME MongoDB data — the data itself was
    // never out of sync, only V1's in-memory snapshot of it was stale.
    //
    // A full reload is the simplest and safest fix without touching V1's
    // internal state management (a ~7000-line file) — it guarantees
    // whichever side loads next always fetches fresh from the server.
    // This is a deliberate stopgap for while both UIs are actively used
    // side by side; once V2 fully replaces V1 this toggle (and this
    // reload) goes away entirely.
    window.location.reload();
  };
  document.body.appendChild(togglePages);

  function render() {
    const on = isV2Pages();
    const hasToken = !!localStorage.getItem('token');

    if (on && hasToken) {
      container.style.display = 'block';
      container.style.paddingLeft = '240px'; // room for sidebar
      pagesRoot.render(<V2Pages />);
    } else {
      container.style.display = 'none';
      pagesRoot.render(<React.Fragment />);
    }
    togglePages.textContent = on ? '◈ V2 Pages ON' : '◇ V2 Pages OFF';
  }

  render();

  window.addEventListener('storage', (e) => {
    if (e.key === 'voyage:v2pages' || e.key === 'token') render();
  });

  // Re-render if user logs in
  const authCheckInterval = setInterval(() => {
    const shouldShow = isV2Pages() && !!localStorage.getItem('token');
    const isShowing = container.style.display === 'block';
    if (shouldShow !== isShowing) render();
  }, 1500);

  window.addEventListener('beforeunload', () => clearInterval(authCheckInterval));
}

reportWebVitals();
