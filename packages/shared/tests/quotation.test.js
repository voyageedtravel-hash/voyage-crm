/**
 * Voyage-Ed Quotation — Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  QUOTATION_TIERS,
  COMMON_INCLUSIONS,
  COMMON_EXCLUSIONS,
  generateQuotationNumber,
  computeTierPricing,
  computeCombinedPricing,
  materialisePaymentSchedule,
  buildQuotationFromDeal,
  reviseQuotation,
} from '../src/logic/quotation/index.js';

/* ─── Constants ──────────────────────────────────────────── */

describe('QUOTATION_TIERS', () => {
  it('has 4 standard tiers in ascending order', () => {
    expect(QUOTATION_TIERS.length).toBe(4);
    expect(QUOTATION_TIERS[0].code).toBe('STANDARD');
    expect(QUOTATION_TIERS[3].code).toBe('LUXURY');
  });

  it('has hex colors matching Voyage-Ed brand', () => {
    const deluxe = QUOTATION_TIERS.find((t) => t.code === 'DELUXE');
    expect(deluxe.hexColor).toBe('#c9a84c'); // Gold
    const luxury = QUOTATION_TIERS.find((t) => t.code === 'LUXURY');
    expect(luxury.hexColor).toBe('#0d1b3e'); // Navy
  });

  it('has hotel star hints for client understanding', () => {
    expect(QUOTATION_TIERS[0].hotelStars).toBe('3-4');
    expect(QUOTATION_TIERS[3].hotelStars).toBe('5+');
  });
});

describe('COMMON_INCLUSIONS/EXCLUSIONS', () => {
  it('inclusions cover typical package items', () => {
    expect(COMMON_INCLUSIONS.some((i) => i.includes('airfare'))).toBe(true);
    expect(COMMON_INCLUSIONS.some((i) => i.includes('breakfast'))).toBe(true);
    expect(COMMON_INCLUSIONS.some((i) => i.toLowerCase().includes('visa'))).toBe(true);
  });

  it('exclusions cover typical carve-outs', () => {
    expect(COMMON_EXCLUSIONS.some((e) => e.includes('Personal expenses'))).toBe(true);
    expect(COMMON_EXCLUSIONS.some((e) => e.includes('taxes or fuel'))).toBe(true);
  });
});

/* ─── Quotation number generation ────────────────────────── */

describe('generateQuotationNumber()', () => {
  it('produces VE-Q-YYMM-XXXX-VV format', () => {
    const qn = generateQuotationNumber('VE-2608-K7QA', 1, new Date(2026, 7, 3));
    expect(qn).toMatch(/^VE-Q-2608-K7QA-01$/);
  });

  it('bumps version on revision', () => {
    const v2 = generateQuotationNumber('VE-2608-K7QA', 2, new Date(2026, 7, 3));
    expect(v2).toMatch(/^VE-Q-2608-K7QA-02$/);
  });

  it('generates random suffix when no deal number', () => {
    const qn = generateQuotationNumber('', 1, new Date(2026, 7, 3));
    expect(qn).toMatch(/^VE-Q-2608-[A-HJ-NP-Z2-9]{4}-01$/);
  });
});

/* ─── Tier pricing computation ───────────────────────────── */

describe('computeTierPricing() — Kirti Vietnam 2 adults', () => {
  const kirtiParty = { numberOfAdults: 2, numberOfChildren: 0 };
  const vietnamDeluxe = {
    code: 'DELUXE',
    perPersonPrice: 125000, // ₹1.25L per adult
    childPrice: 62500,
    singleSupplement: 25000,
  };

  const p = computeTierPricing(vietnamDeluxe, kirtiParty);

  it('total = per-adult × 2', () => {
    expect(p.total).toBe(250000);
  });

  it('no single supplement for couple', () => {
    expect(p.singleSupplement).toBe(0);
  });

  it('per-person = total / pax', () => {
    expect(p.perPerson).toBe(125000);
  });
});

describe('computeTierPricing() — solo traveller', () => {
  const solo = { numberOfAdults: 1, numberOfChildren: 0 };
  const deluxe = {
    perPersonPrice: 125000,
    singleSupplement: 25000,
  };

  const p = computeTierPricing(deluxe, solo);

  it('applies single supplement', () => {
    expect(p.singleSupplement).toBe(25000);
  });

  it('total = per-adult + supplement', () => {
    expect(p.total).toBe(150000);
  });
});

describe('computeTierPricing() — family with kids', () => {
  const family = { numberOfAdults: 2, numberOfChildren: 2 };
  const deluxe = {
    perPersonPrice: 125000,
    childPrice: 62500,
  };

  const p = computeTierPricing(deluxe, family);

  it('adults + children', () => {
    expect(p.adultsTotal).toBe(250000);
    expect(p.childrenTotal).toBe(125000);
    expect(p.total).toBe(375000);
  });

  it('per-person divides across all', () => {
    expect(p.perPerson).toBe(93750); // 375000 / 4
  });
});

/* ─── Combined multi-destination pricing ─────────────────── */

describe('computeCombinedPricing() — Vietnam + Cambodia multi-destination', () => {
  const quotation = {
    numberOfAdults: 2,
    numberOfChildren: 0,
    destinations: [
      {
        destinationCode: 'VN',
        destinationName: 'Vietnam',
        tiers: [
          { code: 'STANDARD', perPersonPrice: 85000 },
          { code: 'DELUXE', perPersonPrice: 125000 },
        ],
      },
      {
        destinationCode: 'KH',
        destinationName: 'Cambodia',
        tiers: [
          { code: 'STANDARD', perPersonPrice: 45000 },
          { code: 'DELUXE', perPersonPrice: 65000 },
        ],
      },
    ],
  };

  const combined = computeCombinedPricing(quotation);

  it('combines standard across destinations', () => {
    // VN: 85000 × 2 = 170000
    // KH: 45000 × 2 = 90000
    // Total: 260000
    expect(combined.STANDARD.total).toBe(260000);
    expect(combined.STANDARD.perPerson).toBe(130000);
  });

  it('combines deluxe across destinations', () => {
    // VN: 125000 × 2 = 250000
    // KH: 65000 × 2 = 130000
    // Total: 380000
    expect(combined.DELUXE.total).toBe(380000);
  });

  it('breaks down by destination', () => {
    expect(combined.STANDARD.byDestination.VN.total).toBe(170000);
    expect(combined.STANDARD.byDestination.KH.total).toBe(90000);
  });
});

/* ─── Payment schedule ──────────────────────────────────── */

describe('materialisePaymentSchedule()', () => {
  const total = 250000;
  const bookingDate = new Date(2026, 7, 3); // Aug 3, 2026
  const travelStartDate = '2026-10-15';

  const schedule = materialisePaymentSchedule(total, travelStartDate, bookingDate);

  it('creates 3 milestones', () => {
    expect(schedule.length).toBe(3);
  });

  it('milestones sum to total', () => {
    const sum = schedule.reduce((s, m) => s + m.amount, 0);
    expect(sum).toBe(total);
  });

  it('first payment is 25% at booking', () => {
    expect(schedule[0].percent).toBe(25);
    expect(schedule[0].amount).toBe(62500);
    expect(schedule[0].dueDate).toBe('2026-08-03');
  });

  it('final payment is 30 days before travel', () => {
    const final = schedule[schedule.length - 1];
    expect(final.percent).toBe(50);
    expect(final.dueDate).toBe('2026-09-15'); // 30 days before Oct 15
  });

  it('all milestones have status Pending', () => {
    schedule.forEach((m) => expect(m.status).toBe('Pending'));
  });
});

/* ─── Build from deal ───────────────────────────────────── */

describe('buildQuotationFromDeal() — Kirti Vietnam', () => {
  const deal = {
    id: 'deal-1234',
    dealNumber: 'VE-2608-K7QA',
    enquiryId: 'enq-abc',
    clientName: 'Kirti Malhotra',
    clientEmail: 'kirti@example.com',
    clientPhone: '+91 98765 43210',
    destination: 'Vietnam',
    nights: 7,
    adults: 2,
    children: 0,
    travelStartDate: '2026-10-15',
    travelEndDate: '2026-10-22',
  };

  const q = buildQuotationFromDeal(deal);

  it('copies client info from deal', () => {
    expect(q.clientName).toBe('Kirti Malhotra');
    expect(q.clientEmail).toBe('kirti@example.com');
  });

  it('preserves quotation-deal linkage', () => {
    expect(q.dealId).toBe('deal-1234');
    expect(q.enquiryId).toBe('enq-abc');
  });

  it('generates quotation number from deal number suffix', () => {
    expect(q.quotationNumber).toMatch(/^VE-Q-\d{4}-K7QA-01$/);
  });

  it('creates default destination with 3 tiers ready to fill', () => {
    expect(q.destinations.length).toBe(1);
    expect(q.destinations[0].destinationName).toBe('Vietnam');
    expect(q.destinations[0].tiers.length).toBe(3);
    expect(q.destinations[0].tiers.map((t) => t.code)).toEqual(['STANDARD', 'DELUXE', 'PREMIUM']);
  });

  it('populates default inclusions/exclusions on each tier', () => {
    const deluxe = q.destinations[0].tiers.find((t) => t.code === 'DELUXE');
    expect(deluxe.tierInclusions.length).toBeGreaterThan(5);
    expect(deluxe.tierExclusions.length).toBeGreaterThan(5);
  });

  it('sets 14-day validity by default', () => {
    const validUntil = new Date(q.validUntil);
    const daysFromNow = Math.floor((validUntil - new Date()) / (1000 * 60 * 60 * 24));
    expect(daysFromNow).toBeGreaterThanOrEqual(13);
    expect(daysFromNow).toBeLessThanOrEqual(14);
  });
});

describe('buildQuotationFromDeal() — with custom multi-destination', () => {
  it('accepts destinations override for multi-country trips', () => {
    const q = buildQuotationFromDeal(
      { id: 'd1', clientName: 'Test', destination: 'Asia', nights: 12 },
      {
        destinations: [
          {
            id: 'vn',
            destinationName: 'Vietnam',
            destinationCode: 'VN',
            nights: 7,
            cities: ['Hanoi', 'Da Nang'],
            dayPlan: [],
            tiers: [{ code: 'DELUXE', perPersonPrice: 125000 }],
          },
          {
            id: 'kh',
            destinationName: 'Cambodia',
            destinationCode: 'KH',
            nights: 5,
            cities: ['Siem Reap'],
            dayPlan: [],
            tiers: [{ code: 'DELUXE', perPersonPrice: 65000 }],
          },
        ],
      }
    );

    expect(q.destinations.length).toBe(2);
    expect(q.destinations[0].destinationCode).toBe('VN');
    expect(q.destinations[1].destinationCode).toBe('KH');
  });
});

/* ─── Version management ────────────────────────────────── */

describe('reviseQuotation()', () => {
  const original = {
    id: 'quo-orig-1',
    version: 1,
    dealId: 'deal-VE-2608-K7QA',
    quotationNumber: 'VE-Q-2608-K7QA-01',
    clientName: 'Kirti Malhotra',
    numberOfAdults: 2,
    destinations: [],
    sentAt: '2026-08-03T10:00:00Z',
    viewedByClient: true,
    viewedAt: '2026-08-03T11:00:00Z',
  };

  const revised = reviseQuotation(original, {
    clientName: 'Kirti Malhotra',
    numberOfAdults: 3, // Kirti added a person
  });

  it('bumps version to 2', () => {
    expect(revised.version).toBe(2);
  });

  it('references parent quotation', () => {
    expect(revised.parentQuotationId).toBe('quo-orig-1');
  });

  it('gets new ID (audit trail)', () => {
    expect(revised.id).not.toBe(original.id);
    expect(revised.id).toMatch(/^quo-/);
  });

  it('resets delivery + response state', () => {
    expect(revised.sentAt).toBe('');
    expect(revised.viewedByClient).toBe(false);
    expect(revised.viewedAt).toBe('');
  });

  it('applies overrides', () => {
    expect(revised.numberOfAdults).toBe(3);
  });
});

/* ─── Safety ────────────────────────────────────────────── */

describe('Quotation safety', () => {
  it('computeTierPricing handles null', () => {
    expect(computeTierPricing(null, null).total).toBe(0);
  });

  it('computeCombinedPricing handles null', () => {
    expect(computeCombinedPricing(null)).toEqual({});
  });

  it('computeCombinedPricing handles quotation without destinations', () => {
    expect(computeCombinedPricing({ numberOfAdults: 2 })).toEqual({});
  });
});
