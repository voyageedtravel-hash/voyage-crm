/**
 * Voyage-Ed SIM/eSIM Vendor Schema
 * International SIM/eSIM plans. Airalo, Nomad, Matrix, Clay Travel, etc.
 */

import { toINR, num } from '../finance/index.js';

export const SIM_PROVIDERS = [
  'Airalo', 'Nomad', 'Matrix Cellular', 'Clay Travel', 'TSIM',
  'Holafly', 'Yesim', 'Ubigi', 'Local Physical SIM', 'Other eSIM',
];

export const SIM_TYPES = [
  'eSIM (QR delivery)', 'Physical SIM (courier)',
  'Physical SIM (pickup at airport)', 'Rental phone with SIM',
];

export const SIM_REGIONS = [
  'Single Country', 'Regional (Asia)', 'Regional (Europe)',
  'Regional (Americas)', 'Regional (Middle East)', 'Global',
];

export const simVendorSchema = {
  id: '', name: '', simType: '', region: '', countriesCovered: [],
  dataGB: 0, validityDays: 0, callingMinutes: 0, smsCount: 0, hotspotAllowed: true,
  activationDate: '', expiryDate: '', qrCodeUrl: '', simNumber: '',
  travellerId: '', perTravellerSIM: true,
  currency: 'INR', exchangeRate: 1,
  quantity: 1, unitCost: 0, unitPrice: 0, costPrice: 0, sellingPrice: 0,
  deliveryMethod: '', deliveryDate: '', deliveryTrackingId: '',
  payments: [], notes: '',
  createdAt: '', updatedAt: '',
  extractedByAI: false, extractedAt: '', extractedFromFileName: '',
};

export const simPriceBreakdown = (sim) => {
  if (!sim) return { costTotalINR: 0, sellTotalINR: 0 };
  const rate = num(sim.exchangeRate) || 1;
  const currency = sim.currency || 'INR';
  const qty = num(sim.quantity) || 1;
  const computedCost = num(sim.unitCost) * qty;
  const computedSell = num(sim.unitPrice) * qty;
  const costRaw = num(sim.costPrice) || computedCost;
  const sellRaw = num(sim.sellingPrice) || computedSell;
  return {
    computedCost: toINR(computedCost, currency, rate),
    computedSell: toINR(computedSell, currency, rate),
    costTotalINR: toINR(costRaw, currency, rate),
    sellTotalINR: toINR(sellRaw, currency, rate),
  };
};

export const buildSimVendorFromOCR = (ocr, options = {}) => {
  const now = new Date().toISOString();
  return {
    ...simVendorSchema,
    id: options.id || 'sim-' + Math.random().toString(36).slice(2, 10),
    name: ocr.provider || '',
    simType: ocr.simType || 'eSIM (QR delivery)',
    region: ocr.region || '',
    countriesCovered: Array.isArray(ocr.countriesCovered) ? ocr.countriesCovered : [],
    dataGB: num(ocr.dataGB),
    validityDays: num(ocr.validityDays),
    callingMinutes: num(ocr.callingMinutes),
    activationDate: ocr.activationDate || '',
    expiryDate: ocr.expiryDate || '',
    qrCodeUrl: ocr.qrCodeUrl || '',
    simNumber: ocr.simNumber || '',
    currency: ocr.currency || 'INR',
    exchangeRate: options.exchangeRate || 1,
    quantity: num(ocr.quantity) || 1,
    unitCost: num(ocr.unitCost),
    unitPrice: num(ocr.unitPrice),
    deliveryMethod: ocr.deliveryMethod || '',
    notes: ocr.notes || '',
    extractedByAI: true, extractedAt: now,
    extractedFromFileName: options.fileName || '',
    createdAt: now, updatedAt: now,
  };
};

export default { SIM_PROVIDERS, SIM_TYPES, SIM_REGIONS, simVendorSchema, simPriceBreakdown, buildSimVendorFromOCR };
