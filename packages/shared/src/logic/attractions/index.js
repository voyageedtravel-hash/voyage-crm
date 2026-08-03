/**
 * Voyage-Ed Attractions Vendor Schema
 * Theme parks, museums, guided tours, day excursions. Split from V1 "Activities".
 */

import { toINR, num } from '../finance/index.js';

export const ATTRACTION_TYPES = [
  'Theme Park Ticket', 'Museum Entry', 'Historical Site',
  'Guided City Tour', 'Half-Day Tour', 'Full-Day Tour',
  'Adventure Activity', 'Water Sports', 'Skiing / Snow Sports',
  'Wildlife Safari', 'Boat Ride / Ferry', 'Cable Car / Ropeway',
  'Show / Concert Ticket', 'Culinary Experience', 'Spa / Wellness',
];

export const attractionVendorSchema = {
  id: '', name: '', attractionType: '',
  cityOfService: '', activityDate: '', activityTime: '', duration: '',
  meetingPoint: '',
  currency: 'INR', exchangeRate: 1,
  adultTicketPrice: 0, childTicketPrice: 0, seniorTicketPrice: 0,
  adultCount: 0, childCount: 0, seniorCount: 0,
  privateGuideCharge: 0, transportationCharge: 0,
  costPrice: 0, sellingPrice: 0,
  voucherPdfUrl: '', qrCodeUrl: '', ticketNumbers: [],
  includesGuide: false, includesMeal: false, includesTransportation: false,
  cancellationFree: false,
  payments: [], notes: '',
  createdAt: '', updatedAt: '',
  extractedByAI: false, extractedAt: '', extractedFromFileName: '',
};

export const attractionPriceBreakdown = (attraction) => {
  if (!attraction) return { costTotalINR: 0, sellTotalINR: 0 };
  const rate = num(attraction.exchangeRate) || 1;
  const currency = attraction.currency || 'INR';
  const adultTotal = num(attraction.adultTicketPrice) * num(attraction.adultCount);
  const childTotal = num(attraction.childTicketPrice) * num(attraction.childCount);
  const seniorTotal = num(attraction.seniorTicketPrice) * num(attraction.seniorCount);
  const guide = num(attraction.privateGuideCharge);
  const transport = num(attraction.transportationCharge);
  const computed = adultTotal + childTotal + seniorTotal + guide + transport;
  const costRaw = num(attraction.costPrice) || computed;
  const sellRaw = num(attraction.sellingPrice) || computed;
  return {
    adultTotal: toINR(adultTotal, currency, rate),
    childTotal: toINR(childTotal, currency, rate),
    seniorTotal: toINR(seniorTotal, currency, rate),
    privateGuide: toINR(guide, currency, rate),
    transportation: toINR(transport, currency, rate),
    computed: toINR(computed, currency, rate),
    costTotalINR: toINR(costRaw, currency, rate),
    sellTotalINR: toINR(sellRaw, currency, rate),
  };
};

export const buildAttractionVendorFromOCR = (ocr, options = {}) => {
  const now = new Date().toISOString();
  return {
    ...attractionVendorSchema,
    id: options.id || 'at-' + Math.random().toString(36).slice(2, 10),
    name: ocr.attractionName || '',
    attractionType: ocr.attractionType || '',
    cityOfService: ocr.cityOfService || '',
    activityDate: ocr.activityDate || '',
    activityTime: ocr.activityTime || '',
    duration: ocr.duration || '',
    currency: ocr.currency || 'INR',
    exchangeRate: options.exchangeRate || 1,
    adultTicketPrice: num(ocr.adultTicketPrice),
    childTicketPrice: num(ocr.childTicketPrice),
    seniorTicketPrice: num(ocr.seniorTicketPrice),
    adultCount: num(ocr.adultCount),
    childCount: num(ocr.childCount),
    seniorCount: num(ocr.seniorCount),
    includesGuide: !!ocr.includesGuide,
    includesMeal: !!ocr.includesMeal,
    includesTransportation: !!ocr.includesTransportation,
    ticketNumbers: Array.isArray(ocr.ticketNumbers) ? ocr.ticketNumbers : [],
    notes: ocr.notes || '',
    extractedByAI: true, extractedAt: now,
    extractedFromFileName: options.fileName || '',
    createdAt: now, updatedAt: now,
  };
};

export default { ATTRACTION_TYPES, attractionVendorSchema, attractionPriceBreakdown, buildAttractionVendorFromOCR };
