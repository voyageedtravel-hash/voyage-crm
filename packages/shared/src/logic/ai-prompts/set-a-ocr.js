/**
 * Voyage-Ed AI Prompts - Simpler Travel Components
 */

export const TRANSFER_OCR_SYSTEM_PROMPT = `Extract airport/hotel transfer booking. Return JSON only:
{ "confidence": 0-1, "vendorName": "", "transferType": "Airport Pickup|Airport Drop|...", "vehicleCategory": "Sedan|SUV|...", "pickupLocation": "", "pickupDateTime": "ISO", "dropLocation": "", "flightNumber": "", "meetAndGreet": boolean, "paxCount": int, "bagCount": int, "currency": "3-letter", "costPrice": number, "sellingPrice": number, "totalShownOnScreenshot": number, "notes": "", "uncertainFields": [] }`;

export const CAB_OCR_SYSTEM_PROMPT = `Extract cab rental booking. Return JSON only:
{ "confidence": 0-1, "vendorName": "", "cabType": "Local (8hr/80km)|Outstation|...", "vehicleCategory": "", "serviceStartDate": "YYYY-MM-DD", "serviceEndDate": "YYYY-MM-DD", "totalDays": int, "cityOfService": "", "route": "", "paxCount": int, "currency": "3-letter", "perDayRate": number, "driverBhataPerDay": number, "parkingCharges": number, "tollCharges": number, "costPrice": number, "sellingPrice": number, "totalShownOnScreenshot": number, "notes": "", "uncertainFields": [] }`;

export const ATTRACTION_OCR_SYSTEM_PROMPT = `Extract attraction/tour booking. Return JSON only:
{ "confidence": 0-1, "attractionName": "", "attractionType": "Theme Park Ticket|Museum Entry|...", "cityOfService": "", "activityDate": "YYYY-MM-DD", "activityTime": "HH:MM", "duration": "", "currency": "3-letter", "adultTicketPrice": number, "childTicketPrice": number, "seniorTicketPrice": number, "adultCount": int, "childCount": int, "seniorCount": int, "privateGuideCharge": number, "transportationCharge": number, "includesGuide": boolean, "includesMeal": boolean, "includesTransportation": boolean, "ticketNumbers": [], "totalShownOnScreenshot": number, "notes": "", "uncertainFields": [] }`;

export const EXTRA_OCR_SYSTEM_PROMPT = `Extract travel add-on (baggage/lounge/photographer/etc). Return JSON only:
{ "confidence": 0-1, "vendorName": "", "extraType": "Extra Baggage|Priority Pass|...", "description": "", "cityOfService": "", "serviceDate": "YYYY-MM-DD", "quantity": int, "currency": "3-letter", "unitPrice": number, "costPrice": number, "sellingPrice": number, "totalShownOnScreenshot": number, "notes": "", "uncertainFields": [] }`;

export const SIM_OCR_SYSTEM_PROMPT = `Extract SIM/eSIM booking. Return JSON only:
{ "confidence": 0-1, "provider": "Airalo|Nomad|Matrix Cellular|...", "simType": "eSIM (QR delivery)|Physical SIM|...", "region": "Single Country|Regional (Europe)|Global|...", "countriesCovered": [], "dataGB": number, "validityDays": int, "callingMinutes": int, "smsCount": int, "activationDate": "YYYY-MM-DD", "expiryDate": "YYYY-MM-DD", "qrCodeUrl": "", "simNumber": "", "currency": "3-letter", "quantity": int, "unitCost": number, "unitPrice": number, "deliveryMethod": "", "totalShownOnScreenshot": number, "notes": "", "uncertainFields": [] }`;

export const validateGenericOCR = (ocr, computed, options = {}) => {
  const warnings = [];
  const n = (v) => Number(v) || 0;
  const min = options.minConfidence ?? 0.7;
  const tol = options.totalTolerance ?? 0.05;
  if (n(ocr.confidence) < min) warnings.push({ level: 'warning', message: `Confidence ${Math.round(n(ocr.confidence)*100)}%` });
  const shown = n(ocr.totalShownOnScreenshot);
  const total = n(computed?.grandTotal) || n(computed?.costTotalINR) || n(computed?.computed);
  if (shown > 0 && total > 0) {
    const diff = Math.abs(shown - total) / shown;
    if (diff > tol) warnings.push({ level: 'warning', message: `Total mismatch ${Math.round(diff*100)}%` });
  }
  if (Array.isArray(ocr.uncertainFields) && ocr.uncertainFields.length) {
    warnings.push({ level: 'info', message: `Uncertain: ${ocr.uncertainFields.join(', ')}` });
  }
  return warnings;
};

export default {
  TRANSFER_OCR_SYSTEM_PROMPT, CAB_OCR_SYSTEM_PROMPT,
  ATTRACTION_OCR_SYSTEM_PROMPT, EXTRA_OCR_SYSTEM_PROMPT,
  SIM_OCR_SYSTEM_PROMPT, validateGenericOCR,
};
