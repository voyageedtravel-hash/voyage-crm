/**
 * Voyage-Ed Quotation Domain
 * ────────────────────────────────────────────────────────────
 * The quotation is what the client sees BEFORE they book. Different
 * from the deal itself, which is what we track internally.
 *
 * Vishal's real quotation workflow (from V1 usage patterns):
 *
 *   1. Enquiry arrives (Kirti wants Vietnam 7N, 2 pax, ~1.5-2L budget)
 *   2. Vishal builds 3-4 tiers: Standard / Deluxe / Premium / Luxury
 *   3. Each tier is a full package: hotels of that grade, similar
 *      flights, similar activities. Not just "cheaper hotel".
 *   4. Multi-destination bookings (Vietnam + Cambodia) → each destination
 *      has its own tiers, quoted together.
 *   5. PDF sent via WhatsApp / email
 *   6. Client picks a tier (or asks for tweaks — Deluxe hotels but
 *      Premium flights, etc)
 *   7. Deal freezes with the booked tier as the sell price
 *      (see finance.tierSellINR() and dealFinance() for math)
 *
 * This module produces the DATA. Rendering is a separate concern
 * (PDF ReportLab OR React Deal Detail preview OR future client portal).
 */

import { toINR, num, fmtINR } from '../finance/index.js';

/* ─── Tier definitions ───────────────────────────────────── */

/**
 * Standard tier names used in quotations. Vishal can override per-quote
 * (e.g. "Silver / Gold / Platinum" for a specific client) but these
 * are the defaults.
 */
export const QUOTATION_TIERS = [
  {
    code: 'STANDARD',
    label: 'Standard',
    hexColor: '#8b95a8',           // Neutral grey
    hotelStars: '3-4',
    description: 'Comfortable 3-4 star hotels, standard flights, group tours where possible.',
    markupHint: 0.12,              // Voyage-Ed typical markup for this tier
  },
  {
    code: 'DELUXE',
    label: 'Deluxe',
    hexColor: '#c9a84c',            // Voyage-Ed gold
    hotelStars: '4-5',
    description: 'Premium 4-5 star hotels, direct flights preferred, private transfers, mix of group + private tours.',
    markupHint: 0.15,
  },
  {
    code: 'PREMIUM',
    label: 'Premium',
    hexColor: '#1a3060',            // Voyage-Ed navy light
    hotelStars: '5',
    description: 'Luxury 5-star hotels, premium economy or business class, all private tours with English-speaking guide, VIP airport services.',
    markupHint: 0.18,
  },
  {
    code: 'LUXURY',
    label: 'Luxury',
    hexColor: '#0d1b3e',            // Voyage-Ed navy
    hotelStars: '5+',
    description: 'Ultra-luxury (Four Seasons, Aman, Ritz-Carlton, Mandarin Oriental), business class flights, chauffeur throughout, dedicated concierge.',
    markupHint: 0.20,
  },
];

/**
 * Common inclusion / exclusion clauses. These are picked from a menu
 * during quote building so we don't retype the same 15 lines each time.
 */
export const COMMON_INCLUSIONS = [
  'Return economy class airfare from starting city',
  'Accommodation as per selected tier with breakfast',
  'All airport transfers on private basis',
  'Sightseeing as per detailed itinerary',
  'English-speaking local guide',
  'Entry tickets to attractions mentioned',
  'Travel insurance (basic cover)',
  'Visa assistance and documentation',
  'GST as applicable',
  '24/7 support during travel',
];

export const COMMON_EXCLUSIONS = [
  'Anything not mentioned in inclusions',
  'Personal expenses (laundry, phone calls, tips)',
  'Meals not mentioned in itinerary',
  'Optional activities and shore excursions',
  'Travel insurance upgrade to premium plan',
  'Any increase in taxes or fuel surcharges',
  'Visa fee (charged separately at actuals)',
  'Portage at airports and hotels',
  'Personal shopping and souvenirs',
  'Any medical or emergency expenses',
];

/* ─── Quotation shape ────────────────────────────────────── */

/**
 * One tier within a quotation.
 */
export const quotationTierSchema = {
  id: '',
  code: '',                        // From QUOTATION_TIERS.code, or custom
  label: '',                       // Display name

  // Hotels for this tier (subset of full hotelVendors — quote view)
  hotelSummary: [],                // [{ city, hotelName, category, nights, roomType }]

  // Flights included in this tier
  flightSummary: [],               // [{ sector, class, airline }]

  // Transportation type
  transferType: 'Private',         // Private / Shared / Mixed

  // Activities/sightseeing
  activityHighlights: [],           // Bullet points

  // Meal plan
  mealPlan: 'Breakfast',           // Breakfast / Half Board / Full Board / All Inclusive

  // What's included specifically for this tier
  tierInclusions: [],
  tierExclusions: [],

  // Pricing
  perPersonPrice: 0,               // INR, all-inclusive twin sharing
  singleSupplement: 0,             // If solo
  childPrice: 0,                   // Child with parents
  totalPrice: 0,                   // For the party (auto-computed from per-person × pax)

  // Internal notes (not shown to client)
  internalNotes: '',
  costPrice: 0,                    // What we pay (internal)
  markup: 0,                       // Computed profit margin (internal)

  // Which tier client selected (marked when they book)
  booked: false,
  bookedAt: '',
};

/**
 * One destination segment within a multi-destination quotation.
 */
export const quotationDestinationSchema = {
  id: '',
  destinationName: '',              // e.g. "Vietnam", "Bali", "Singapore"
  destinationCode: '',              // e.g. "VN", "ID", "SG"
  heroImageUrl: '',                 // Cover photo for PDF
  nights: 0,
  cities: [],                       // e.g. ["Hanoi", "Ha Long", "Da Nang", "Phu Quoc"]

  // Day-by-day itinerary
  dayPlan: [],                     // Array of dayPlanSchema

  // Tiers offered for this destination
  tiers: [],                       // Array of quotationTierSchema
};

/**
 * One day in the itinerary.
 */
export const dayPlanSchema = {
  day: 0,                          // Day number (1, 2, 3...)
  date: '',                        // Actual date if known
  city: '',                        // Where they are that day
  title: '',                       // e.g. "Arrival in Hanoi"
  narrative: '',                   // 2-3 sentence description
  meals: [],                       // ['Breakfast', 'Lunch'] — capital letters
  activities: [],                  // Bullet points
  overnight: '',                   // Hotel name (or "Overnight in Hanoi")
  transferNote: '',                // e.g. "3-hour drive to Ha Long"
};

/**
 * Top-level quotation record.
 */
export const quotationSchema = {
  id: '',
  quotationNumber: '',              // e.g. "VE-Q-2608-K7QA-01"
  version: 1,                      // Increment on each revision
  parentQuotationId: '',           // If this is a revision

  // Deal linkage
  dealId: '',
  enquiryId: '',
  clientName: '',
  clientEmail: '',
  clientPhone: '',

  // Trip basics
  travelStartDate: '',
  travelEndDate: '',
  totalNights: 0,
  totalDays: 0,
  numberOfAdults: 0,
  numberOfChildren: 0,
  childrenAges: [],

  // Multi-destination structure
  destinations: [],                // Array of quotationDestinationSchema

  // Combined pricing across all destinations, per tier
  // { STANDARD: { perPerson: 0, total: 0 }, DELUXE: {...}, ... }
  combinedPricing: {},

  // Metadata
  currency: 'INR',
  quotedBy: '',                    // Sales agent name
  quotedAt: '',                    // Timestamp
  validUntil: '',                  // Quote expiry date (7-14 days typical)

  // Terms
  paymentSchedule: [],              // Array of { milestone, percentOrAmount, dueDate }
  cancellationPolicy: '',           // Text block
  bookingTerms: '',                 // Text block
  visaAdvice: '',                   // Text block

  // Style
  themeColor: '#0d1b3e',           // Navy default
  accentColor: '#c9a84c',           // Gold default

  // Delivery
  sentAt: '',
  sentTo: '',                      // Client's email
  sentVia: '',                     // 'email' | 'whatsapp' | 'download'
  viewedByClient: false,
  viewedAt: '',

  // Booking outcome
  clientResponse: '',              // 'accepted' | 'declined' | 'wants_revision' | 'pending'
  bookedTierCode: '',              // Which tier they picked
  bookedAt: '',
  declineReason: '',

  createdAt: '',
  updatedAt: '',
};

/* ─── Quotation number generator ────────────────────────── */

/**
 * Generate a client-facing quotation number.
 *   VE-Q-2608-K7QA-01
 *   VE-Q = Voyage-Ed Quotation prefix
 *   2608 = Year 26, Month 08
 *   K7QA = 4-char alphanumeric (matches deal number style)
 *   01   = Version (revisions bump this)
 */
export const generateQuotationNumber = (dealNumber = '', version = 1, date = new Date()) => {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const versionStr = String(version).padStart(2, '0');

  // If we have a deal number like "VE-2608-K7QA", reuse its suffix
  const dealSuffix = dealNumber.split('-').slice(-1)[0] || randomSuffix();

  return `VE-Q-${yy}${mm}-${dealSuffix}-${versionStr}`;
};

const randomSuffix = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let r = '';
  for (let i = 0; i < 4; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
};

/* ─── Tier pricing rollup ────────────────────────────────── */

/**
 * Given a tier and party composition, compute the client-facing
 * pricing (total, per adult, per child, single supplement).
 *
 * All numbers are INR, all-inclusive. Vendor cost is separate.
 */
export const computeTierPricing = (tier, party) => {
  if (!tier || !party) return { perPerson: 0, total: 0, perAdult: 0, perChild: 0 };

  const adults = num(party.numberOfAdults) || 0;
  const children = num(party.numberOfChildren) || 0;
  const perPerson = num(tier.perPersonPrice);
  const perChild = num(tier.childPrice);
  const singleSup = adults === 1 ? num(tier.singleSupplement) : 0;

  const adultsTotal = perPerson * adults + singleSup;
  const childrenTotal = perChild * children;
  const total = adultsTotal + childrenTotal;

  return {
    perAdult: perPerson,
    perChild: perChild,
    singleSupplement: singleSup,
    adultsTotal,
    childrenTotal,
    total,
    perPerson: (adults + children) > 0 ? Math.round(total / (adults + children)) : 0,
  };
};

/**
 * For a multi-destination quotation, compute combined pricing across
 * all destinations per tier.
 *
 * Result: {
 *   STANDARD: { perPerson, total, byDestination: { VN: {...}, BA: {...} } },
 *   DELUXE:   { ... },
 * }
 */
export const computeCombinedPricing = (quotation) => {
  if (!quotation || !Array.isArray(quotation.destinations)) return {};

  const party = {
    numberOfAdults: num(quotation.numberOfAdults),
    numberOfChildren: num(quotation.numberOfChildren),
  };

  // Collect all unique tier codes across destinations
  const tierCodes = new Set();
  quotation.destinations.forEach((d) => {
    (d.tiers || []).forEach((t) => tierCodes.add(t.code));
  });

  const result = {};
  tierCodes.forEach((code) => {
    let totalAcrossDestinations = 0;
    const byDestination = {};

    quotation.destinations.forEach((d) => {
      const tier = (d.tiers || []).find((t) => t.code === code);
      if (tier) {
        const pricing = computeTierPricing(tier, party);
        byDestination[d.destinationCode || d.destinationName] = pricing;
        totalAcrossDestinations += pricing.total;
      }
    });

    const pax = party.numberOfAdults + party.numberOfChildren;
    result[code] = {
      total: totalAcrossDestinations,
      perPerson: pax > 0 ? Math.round(totalAcrossDestinations / pax) : 0,
      byDestination,
    };
  });

  return result;
};

/* ─── Payment schedule ──────────────────────────────────── */

/**
 * Standard Voyage-Ed payment milestones. Vishal can override per deal.
 */
export const DEFAULT_PAYMENT_SCHEDULE = [
  { milestone: 'Booking confirmation', percent: 25, daysFromBooking: 0 },
  { milestone: 'Visa filing (if applicable)', percent: 25, daysFromBooking: 15 },
  { milestone: 'Final payment before travel', percent: 50, daysBeforeTravel: 30 },
];

/**
 * Materialise the payment schedule with actual amounts and dates.
 */
export const materialisePaymentSchedule = (totalAmount, travelStartDate, bookingDate = new Date()) => {
  const total = num(totalAmount);
  const travelDate = new Date(travelStartDate);
  const daysToTravel = Math.floor((travelDate - bookingDate) / (1000 * 60 * 60 * 24));

  const schedule = [];
  let remainingAmount = total;

  DEFAULT_PAYMENT_SCHEDULE.forEach((rule, idx) => {
    const amount = idx === DEFAULT_PAYMENT_SCHEDULE.length - 1
      ? remainingAmount  // Final: whatever's left (handles rounding)
      : Math.round(total * (rule.percent / 100));

    remainingAmount -= amount;

    let dueDate = new Date(bookingDate);
    if (rule.daysFromBooking != null) {
      dueDate.setDate(dueDate.getDate() + rule.daysFromBooking);
    } else if (rule.daysBeforeTravel != null) {
      dueDate = new Date(travelDate);
      dueDate.setDate(dueDate.getDate() - rule.daysBeforeTravel);
    }

    schedule.push({
      milestone: rule.milestone,
      percent: rule.percent,
      amount,
      dueDate: dueDate.toISOString().slice(0, 10),
      status: 'Pending',
    });
  });

  return schedule;
};

/* ─── Build quotation from deal ─────────────────────────── */

/**
 * Bootstrap a quotation from an existing deal. Used when Vishal clicks
 * "Generate Quotation" on Deal Detail. Pre-populates client info,
 * dates, and blank tier structures.
 */
export const buildQuotationFromDeal = (deal, options = {}) => {
  const now = new Date().toISOString();
  const dealNumber = deal.dealNumber || '';
  const version = num(options.version) || 1;

  const validDays = num(options.validForDays) || 14;
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validDays);

  // Handle multi-destination if deal has multiple entries (siblings)
  const destinations = Array.isArray(options.destinations) && options.destinations.length
    ? options.destinations
    : [{
        id: 'dest-' + Math.random().toString(36).slice(2, 8),
        destinationName: deal.destination || '',
        destinationCode: '',
        nights: num(deal.nights) || 0,
        cities: Array.isArray(deal.cities) ? deal.cities : [],
        dayPlan: [],
        tiers: buildDefaultTiers(),
      }];

  return {
    ...quotationSchema,
    id: 'quo-' + Math.random().toString(36).slice(2, 10),
    quotationNumber: generateQuotationNumber(dealNumber, version),
    version,
    parentQuotationId: options.parentQuotationId || '',
    dealId: deal.id || deal._id || '',
    enquiryId: deal.enquiryId || '',
    clientName: deal.clientName || '',
    clientEmail: deal.clientEmail || '',
    clientPhone: deal.clientPhone || '',
    travelStartDate: deal.travelStartDate || deal.startDate || '',
    travelEndDate: deal.travelEndDate || deal.endDate || '',
    totalNights: num(deal.nights),
    totalDays: num(deal.nights) + 1,
    numberOfAdults: num(deal.adults) || num(deal.numberOfAdults) || 2,
    numberOfChildren: num(deal.children) || num(deal.numberOfChildren) || 0,
    destinations,
    combinedPricing: {},
    quotedBy: options.quotedBy || 'Voyage-Ed',
    quotedAt: now,
    validUntil: validUntil.toISOString().slice(0, 10),
    paymentSchedule: [],
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * Empty tiers scaffold — Standard, Deluxe, Premium ready to fill.
 */
const buildDefaultTiers = () => {
  return QUOTATION_TIERS.slice(0, 3).map((t) => ({
    ...quotationTierSchema,
    id: 'tier-' + Math.random().toString(36).slice(2, 8),
    code: t.code,
    label: t.label,
    tierInclusions: [...COMMON_INCLUSIONS],
    tierExclusions: [...COMMON_EXCLUSIONS],
    mealPlan: 'Breakfast',
  }));
};

/* ─── Version management ────────────────────────────────── */

/**
 * Create a new revision of an existing quotation. Preserves the
 * original as the parent (audit trail).
 */
export const reviseQuotation = (quotation, changes = {}) => {
  const now = new Date().toISOString();
  const nextVersion = num(quotation.version) + 1;

  return {
    ...quotation,
    ...changes,
    id: 'quo-' + Math.random().toString(36).slice(2, 10),
    version: nextVersion,
    parentQuotationId: quotation.id,
    quotationNumber: generateQuotationNumber(
      quotation.dealId ? quotation.dealId.split('-').slice(-1)[0] : '',
      nextVersion
    ),
    sentAt: '',
    sentTo: '',
    viewedByClient: false,
    viewedAt: '',
    clientResponse: '',
    bookedTierCode: '',
    bookedAt: '',
    createdAt: now,
    updatedAt: now,
  };
};

/* ─── Public API ─────────────────────────────────────────── */

export default {
  QUOTATION_TIERS,
  COMMON_INCLUSIONS,
  COMMON_EXCLUSIONS,
  DEFAULT_PAYMENT_SCHEDULE,
  quotationSchema,
  quotationDestinationSchema,
  quotationTierSchema,
  dayPlanSchema,
  generateQuotationNumber,
  computeTierPricing,
  computeCombinedPricing,
  materialisePaymentSchedule,
  buildQuotationFromDeal,
  reviseQuotation,
};
