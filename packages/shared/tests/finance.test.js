/**
 * Voyage-Ed Finance — Unit Tests
 * ────────────────────────────────────────────────────────────
 * These tests guard against silent breakage of financial math during
 * the V1 → V2 refactor. Every function that touches money must have
 * at least one test here.
 *
 * Run: pnpm --filter @voyage/shared test
 *
 * When a test fails during a refactor, DO NOT change the test to make
 * it pass. Fix the code until the number matches. If the math genuinely
 * needs to change (rare), update the test WITH a comment explaining why
 * and update CHANGELOG.md with a Breaking Change entry.
 */

import { describe, it, expect } from 'vitest';
import {
  num,
  sum,
  toINR,
  fmtINR,
  bookedTierOf,
  tierSellINR,
  allVendors,
  cancelCompute,
  dealFinance,
  siblingsOf,
  generateDealNumber,
} from '../src/logic/finance/index.js';

/* ─── Primitives ─────────────────────────────────────────── */

describe('num()', () => {
  it('coerces strings to numbers', () => {
    expect(num('42')).toBe(42);
    expect(num('3.14')).toBe(3.14);
  });
  it('returns 0 for garbage', () => {
    expect(num(null)).toBe(0);
    expect(num(undefined)).toBe(0);
    expect(num('abc')).toBe(0);
    expect(num({})).toBe(0);
    expect(num(NaN)).toBe(0);
  });
});

describe('sum()', () => {
  it('sums a numeric key across an array', () => {
    const payments = [{ amount: 100 }, { amount: 200 }, { amount: 50 }];
    expect(sum(payments, 'amount')).toBe(350);
  });
  it('handles empty and null arrays', () => {
    expect(sum([], 'amount')).toBe(0);
    expect(sum(null, 'amount')).toBe(0);
    expect(sum(undefined, 'amount')).toBe(0);
  });
  it('treats missing / non-numeric values as zero', () => {
    const rows = [{ amount: 100 }, { amount: 'foo' }, {}, { amount: null }];
    expect(sum(rows, 'amount')).toBe(100);
  });
});

describe('toINR()', () => {
  it('returns amount unchanged for INR', () => {
    expect(toINR(1000, 'INR', 86)).toBe(1000);
    expect(toINR(1000, 'INR', 999)).toBe(1000); // rate ignored for INR
  });
  it('multiplies foreign amount by exchange rate', () => {
    expect(toINR(100, 'USD', 86)).toBe(8600);
    expect(toINR(500, 'EUR', 92.5)).toBe(46250);
    expect(toINR(1000, 'AED', 23.4)).toBe(23400);
  });
  it('handles missing values safely', () => {
    expect(toINR(null, 'USD', 86)).toBe(0);
    expect(toINR(100, 'USD', null)).toBe(0);
  });
});

describe('fmtINR()', () => {
  it('formats with Indian comma grouping', () => {
    expect(fmtINR(100000)).toBe('₹1,00,000');
    expect(fmtINR(2500000)).toBe('₹25,00,000');
    expect(fmtINR(42600)).toBe('₹42,600');
  });
  it('rounds to nearest rupee', () => {
    expect(fmtINR(100.4)).toBe('₹100');
    expect(fmtINR(100.6)).toBe('₹101');
  });
});

/* ─── Booked tier ────────────────────────────────────────── */

describe('bookedTierOf()', () => {
  it('returns the booked tier when one exists', () => {
    const deal = {
      useTiers: true,
      tiers: [
        { id: 't1', label: 'Standard', totalPrice: 100000, booked: false },
        { id: 't2', label: 'Deluxe', totalPrice: 150000, booked: true },
        { id: 't3', label: 'Premium', totalPrice: 200000, booked: false },
      ],
    };
    expect(bookedTierOf(deal)).toEqual(expect.objectContaining({ id: 't2', label: 'Deluxe' }));
  });
  it('returns null when no tier is booked', () => {
    const deal = { useTiers: true, tiers: [{ id: 't1', totalPrice: 100000, booked: false }] };
    expect(bookedTierOf(deal)).toBeNull();
  });
  it('returns null when tiers are disabled', () => {
    const deal = { useTiers: false, tiers: [{ id: 't1', totalPrice: 100000, booked: true }] };
    expect(bookedTierOf(deal)).toBeNull();
  });
});

describe('tierSellINR()', () => {
  it('returns the booked tier price', () => {
    const deal = {
      useTiers: true,
      tiers: [{ id: 't2', totalPrice: 235000, booked: true }],
    };
    expect(tierSellINR(deal)).toBe(235000);
  });
  it('returns null when tier price is zero or missing', () => {
    const deal = { useTiers: true, tiers: [{ id: 't2', totalPrice: 0, booked: true }] };
    expect(tierSellINR(deal)).toBeNull();
  });
});

/* ─── Vendor extraction ──────────────────────────────────── */

describe('allVendors()', () => {
  it('flattens vendors across all component arrays', () => {
    const deal = {
      hotelVendors: [{ name: 'Radisson' }, { name: 'Marriott' }],
      flightVendors: [{ name: 'Vietnam Airlines' }],
      trainVendors: [],
      landVendors: [{ name: 'Local Cabs' }],
      visaVendors: [{ name: 'VFS' }],
    };
    expect(allVendors(deal)).toHaveLength(5);
  });
  it('handles a deal with no vendors', () => {
    expect(allVendors({})).toEqual([]);
    expect(allVendors(null)).toEqual([]);
  });
});

/* ─── Cancellation ───────────────────────────────────────── */

describe('cancelCompute()', () => {
  it('computes profit as penalty + myProfit − vendorLoss', () => {
    // Real Voyage-Ed scenario: Client cancels Bali trip 20 days before travel.
    // Charged ₹15k penalty, we agreed to refund ₹85k of the ₹1L collected.
    // Vendor cancellation loss ₹8k (non-refundable hotel deposit).
    // We keep ₹5k as our profit on cancellation admin work.
    const cxl = {
      refundToClient: 85000,
      penaltyToClient: 15000,
      vendorCancellationLoss: 8000,
      myProfitOnCancellation: 5000,
    };
    const result = cancelCompute(cxl, {});
    expect(result.refund).toBe(85000);
    expect(result.penalty).toBe(15000);
    expect(result.profit).toBe(12000); // 15000 + 5000 - 8000
  });
  it('handles missing cancellation record', () => {
    const result = cancelCompute(null, {});
    expect(result).toEqual({ refund: 0, penalty: 0, profit: 0, cancelledCompOrigProfit: 0 });
  });
});

/* ─── The big one: dealFinance ───────────────────────────── */

describe('dealFinance()', () => {
  it('computes finance for a real Vietnam booking (from mockup)', () => {
    // Kirti Malhotra · VE-2608-K7QA · 2 pax · 7N/8D Vietnam
    // Numbers taken from the deal-detail mockup so tests match visual reality.
    const deal = {
      hotelVendors: [
        {
          id: 'h1',
          name: 'Radisson Hotel Danang',
          currency: 'USD',
          exchangeRate: 86,
          costPrice: 635,
          sellingPrice: 800,
          payments: [{ id: 'p1', amount: 35500 }],
        },
        {
          id: 'h2',
          name: 'Radisson Blu Phu Quoc',
          currency: 'USD',
          exchangeRate: 86,
          costPrice: 847,
          sellingPrice: 1000,
          payments: [{ id: 'p2', amount: 32760 }],
        },
      ],
      flightVendors: [
        {
          id: 'f1',
          name: 'Vietnam Airlines (Trip Jack)',
          currency: 'INR',
          exchangeRate: 1,
          costPrice: 68400,
          sellingPrice: 74000,
          payments: [{ id: 'p3', amount: 68400 }],
        },
      ],
      visaVendors: [
        {
          id: 'v1',
          name: 'Vietnam e-Visa',
          currency: 'USD',
          exchangeRate: 86,
          costPrice: 100,
          sellingPrice: 110,
          payments: [{ id: 'p4', amount: 8800 }],
        },
      ],
      clientPayments: [
        { id: 'cp1', amount: 90000 },     // Booking deposit
        { id: 'cp2', amount: 100000 },    // Second instalment
      ],
      refunds: [],
      cancellations: [],
      forfeitAmount: 0,
    };

    const f = dealFinance(deal);
    // Sell = hotels (635+847)*86 + 800+1000)*86 + flight 74000 + visa 110*86
    //     Wait — sellingPrice for hotels are 800/1000 USD, so sell in INR is:
    //     hotels: (800 + 1000) * 86 = 154800
    //     flight: 74000
    //     visa:   110 * 86         = 9460
    //     total sell = 154800 + 74000 + 9460 = 238260
    expect(f.sell).toBe(154800 + 74000 + 9460);
    // Cost = hotels 127400 + flight 68400 + visa 8600 = 204400
    expect(f.cost).toBe((635 + 847) * 86 + 68400 + 100 * 86);
    // GPM = sell - cost (no forfeit, no refunds)
    expect(f.gpm).toBe(f.sell - f.cost);
    // Client received = 90000 + 100000 = 190000
    expect(f.clientRec).toBe(190000);
    // Client due = sell - received
    expect(f.clientDue).toBe(f.sell - 190000);
    // Vendor paid = 35500 + 32760 + 68400 + 8800 = 145460
    expect(f.vendorPaid).toBe(145460);
    // Vendor due = cost - vendorPaid
    expect(f.vendorDue).toBe(f.cost - f.vendorPaid);
    // No cancellations
    expect(f.hasCxl).toBe(false);
  });

  it('applies forfeitAmount as a GPM reduction only', () => {
    const deal = {
      hotelVendors: [
        {
          currency: 'INR',
          exchangeRate: 1,
          costPrice: 50000,
          sellingPrice: 70000,
          payments: [],
        },
      ],
      clientPayments: [{ amount: 70000 }], // Client paid full
      refunds: [],
      cancellations: [],
      forfeitAmount: 5000, // ₹5k absorbed loss (e.g. name change fee we ate)
    };
    const f = dealFinance(deal);
    expect(f.sell).toBe(70000);
    expect(f.cost).toBe(50000);
    expect(f.forfeit).toBe(5000);
    expect(f.gpm).toBe(15000); // 70000 - 50000 - 5000
    // Client is fully paid (forfeit doesn't affect what we collect)
    expect(f.clientDue).toBe(0);
  });

  it('applies tier price override when a tier is booked', () => {
    // 3 tiers quoted; client picks the deluxe at ₹1.5L. Vendors sum to
    // something different (e.g., ₹1.2L). The tier price wins.
    const deal = {
      useTiers: true,
      tiers: [
        { id: 't1', label: 'Standard', totalPrice: 100000, booked: false },
        { id: 't2', label: 'Deluxe', totalPrice: 150000, booked: true },
      ],
      hotelVendors: [
        { currency: 'INR', exchangeRate: 1, costPrice: 80000, sellingPrice: 120000, payments: [] },
      ],
      clientPayments: [{ amount: 50000 }],
      refunds: [],
      cancellations: [],
    };
    const f = dealFinance(deal);
    expect(f.sell).toBe(150000);       // Tier price used, not vendor sell
    expect(f.cost).toBe(80000);        // Cost stays as vendor cost
    expect(f.gpm).toBe(70000);         // 150000 - 80000
    expect(f.clientDue).toBe(100000);  // 150000 - 50000 client paid
  });

  it('subtracts refunds from netSell', () => {
    const deal = {
      hotelVendors: [
        { currency: 'INR', exchangeRate: 1, costPrice: 50000, sellingPrice: 80000, payments: [] },
      ],
      clientPayments: [{ amount: 80000 }],
      refunds: [{ amount: 20000 }],       // We refunded ₹20k to client
      cancellations: [],
    };
    const f = dealFinance(deal);
    expect(f.sell).toBe(80000);
    expect(f.netSell).toBe(60000);        // 80000 - 20000 refunded
    expect(f.gpm).toBe(10000);            // 60000 - 50000 cost
  });

  it('handles a deal with no vendors', () => {
    const f = dealFinance({});
    expect(f.sell).toBe(0);
    expect(f.cost).toBe(0);
    expect(f.gpm).toBe(0);
    expect(f.clientRec).toBe(0);
    expect(f.clientDue).toBe(0);
    expect(f.hasCxl).toBe(false);
  });
});

/* ─── Sibling deals ──────────────────────────────────────── */

describe('siblingsOf()', () => {
  it('groups packages by enquiryId', () => {
    const dubai = { _localId: 'a', enquiryId: 'e1', destination: 'Dubai' };
    const singapore = { _localId: 'b', enquiryId: 'e1', destination: 'Singapore' };
    const unrelated = { _localId: 'c', enquiryId: 'e2', destination: 'Bali' };
    const siblings = siblingsOf(dubai, [dubai, singapore, unrelated]);
    expect(siblings).toHaveLength(2);
    expect(siblings.map((d) => d.destination).sort()).toEqual(['Dubai', 'Singapore']);
  });
  it('falls back to _localId when no enquiryId', () => {
    const solo = { _localId: 'x', destination: 'Vietnam' };
    expect(siblingsOf(solo, [solo])).toHaveLength(1);
  });
});

/* ─── Deal number generator ──────────────────────────────── */

describe('generateDealNumber()', () => {
  it('produces VE-YYMM-XXXX format', () => {
    const dn = generateDealNumber(new Date(2026, 7, 2)); // August 2026 (month is 0-indexed)
    expect(dn).toMatch(/^VE-2608-[A-HJ-NP-Z2-9]{4}$/);
  });
  it('avoids ambiguous characters (0, O, 1, I)', () => {
    for (let i = 0; i < 100; i++) {
      const dn = generateDealNumber();
      const suffix = dn.slice(-4);
      expect(suffix).not.toMatch(/[01OI]/);
    }
  });
});
