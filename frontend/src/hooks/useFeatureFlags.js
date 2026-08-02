// frontend/src/hooks/useFeatureFlags.js
// ────────────────────────────────────────────────────────────────
// React hook and helper for feature flags. Everything V2 gates
// through this. See docs/DECISIONS.md ADR-005.
//
// Usage:
//   import { useFeatureFlag } from '../hooks/useFeatureFlags';
//   const showNewDashboard = useFeatureFlag('newDashboard');
//   return showNewDashboard ? <NewDashboard/> : <OldDashboard/>;
//
// Fetches flags on mount, caches in memory. Falls back to `false` for
// every flag on any error — so a broken flags endpoint never breaks the
// app (users just see V1 behaviour).

import { useEffect, useState } from 'react';

const API_BASE =
  process.env.REACT_APP_API_URL || 'https://voyage-crm.onrender.com';

// Module-level cache. All hooks share one fetch.
let cachedFlags = null;
let fetchPromise = null;
const listeners = new Set();

const notifyListeners = () => {
  listeners.forEach((cb) => cb(cachedFlags || {}));
};

const fetchFlags = async () => {
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        cachedFlags = {};
        return cachedFlags;
      }
      const res = await fetch(`${API_BASE}/api/flags`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        cachedFlags = {};
        return cachedFlags;
      }
      const data = await res.json();
      cachedFlags = data.flags || {};
      return cachedFlags;
    } catch {
      // Fail safe: return empty flags map (everything falls back to V1)
      cachedFlags = {};
      return cachedFlags;
    } finally {
      notifyListeners();
      fetchPromise = null;
    }
  })();

  return fetchPromise;
};

/**
 * React hook — returns the value of a single feature flag.
 * Returns `false` while flags are still loading (V1 behaviour shows).
 */
export const useFeatureFlag = (flagName) => {
  const [flags, setFlags] = useState(cachedFlags || {});

  useEffect(() => {
    listeners.add(setFlags);
    if (!cachedFlags) fetchFlags();
    return () => {
      listeners.delete(setFlags);
    };
  }, []);

  return Boolean(flags[flagName]);
};

/**
 * React hook — returns the whole flags map. Use when a component
 * cares about multiple flags at once.
 */
export const useFeatureFlags = () => {
  const [flags, setFlags] = useState(cachedFlags || {});

  useEffect(() => {
    listeners.add(setFlags);
    if (!cachedFlags) fetchFlags();
    return () => {
      listeners.delete(setFlags);
    };
  }, []);

  return flags;
};

/**
 * Non-React helper — synchronously read a flag (returns false until
 * fetched). Useful outside React tree (e.g. plain utility modules).
 */
export const isFeatureEnabled = (flagName) => {
  return Boolean(cachedFlags && cachedFlags[flagName]);
};

/**
 * Force a re-fetch. Called from admin toggle UI after changing a flag.
 */
export const refreshFeatureFlags = () => {
  cachedFlags = null;
  fetchPromise = null;
  return fetchFlags();
};

/**
 * Admin only — toggle a flag on the backend and re-fetch.
 * Returns updated flag map.
 */
export const toggleFeatureFlag = async (flagName, enabled) => {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/api/flags/${flagName}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error(`Toggle failed: ${res.statusText}`);
  return refreshFeatureFlags();
};

export default useFeatureFlag;
