/**
 * @voyage/shared — public API
 * Import: import { dealFinance, fmtINR } from '@voyage/shared';
 */

// Finance
export * from './logic/finance/index.js';
export { default as finance } from './logic/finance/index.js';

// Travel components (ADR-015)
export * from './logic/cruises/index.js';
export { default as cruises } from './logic/cruises/index.js';

export * from './logic/insurance/index.js';
export { default as insurance } from './logic/insurance/index.js';

export * from './logic/transfers/index.js';
export { default as transfers } from './logic/transfers/index.js';

export * from './logic/cabs/index.js';
export { default as cabs } from './logic/cabs/index.js';

export * from './logic/attractions/index.js';
export { default as attractions } from './logic/attractions/index.js';

export * from './logic/extras/index.js';
export { default as extras } from './logic/extras/index.js';

export * from './logic/sim/index.js';
export { default as sim } from './logic/sim/index.js';

// Cancellation
export * from './logic/cancellation/index.js';
export { default as cancellation } from './logic/cancellation/index.js';

// AI OCR prompts
export {
  CRUISE_OCR_SYSTEM_PROMPT,
  CRUISE_OCR_PREVIEW_HINTS,
  validateCruiseOCR,
} from './logic/ai-prompts/cruise-ocr.js';

export {
  INSURANCE_OCR_SYSTEM_PROMPT,
  validateInsuranceOCR,
} from './logic/ai-prompts/insurance-ocr.js';

export {
  TRANSFER_OCR_SYSTEM_PROMPT,
  CAB_OCR_SYSTEM_PROMPT,
  ATTRACTION_OCR_SYSTEM_PROMPT,
  EXTRA_OCR_SYSTEM_PROMPT,
  SIM_OCR_SYSTEM_PROMPT,
  validateGenericOCR,
} from './logic/ai-prompts/set-a-ocr.js';

// Services
export { extractCruiseFromImage } from './services/cruise-ocr-client.js';
