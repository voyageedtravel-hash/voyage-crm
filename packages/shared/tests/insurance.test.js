import { describe, it, expect } from 'vitest';
import {
  insurancePriceBreakdown, ageBracketFor, buildInsuranceVendorFromOCR,
  INSURANCE_PROVIDERS, INSURANCE_REGIONS,
} from '../src/logic/insurance/index.js';

describe('INSURANCE_PROVIDERS', () => {
  it('includes major Indian insurers', () => {
    expect(INSURANCE_PROVIDERS).toContain('TATA AIG');
    expect(INSURANCE_PROVIDERS).toContain('ICICI Lombard');
    expect(INSURANCE_PROVIDERS).toContain('HDFC ERGO');
  });
});

describe('INSURANCE_REGIONS', () => {
  it('has 7 standard regions', () => {
    expect(INSURANCE_REGIONS.length).toBe(7);
    const codes = INSURANCE_REGIONS.map((r) => r.code);
    expect(codes).toContain('DOMESTIC');
    expect(codes).toContain('SCHENGEN');
    expect(codes).toContain('USA_CANADA');
  });
});

describe('ageBracketFor()', () => {
  it('classifies infant (0-5) at 0.5x', () => {
    expect(ageBracketFor(2).multiplier).toBe(0.5);
  });
  it('classifies young adult (18-40) at 1.0x', () => {
    expect(ageBracketFor(30).multiplier).toBe(1.0);
  });
  it('classifies senior (56-65) at 1.5x', () => {
    expect(ageBracketFor(60).multiplier).toBe(1.5);
  });
  it('classifies silver (71+) at 3x', () => {
    expect(ageBracketFor(75).multiplier).toBe(3.0);
  });
});

describe('insurancePriceBreakdown() Schengen family', () => {
  const family = {
    name: 'ICICI Lombard', region: 'SCHENGEN', sumInsuredUSD: 50000,
    travellerCount: 4, perTravellerPremium: 900,
    currency: 'INR', exchangeRate: 1,
  };
  const b = insurancePriceBreakdown(family);
  it('base premium = per-pax x count', () => expect(b.basePremium).toBe(3600));
  it('GST 18% on premium', () => expect(b.gstAmount).toBe(648));
  it('grand total = premium + GST', () => expect(b.grandTotal).toBe(4248));
  it('per-traveller INR', () => expect(b.perTraveller).toBe(1062));
});

describe('insurancePriceBreakdown() with add-ons', () => {
  const withAdv = {
    name: 'TATA AIG', region: 'ASIA', travellerCount: 2, basePremium: 1100,
    currency: 'INR', exchangeRate: 1,
    adventureSportsCover: true, adventureSportsAddOn: 500,
    covidCover: true, covidCoverAddOn: 300,
  };
  const b = insurancePriceBreakdown(withAdv);
  it('sums add-ons', () => expect(b.addonsTotal).toBe(800));
  it('subtotal', () => expect(b.subtotal).toBe(1900));
  it('GST on subtotal', () => expect(b.gstAmount).toBe(342));
});

describe('insurancePriceBreakdown() pre-existing', () => {
  const senior = {
    name: 'HDFC ERGO', region: 'USA_CANADA', travellerCount: 1,
    basePremium: 3200, currency: 'INR', exchangeRate: 1,
    preExistingDeclared: true, preExistingSurcharge: 1500,
  };
  const b = insurancePriceBreakdown(senior);
  it('surcharge applied', () => expect(b.preExistingSurcharge).toBe(1500));
  it('subtotal', () => expect(b.subtotal).toBe(4700));
});

describe('insurancePriceBreakdown() override', () => {
  it('uses explicit cost/sell', () => {
    const b = insurancePriceBreakdown({
      travellerCount: 2, basePremium: 2000, currency: 'INR', exchangeRate: 1,
      costPrice: 2500, sellingPrice: 3800,
    });
    expect(b.costTotalINR).toBe(2500);
    expect(b.sellTotalINR).toBe(3800);
  });
});

describe('insurancePriceBreakdown() safety', () => {
  it('handles null', () => expect(insurancePriceBreakdown(null).grandTotal).toBe(0));
  it('handles empty', () => expect(insurancePriceBreakdown({}).grandTotal).toBe(0));
});

describe('buildInsuranceVendorFromOCR()', () => {
  it('produces valid vendor', () => {
    const ocr = {
      confidence: 0.9, provider: 'TATA AIG', policyNumber: 'TAG-INT-2026-88421',
      planName: 'Travel Guard Platinum', region: 'WORLDWIDE',
      sumInsuredUSD: 250000, travellerCount: 2, basePremium: 4200,
      currency: 'INR', policyStartDate: '2026-10-06', policyEndDate: '2026-10-16',
      totalDays: 10, coverages: ['Medical Emergency', 'Trip Cancellation'],
    };
    const v = buildInsuranceVendorFromOCR(ocr, { fileName: 'tata_aig.pdf' });
    expect(v.name).toBe('TATA AIG');
    expect(v.sumInsuredUSD).toBe(250000);
    expect(v.totalDays).toBe(10);
    expect(v.extractedByAI).toBe(true);
    expect(v.id).toMatch(/^ins-/);
  });
  it('applies safe defaults', () => {
    const v = buildInsuranceVendorFromOCR({ provider: 'ICICI Lombard' });
    expect(v.travellerCount).toBe(1);
    expect(v.currency).toBe('INR');
    expect(v.exchangeRate).toBe(1);
  });
});
