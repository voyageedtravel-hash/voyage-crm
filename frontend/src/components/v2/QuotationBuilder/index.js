/**
 * Voyage-Ed V2 Quotation Builder
 * ────────────────────────────────────────────────────────────
 * Displays inside Deal Detail. Gated behind the `newQuotationBuilder`
 * feature flag so V1 stays untouched.
 *
 * Design language: matches approved mockups (navy + gold, Playfair,
 * accordion sections per ADR-010).
 *
 * Data flow:
 *   1. `buildQuotationFromDeal(deal)` bootstraps a fresh quotation
 *      with 3 tiers ready to fill.
 *   2. Vishal edits each tier (hotels, activities, per-person price)
 *   3. `computeCombinedPricing()` recomputes on every change.
 *   4. "Save Draft" persists to backend `deal.quotations[]`.
 *   5. "Generate PDF" opens a preview modal → download.
 *
 * All heavy math is in @voyage/shared/quotation. This file is
 * purely presentational.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  QUOTATION_TIERS,
  COMMON_INCLUSIONS,
  COMMON_EXCLUSIONS,
  buildQuotationFromDeal,
  reviseQuotation,
  computeTierPricing,
  computeCombinedPricing,
  materialisePaymentSchedule,
} from '../../../../packages/shared/src/logic/quotation/index.js';
import { fmtINR } from '../../../../packages/shared/src/logic/finance/index.js';

/* ─── Styles (V2 design tokens inlined) ──────────────────── */

const styles = {
  root: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    color: '#0f2350',
    background: '#f9fafc',
    padding: '24px',
    borderRadius: '18px',
    border: '1px solid #e8ecf5',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    paddingBottom: '20px',
    borderBottom: '2px solid #c9a84c',
  },
  headerTitle: {
    fontFamily: '"Playfair Display", Georgia, serif',
    fontSize: '26px',
    fontWeight: 600,
    color: '#0d1b3e',
    margin: 0,
    letterSpacing: '-0.5px',
  },
  headerMeta: {
    fontSize: '12px',
    color: '#6b7a99',
    marginTop: '4px',
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  btnPrimary: {
    padding: '10px 20px',
    background: '#0d1b3e',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0.3px',
  },
  btnSecondary: {
    padding: '10px 20px',
    background: '#fff',
    color: '#0d1b3e',
    border: '1px solid #d4dcec',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  btnGold: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #c9a84c, #b78d38)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(201, 168, 76, 0.25)',
  },
  clientRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '32px',
    padding: '20px',
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e8ecf5',
  },
  clientCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  clientLabel: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#6b7a99',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
  },
  clientValue: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#0f2350',
  },
  sectionTitle: {
    fontFamily: '"Playfair Display", Georgia, serif',
    fontSize: '20px',
    fontWeight: 500,
    color: '#0d1b3e',
    margin: '32px 0 20px 0',
  },
  tiersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginBottom: '32px',
  },
  tierCard: (color, isSelected) => ({
    background: '#fff',
    border: isSelected ? `2px solid ${color}` : '1px solid #e8ecf5',
    borderRadius: '18px',
    padding: '24px',
    position: 'relative',
    boxShadow: isSelected ? '0 12px 32px rgba(15, 35, 80, 0.10)' : '0 1px 2px rgba(15, 35, 80, 0.05)',
    transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  }),
  tierBadge: (color) => ({
    position: 'absolute',
    top: '-10px',
    right: '20px',
    background: color,
    color: '#fff',
    padding: '4px 12px',
    borderRadius: '999px',
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '1px',
  }),
  tierLabel: {
    fontFamily: '"Playfair Display", Georgia, serif',
    fontSize: '22px',
    fontWeight: 600,
    color: '#0d1b3e',
    margin: '8px 0 4px 0',
  },
  tierStars: {
    fontSize: '11px',
    color: '#c9a84c',
    letterSpacing: '2px',
    marginBottom: '12px',
  },
  tierDescription: {
    fontSize: '12px',
    color: '#6b7a99',
    lineHeight: 1.5,
    marginBottom: '20px',
    minHeight: '54px',
  },
  tierPriceInput: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '16px',
  },
  inputLabel: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#33446b',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #d4dcec',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: '"JetBrains Mono", monospace',
    color: '#0f2350',
    outline: 'none',
  },
  tierTotal: {
    marginTop: '16px',
    padding: '16px',
    background: '#f4f7fc',
    borderRadius: '12px',
    textAlign: 'center',
  },
  tierTotalLabel: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#33446b',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    marginBottom: '6px',
  },
  tierTotalValue: {
    fontFamily: '"Playfair Display", Georgia, serif',
    fontSize: '28px',
    fontWeight: 600,
    color: '#0d1b3e',
  },
  tierPerPerson: {
    fontSize: '11px',
    color: '#6b7a99',
    marginTop: '4px',
  },
  inclusionsRow: {
    marginTop: '20px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  inclusionCol: {
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e8ecf5',
    padding: '20px',
  },
  inclusionColTitle: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#0d1b3e',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    marginBottom: '12px',
    paddingBottom: '8px',
    borderBottom: '1px solid #e8ecf5',
  },
  inclusionList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  inclusionItem: {
    fontSize: '12px',
    lineHeight: 1.6,
    padding: '4px 0',
    color: '#33446b',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  },
  bullet: (color) => ({
    display: 'inline-block',
    minWidth: '6px',
    height: '6px',
    borderRadius: '50%',
    background: color,
    marginTop: '7px',
  }),
  paymentSchedule: {
    marginTop: '32px',
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e8ecf5',
    padding: '20px',
  },
  paymentTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  paymentRow: {
    borderBottom: '1px solid #f4f7fc',
  },
  paymentCell: {
    padding: '10px 12px',
    fontSize: '13px',
    color: '#33446b',
  },
  paymentCellRight: {
    padding: '10px 12px',
    fontSize: '13px',
    textAlign: 'right',
    fontFamily: '"JetBrains Mono", monospace',
    color: '#0f2350',
  },
};

/* ─── Component ──────────────────────────────────────────── */

export default function QuotationBuilder({
  deal,
  existingQuotation = null,
  onSave = () => {},
  onGeneratePDF = () => {},
}) {
  // Bootstrap quotation from deal on first render
  const [quotation, setQuotation] = useState(() => {
    if (existingQuotation) return existingQuotation;
    return buildQuotationFromDeal(deal || {});
  });

  const [selectedTierCode, setSelectedTierCode] = useState('DELUXE');

  // The first destination is what we edit (multi-dest UI comes in next iteration)
  const primaryDest = quotation.destinations[0] || null;

  // Recompute totals on every render
  const combinedPricing = useMemo(
    () => computeCombinedPricing(quotation),
    [quotation]
  );

  const selectedTier = primaryDest?.tiers.find((t) => t.code === selectedTierCode);
  const paymentSchedule = useMemo(() => {
    if (!selectedTier || !quotation.travelStartDate) return [];
    const pricing = computeTierPricing(selectedTier, quotation);
    return materialisePaymentSchedule(pricing.total, quotation.travelStartDate);
  }, [selectedTier, quotation]);

  /* ─── Handlers ────────────────────────────────────────── */

  const updateTierPrice = useCallback((tierCode, field, value) => {
    setQuotation((q) => {
      const newQ = { ...q };
      newQ.destinations = newQ.destinations.map((d) => ({
        ...d,
        tiers: d.tiers.map((t) => {
          if (t.code !== tierCode) return t;
          return { ...t, [field]: Number(value) || 0 };
        }),
      }));
      newQ.updatedAt = new Date().toISOString();
      return newQ;
    });
  }, []);

  const handleSaveDraft = useCallback(() => {
    onSave(quotation);
  }, [quotation, onSave]);

  const handleGeneratePDF = useCallback(() => {
    onGeneratePDF(quotation, selectedTierCode);
  }, [quotation, selectedTierCode, onGeneratePDF]);

  /* ─── Render ──────────────────────────────────────────── */

  const tiers = primaryDest?.tiers || [];
  const tierMeta = (code) => QUOTATION_TIERS.find((t) => t.code === code) || QUOTATION_TIERS[1];

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.headerTitle}>{quotation.quotationNumber || 'New Quotation'}</h2>
          <div style={styles.headerMeta}>
            Version {quotation.version} · Valid until {quotation.validUntil}
          </div>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.btnSecondary} onClick={handleSaveDraft}>
            Save Draft
          </button>
          <button style={styles.btnGold} onClick={handleGeneratePDF}>
            Generate PDF →
          </button>
        </div>
      </div>

      {/* Client info */}
      <div style={styles.clientRow}>
        <div style={styles.clientCell}>
          <span style={styles.clientLabel}>Client</span>
          <span style={styles.clientValue}>{quotation.clientName || '—'}</span>
        </div>
        <div style={styles.clientCell}>
          <span style={styles.clientLabel}>Destination</span>
          <span style={styles.clientValue}>
            {primaryDest?.destinationName || '—'}
            {primaryDest?.nights ? ` · ${primaryDest.nights}N/${primaryDest.nights + 1}D` : ''}
          </span>
        </div>
        <div style={styles.clientCell}>
          <span style={styles.clientLabel}>Travel Dates</span>
          <span style={styles.clientValue}>
            {quotation.travelStartDate || '—'}
            {quotation.travelEndDate ? ` → ${quotation.travelEndDate}` : ''}
          </span>
        </div>
        <div style={styles.clientCell}>
          <span style={styles.clientLabel}>Travellers</span>
          <span style={styles.clientValue}>
            {quotation.numberOfAdults} Adults
            {quotation.numberOfChildren > 0 ? ` + ${quotation.numberOfChildren} Children` : ''}
          </span>
        </div>
      </div>

      {/* Tier cards */}
      <h3 style={styles.sectionTitle}>Package Options</h3>
      <div style={styles.tiersGrid}>
        {tiers.map((tier) => {
          const meta = tierMeta(tier.code);
          const isSelected = tier.code === selectedTierCode;
          const pricing = computeTierPricing(tier, quotation);
          const stars = '★'.repeat(parseInt(meta.hotelStars, 10));

          return (
            <div
              key={tier.code}
              style={styles.tierCard(meta.hexColor, isSelected)}
              onClick={() => setSelectedTierCode(tier.code)}
            >
              <div style={styles.tierBadge(meta.hexColor)}>{meta.label}</div>
              <div style={styles.tierLabel}>{meta.label}</div>
              <div style={styles.tierStars}>{stars} · {meta.hotelStars} STAR HOTELS</div>
              <div style={styles.tierDescription}>{meta.description}</div>

              <div style={styles.tierPriceInput}>
                <label style={styles.inputLabel}>Per Person (₹)</label>
                <input
                  type="number"
                  style={styles.input}
                  value={tier.perPersonPrice || ''}
                  onChange={(e) => updateTierPrice(tier.code, 'perPersonPrice', e.target.value)}
                  placeholder="e.g. 125000"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {quotation.numberOfChildren > 0 && (
                <div style={styles.tierPriceInput}>
                  <label style={styles.inputLabel}>Per Child (₹)</label>
                  <input
                    type="number"
                    style={styles.input}
                    value={tier.childPrice || ''}
                    onChange={(e) => updateTierPrice(tier.code, 'childPrice', e.target.value)}
                    placeholder="e.g. 62500"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}

              <div style={styles.tierTotal}>
                <div style={styles.tierTotalLabel}>Total for Party</div>
                <div style={styles.tierTotalValue}>{fmtINR(pricing.total)}</div>
                <div style={styles.tierPerPerson}>
                  {fmtINR(pricing.perPerson)} per person
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inclusions / Exclusions for selected tier */}
      {selectedTier && (
        <>
          <h3 style={styles.sectionTitle}>
            What's Included · {tierMeta(selectedTierCode).label}
          </h3>
          <div style={styles.inclusionsRow}>
            <div style={styles.inclusionCol}>
              <div style={styles.inclusionColTitle}>Inclusions</div>
              <ul style={styles.inclusionList}>
                {(selectedTier.tierInclusions || COMMON_INCLUSIONS).map((item, i) => (
                  <li key={i} style={styles.inclusionItem}>
                    <span style={styles.bullet('#059669')}></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div style={styles.inclusionCol}>
              <div style={styles.inclusionColTitle}>Exclusions</div>
              <ul style={styles.inclusionList}>
                {(selectedTier.tierExclusions || COMMON_EXCLUSIONS).map((item, i) => (
                  <li key={i} style={styles.inclusionItem}>
                    <span style={styles.bullet('#dc2626')}></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}

      {/* Payment schedule */}
      {paymentSchedule.length > 0 && (
        <>
          <h3 style={styles.sectionTitle}>Payment Schedule</h3>
          <div style={styles.paymentSchedule}>
            <table style={styles.paymentTable}>
              <thead>
                <tr>
                  <th style={{ ...styles.paymentCell, fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                    Milestone
                  </th>
                  <th style={{ ...styles.paymentCellRight, fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                    %
                  </th>
                  <th style={{ ...styles.paymentCellRight, fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                    Amount
                  </th>
                  <th style={{ ...styles.paymentCellRight, fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                    Due Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {paymentSchedule.map((p, i) => (
                  <tr key={i} style={styles.paymentRow}>
                    <td style={styles.paymentCell}>{p.milestone}</td>
                    <td style={styles.paymentCellRight}>{p.percent}%</td>
                    <td style={styles.paymentCellRight}>{fmtINR(p.amount)}</td>
                    <td style={styles.paymentCellRight}>{p.dueDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
