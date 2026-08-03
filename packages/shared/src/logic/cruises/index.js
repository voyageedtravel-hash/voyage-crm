/**
 * Voyage-Ed Cruise Vendor Schema
 * ────────────────────────────────────────────────────────────
 * Cruises are a first-class travel component in V2 (ADR-015), not a
 * sub-type of Activities. They have their own pricing structure that
 * flights and hotels don't need:
 *
 *   - Cabin category (Interior / Ocean View / Balcony / Suite)
 *   - Per-cabin double-occupancy pricing (industry standard)
 *   - Single supplement charges
 *   - **Port charges & government taxes** (separate line, mandatory)
 *   - **Gratuities / service charges** (per person, per night)
 *   - Beverage / wifi / dining upgrade packages
 *   - Deposit + final-payment schedule (cruise lines require deposit
 *     at booking, balance ~90 days pre-sail)
 *   - Multi-stop itinerary with embarkation + ports of call
 *   - Cancellation timeline (very restrictive vs hotels — matters for
 *     the cancellation engine)
 *
 * This schema is the shape both:
 *   - the frontend form uses (Vishal fills / OCR fills)
 *   - the backend Mongoose validator accepts
 *   - the AI OCR extractor targets when reading a cruise screenshot
 *   - the profit-drill-down (ADR-014) breaks down
 *
 * See DECISIONS.md ADR-015 for the full 11-component list.
 * See ADR-011 for the AI action that triggers cruise-screenshot OCR.
 */

import { toINR, num } from '../finance/index.js';

/* ─── Constants ──────────────────────────────────────────── */

/** Cabin categories in ascending price order. Used by dropdowns and by
 * the OCR extractor to normalise variations like "OV / Oceanview". */
export const CRUISE_CABIN_CATEGORIES = [
  'Interior',
  'Ocean View',
  'Balcony',
  'Mini-Suite',
  'Suite',
  'Concierge Suite',
  'Penthouse Suite',
  'Owner\'s Suite',
];

/** Common cruise lines Voyage-Ed sells. Used for autocomplete + logo
 * matching + OCR normalisation. Expand as new lines get booked. */
export const CRUISE_LINES = [
  'Royal Caribbean',
  'Celebrity Cruises',
  'Norwegian Cruise Line',
  'Carnival',
  'MSC Cruises',
  'Costa Cruises',
  'Princess Cruises',
  'Holland America',
  'Cunard',
  'Cordelia Cruises',
  'Star Cruises',
  'Genting Dream',
  'Resorts World Cruises',
  'Disney Cruise Line',
  'Viking Ocean',
  'Silversea',
  'Regent Seven Seas',
  'Seabourn',
  'Oceania Cruises',
  'Aqua Expeditions',
];

/** Standard cruise durations Voyage-Ed sells. */
export const CRUISE_DURATIONS = [
  { nights: 1, label: '1 Night · Weekend Getaway' },
  { nights: 2, label: '2 Nights · Short Break' },
  { nights: 3, label: '3 Nights · Long Weekend' },
  { nights: 4, label: '4 Nights · Extended Weekend' },
  { nights: 5, label: '5 Nights · Short Cruise' },
  { nights: 6, label: '6 Nights' },
  { nights: 7, label: '7 Nights · Standard Cruise' },
  { nights: 8, label: '8 Nights' },
  { nights: 10, label: '10 Nights · Extended' },
  { nights: 11, label: '11 Nights · Extended' },
  { nights: 14, label: '14 Nights · Two Weeks' },
  { nights: 21, label: '21 Nights · World Segment' },
];

/** Meal / beverage package tiers commonly offered. */
export const CRUISE_MEAL_PACKAGES = [
  'Standard (included dining only)',
  'Classic Beverage Package',
  'Premium Beverage Package',
  'Specialty Dining 3 nights',
  'Specialty Dining 5 nights',
  'Ultimate Package (drinks + dining + wifi)',
];

/* ─── Vendor shape ───────────────────────────────────────── */

/**
 * The canonical shape of one cruise vendor on a deal. Every field is
 * optional at storage time (drafts are common), but the AI extractor
 * aims to fill as many as possible from a single screenshot.
 */
export const cruiseVendorSchema = {
  id: '',                        // uuid
  name: '',                      // Cruise line name, e.g. "Cordelia Cruises"

  // Ship + voyage identifiers
  shipName: '',                  // e.g. "MV Empress"
  voyageNumber: '',              // Booking reference / voyage code
  itineraryName: '',             // e.g. "Mumbai → Diu → Mumbai · 3 Nights"

  // Timing
  embarkationDate: '',           // YYYY-MM-DD
  disembarkationDate: '',        // YYYY-MM-DD
  nights: 0,                     // 1, 2, 3, 7, etc.
  embarkationPort: '',           // e.g. "Mumbai (Bombay)"
  disembarkationPort: '',        // e.g. "Mumbai (Bombay)"

  // Multi-stop itinerary
  ports: [],                     // See portOfCallSchema below

  // Cabin
  cabinCategory: '',             // From CRUISE_CABIN_CATEGORIES
  cabinNumber: '',               // Once assigned by cruise line
  cabinDeck: '',                 // e.g. "Deck 8"
  cabinOccupancy: 2,             // Doubles are default; singles pay supplement

  // Travellers on this cabin (subset of deal.travellers by id)
  travellerIds: [],

  // Pricing — the important part
  currency: 'INR',
  exchangeRate: 1,

  // Per-person base fare (cruise industry lists this way)
  perPersonBaseFare: 0,          // Fare for one adult, double occupancy
  numberOfAdults: 2,             // How many pay full fare
  numberOfChildren: 0,           // Kids often 50% or free
  perChildFare: 0,
  singleSupplement: 0,           // Applied when 1 adult in cabin

  // Mandatory extras (always separate from base fare in industry)
  portChargesPerPerson: 0,       // Port taxes + govt fees, per person
  gratuitiesPerPersonPerNight: 0,// Service charge, typically $15-20/night/pax
  gratuitiesTotal: 0,            // Computed = gratuitiesPerPersonPerNight × pax × nights

  // Optional add-ons
  mealPackage: '',               // From CRUISE_MEAL_PACKAGES
  mealPackagePrice: 0,           // Per person total
  beveragePackagePrice: 0,
  wifiPackagePrice: 0,
  shoreExcursionsPrice: 0,       // Sum of pre-booked excursions
  specialtyDiningPrice: 0,
  spaCreditPrice: 0,
  otherAddonsPrice: 0,
  otherAddonsNote: '',

  // Final numbers (what we quote to client and pay to vendor)
  costPrice: 0,                  // What we pay the cruise line
  sellingPrice: 0,               // What client pays us

  // Booking status
  bookingReference: '',          // Cruise line booking number
  bookingStatus: 'Enquiry',      // Enquiry / Held / Confirmed / Ticketed / Sailed / Cancelled
  holdExpiresAt: '',             // Cruise lines often hold cabins for 3-7 days

  // Payment schedule (cruise lines require staged payments)
  depositAmount: 0,              // ~10-25% at booking
  depositDueAt: '',
  balanceAmount: 0,
  balanceDueAt: '',              // Usually 60-90 days before sailing

  // Payments made
  payments: [],                  // Standard payment log shape

  // Cancellation policy (cruise-specific — different from hotels)
  cancellationPolicy: '',        // Free text summary
  cancellationScheduleCode: '',  // Structured code for auto-computing penalties

  // Documents
  cruiseTicketPdfUrl: '',
  boardingPassUrl: '',
  itineraryPdfUrl: '',

  // Notes
  notes: '',

  // Metadata
  createdAt: '',
  updatedAt: '',
  extractedByAI: false,          // True if OCR filled the fields
  extractedAt: '',
  extractedFromFileName: '',
};

/** Port of call sub-schema (each stop within the cruise). */
export const portOfCallSchema = {
  id: '',
  portName: '',                  // e.g. "Diu"
  arrivalDate: '',               // YYYY-MM-DD
  arrivalTime: '',               // HH:MM
  departureDate: '',             // Usually same day for short calls
  departureTime: '',
  atSea: false,                  // True for "sea day" (no port)
  shoreExcursion: '',            // What the client booked ashore
  excursionCost: 0,
  excursionSelling: 0,
};

/* ─── Pricing rollup ─────────────────────────────────────── */

/**
 * Compute the total cost and total sell for a cruise vendor, correctly
 * accounting for port charges + gratuities + all add-ons.
 *
 * This is what the deal financial ribbon uses. Byte-identical results
 * between web and mobile via the shared package.
 *
 * @param {Object} cruise - a cruise vendor object matching cruiseVendorSchema
 * @returns {{
 *   baseFareTotal: number,
 *   portChargesTotal: number,
 *   gratuitiesTotal: number,
 *   addonsTotal: number,
 *   costTotalINR: number,
 *   sellTotalINR: number
 * }}
 */
export const cruisePriceBreakdown = (cruise) => {
  if (!cruise) return zeroBreakdown();

  const rate = num(cruise.exchangeRate) || 1;
  const currency = cruise.currency || 'INR';
  const toINRLocal = (v) => toINR(v, currency, rate);

  const adults = num(cruise.numberOfAdults);
  const children = num(cruise.numberOfChildren);
  const nights = num(cruise.nights);
  const pax = adults + children;

  // Base fare — adults at full, children at their fare
  const adultFareTotal = num(cruise.perPersonBaseFare) * adults;
  const childFareTotal = num(cruise.perChildFare) * children;
  const singleSup = adults === 1 ? num(cruise.singleSupplement) : 0;
  const baseFareTotal = adultFareTotal + childFareTotal + singleSup;

  // Port charges — usually per person, applied to everyone including children
  const portChargesTotal = num(cruise.portChargesPerPerson) * pax;

  // Gratuities — per person per night. Auto-compute if user hasn't overridden.
  const gratuitiesComputed = num(cruise.gratuitiesPerPersonPerNight) * pax * nights;
  const gratuitiesTotal = num(cruise.gratuitiesTotal) || gratuitiesComputed;

  // Add-ons
  const addonsTotal =
    num(cruise.mealPackagePrice) +
    num(cruise.beveragePackagePrice) +
    num(cruise.wifiPackagePrice) +
    num(cruise.shoreExcursionsPrice) +
    num(cruise.specialtyDiningPrice) +
    num(cruise.spaCreditPrice) +
    num(cruise.otherAddonsPrice);

  // Grand totals — costPrice/sellingPrice on the vendor override the
  // computed sums (so Vishal can lock a special rate a vendor gave him
  // that doesn't match the arithmetic).
  const computedCost = baseFareTotal + portChargesTotal + gratuitiesTotal + addonsTotal;

  // If explicit cost/sell set, use them. Otherwise use computed.
  const costRaw = num(cruise.costPrice) || computedCost;
  const sellRaw = num(cruise.sellingPrice) || computedCost;

  return {
    baseFareTotal: toINRLocal(baseFareTotal),
    portChargesTotal: toINRLocal(portChargesTotal),
    gratuitiesTotal: toINRLocal(gratuitiesTotal),
    addonsTotal: toINRLocal(addonsTotal),
    costTotalINR: toINRLocal(costRaw),
    sellTotalINR: toINRLocal(sellRaw),
    perPersonBreakdown: {
      baseFarePP: pax > 0 ? toINRLocal(baseFareTotal / pax) : 0,
      portChargesPP: toINRLocal(num(cruise.portChargesPerPerson)),
      gratuitiesPP: nights > 0
        ? toINRLocal(gratuitiesTotal / pax) : 0,
      totalPerPerson: pax > 0 ? toINRLocal(costRaw / pax) : 0,
    },
  };
};

const zeroBreakdown = () => ({
  baseFareTotal: 0,
  portChargesTotal: 0,
  gratuitiesTotal: 0,
  addonsTotal: 0,
  costTotalINR: 0,
  sellTotalINR: 0,
  perPersonBreakdown: {
    baseFarePP: 0,
    portChargesPP: 0,
    gratuitiesPP: 0,
    totalPerPerson: 0,
  },
});

/* ─── AI OCR extraction contract ─────────────────────────── */

/**
 * The exact JSON shape the AI vision endpoint should return when
 * given a cruise booking screenshot. Used as the "system prompt"
 * contract when we call Anthropic vision from the deal AI button.
 *
 * The AI's job:
 *   1. Read the screenshot (Cordelia / Royal Caribbean / MSC etc.)
 *   2. Extract into this shape
 *   3. Compute NOTHING — return raw numbers; our code does the math
 *
 * The frontend then calls cruisePriceBreakdown() on the result to
 * get the totals, and shows a preview (per ADR-011 pattern:
 * preview → user confirms → apply). Same as AI Cancellation.
 */
export const cruiseOCRTargetShape = {
  confidence: 0,        // 0-1, AI's own confidence in the extraction

  cruiseLine: '',        // Matched to CRUISE_LINES if possible
  shipName: '',
  voyageNumber: '',
  itineraryName: '',

  embarkationDate: '',
  embarkationPort: '',
  disembarkationDate: '',
  disembarkationPort: '',
  nights: 0,

  ports: [
    // { portName, arrivalDate, arrivalTime, departureTime, atSea }
  ],

  cabinCategory: '',
  cabinNumber: '',
  cabinDeck: '',

  currency: '',          // AI reads the symbol from the screenshot
  numberOfAdults: 0,
  numberOfChildren: 0,

  perPersonBaseFare: 0,
  perChildFare: 0,
  singleSupplement: 0,

  portChargesPerPerson: 0,
  gratuitiesPerPersonPerNight: 0,
  gratuitiesTotal: 0,    // If shown as one line, capture as-is

  mealPackage: '',
  mealPackagePrice: 0,
  beveragePackagePrice: 0,
  wifiPackagePrice: 0,

  totalShownOnScreenshot: 0,  // Sanity-check field — must roughly match computed

  notes: '',

  // Fields the AI could not read confidently
  uncertainFields: [],
};

/**
 * Merge an AI-extracted cruise object into a new vendor record with
 * sensible defaults for whatever the AI could not extract.
 */
export const buildCruiseVendorFromOCR = (ocrResult, options = {}) => {
  const now = new Date().toISOString();
  const nights = num(ocrResult.nights);

  return {
    ...cruiseVendorSchema,
    id: options.id || generateVendorId(),
    name: ocrResult.cruiseLine || '',
    shipName: ocrResult.shipName || '',
    voyageNumber: ocrResult.voyageNumber || '',
    itineraryName: ocrResult.itineraryName || '',

    embarkationDate: ocrResult.embarkationDate || '',
    disembarkationDate: ocrResult.disembarkationDate || '',
    nights,
    embarkationPort: ocrResult.embarkationPort || '',
    disembarkationPort: ocrResult.disembarkationPort || '',
    ports: Array.isArray(ocrResult.ports) ? ocrResult.ports : [],

    cabinCategory: ocrResult.cabinCategory || '',
    cabinNumber: ocrResult.cabinNumber || '',
    cabinDeck: ocrResult.cabinDeck || '',

    currency: ocrResult.currency || 'INR',
    exchangeRate: options.exchangeRate || 1,

    numberOfAdults: num(ocrResult.numberOfAdults) || 2,
    numberOfChildren: num(ocrResult.numberOfChildren),

    perPersonBaseFare: num(ocrResult.perPersonBaseFare),
    perChildFare: num(ocrResult.perChildFare),
    singleSupplement: num(ocrResult.singleSupplement),

    portChargesPerPerson: num(ocrResult.portChargesPerPerson),
    gratuitiesPerPersonPerNight: num(ocrResult.gratuitiesPerPersonPerNight),
    gratuitiesTotal: num(ocrResult.gratuitiesTotal),

    mealPackage: ocrResult.mealPackage || '',
    mealPackagePrice: num(ocrResult.mealPackagePrice),
    beveragePackagePrice: num(ocrResult.beveragePackagePrice),
    wifiPackagePrice: num(ocrResult.wifiPackagePrice),

    notes: ocrResult.notes || '',

    extractedByAI: true,
    extractedAt: now,
    extractedFromFileName: options.fileName || '',
    createdAt: now,
    updatedAt: now,
    bookingStatus: 'Enquiry',
  };
};

const generateVendorId = () =>
  'cr-' + Math.random().toString(36).slice(2, 10);

/* ─── Public API ─────────────────────────────────────────── */

export default {
  CRUISE_CABIN_CATEGORIES,
  CRUISE_LINES,
  CRUISE_DURATIONS,
  CRUISE_MEAL_PACKAGES,
  cruiseVendorSchema,
  portOfCallSchema,
  cruiseOCRTargetShape,
  cruisePriceBreakdown,
  buildCruiseVendorFromOCR,
};
