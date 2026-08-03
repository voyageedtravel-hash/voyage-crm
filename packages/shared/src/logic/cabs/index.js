/**
 * Voyage-Ed Cabs Vendor Schema
 * Local/city/outstation cabs with km/day quotas. Split from V1 "Land".
 */

import { toINR, num } from '../finance/index.js';

export const CAB_TYPES = [
  'Local (8hr/80km)', 'Local (12hr/120km)',
  'Full Day at Disposal', 'Half Day at Disposal',
  'Outstation One-Way', 'Outstation Round-Trip',
  'Point-to-Point', 'Sightseeing (per day)',
];

export const cabVendorSchema = {
  id: '', name: '', cabType: '', vehicleCategory: '',
  serviceStartDate: '', serviceEndDate: '', totalDays: 0,
  cityOfService: '', route: '',
  driverName: '', driverPhone: '', vehicleNumber: '',
  paxCount: 0,
  currency: 'INR', exchangeRate: 1,
  perDayRate: 0, totalDaysBilled: 0,
  extraKmRate: 0, extraHourRate: 0,
  driverBhataPerDay: 0, parkingCharges: 0, tollCharges: 0,
  costPrice: 0, sellingPrice: 0,
  voucherPdfUrl: '', payments: [], notes: '',
  createdAt: '', updatedAt: '',
  extractedByAI: false, extractedAt: '', extractedFromFileName: '',
};

export const cabPriceBreakdown = (cab) => {
  if (!cab) return { costTotalINR: 0, sellTotalINR: 0 };
  const rate = num(cab.exchangeRate) || 1;
  const currency = cab.currency || 'INR';
  const days = num(cab.totalDaysBilled) || num(cab.totalDays);
  const perDay = num(cab.perDayRate);
  const bhata = num(cab.driverBhataPerDay) * days;
  const parking = num(cab.parkingCharges);
  const toll = num(cab.tollCharges);
  const computed = perDay * days + bhata + parking + toll;
  const costRaw = num(cab.costPrice) || computed;
  const sellRaw = num(cab.sellingPrice) || computed;
  return {
    perDayTotal: toINR(perDay * days, currency, rate),
    driverBhataTotal: toINR(bhata, currency, rate),
    parkingTotal: toINR(parking, currency, rate),
    tollTotal: toINR(toll, currency, rate),
    computed: toINR(computed, currency, rate),
    costTotalINR: toINR(costRaw, currency, rate),
    sellTotalINR: toINR(sellRaw, currency, rate),
  };
};

export const buildCabVendorFromOCR = (ocr, options = {}) => {
  const now = new Date().toISOString();
  return {
    ...cabVendorSchema,
    id: options.id || 'cb-' + Math.random().toString(36).slice(2, 10),
    name: ocr.vendorName || '',
    cabType: ocr.cabType || '',
    vehicleCategory: ocr.vehicleCategory || '',
    serviceStartDate: ocr.serviceStartDate || '',
    serviceEndDate: ocr.serviceEndDate || '',
    totalDays: num(ocr.totalDays),
    cityOfService: ocr.cityOfService || '',
    route: ocr.route || '',
    paxCount: num(ocr.paxCount),
    currency: ocr.currency || 'INR',
    exchangeRate: options.exchangeRate || 1,
    perDayRate: num(ocr.perDayRate),
    driverBhataPerDay: num(ocr.driverBhataPerDay),
    parkingCharges: num(ocr.parkingCharges),
    tollCharges: num(ocr.tollCharges),
    costPrice: num(ocr.costPrice),
    sellingPrice: num(ocr.sellingPrice),
    notes: ocr.notes || '',
    extractedByAI: true, extractedAt: now,
    extractedFromFileName: options.fileName || '',
    createdAt: now, updatedAt: now,
  };
};

export default { CAB_TYPES, cabVendorSchema, cabPriceBreakdown, buildCabVendorFromOCR };
