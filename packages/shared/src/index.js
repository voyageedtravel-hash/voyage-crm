/**
 * @voyage/shared — public API
 *
 * Import: import { dealFinance, fmtINR } from '@voyage/shared';
 * or:     import { dealFinance } from '@voyage/shared/finance';
 * or:     import { cruisePriceBreakdown } from '@voyage/shared/cruises';
 */

// Finance
export * from './logic/finance/index.js';
export { default as finance } from './logic/finance/index.js';

// Cruises (ADR-015)
export * from './logic/cruises/index.js';
export { default as cruises } from './logic/cruises/index.js';

// AI prompts
export {
  CRUISE_OCR_SYSTEM_PROMPT,
  CRUISE_OCR_PREVIEW_HINTS,
  validateCruiseOCR,
} from './logic/ai-prompts/cruise-ocr.js';

// Services (client-side wrappers around backend)
export { extractCruiseFromImage } from './services/cruise-ocr-client.js';
