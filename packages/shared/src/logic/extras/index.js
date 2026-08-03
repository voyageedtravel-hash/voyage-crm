/**
 * Voyage-Ed Extras Vendor Schema
 * Catch-all: extra baggage, lounge pass, photographer, cake, etc.
 */

import { toINR, num } from '../finance/index.js';

export const EXTRA_TYPES = [
  'Extra Baggage', 'Priority Pass / Lounge Access', 'Airport Meet & Greet',
  'Airport Fast Track', 'Wheelchair Assistance', 'Special Meal (Kosher/Halal/Vegan)',
  'Extra Legroom Seat', 'Photographer', 'Anniversary Cake', 'Birthday Package',
  'Honeymoon Package', 'Ferry Ticket', 'Bike/Scooter Rental', 'Yacht Charter',
  'Helicopter Transfer', 'Luggage Forwarding', 'Other',
];

export const extraVendorSchema = {
  id: '', name: '', extraType: '', description: '',
  cityOfService: '', serviceDate: '', quantity: 1,
  currency: 'INR', exchangeRate: 1,
  unitPrice: 0, costPrice: 0, sellingPrice: 0,
  voucherPdfUrl: '', payments: [], notes: '',
  createdAt: '', updatedAt: '',
  extractedByAI: false, extractedAt: '', extractedFromFileName: '',
};

export const extraPriceBreakdown = (extra) => {
  if (!extra) return { costTotalINR: 0, sellTotalINR: 0 };
  const rate = num(extra.exchangeRate) || 1;
  const currency = extra.currency || 'INR';
  const qty = num(extra.quantity) || 1;
  const computed = num(extra.unitPrice) * qty;
  const costRaw = num(extra.costPrice) || computed;
  const sellRaw = num(extra.sellingPrice) || computed;
  return {
    computed: toINR(computed, currency, rate),
    costTotalINR: toINR(costRaw, currency, rate),
    sellTotalINR: toINR(sellRaw, currency, rate),
  };
};

export const buildExtraVendorFromOCR = (ocr, options = {}) => {
  const now = new Date().toISOString();
  return {
    ...extraVendorSchema,
    id: options.id || 'ex-' + Math.random().toString(36).slice(2, 10),
    name: ocr.vendorName || '',
    extraType: ocr.extraType || 'Other',
    description: ocr.description || '',
    cityOfService: ocr.cityOfService || '',
    serviceDate: ocr.serviceDate || '',
    quantity: num(ocr.quantity) || 1,
    currency: ocr.currency || 'INR',
    exchangeRate: options.exchangeRate || 1,
    unitPrice: num(ocr.unitPrice),
    costPrice: num(ocr.costPrice),
    sellingPrice: num(ocr.sellingPrice),
    notes: ocr.notes || '',
    extractedByAI: true, extractedAt: now,
    extractedFromFileName: options.fileName || '',
    createdAt: now, updatedAt: now,
  };
};

export default { EXTRA_TYPES, extraVendorSchema, extraPriceBreakdown, buildExtraVendorFromOCR };
