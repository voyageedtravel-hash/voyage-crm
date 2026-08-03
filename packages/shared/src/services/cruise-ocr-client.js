/**
 * Voyage-Ed Cruise OCR Client
 * ────────────────────────────────────────────────────────────
 * Wraps the /api/chat endpoint to specifically extract cruise details
 * from a screenshot or PDF page. Used by both:
 *   - packages/web (Deal Detail Cruises section — camera / file upload)
 *   - packages/mobile (Expo camera → sends here)
 *
 * Contract:
 *   Input:  { imageBase64, mimeType?, fileName? }
 *   Output: { ocr, warnings, vendor }
 *
 *   ocr      = raw JSON parsed from Claude vision response
 *   warnings = array from validateCruiseOCR() — surfaced in preview UI
 *   vendor   = fully-populated cruise vendor record ready to append
 *              to deal.cruiseVendors[] (after user confirms)
 *
 * The preview → confirm → apply pattern (ADR-011) means the caller
 * MUST show the preview UI before persisting. This service does NOT
 * write to the deal — it just returns the extracted vendor object.
 */

import {
  CRUISE_OCR_SYSTEM_PROMPT,
  validateCruiseOCR,
} from '../logic/ai-prompts/cruise-ocr.js';
import {
  cruisePriceBreakdown,
  buildCruiseVendorFromOCR,
} from '../logic/cruises/index.js';

/**
 * The API base URL — resolved lazily so tests can override.
 * Web reads REACT_APP_API_URL. Mobile passes explicit config.
 */
const getApiBase = (config = {}) => {
  if (config.apiBase) return config.apiBase;
  if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  return 'https://voyage-crm.onrender.com';
};

/**
 * Extract cruise details from an image.
 *
 * @param {Object} params
 * @param {string} params.imageBase64 - base64-encoded image (no data:URI prefix)
 * @param {string} [params.mimeType]  - e.g. 'image/png', 'image/jpeg'
 * @param {string} [params.fileName]  - original filename for audit
 * @param {string} [params.token]     - JWT auth token
 * @param {number} [params.exchangeRate] - INR rate for foreign currency
 * @param {Object} [config]           - { apiBase, model }
 * @returns {Promise<{ ocr, warnings, vendor, computed }>}
 */
export const extractCruiseFromImage = async (params, config = {}) => {
  const {
    imageBase64,
    mimeType = 'image/png',
    fileName = 'cruise-screenshot.png',
    token,
    exchangeRate = 1,
  } = params;

  if (!imageBase64) {
    throw new Error('extractCruiseFromImage: imageBase64 is required');
  }

  const apiBase = getApiBase(config);
  const model = config.model || 'claude-sonnet-4-6';   // Vision needs Sonnet

  // Anthropic vision message payload
  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mimeType,
            data: imageBase64,
          },
        },
        {
          type: 'text',
          text: 'Extract cruise details from this screenshot into the JSON schema. Return JSON only.',
        },
      ],
    },
  ];

  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${apiBase}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      system: CRUISE_OCR_SYSTEM_PROMPT,
      messages,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`Cruise OCR failed (${response.status}): ${errText}`);
  }

  const data = await response.json();

  // Anthropic returns { content: [{ type: 'text', text: '{...json...}' }] }
  const rawText = extractResponseText(data);
  const ocr = safeParseOCRJson(rawText);

  // Compute totals using the shared pricing engine so preview shows real numbers
  const provisionalVendor = buildCruiseVendorFromOCR(ocr, {
    fileName,
    exchangeRate,
  });
  const computed = cruisePriceBreakdown(provisionalVendor);

  // Validate + gather warnings
  const warnings = validateCruiseOCR(ocr, computed);

  return {
    ocr,          // Raw AI extraction
    warnings,     // Advisory messages for the preview UI
    vendor: provisionalVendor,  // Vendor record ready to insert
    computed,     // Full price breakdown
  };
};

/* ─── Helpers ────────────────────────────────────────────── */

const extractResponseText = (anthropicData) => {
  if (!anthropicData) return '';
  if (typeof anthropicData === 'string') return anthropicData;
  const content = anthropicData.content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((c) => c && c.type === 'text' && typeof c.text === 'string')
    .map((c) => c.text)
    .join('\n');
};

/**
 * Anthropic may wrap the JSON in ```json fences or preface it with a
 * short explanation despite instructions. Strip that reliably.
 */
const safeParseOCRJson = (raw) => {
  if (!raw) return {};

  // Strip common markdown wrappers
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  cleaned = cleaned.replace(/^```\s*/i, '').replace(/```$/i, '').trim();

  // Find the first { and the matching last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn('[cruise-ocr] JSON parse failed:', err.message);
    console.warn('[cruise-ocr] raw response:', raw.slice(0, 500));
    return { confidence: 0, uncertainFields: ['ALL_FIELDS_PARSE_FAILED'] };
  }
};

export default { extractCruiseFromImage };
