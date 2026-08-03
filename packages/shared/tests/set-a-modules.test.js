import { describe, it, expect } from 'vitest';
import { transferPriceBreakdown, buildTransferVendorFromOCR, TRANSFER_TYPES, VEHICLE_CATEGORIES } from '../src/logic/transfers/index.js';
import { cabPriceBreakdown, buildCabVendorFromOCR, CAB_TYPES } from '../src/logic/cabs/index.js';
import { attractionPriceBreakdown, buildAttractionVendorFromOCR, ATTRACTION_TYPES } from '../src/logic/attractions/index.js';
import { extraPriceBreakdown, buildExtraVendorFromOCR, EXTRA_TYPES } from '../src/logic/extras/index.js';
import { simPriceBreakdown, buildSimVendorFromOCR, SIM_PROVIDERS } from '../src/logic/sim/index.js';
import { cancelCompute, computeCancellationImpact, decodeCancellationPolicy, refundPercentForDaysOut } from '../src/logic/cancellation/index.js';

describe('Transfers module', () => {
  it('has standard types', () => expect(TRANSFER_TYPES).toContain('Airport Pickup'));
  it('has luxury vehicles', () => expect(VEHICLE_CATEGORIES).toContain('Luxury Sedan (Mercedes E-Class)'));
  it('computes INR direct', () => {
    const b = transferPriceBreakdown({ currency: 'INR', exchangeRate: 1, costPrice: 2500, sellingPrice: 3500 });
    expect(b.costTotalINR).toBe(2500);
    expect(b.sellTotalINR).toBe(3500);
  });
  it('converts USD', () => {
    const b = transferPriceBreakdown({ currency: 'USD', exchangeRate: 86, costPrice: 45, sellingPrice: 65 });
    expect(b.costTotalINR).toBe(45 * 86);
  });
  it('builds from OCR', () => {
    const v = buildTransferVendorFromOCR({
      vendorName: 'Bali Prasetya Tours', transferType: 'Airport Pickup',
      vehicleCategory: 'SUV (4 pax + 4 bags)', pickupLocation: 'Ngurah Rai',
      flightNumber: 'GA412', meetAndGreet: true, paxCount: 2,
      currency: 'USD', costPrice: 25, sellingPrice: 40,
    }, { fileName: 'bali.pdf' });
    expect(v.name).toBe('Bali Prasetya Tours');
    expect(v.meetAndGreet).toBe(true);
    expect(v.extractedByAI).toBe(true);
    expect(v.id).toMatch(/^tr-/);
  });
  it('safe on null', () => expect(transferPriceBreakdown(null).costTotalINR).toBe(0));
});

describe('Cabs module', () => {
  it('has cab types', () => expect(CAB_TYPES).toContain('Outstation Round-Trip'));
  it('computes per-day + bhata + parking + toll', () => {
    const b = cabPriceBreakdown({
      currency: 'INR', exchangeRate: 1, totalDaysBilled: 3,
      perDayRate: 3500, driverBhataPerDay: 500,
      parkingCharges: 300, tollCharges: 800,
    });
    expect(b.perDayTotal).toBe(10500);
    expect(b.driverBhataTotal).toBe(1500);
    expect(b.computed).toBe(13100);
  });
  it('override wins', () => {
    const b = cabPriceBreakdown({
      currency: 'INR', exchangeRate: 1, totalDaysBilled: 3, perDayRate: 3500,
      costPrice: 10000, sellingPrice: 15000,
    });
    expect(b.costTotalINR).toBe(10000);
    expect(b.sellTotalINR).toBe(15000);
  });
  it('builds from OCR', () => {
    const v = buildCabVendorFromOCR({
      vendorName: 'Savaari', cabType: 'Outstation Round-Trip',
      totalDays: 3, cityOfService: 'Bangalore',
      route: 'Bangalore -> Mysore -> Coorg -> Bangalore', paxCount: 4,
    });
    expect(v.name).toBe('Savaari');
    expect(v.route).toContain('Mysore');
    expect(v.id).toMatch(/^cb-/);
  });
});

describe('Attractions module', () => {
  it('has types', () => expect(ATTRACTION_TYPES).toContain('Theme Park Ticket'));
  it('computes adult+child+senior', () => {
    // Universal Studios Singapore family 2A+2C
    const b = attractionPriceBreakdown({
      currency: 'SGD', exchangeRate: 65,
      adultTicketPrice: 85, adultCount: 2,
      childTicketPrice: 65, childCount: 2,
    });
    expect(b.adultTotal).toBe(11050); // 85*2*65
    expect(b.childTotal).toBe(8450);  // 65*2*65
    expect(b.computed).toBe(19500);
  });
  it('adds guide + transport', () => {
    const b = attractionPriceBreakdown({
      currency: 'INR', exchangeRate: 1,
      adultTicketPrice: 500, adultCount: 4,
      privateGuideCharge: 3000, transportationCharge: 2500,
    });
    expect(b.computed).toBe(7500);
  });
  it('builds from OCR', () => {
    const v = buildAttractionVendorFromOCR({
      attractionName: 'Universal Studios Singapore',
      attractionType: 'Theme Park Ticket', cityOfService: 'Singapore',
      activityDate: '2026-10-10', currency: 'SGD',
      adultTicketPrice: 85, adultCount: 2, childTicketPrice: 65, childCount: 2,
      ticketNumbers: ['A', 'B', 'C', 'D'],
    });
    expect(v.name).toBe('Universal Studios Singapore');
    expect(v.ticketNumbers).toHaveLength(4);
    expect(v.id).toMatch(/^at-/);
  });
});

describe('Extras module', () => {
  it('has types', () => {
    expect(EXTRA_TYPES).toContain('Extra Baggage');
    expect(EXTRA_TYPES).toContain('Anniversary Cake');
    expect(EXTRA_TYPES).toContain('Priority Pass / Lounge Access');
  });
  it('computes unit x qty', () => {
    const b = extraPriceBreakdown({
      extraType: 'Extra Baggage', currency: 'INR', exchangeRate: 1,
      unitPrice: 2500, quantity: 2,
    });
    expect(b.computed).toBe(5000);
  });
  it('override wins', () => {
    const b = extraPriceBreakdown({
      currency: 'INR', exchangeRate: 1, unitPrice: 3000, quantity: 2,
      costPrice: 5500, sellingPrice: 7000,
    });
    expect(b.costTotalINR).toBe(5500);
    expect(b.sellTotalINR).toBe(7000);
  });
  it('builds from OCR', () => {
    const v = buildExtraVendorFromOCR({
      vendorName: 'Emirates', extraType: 'Extra Baggage',
      description: 'Additional 10kg', quantity: 1, unitPrice: 4500, currency: 'INR',
    });
    expect(v.name).toBe('Emirates');
    expect(v.id).toMatch(/^ex-/);
  });
});

describe('SIM/eSIM module', () => {
  it('has providers', () => {
    expect(SIM_PROVIDERS).toContain('Airalo');
    expect(SIM_PROVIDERS).toContain('Matrix Cellular');
  });
  it('computes unit x qty', () => {
    // Airalo Europe 2 travellers
    const b = simPriceBreakdown({
      name: 'Airalo', currency: 'USD', exchangeRate: 86,
      quantity: 2, unitCost: 15, unitPrice: 22,
    });
    expect(b.computedCost).toBe(2580); // 15*2*86
    expect(b.computedSell).toBe(3784); // 22*2*86
  });
  it('builds from OCR', () => {
    const v = buildSimVendorFromOCR({
      provider: 'Airalo', simType: 'eSIM (QR delivery)',
      region: 'Regional (Europe)',
      countriesCovered: ['France', 'Germany', 'Italy', 'Spain'],
      dataGB: 5, validityDays: 15, currency: 'USD',
      quantity: 2, unitCost: 15, unitPrice: 22,
      deliveryMethod: 'Email QR',
    });
    expect(v.name).toBe('Airalo');
    expect(v.countriesCovered).toHaveLength(4);
    expect(v.dataGB).toBe(5);
    expect(v.id).toMatch(/^sim-/);
  });
  it('safe on null', () => expect(simPriceBreakdown(null).costTotalINR).toBe(0));
});

describe('Cancellation engine', () => {
  it('cancelCompute: profit = penalty + myProfit - vendorLoss', () => {
    const r = cancelCompute({
      refundToClient: 85000, penaltyToClient: 15000,
      vendorCancellationLoss: 8000, myProfitOnCancellation: 5000,
    });
    expect(r.refund).toBe(85000);
    expect(r.penalty).toBe(15000);
    expect(r.profit).toBe(12000); // 15000 + 5000 - 8000
  });
  it('cancelCompute handles null', () => {
    const r = cancelCompute(null);
    expect(r.refund).toBe(0);
    expect(r.profit).toBe(0);
  });
  it('computeCancellationImpact combines with prior', () => {
    const deal = {
      cancellations: [
        { status: 'Closed', penaltyToClient: 5000, myProfitOnCancellation: 2000, vendorCancellationLoss: 3000 },
      ],
    };
    const impact = computeCancellationImpact(deal, {
      penaltyToClient: 10000, myProfitOnCancellation: 3000, vendorCancellationLoss: 5000, refundToClient: 50000,
    });
    expect(impact.priorImpact.totalProfit).toBe(4000); // 5000 + 2000 - 3000
    expect(impact.profit).toBe(8000); // 10000 + 3000 - 5000
    expect(impact.combined.totalProfit).toBe(12000);
  });
  it('decodeCancellationPolicy F30-P50-N90', () => {
    const rules = decodeCancellationPolicy('F30-P50-N90');
    expect(rules).toHaveLength(3);
    expect(rules[0]).toEqual({ daysBeforeTravel: 30, refundPercent: 100 });
    expect(rules[1]).toEqual({ daysBeforeTravel: 50, refundPercent: 50 });
  });
  it('refundPercentForDaysOut applies most lenient matching rule', () => {
    const schedule = [
      { daysBeforeTravel: 60, refundPercent: 100 },
      { daysBeforeTravel: 30, refundPercent: 50 },
      { daysBeforeTravel: 15, refundPercent: 0 },
    ];
    expect(refundPercentForDaysOut(schedule, 90)).toBe(100);
    expect(refundPercentForDaysOut(schedule, 45)).toBe(50);
    expect(refundPercentForDaysOut(schedule, 20)).toBe(0);
    expect(refundPercentForDaysOut(schedule, 5)).toBe(0);
  });
});
