/**
 * Voyage-Ed Finance Calculations
 * ────────────────────────────────────────────────────────────
 * Single source of truth for money math. Consumed by:
 *   - packages/web  (React CRA — existing)
 *   - packages/mobile  (Expo — coming Phase 3)
 *   - backend/  (Node — validation on the server)
 *
 * IMPORTANT: These functions produce IDENTICAL results to the V1
 * calculations in frontend/src/App.js. Do NOT change the math without
 * running the entire test suite (packages/shared/tests/finance.test.js).
 *
 * See docs/DECISIONS.md ADR-014 for the profit-drill-down design that
 * this file's `dealFinanceBreakdown()` will support in Phase 6.
 */

/* ─── Primitives ─────────────────────────────────────────── */

/** Safe number coercion. Same as V1 `n()`. */
export const num = (v) => Number(v) || 0;

/** Sum a numeric key across an array. Handles null/undefined. */
export const sum = (arr, key) =>
  (arr || []).reduce((s, item) => s + (Number(item[key]) || 0), 0);

/** Convert amount to INR using currency + exchange rate. */
export const toINR = (amount, currency, rate) =>
  currency === 'INR' ? num(amount) : num(amount) * num(rate);

/** Format INR with rupee symbol and Indian comma grouping. */
export const fmtINR = (val) =>
  '₹' + Math.round(num(val)).toLocaleString('en-IN');

/* ─── Booked tier resolution ─────────────────────────────── */

/**
 * When a client books a specific star-tier package (Standard / Deluxe /
 * Premium / Luxury), that tier's total price becomes the deal's selling
 * price, regardless of what individual vendor sell prices add up to.
 * The tier system supports "we quoted 4 options, client booked the deluxe".
 */
export const bookedTierOf = (deal) => {
  if (!deal || !deal.useTiers || !Array.isArray(deal.tiers)) return null;
  const t = deal.tiers.find((x) => x && x.booked && Number(x.totalPrice) > 0);
  return t || null;
};

/**
 * Returns tier selling price in INR if a tier is booked, null otherwise.
 * Callers should use this to override the sum-of-vendor-sells.
 */
export const tierSellINR = (deal) => {
  const t = bookedTierOf(deal);
  const price = t ? Number(t.totalPrice) || 0 : 0;
  return t && price > 0 ? price : null;
};

/* ─── Vendor extraction ──────────────────────────────────── */

/**
 * V1 travel component arrays. V2 will add: cruiseVendors, transferVendors,
 * cabVendors, attractionVendors, insuranceVendors, forexVendors,
 * simVendors, extraVendors (see ADR-015).
 *
 * This constant is the single source of truth for "what vendors count
 * toward totals". Adding a new component = add to this list = it flows
 * everywhere automatically.
 */
export const VENDOR_ARRAYS = [
  'hotelVendors',
  'flightVendors',
  'trainVendors',
  'landVendors',   // Deprecated in V2 (splits into transfer/cab). Kept during migration.
  'visaVendors',
  // 'activityVendors',  // enable when migrating to cruises + attractions
  // V2 additions (uncomment as sections come online):
  // 'cruiseVendors',
  // 'transferVendors',
  // 'cabVendors',
  // 'attractionVendors',
  // 'insuranceVendors',
  // 'forexVendors',
  // 'simVendors',
  // 'extraVendors',
];

/** Flatten all vendors from a deal into a single array for totals. */
export const allVendors = (deal) => {
  if (!deal) return [];
  return VENDOR_ARRAYS.reduce((acc, key) => acc.concat(deal[key] || []), []);
};

/* ─── Cancellation math ──────────────────────────────────── */

/**
 * Compute the financial outcome of a single cancellation record.
 * Kept identical to V1 `cancelCompute()` for compatibility.
 */
export const cancelCompute = (cxl, deal) => {
  if (!cxl) return { refund: 0, penalty: 0, profit: 0, cancelledCompOrigProfit: 0 };
  const refund = num(cxl.refundToClient);
  const penalty = num(cxl.penaltyToClient);
  const vendorLoss = num(cxl.vendorCancellationLoss);
  const myProfit = num(cxl.myProfitOnCancellation);
  return {
    refund,
    penalty,
    profit: penalty + myProfit - vendorLoss,
    cancelledCompOrigProfit: num(cxl.originalCompProfit),
  };
};

/* ─── Deal finance rollup (THE core calculation) ─────────── */

/**
 * The one function that computes every money number for a deal.
 * Used by dashboard KPIs, deal detail finance ribbon, reports.
 *
 * Behaviour is byte-identical to V1 App.js dealFinance().
 *
 * @param {Object} deal - the deal object from MongoDB
 * @returns {Object} numbers for display
 */
export const dealFinance = (deal) => {
  const V = allVendors(deal);

  // Vendor-level rollup
  const vendorSell = V.reduce((s, v) => s + toINR(v.sellingPrice, v.currency, v.exchangeRate), 0);
  const ts = tierSellINR(deal);
  const sell = ts != null ? ts : vendorSell;
  const cost = V.reduce((s, v) => s + toINR(v.costPrice, v.currency, v.exchangeRate), 0);
  const vendorPaid = V.reduce((s, v) => s + sum(v.payments || [], 'amount'), 0);

  // Client refunds already issued
  const refunded = sum(deal.refunds || [], 'amount');

  // Cancellations that reached a confirmed state
  const cxlConfirmed = (deal.cancellations || []).filter((c) =>
    ['Refund Approved', 'Refund Processed', 'No Refund Due', 'Closed'].includes(c.status)
  );
  const cxlResults = cxlConfirmed.map((c) => cancelCompute(c, deal));
  const cxlRefundDue = cxlResults.reduce((s, r) => s + r.refund, 0);
  const cxlPenalty = cxlResults.reduce((s, r) => s + r.penalty, 0);
  const cxlProfit = cxlResults.reduce((s, r) => s + r.profit, 0);
  const cxlOrigProfit = cxlResults.reduce((s, r) => s + r.cancelledCompOrigProfit, 0);

  // Client receipts
  const clientRec = sum(deal.clientPayments || [], 'amount');

  // Derived
  const netSell = sell - refunded;
  const forfeit = num(deal.forfeitAmount);      // Absorbed loss — hits GPM only
  const gpm = netSell - cost - forfeit;
  const bal = netSell - clientRec;

  return {
    // Top-line
    sell,
    netSell,
    cost,
    refunded,
    gpm,
    forfeit,

    // Vendor side
    vendorPaid,
    vendorDue: Math.max(0, cost - vendorPaid),

    // Client side
    clientRec,
    clientDue: Math.max(0, bal),         // still to COLLECT from client
    clientAdvance: Math.max(0, -bal),    // client overpaid — refundable

    // Cancellation summary
    cxlRefundDue,
    cxlPenalty,
    cxlProfit,
    cxlOrigProfit,
    hasCxl: cxlConfirmed.length > 0,

    // After-cancellation actuals (same as current values — see V1 comment)
    revisedProfit: gpm,
    afterSell: netSell,
    afterCost: cost,
  };
};

/* ─── Sibling deals (multi-destination enquiries) ────────── */

export const enquiryIdOf = (deal) => (deal && (deal.enquiryId || deal._localId)) || '';

/** All packages that belong to the same enquiry (Dubai + Bali + Singapore). */
export const siblingsOf = (deal, all) => {
  const eid = enquiryIdOf(deal);
  if (!eid) return deal ? [deal] : [];
  return (all || []).filter((x) => enquiryIdOf(x) === eid);
};

/* ─── Deal number generation (VE-YYMM-XXXX) ──────────────── */

/**
 * Generate a client-friendly deal number like VE-2608-K7QA.
 *   - Prefix: 'VE' (Voyage-Ed brand)
 *   - Year+Month: 2608 (August 2026)
 *   - Random 4-char alphanumeric (no ambiguous chars 0/O/I/1)
 *
 * NOTE: Real uniqueness enforcement is on the backend using a Mongo
 * counter (see backend/models). This is the client-side generator used
 * when a lead is created offline and backend hasn't assigned one yet.
 */
export const generateDealNumber = (date = new Date()) => {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
  let rand = '';
  for (let i = 0; i < 4; i++) rand += chars[Math.floor(Math.random() * chars.length)];
  return `VE-${yy}${mm}-${rand}`;
};

/* ─── Public API ─────────────────────────────────────────── */

export default {
  num,
  sum,
  toINR,
  fmtINR,
  bookedTierOf,
  tierSellINR,
  VENDOR_ARRAYS,
  allVendors,
  cancelCompute,
  dealFinance,
  enquiryIdOf,
  siblingsOf,
  generateDealNumber,
};
