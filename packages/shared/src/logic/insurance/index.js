/**
 * Voyage-Ed Insurance Vendor Schema
 * ────────────────────────────────────────────────────────────
 * Travel insurance is a first-class travel component in V2 (ADR-015).
 *
 * Common vendors Voyage-Ed uses: TATA AIG, ICICI Lombard, HDFC ERGO,
 * Bajaj Allianz, Reliance General, Care Insurance.
 */

import { toINR, num } from '../finance/index.js';

export const INSURANCE_PROVIDERS = [
  'TATA AIG',
  'ICICI Lombard',
  'HDFC ERGO',
  'Bajaj Allianz',
  'Reliance General',
  'Care Insurance (Religare)',
  'Digit Insurance',
  'Chola MS',
  'SBI General',
  'Universal Sompo',
];

export const INSURANCE_REGIONS = [
  { code: 'DOMESTIC', label: 'Domestic (India)', typical_pp: 250 },
  { code: 'ASIA', label: 'Asia', typical_pp: 550 },
  { code: 'SCHENGEN', label: 'Schengen (Europe)', typical_pp: 900 },
  { code: 'UK', label: 'United Kingdom', typical_pp: 1100 },
  { code: 'USA_CANADA', label: 'USA / Canada', typical_pp: 1600 },
  { code: 'WORLDWIDE_EX_USA', label: 'Worldwide (excl. USA)', typical_pp: 1300 },
  { code: 'WORLDWIDE', label: 'Worldwide (incl. USA)', typical_pp: 1800 },
];

export const INSURANCE_PLANS = [
  'Silver', 'Gold', 'Platinum', 'Diamond',
  'Corporate', 'Student', 'Senior Citizen', 'Family Floater',
];

export const AGE_BRACKETS = [
  { min: 0, max: 5, code: 'infant', multiplier: 0.5 },
  { min: 6, max: 17, code: 'child', multiplier: 0.7 },
  { min: 18, max: 40, code: 'young_adult', multiplier: 1.0 },
  { min: 41, max: 55, code: 'adult', multiplier: 1.15 },
  { min: 56, max: 65, code: 'senior', multiplier: 1.5 },
  { min: 66, max: 70, code: 'senior_plus', multiplier: 2.0 },
  { min: 71, max: 80, code: 'silver', multiplier: 3.0 },
];

export const COVERAGE_TYPES = [
  'Medical Emergency', 'Trip Cancellation', 'Trip Interruption',
  'Baggage Loss', 'Baggage Delay', 'Flight Delay', 'Missed Connection',
  'Passport Loss', 'Personal Liability', 'Accidental Death & Dismemberment',
  'Adventure Sports Cover', 'Pre-existing Diseases', 'Dental Emergency',
  'Emergency Evacuation', 'Repatriation of Remains',
];

export const insuranceVendorSchema = {
  id: '', name: '', policyNumber: '', planName: '', planTier: '',
  region: '', sumInsuredUSD: 0, sumInsuredINR: 0, coverages: [],
  policyStartDate: '', policyEndDate: '', totalDays: 0,
  travellerIds: [], travellerCount: 0,
  isFamilyFloater: false, perTravellerPremium: 0,
  ageMultiplierAdjusted: false, premiumBreakdown: [],
  currency: 'INR', exchangeRate: 1,
  basePremium: 0, gst: 0, costPrice: 0, sellingPrice: 0,
  adventureSportsCover: false, adventureSportsAddOn: 0,
  covidCover: false, covidCoverAddOn: 0,
  preExistingDeclared: false, preExistingSurcharge: 0,
  policyPdfUrl: '', quoteScreenshotUrl: '', premiumReceiptUrl: '',
  payments: [], notes: '',
  createdAt: '', updatedAt: '',
  extractedByAI: false, extractedAt: '', extractedFromFileName: '',
};

export const insurancePriceBreakdown = (insurance) => {
  if (!insurance) return zeroBreakdown();
  const rate = num(insurance.exchangeRate) || 1;
  const currency = insurance.currency || 'INR';
  const toINRLocal = (v) => toINR(v, currency, rate);

  let basePremium = num(insurance.basePremium);
  if (!basePremium && Array.isArray(insurance.premiumBreakdown) && insurance.premiumBreakdown.length) {
    basePremium = insurance.premiumBreakdown.reduce((s, t) => s + num(t.premium), 0);
  }
  if (!basePremium) {
    basePremium = num(insurance.perTravellerPremium) * num(insurance.travellerCount);
  }

  const adventureAdd = insurance.adventureSportsCover ? num(insurance.adventureSportsAddOn) : 0;
  const covidAdd = insurance.covidCover ? num(insurance.covidCoverAddOn) : 0;
  const preExAdd = insurance.preExistingDeclared ? num(insurance.preExistingSurcharge) : 0;
  const addonsTotal = adventureAdd + covidAdd + preExAdd;

  const subtotal = basePremium + addonsTotal;
  const gstRate = insurance.gst ? num(insurance.gst) / 100 : 0.18;
  const gstAmount = currency === 'INR' ? subtotal * gstRate : 0;
  const grandTotal = subtotal + gstAmount;

  const costRaw = num(insurance.costPrice) || grandTotal;
  const sellRaw = num(insurance.sellingPrice) || grandTotal;

  return {
    basePremium: toINRLocal(basePremium),
    adventureSportsAddOn: toINRLocal(adventureAdd),
    covidCoverAddOn: toINRLocal(covidAdd),
    preExistingSurcharge: toINRLocal(preExAdd),
    addonsTotal: toINRLocal(addonsTotal),
    subtotal: toINRLocal(subtotal),
    gstAmount: toINRLocal(gstAmount),
    grandTotal: toINRLocal(grandTotal),
    costTotalINR: toINRLocal(costRaw),
    sellTotalINR: toINRLocal(sellRaw),
    perTraveller: num(insurance.travellerCount) ? toINRLocal(grandTotal / insurance.travellerCount) : 0,
  };
};

const zeroBreakdown = () => ({
  basePremium: 0, adventureSportsAddOn: 0, covidCoverAddOn: 0,
  preExistingSurcharge: 0, addonsTotal: 0, subtotal: 0,
  gstAmount: 0, grandTotal: 0, costTotalINR: 0, sellTotalINR: 0, perTraveller: 0,
});

export const ageBracketFor = (age) => {
  const a = num(age);
  return AGE_BRACKETS.find((b) => a >= b.min && a <= b.max) || AGE_BRACKETS[2];
};

export const insuranceOCRTargetShape = {
  confidence: 0, provider: '', policyNumber: '', planName: '', planTier: '',
  region: '', sumInsuredUSD: 0, sumInsuredINR: 0, coverages: [],
  policyStartDate: '', policyEndDate: '', totalDays: 0, travellerCount: 0,
  basePremium: 0, gst: 0, currency: '',
  adventureSportsCover: false, covidCover: false, preExistingDeclared: false,
  totalShownOnScreenshot: 0, notes: '', uncertainFields: [],
};

export const buildInsuranceVendorFromOCR = (ocr, options = {}) => {
  const now = new Date().toISOString();
  return {
    ...insuranceVendorSchema,
    id: options.id || 'ins-' + Math.random().toString(36).slice(2, 10),
    name: ocr.provider || '',
    policyNumber: ocr.policyNumber || '',
    planName: ocr.planName || '',
    planTier: ocr.planTier || '',
    region: ocr.region || '',
    sumInsuredUSD: num(ocr.sumInsuredUSD),
    sumInsuredINR: num(ocr.sumInsuredINR),
    coverages: Array.isArray(ocr.coverages) ? ocr.coverages : [],
    policyStartDate: ocr.policyStartDate || '',
    policyEndDate: ocr.policyEndDate || '',
    totalDays: num(ocr.totalDays),
    travellerCount: num(ocr.travellerCount) || 1,
    basePremium: num(ocr.basePremium),
    gst: num(ocr.gst),
    currency: ocr.currency || 'INR',
    exchangeRate: options.exchangeRate || 1,
    adventureSportsCover: !!ocr.adventureSportsCover,
    covidCover: !!ocr.covidCover,
    preExistingDeclared: !!ocr.preExistingDeclared,
    notes: ocr.notes || '',
    extractedByAI: true,
    extractedAt: now,
    extractedFromFileName: options.fileName || '',
    createdAt: now,
    updatedAt: now,
  };
};

export default {
  INSURANCE_PROVIDERS, INSURANCE_REGIONS, INSURANCE_PLANS, AGE_BRACKETS,
  COVERAGE_TYPES, insuranceVendorSchema, insurancePriceBreakdown,
  ageBracketFor, insuranceOCRTargetShape, buildInsuranceVendorFromOCR,
};
