/**
 * Voyage-Ed V2 App Shell (JavaScript)
 * ────────────────────────────────────────────────────────────
 * Standalone sidebar navigation. Does NOT modify App.js.
 *
 * How it works:
 *   1. Mounts a fixed left sidebar into document.body
 *   2. Nav clicks trigger clicks on existing App.js buttons via
 *      querySelector — the buttons that already exist in the top
 *      bar (Dashboard, Accounts, Reports, etc)
 *   3. Reads current screen state by watching DOM mutations
 *
 * Toggle:
 *   localStorage.setItem('voyage:layout', 'v2') // ON (default now)
 *   localStorage.setItem('voyage:layout', 'v1') // OFF (rollback)
 *
 * Or click the floating pill bottom-right to toggle.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: '◆', match: /dashboard|home/i },
    ],
  },
  {
    title: 'Sales',
    items: [
      { key: 'leads', label: 'Leads', icon: '◐', match: /lead|enquir/i },
      { key: 'deals', label: 'Deals', icon: '◈', match: /deal/i },
      { key: 'clients', label: 'Clients', icon: '◑', match: /client/i },
      { key: 'proposals', label: 'Proposals', icon: '◒', match: /proposal|quote|quotation/i },
    ],
  },
  {
    title: 'Operations',
    items: [
      { key: 'vendors', label: 'Vendors', icon: '◇', match: /vendor|supplier/i },
      { key: 'visa', label: 'Visa Filings', icon: '◊', match: /visa/i },
      { key: 'tasks', label: 'Tasks', icon: '●', match: /task/i },
    ],
  },
  {
    title: 'Finance',
    items: [
      { key: 'accounts', label: 'Accounts', icon: '◆', match: /account|ledger/i },
      { key: 'reports', label: 'Reports', icon: '◕', match: /report|analytic/i },
    ],
  },
];

/**
 * The sidebar component.
 */
function Sidebar() {
  const [activeKey, setActiveKey] = useState('dashboard');

  const detectActiveScreen = useCallback(() => {
    // When V2 Pages overlay is on, the sidebar's active state is driven by
    // handleNavClick + the 'voyage:nav' events, not by reading V1's DOM
    // (which sits hidden underneath the overlay).
    if (localStorage.getItem('voyage:v2pages') === 'on') return;

    // Look at document title / URL / visible h1 to guess screen
    const h1 = document.querySelector('h1');
    const h1Text = h1 ? h1.textContent : '';
    const bodyText = document.body.innerText.slice(0, 500);

    for (const section of NAV_SECTIONS) {
      for (const item of section.items) {
        if (item.match.test(h1Text)) {
          setActiveKey(item.key);
          return;
        }
      }
    }
    // Fallback: if a "New Deal" button or deal detail visible → deals
    if (/vendor cost|selling price|deal number/i.test(bodyText)) {
      setActiveKey('deals');
      return;
    }
    if (/accounts|ledger|cash location/i.test(bodyText)) {
      setActiveKey('accounts');
      return;
    }
    if (/reports|export|analytics/i.test(bodyText)) {
      setActiveKey('reports');
      return;
    }
    setActiveKey('dashboard');
  }, []);

  useEffect(() => {
    // Detect on mount + whenever DOM changes materially
    detectActiveScreen();
    const observer = new MutationObserver(() => {
      detectActiveScreen();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: false,
    });
    return () => observer.disconnect();
  }, [detectActiveScreen]);

  /**
   * Click a nav item — find matching button in the existing App.js
   * top bar and trigger it.
   */
  const handleNavClick = useCallback((key) => {
    setActiveKey(key);

    // When V2 Pages overlay is active, route within it via a custom event
    // instead of hunting for V1 DOM buttons hidden underneath the overlay.
    const v2PagesOn = localStorage.getItem('voyage:v2pages') === 'on';
    if (v2PagesOn) {
      const v2Routable = { dashboard: 'dashboard', leads: 'leads', deals: 'deals' };
      if (v2Routable[key]) {
        // Primary path: direct imperative call, no event/listener race possible.
        if (typeof window.__voyagePagesNav === 'function') {
          window.__voyagePagesNav(v2Routable[key]);
        } else {
          // Fallback in case V2Pages hasn't attached __voyagePagesNav yet.
          window.dispatchEvent(new CustomEvent('voyage:nav', { detail: { key: v2Routable[key] } }));
        }
        return;
      }
      // Sections not yet built in V2 pages
      const comingSoon = {
        clients: 'Clients — coming to V2 Pages soon',
        proposals: 'Proposals — coming to V2 Pages soon',
        vendors: 'Vendors master — coming to V2 Pages soon',
        visa: 'Visa filings — coming to V2 Pages soon',
        tasks: 'Tasks — coming to V2 Pages soon',
        accounts: 'Accounts — turn off V2 Pages to use V1 Accounts for now',
        reports: 'Reports — turn off V2 Pages to use V1 Reports for now',
      };
      window.veToast && window.veToast(comingSoon[key] || 'Coming soon', 'info');
      return;
    }

    const clickMap = {
      dashboard: () => {
        // Look for "← Dashboard" or "← Back to Dashboard" button
        const buttons = Array.from(document.querySelectorAll('button'));
        const dashBtn = buttons.find((b) => /dashboard/i.test(b.textContent || ''));
        if (dashBtn) dashBtn.click();
      },
      accounts: () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find((b) => /accounts/i.test(b.textContent || '') && !/back to/i.test(b.textContent || ''));
        if (btn) btn.click();
      },
      reports: () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find((b) => /reports/i.test(b.textContent || ''));
        if (btn) btn.click();
      },
      deals: () => {
        // Dashboard has all deals visible; navigate there
        const buttons = Array.from(document.querySelectorAll('button'));
        const dashBtn = buttons.find((b) => /dashboard/i.test(b.textContent || ''));
        if (dashBtn) dashBtn.click();
        // Scroll to deals section after brief delay
        setTimeout(() => {
          const el = Array.from(document.querySelectorAll('h1,h2,h3,h4')).find((n) =>
            /deals|leads|enquir/i.test(n.textContent || '')
          );
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
      },
      leads: () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const dashBtn = buttons.find((b) => /dashboard/i.test(b.textContent || ''));
        if (dashBtn) dashBtn.click();
        setTimeout(() => {
          const el = Array.from(document.querySelectorAll('h1,h2,h3,h4')).find((n) =>
            /leads|enquir/i.test(n.textContent || '')
          );
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
      },
      // Others fall back to dashboard for now (features not built)
      clients: () => window.veToast && window.veToast('Clients section — coming in V2 Phase 4', 'info'),
      proposals: () => window.veToast && window.veToast('Proposals — coming in V2 Phase 5', 'info'),
      vendors: () => window.veToast && window.veToast('Vendors master — coming in V2 Phase 3', 'info'),
      visa: () => window.veToast && window.veToast('Visa filings — coming in V2 Phase 5', 'info'),
      tasks: () => window.veToast && window.veToast('Tasks — coming in V2 Phase 4', 'info'),
    };

    const action = clickMap[key];
    if (action) action();
  }, []);

  return (
    <aside className="v-sidebar" role="navigation" aria-label="Main navigation">
      <div className="v-sb-brand">
        <div className="v-sb-brand-mark">V</div>
        <div className="v-sb-brand-text">
          <div className="v-sb-brand-name">Voyage-Ed</div>
          <div className="v-sb-brand-sub">Travels</div>
        </div>
      </div>

      {NAV_SECTIONS.map((section) => (
        <React.Fragment key={section.title}>
          <div className="v-sb-section">{section.title}</div>
          <div className="v-sb-nav">
            {section.items.map((item) => (
              <button
                key={item.key}
                className={`v-sb-item ${activeKey === item.key ? 'active' : ''}`}
                onClick={() => handleNavClick(item.key)}
                type="button"
              >
                <span className="v-sb-item-icon">{item.icon}</span>
                <span className="v-sb-item-label">{item.label}</span>
                {item.badge && <span className="v-sb-item-badge">{item.badge}</span>}
              </button>
            ))}
          </div>
        </React.Fragment>
      ))}

      <div className="v-sb-user">
        <div className="v-sb-user-avatar">V</div>
        <div className="v-sb-user-text">
          <div className="v-sb-user-name">Vishal Sharma</div>
          <div className="v-sb-user-role">Founder</div>
        </div>
      </div>
    </aside>
  );
}

/**
 * Layout toggle pill — click to switch between V1 (no sidebar) and V2.
 */
function LayoutToggle({ active, onToggle }) {
  return (
    <button
      className="v-layout-toggle"
      onClick={onToggle}
      type="button"
      title={active ? 'Switch to V1 layout (no sidebar)' : 'Switch to V2 layout (with sidebar)'}
    >
      {active ? '◐ V2 Layout ON' : '◑ V2 Layout OFF'}
    </button>
  );
}

/**
 * Mount / unmount the shell based on localStorage flag.
 * Exported for index.js to call.
 */
export function initVoyageShell() {
  const container = document.createElement('div');
  container.id = 'voyage-shell-root';
  document.body.appendChild(container);

  const toggleContainer = document.createElement('div');
  toggleContainer.id = 'voyage-shell-toggle';
  document.body.appendChild(toggleContainer);

  const sidebarRoot = createRoot(container);
  const toggleRoot = createRoot(toggleContainer);

  function render() {
    const flag = localStorage.getItem('voyage:layout');
    const isV2 = flag !== 'v1'; // Default to V2 when no flag set

    if (isV2) {
      document.body.classList.add('v-has-sidebar');
      sidebarRoot.render(<Sidebar />);
    } else {
      document.body.classList.remove('v-has-sidebar');
      sidebarRoot.render(<React.Fragment />);
    }

    toggleRoot.render(
      <LayoutToggle
        active={isV2}
        onToggle={() => {
          localStorage.setItem('voyage:layout', isV2 ? 'v1' : 'v2');
          render();
        }}
      />
    );
  }

  render();

  // Watch for localStorage changes from other tabs
  window.addEventListener('storage', (e) => {
    if (e.key === 'voyage:layout') render();
  });
}
