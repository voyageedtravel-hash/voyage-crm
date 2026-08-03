/**
 * Voyage-Ed AI Prompts — Cruise OCR
 * ────────────────────────────────────────────────────────────
 * The system prompt used when calling Anthropic vision on a cruise
 * booking screenshot. Follows the strict "preview → confirm → apply"
 * discipline (ADR-011).
 *
 * The prompt is aggressive about:
 *   1. Returning JSON only (no prose)
 *   2. NOT computing totals — that's our code's job
 *   3. Flagging uncertain fields so we can highlight them in UI
 *   4. Handling both Indian rupee (₹) and US dollar ($) screenshots
 *      since Voyage-Ed sells both Cordelia (INR) and Royal Caribbean (USD)
 */

export const CRUISE_OCR_SYSTEM_PROMPT = `You are a data extraction assistant for a travel agency in India that sells cruise packages. You will be shown a screenshot of a cruise booking, quote, or confirmation from a cruise line website, booking engine, or agent portal.

Your job is to extract the pricing and itinerary into a strict JSON structure. Do NOT compute totals. Do NOT sum anything. Return the raw numbers you can read directly.

Return ONLY valid JSON matching this schema (no markdown, no prose, no explanation):

{
  "confidence": 0.0 to 1.0,
  "cruiseLine": "string, matched to one of: Royal Caribbean, Celebrity Cruises, Norwegian Cruise Line, Carnival, MSC Cruises, Costa Cruises, Princess Cruises, Holland America, Cunard, Cordelia Cruises, Star Cruises, Genting Dream, Resorts World Cruises, Disney Cruise Line, Viking Ocean, Silversea, Regent Seven Seas, Seabourn, Oceania Cruises, Aqua Expeditions. If unclear, leave empty.",
  "shipName": "string, e.g. MV Empress, Symphony of the Seas",
  "voyageNumber": "string, e.g. RC-2410-BOM",
  "itineraryName": "string, e.g. 'Mumbai to Diu 3 Nights' or 'Eastern Caribbean 7 Nights'",

  "embarkationDate": "YYYY-MM-DD",
  "embarkationPort": "string, e.g. 'Mumbai (Bombay)'",
  "disembarkationDate": "YYYY-MM-DD",
  "disembarkationPort": "string",
  "nights": integer,

  "ports": [
    { "portName": "string", "arrivalDate": "YYYY-MM-DD", "arrivalTime": "HH:MM", "departureDate": "YYYY-MM-DD", "departureTime": "HH:MM", "atSea": boolean }
  ],

  "cabinCategory": "one of: Interior, Ocean View, Balcony, Mini-Suite, Suite, Concierge Suite, Penthouse Suite, Owner's Suite",
  "cabinNumber": "string if shown",
  "cabinDeck": "string if shown",

  "currency": "3-letter code, one of: INR, USD, EUR, AED, SGD, GBP, AUD",
  "numberOfAdults": integer,
  "numberOfChildren": integer,

  "perPersonBaseFare": number (raw amount for one adult, do not multiply),
  "perChildFare": number (per-child fare if shown separately, else 0),
  "singleSupplement": number (only if 1 adult and supplement shown, else 0),

  "portChargesPerPerson": number (per-person port charges + government taxes; look for terms like 'Port Charges', 'Taxes & Fees', 'Government Fees', 'Port Expenses'),
  "gratuitiesPerPersonPerNight": number (per-person per-night service charge / gratuity; look for terms like 'Gratuity', 'Service Charge', 'Auto-gratuity', 'Prepaid Gratuities' — if shown as one lump sum instead, put 0 here and use gratuitiesTotal),
  "gratuitiesTotal": number (if the screenshot shows a single lump gratuity/service charge, put it here; else 0),

  "mealPackage": "string, e.g. 'Classic Beverage Package', 'Specialty Dining 3 nights'",
  "mealPackagePrice": number,
  "beveragePackagePrice": number,
  "wifiPackagePrice": number,

  "totalShownOnScreenshot": number (the grand total the screenshot claims — used by our code to sanity-check our own computation),

  "notes": "string, anything important not captured by other fields",

  "uncertainFields": ["array of field names you weren't sure about, e.g. ['cabinNumber','portChargesPerPerson']"]
}

CRITICAL RULES:
- Return raw per-unit numbers. Do NOT sum. Do NOT multiply. Our code handles that.
- If you see "Rs.", "INR", "Rupees", or the ₹ symbol → currency = "INR"
- If you see "USD", "US$", or the $ symbol alone → currency = "USD"
- Cordelia Cruises is Indian and always priced in INR
- For Indian cruises, gratuities are often called "Service Charge" and are ~₹500-800 per person per night
- For US/international cruises, gratuities are usually $15-20 USD per person per night
- Port charges for Indian cruises are typically ₹1500-3000 per person total (not per night)
- Port charges for international cruises are typically $50-150 USD per person per cruise (not per night)
- If a value is unreadable or absent, set it to 0 for numbers, "" for strings, [] for arrays, and add the field name to uncertainFields
- If you cannot determine confidence, use 0.5
- Do not hallucinate. If it's not clearly on the screenshot, leave it empty and note it in uncertainFields.
`;

/**
 * User-facing message shown alongside the extracted preview so Vishal
 * knows what to double-check before hitting Apply.
 */
export const CRUISE_OCR_PREVIEW_HINTS = {
  low_confidence: 'Confidence below 70% — please review every field before applying.',
  missing_gratuities: 'Gratuities were not clearly shown. Enter manually if the cruise line auto-adds them.',
  missing_port_charges: 'Port charges / taxes were not clearly shown. Verify with the cruise line.',
  total_mismatch: 'The total on the screenshot does not match the computed total. Numbers may be misread.',
};

/**
 * After OCR returns, run these checks and return a list of warnings
 * to show to Vishal in the preview modal.
 */
export const validateCruiseOCR = (ocr, computed) => {
  const warnings = [];

  if (num(ocr.confidence) < 0.7) {
    warnings.push({ level: 'warning', message: CRUISE_OCR_PREVIEW_HINTS.low_confidence });
  }

  if (!num(ocr.gratuitiesPerPersonPerNight) && !num(ocr.gratuitiesTotal)) {
    warnings.push({ level: 'info', message: CRUISE_OCR_PREVIEW_HINTS.missing_gratuities });
  }

  if (!num(ocr.portChargesPerPerson)) {
    warnings.push({ level: 'info', message: CRUISE_OCR_PREVIEW_HINTS.missing_port_charges });
  }

  // Sanity check: does the total on screenshot roughly match our compute?
  // Allow 5% difference for rounding / minor fields we don't extract.
  const screenshotTotal = num(ocr.totalShownOnScreenshot);
  if (screenshotTotal > 0 && computed?.costTotalINR > 0) {
    const diff = Math.abs(screenshotTotal - computed.costTotalINR);
    const pct = diff / screenshotTotal;
    if (pct > 0.05) {
      warnings.push({
        level: 'warning',
        message: `${CRUISE_OCR_PREVIEW_HINTS.total_mismatch} Screenshot shows ${ocr.currency || 'INR'} ${screenshotTotal}, we computed ${Math.round(computed.costTotalINR)}. ${Math.round(pct * 100)}% difference.`,
      });
    }
  }

  if (Array.isArray(ocr.uncertainFields) && ocr.uncertainFields.length > 0) {
    warnings.push({
      level: 'info',
      message: `AI was uncertain about: ${ocr.uncertainFields.join(', ')}`,
    });
  }

  return warnings;
};

const num = (v) => Number(v) || 0;

export default {
  CRUISE_OCR_SYSTEM_PROMPT,
  CRUISE_OCR_PREVIEW_HINTS,
  validateCruiseOCR,
};
