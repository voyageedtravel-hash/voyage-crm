/**
 * Voyage-Ed Cancellation Engine (extracted from V1)
 *
 * 4-field model: refundToClient, penaltyToClient, vendorCancellationLoss,
 * myProfitOnCancellation. Profit = penalty + myProfit - vendorLoss.
 */

import { num } from '../finance/index.js';

export const CANCELLATION_STATUSES = [
  'Requested', 'Under Review', 'Vendor Notified',
  'Refund Approved', 'Refund Processed', 'No Refund Due',
  'Closed', 'Reversed',
];

export const CANCELLATION_REASONS = [
  'Client Personal', 'Client Health', 'Client Financial',
  'Visa Rejection', 'Force Majeure', 'Client Rescheduling',
  'Vendor Issue', 'Our Error', 'Other',
];

export const cancelCompute = (cxl, deal) => {
  if (!cxl) return { refund: 0, penalty: 0, profit: 0, cancelledCompOrigProfit: 0 };
  const refund = num(cxl.refundToClient);
  const penalty = num(cxl.penaltyToClient);
  const vendorLoss = num(cxl.vendorCancellationLoss);
  const myProfit = num(cxl.myProfitOnCancellation);
  return {
    refund, penalty,
    profit: penalty + myProfit - vendorLoss,
    cancelledCompOrigProfit: num(cxl.originalCompProfit),
  };
};

export const computeCancellationImpact = (deal, cancellation) => {
  const result = cancelCompute(cancellation, deal);
  const existingCxls = (deal?.cancellations || []).filter((c) =>
    ['Refund Approved', 'Refund Processed', 'No Refund Due', 'Closed'].includes(c.status)
  );
  const existingImpact = existingCxls.reduce(
    (acc, c) => {
      const r = cancelCompute(c, deal);
      return {
        totalRefund: acc.totalRefund + r.refund,
        totalPenalty: acc.totalPenalty + r.penalty,
        totalProfit: acc.totalProfit + r.profit,
      };
    },
    { totalRefund: 0, totalPenalty: 0, totalProfit: 0 }
  );
  return {
    ...result,
    priorImpact: existingImpact,
    combined: {
      totalRefund: existingImpact.totalRefund + result.refund,
      totalPenalty: existingImpact.totalPenalty + result.penalty,
      totalProfit: existingImpact.totalProfit + result.profit,
    },
    profitDelta: result.profit - num(cancellation?.originalCompProfit),
  };
};

export const cancellationAITargetShape = {
  reason: '', status: 'Requested',
  refundToClient: 0, penaltyToClient: 0,
  vendorCancellationLoss: 0, myProfitOnCancellation: 0,
  affectedVendors: [], clientNarrative: '', vendorNarrative: '', internalNotes: '',
};

export const decodeCancellationPolicy = (code) => {
  if (!code || typeof code !== 'string') return [];
  const rules = [];
  const match1 = code.match(/^F(\d+)-P(\d+)-N(\d+)$/);
  if (match1) {
    rules.push({ daysBeforeTravel: parseInt(match1[1]), refundPercent: 100 });
    rules.push({ daysBeforeTravel: parseInt(match1[2]), refundPercent: 50 });
    rules.push({ daysBeforeTravel: parseInt(match1[3]), refundPercent: 0 });
    return rules;
  }
  const parts = code.split('/');
  for (const p of parts) {
    const m = p.trim().match(/^(\d+)d:(.+)$/i);
    if (m) {
      const days = parseInt(m[1]);
      const val = m[2].toLowerCase();
      let refund = 100;
      if (val === 'free' || val === '0') refund = 100;
      else if (val === '100' || val === 'full') refund = 0;
      else refund = 100 - parseInt(val);
      rules.push({ daysBeforeTravel: days, refundPercent: refund });
    }
  }
  return rules;
};

export const refundPercentForDaysOut = (schedule, daysBeforeTravel) => {
  if (!Array.isArray(schedule) || schedule.length === 0) return 100;
  const sorted = [...schedule].sort((a, b) => b.daysBeforeTravel - a.daysBeforeTravel);
  for (const rule of sorted) {
    if (daysBeforeTravel >= rule.daysBeforeTravel) return rule.refundPercent;
  }
  return 0;
};

export default {
  CANCELLATION_STATUSES, CANCELLATION_REASONS,
  cancelCompute, computeCancellationImpact, cancellationAITargetShape,
  decodeCancellationPolicy, refundPercentForDaysOut,
};
