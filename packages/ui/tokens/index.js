/**
 * Voyage-Ed Design Tokens
 * ────────────────────────────────────────────────────────────────
 * Single source of truth for colors, spacing, typography, radius,
 * shadows, and motion. Used by web (React) and mobile (React Native).
 *
 * DO NOT hardcode any of these values elsewhere. Import from here.
 *
 * See docs/DECISIONS.md ADR-013 for platform-specific overrides.
 */

/* ─── COLORS ─────────────────────────────────────────────── */

export const colors = {
  // Brand
  navy: '#0d1b3e',
  navyLight: '#1a3060',
  navyHover: '#253a70',
  gold: '#c9a84c',
  goldDark: '#b78d38',
  goldLight: '#faf1dc',
  goldSoft: '#f5ead0',

  // Text
  textPrimary: '#0f2350',
  textSecondary: '#33446b',
  textMuted: '#6b7a99',
  textOnDark: '#ffffff',
  textOnDarkMuted: 'rgba(255, 255, 255, 0.75)',

  // Backgrounds
  bgPage: '#f9fafc',
  bgCard: '#ffffff',
  bgSubtle: '#f4f7fc',
  bgHover: '#eef2f9',

  // Borders
  border: '#e8ecf5',
  borderStrong: '#d4dcec',

  // Semantic states (also used for timeline colors per ADR-012)
  success: '#059669',
  successBg: '#ecfdf5',       // 🟢 Completed
  warning: '#c9942a',
  warningBg: '#fef8ec',       // 🟡 Pending / In Progress
  danger: '#dc2626',
  dangerBg: '#fef2f2',        // 🔴 Overdue / Failed
  info: '#3b82f6',
  infoBg: '#eff6ff',          // 🔵 Reminder / Scheduled
};

/* ─── SPACING ────────────────────────────────────────────── */

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,       // Default card padding (web)
  xl: 32,
  xxl: 48,      // Default section spacing (web)
  xxxl: 64,
};

/**
 * Mobile spacing scale — slightly larger for touch targets.
 * Cards get 20px padding (not 24) to fit more content.
 * Section spacing tightens to 24px so more fits on a small screen.
 */
export const mobileSpacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,       // Mobile card padding
  xl: 24,       // Mobile section spacing
  xxl: 32,
  xxxl: 48,
};

/* ─── BORDER RADIUS ──────────────────────────────────────── */

export const radius = {
  sm: 6,        // Small pills, chips
  md: 12,       // Inputs, buttons
  lg: 18,       // Cards (default)
  xl: 24,       // Modals, hero banners
  full: 999,    // Circles, avatars
};

/* ─── TYPOGRAPHY ─────────────────────────────────────────── */

export const typography = {
  fontFamily: {
    heading: '"Playfair Display", Georgia, serif',
    body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"JetBrains Mono", "SF Mono", Menlo, monospace',
  },
  fontSize: {
    xs: 10,     // Small labels, letter-spaced
    sm: 11,
    body: 13,
    md: 14,
    base: 15,   // Default body size
    lg: 18,
    xl: 22,
    xxl: 26,
    display: 32,
    hero: 42,
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    heavy: 900,
  },
  lineHeight: {
    tight: 1.2,
    heading: 1.3,
    body: 1.5,
    relaxed: 1.6,
  },
  letterSpacing: {
    label: 1.5,     // For uppercase small labels
    labelLg: 2,
    heading: -0.5,
    display: -1,
  },
};

/* ─── SHADOWS ────────────────────────────────────────────── */
/* Web-only. React Native uses shadowOffset/elevation via helper. */

export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(15, 35, 80, 0.05)',
  md: '0 4px 12px rgba(15, 35, 80, 0.06)',
  lg: '0 12px 32px rgba(15, 35, 80, 0.10)',
  xl: '0 24px 60px rgba(15, 35, 80, 0.20)',   // Modals
  goldGlow: '0 8px 24px rgba(201, 168, 76, 0.25)',
};

/**
 * React Native shadow helper — pass a level, get RN-safe shadow object.
 */
export const nativeShadow = (level = 'md') => {
  const map = {
    sm: { shadowColor: '#0f2350', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
    md: { shadowColor: '#0f2350', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
    lg: { shadowColor: '#0f2350', shadowOpacity: 0.10, shadowRadius: 32, shadowOffset: { width: 0, height: 12 }, elevation: 6 },
  };
  return map[level] || map.md;
};

/* ─── MOTION ─────────────────────────────────────────────── */

export const motion = {
  duration: {
    instant: 100,
    quick: 150,
    default: 250,
    slow: 400,
    entrance: 500,
  },
  easing: {
    default: 'cubic-bezier(0.4, 0.0, 0.2, 1)',      // Material standard
    entrance: 'cubic-bezier(0.0, 0.0, 0.2, 1)',     // Decelerate
    exit: 'cubic-bezier(0.4, 0.0, 1, 1)',           // Accelerate
    emphasized: 'cubic-bezier(0.2, 0.0, 0, 1)',     // Bouncy but restrained
  },
};

/* ─── TOUCH TARGETS (mobile) ─────────────────────────────── */

export const touchTarget = {
  min: 44,        // iOS HIG minimum
  comfortable: 48,   // Android Material comfortable
  large: 56,      // Primary CTAs
};

/* ─── Z-INDEX SCALE ──────────────────────────────────────── */

export const zIndex = {
  base: 1,
  dropdown: 100,
  stickyHeader: 200,           // Sticky finance bar (ADR-009)
  overlay: 500,
  modal: 1000,
  toast: 1500,
  floatingButton: 2000,        // Floating AI button (ADR-011)
};

/* ─── BREAKPOINTS (web-only) ─────────────────────────────── */

export const breakpoints = {
  mobile: 480,
  tablet: 768,
  laptop: 1024,
  desktop: 1280,
  wide: 1440,
};

/* ─── EXPORT DEFAULT ──────────────────────────────────────── */

export const tokens = {
  colors,
  spacing,
  mobileSpacing,
  radius,
  typography,
  shadows,
  nativeShadow,
  motion,
  touchTarget,
  zIndex,
  breakpoints,
};

export default tokens;
