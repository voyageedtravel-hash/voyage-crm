/**
 * Voyage-Ed Transfers Vendor Schema
 * Airport / hotel / station transfers. Split from V1 "Land" per ADR-015.
 */

import { toINR, num } from '../finance/index.js';

export const TRANSFER_TYPES = [
  'Airport Pickup', 'Airport Drop', 'Airport to Hotel', 'Hotel to Airport',
  'Hotel to Hotel', 'Station to Hotel', 'Hotel to Station', 'Port to Hotel',
  'Multi-Stop City Tour', 'Full-Day at Disposal', 'Half-Day at Disposal',
];

export const VEHICLE_CATEGORIES = [
  'Sedan (3 pax + 3 bags)', 'SUV (4 pax + 4 bags)', 'MPV (6 pax + 6 bags)',
  'Minivan (8 pax + 8 bags)', 'Coach (15 pax)', 'Bus (25 pax)', 'Bus (45 pax)',
  'Luxury Sedan (Mercedes E-Class)', 'Luxury SUV (Mercedes S-Class)', 'Limousine',
];

export const transferVendorSchema = {
  id: '', name: '', transferType: '', vehicleCategory: '',
  pickupLocation: '', pickupDateTime: '', dropLocation: '', dropDateTime: '',
  flightNumber: '', meetAndGreet: false, paxCount: 0, bagCount: 0,
  driverName: '', driverPhone: '', vehicleNumber: '',
  currency: 'INR', exchangeRate: 1, costPrice: 0, sellingPrice: 0,
  includesToll: true, includesParking: true, includesFuel: true,
  extraKmRate: 0, extraHourRate: 0,
  voucherPdfUrl: '', driverPhotoUrl: '', payments: [], notes: '',
  createdAt: '', updatedAt: '',
  extractedByAI: false, extractedAt: '', extractedFromFileName: '',
};

export const transferPriceBreakdown = (transfer) => {
  if (!transfer) return { costTotalINR: 0, sellTotalINR: 0 };
  const rate = num(transfer.exchangeRate) || 1;
  const currency = transfer.currency || 'INR';
  return {
    costTotalINR: toINR(transfer.costPrice, currency, rate),
    sellTotalINR: toINR(transfer.sellingPrice, currency, rate),
  };
};

export const buildTransferVendorFromOCR = (ocr, options = {}) => {
  const now = new Date().toISOString();
  return {
    ...transferVendorSchema,
    id: options.id || 'tr-' + Math.random().toString(36).slice(2, 10),
    name: ocr.vendorName || '',
    transferType: ocr.transferType || '',
    vehicleCategory: ocr.vehicleCategory || '',
    pickupLocation: ocr.pickupLocation || '',
    pickupDateTime: ocr.pickupDateTime || '',
    dropLocation: ocr.dropLocation || '',
    flightNumber: ocr.flightNumber || '',
    meetAndGreet: !!ocr.meetAndGreet,
    paxCount: num(ocr.paxCount),
    currency: ocr.currency || 'INR',
    exchangeRate: options.exchangeRate || 1,
    costPrice: num(ocr.costPrice),
    sellingPrice: num(ocr.sellingPrice),
    notes: ocr.notes || '',
    extractedByAI: true, extractedAt: now,
    extractedFromFileName: options.fileName || '',
    createdAt: now, updatedAt: now,
  };
};

export default { TRANSFER_TYPES, VEHICLE_CATEGORIES, transferVendorSchema, transferPriceBreakdown, buildTransferVendorFromOCR };
