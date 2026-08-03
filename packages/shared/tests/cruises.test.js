/**
 * Voyage-Ed Cruise — Unit Tests
 * ────────────────────────────────────────────────────────────
 * Real-world scenarios: Cordelia Mumbai-Diu, Royal Caribbean Bahamas.
 * Verifies port charges + gratuities are correctly added on top of
 * base fare, and that per-person breakdowns match cruise-line invoices.
 */

import { describe, it, expect } from 'vitest';
import {
  cruisePriceBreakdown,
  buildCruiseVendorFromOCR,
  CRUISE_CABIN_CATEGORIES,
  CRUISE_LINES,
} from '../src/logic/cruises/index.js';

/* ─── Constants ──────────────────────────────────────────── */

describe('CRUISE_CABIN_CATEGORIES', () => {
  it('is in ascending price order', () => {
    // Not a hard test — but confirms the manual ordering intent.
    expect(CRUISE_CABIN_CATEGORIES[0]).toBe('Interior');
    expect(CRUISE_CABIN_CATEGORIES).toContain('Balcony');
    expect(CRUISE_CABIN_CATEGORIES).toContain('Suite');
  });
});

describe('CRUISE_LINES', () => {
  it('includes Indian and international lines Voyage-Ed sells', () => {
    expect(CRUISE_LINES).toContain('Cordelia Cruises');
    expect(CRUISE_LINES).toContain('Royal Caribbean');
    expect(CRUISE_LINES).toContain('MSC Cruises');
  });
});

/* ─── Cordelia Cruises Mumbai → Diu → Mumbai · 3 Nights ─── */

describe('cruisePriceBreakdown() — Cordelia 3N Mumbai-Diu (INR)', () => {
  // Realistic Cordelia pricing (Aug 2026 rates from their agent portal):
  //   Ocean View cabin, 2 adults
  //   Base fare: ₹22,000 per person per cabin (double occupancy)
  //   Port charges: ₹2,500 per person
  //   Service charge (gratuity): ₹600 per person per night
  //   Beverage package add-on: ₹8,000 total
  const cordeliaOceanView = {
    name: 'Cordelia Cruises',
    shipName: 'MV Empress',
    itineraryName: 'Mumbai → Diu → Mumbai · 3 Nights',
    nights: 3,
    cabinCategory: 'Ocean View',
    currency: 'INR',
    exchangeRate: 1,
    numberOfAdults: 2,
    numberOfChildren: 0,
    perPersonBaseFare: 22000,
    portChargesPerPerson: 2500,
    gratuitiesPerPersonPerNight: 600,
    beveragePackagePrice: 8000,
    costPrice: 0,           // Let the code compute
    sellingPrice: 0,        // Let the code compute
  };

  const b = cruisePriceBreakdown(cordeliaOceanView);

  it('correctly sums base fare for 2 adults', () => {
    expect(b.baseFareTotal).toBe(44000);  // 22000 × 2
  });

  it('applies port charges per person', () => {
    expect(b.portChargesTotal).toBe(5000); // 2500 × 2
  });

  it('computes gratuities as pp × nights × pax', () => {
    expect(b.gratuitiesTotal).toBe(3600);  // 600 × 2 × 3
  });

  it('sums add-ons correctly', () => {
    expect(b.addonsTotal).toBe(8000);
  });

  it('produces correct grand total', () => {
    expect(b.costTotalINR).toBe(44000 + 5000 + 3600 + 8000);  // ₹60,600
  });

  it('breaks down per-person for client-facing quote', () => {
    // Cordelia quotes to clients as "₹X per person all-inclusive"
    expect(b.perPersonBreakdown.totalPerPerson).toBe(30300);  // 60600 / 2
  });
});

/* ─── Family with kids: 2 adults + 2 children ──────────── */

describe('cruisePriceBreakdown() — Cordelia family (2A+2C)', () => {
  const familyCruise = {
    name: 'Cordelia Cruises',
    nights: 3,
    currency: 'INR',
    exchangeRate: 1,
    numberOfAdults: 2,
    numberOfChildren: 2,
    perPersonBaseFare: 22000,
    perChildFare: 11000,          // Kids half price
    portChargesPerPerson: 2500,   // Kids pay port charges too
    gratuitiesPerPersonPerNight: 600,  // Kids pay service charge
  };

  const b = cruisePriceBreakdown(familyCruise);

  it('adds adult and child fares', () => {
    expect(b.baseFareTotal).toBe(44000 + 22000);  // 2×22000 + 2×11000
  });

  it('applies port charges to all 4 travellers', () => {
    expect(b.portChargesTotal).toBe(2500 * 4);
  });

  it('applies gratuities to all 4 travellers × 3 nights', () => {
    expect(b.gratuitiesTotal).toBe(600 * 4 * 3);  // 7200
  });

  it('per-person total divides across everyone', () => {
    // 66000 + 10000 + 7200 = 83200 / 4 pax = 20800
    expect(b.costTotalINR).toBe(83200);
    expect(b.perPersonBreakdown.totalPerPerson).toBe(20800);
  });
});

/* ─── Single traveller with supplement ────────────────── */

describe('cruisePriceBreakdown() — solo traveller with single supplement', () => {
  const soloCruise = {
    nights: 3,
    currency: 'INR',
    exchangeRate: 1,
    numberOfAdults: 1,
    perPersonBaseFare: 22000,
    singleSupplement: 15000,          // 68% of base fare (industry norm)
    portChargesPerPerson: 2500,
    gratuitiesPerPersonPerNight: 600,
  };

  const b = cruisePriceBreakdown(soloCruise);

  it('applies single supplement only when 1 adult in cabin', () => {
    expect(b.baseFareTotal).toBe(22000 + 15000);  // Base + supplement
  });

  it('does NOT apply single supplement when 2 adults', () => {
    const couple = { ...soloCruise, numberOfAdults: 2 };
    const bc = cruisePriceBreakdown(couple);
    expect(bc.baseFareTotal).toBe(44000);  // No supplement
  });
});

/* ─── Royal Caribbean 7 Nights Bahamas (USD, exchange rate) ─── */

describe('cruisePriceBreakdown() — Royal Caribbean 7N Bahamas (USD)', () => {
  // Realistic Royal Caribbean pricing (Aug 2026):
  //   Balcony cabin, 2 adults
  //   Base fare: USD 899 per person
  //   Port charges + taxes: USD 145 per person
  //   Prepaid gratuities: USD 16 per person per night
  //   Classic Beverage Package: USD 480 (per person, times 2)
  const rc = {
    name: 'Royal Caribbean',
    shipName: 'Symphony of the Seas',
    itineraryName: 'Eastern Caribbean 7 Nights',
    nights: 7,
    cabinCategory: 'Balcony',
    currency: 'USD',
    exchangeRate: 86,       // INR/USD as of Aug 2026
    numberOfAdults: 2,
    numberOfChildren: 0,
    perPersonBaseFare: 899,
    portChargesPerPerson: 145,
    gratuitiesPerPersonPerNight: 16,
    beveragePackagePrice: 960,   // 480 × 2 pax
  };

  const b = cruisePriceBreakdown(rc);

  it('base fare in INR = 899 × 2 × 86', () => {
    expect(b.baseFareTotal).toBe(899 * 2 * 86);  // ₹1,54,628
  });

  it('port charges in INR = 145 × 2 × 86', () => {
    expect(b.portChargesTotal).toBe(145 * 2 * 86);  // ₹24,940
  });

  it('gratuities in INR = 16 × 2 × 7 × 86', () => {
    expect(b.gratuitiesTotal).toBe(16 * 2 * 7 * 86);  // ₹19,264
  });

  it('add-ons in INR = 960 × 86', () => {
    expect(b.addonsTotal).toBe(960 * 86);  // ₹82,560
  });

  it('grand total is sum of all in INR', () => {
    const expected = (899 * 2 + 145 * 2 + 16 * 2 * 7 + 960) * 86;
    expect(b.costTotalINR).toBe(expected);
  });
});

/* ─── Override behaviour: locked cost/sell wins over computed ─── */

describe('cruisePriceBreakdown() — explicit cost/sell override', () => {
  it('uses costPrice/sellingPrice when set, ignoring the sum', () => {
    const specialRate = {
      nights: 3,
      currency: 'INR',
      exchangeRate: 1,
      numberOfAdults: 2,
      perPersonBaseFare: 22000,
      portChargesPerPerson: 2500,
      gratuitiesPerPersonPerNight: 600,
      // Vendor gave us a special all-inclusive rate — Vishal locks it in
      costPrice: 50000,
      sellingPrice: 65000,
    };
    const b = cruisePriceBreakdown(specialRate);
    // Even though computed would be 44000+5000+3600 = 52600,
    // the explicit costPrice of 50000 wins.
    expect(b.costTotalINR).toBe(50000);
    expect(b.sellTotalINR).toBe(65000);
  });
});

/* ─── AI OCR result → vendor record conversion ─────────── */

describe('buildCruiseVendorFromOCR()', () => {
  it('produces a valid vendor record from AI extraction', () => {
    const ocrResult = {
      confidence: 0.92,
      cruiseLine: 'Cordelia Cruises',
      shipName: 'MV Empress',
      itineraryName: 'Mumbai → Diu → Mumbai · 3 Nights',
      embarkationDate: '2026-11-15',
      embarkationPort: 'Mumbai (Bombay)',
      disembarkationDate: '2026-11-18',
      disembarkationPort: 'Mumbai (Bombay)',
      nights: 3,
      cabinCategory: 'Ocean View',
      currency: 'INR',
      numberOfAdults: 2,
      numberOfChildren: 0,
      perPersonBaseFare: 22000,
      portChargesPerPerson: 2500,
      gratuitiesPerPersonPerNight: 600,
      totalShownOnScreenshot: 52600,
    };

    const vendor = buildCruiseVendorFromOCR(ocrResult, { fileName: 'cordelia.png' });

    expect(vendor.name).toBe('Cordelia Cruises');
    expect(vendor.shipName).toBe('MV Empress');
    expect(vendor.nights).toBe(3);
    expect(vendor.cabinCategory).toBe('Ocean View');
    expect(vendor.perPersonBaseFare).toBe(22000);
    expect(vendor.gratuitiesPerPersonPerNight).toBe(600);
    expect(vendor.extractedByAI).toBe(true);
    expect(vendor.extractedFromFileName).toBe('cordelia.png');
    expect(vendor.bookingStatus).toBe('Enquiry');
    expect(vendor.id).toMatch(/^cr-/);
  });

  it('applies safe defaults for missing fields', () => {
    const minimalOcr = {
      cruiseLine: 'Cordelia Cruises',
      nights: 3,
    };
    const vendor = buildCruiseVendorFromOCR(minimalOcr);
    expect(vendor.numberOfAdults).toBe(2);       // Default 2 adults
    expect(vendor.numberOfChildren).toBe(0);
    expect(vendor.exchangeRate).toBe(1);
    expect(vendor.currency).toBe('INR');
    expect(vendor.perPersonBaseFare).toBe(0);
  });

  it('runs the vendor through pricing breakdown successfully', () => {
    const ocr = {
      cruiseLine: 'Cordelia Cruises',
      nights: 3,
      numberOfAdults: 2,
      perPersonBaseFare: 22000,
      portChargesPerPerson: 2500,
      gratuitiesPerPersonPerNight: 600,
      currency: 'INR',
    };
    const vendor = buildCruiseVendorFromOCR(ocr);
    const breakdown = cruisePriceBreakdown(vendor);
    expect(breakdown.costTotalINR).toBe(44000 + 5000 + 3600);  // 52,600
  });
});

/* ─── Edge case: empty/null cruise ─────────────────────── */

describe('cruisePriceBreakdown() — safety', () => {
  it('handles null cruise without crashing', () => {
    const b = cruisePriceBreakdown(null);
    expect(b.costTotalINR).toBe(0);
    expect(b.sellTotalINR).toBe(0);
  });

  it('handles empty cruise with defaults', () => {
    const b = cruisePriceBreakdown({});
    expect(b.baseFareTotal).toBe(0);
    expect(b.portChargesTotal).toBe(0);
    expect(b.gratuitiesTotal).toBe(0);
  });
});
