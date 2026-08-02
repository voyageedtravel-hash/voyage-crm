// backend/services/feature-flags.js
// ────────────────────────────────────────────────────────────
// Feature flag service. Every V2 module ships behind a flag so we can
// disable without redeploying if something breaks.
//
// See docs/DECISIONS.md ADR-005.
//
// Discipline: every flag added here MUST have a "delete by" comment.
// Quarterly cleanup: any flag that's been ON 100% for 90 days is removed
// and the code path becomes permanent.

const mongoose = require('mongoose');

/* ─── Schema ─────────────────────────────────────────────── */

const featureFlagSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
    enabled: { type: Boolean, default: false },
    // Roll out to specific roles. Empty array = everyone (if enabled).
    allowedRoles: { type: [String], default: [] },
    // Roll out to specific user emails (for pre-release testing).
    allowedUsers: { type: [String], default: [] },
    // Human-friendly description shown in admin UI.
    description: { type: String, default: '' },
    // When we plan to remove this flag and make the code path permanent.
    // Set to a real date; audit quarterly.
    deleteBy: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'feature_flags' }
);

featureFlagSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const FeatureFlag =
  mongoose.models.FeatureFlag || mongoose.model('FeatureFlag', featureFlagSchema);

/* ─── Initial V2 flag catalogue ──────────────────────────── */
/* These are seeded on first startup. New flags added later via API. */

const INITIAL_FLAGS = [
  {
    name: 'newDashboard',
    enabled: false,
    description: 'V2 Dashboard redesign — vertical cards, business health strip, gold accents.',
    deleteBy: '2027-03-01',
  },
  {
    name: 'newDealDetail',
    enabled: false,
    description: 'V2 Deal Detail — vertical accordion sections, sticky finance bar, floating AI button.',
    deleteBy: '2027-03-01',
  },
  {
    name: 'stickyFinanceBar',
    enabled: false,
    description: 'ADR-009: Sticky finance summary at top when scrolling Deal Detail.',
    deleteBy: '2027-03-01',
  },
  {
    name: 'accordionSections',
    enabled: false,
    description: 'ADR-010: Every travel component section is expandable/collapsible.',
    deleteBy: '2027-03-01',
  },
  {
    name: 'floatingAIButton',
    enabled: false,
    description: 'ADR-011: Bottom-right AI button with 7 deal-scoped actions.',
    deleteBy: '2027-03-01',
  },
  {
    name: 'profitDrilldown',
    enabled: false,
    description: 'ADR-014: Click GPM to see per-component profit breakdown.',
    deleteBy: '2027-06-01',
  },
  {
    name: 'timelineColors',
    enabled: false,
    description: 'ADR-012: 4-color semantic activity timeline.',
    deleteBy: '2027-03-01',
  },
  {
    name: 'newTravelComponents',
    enabled: false,
    description: 'ADR-015: Cruises/Transfers/Cabs/Attractions/Insurance/Forex/SIM/Extras as own sections.',
    deleteBy: '2027-06-01',
  },
  {
    name: 'businessMonth',
    enabled: false,
    description: 'ADR-008: 16th-15th business month toggle for finance views.',
    deleteBy: '2027-06-01',
  },
  {
    name: 'strictSchema',
    enabled: false,
    description: 'Enforce strict Mongoose schema validation on deals.',
    deleteBy: '2027-09-01',
  },
  {
    name: 'auditLog',
    enabled: false,
    description: 'Record who changed what on every deal write.',
    deleteBy: '2027-09-01',
  },
  {
    name: 'clientMaster',
    enabled: false,
    description: 'Client 360 view — all past trips + preferences for one client.',
    deleteBy: '2027-06-01',
  },
  {
    name: 'vendorMaster',
    enabled: false,
    description: 'Supplier master — vendor profile with cross-deal aggregates.',
    deleteBy: '2027-06-01',
  },
];

/* ─── Public API ─────────────────────────────────────────── */

/**
 * Seed initial flags into the DB if they don't exist. Safe to run on
 * every server boot — only creates missing ones.
 */
async function seedInitialFlags() {
  for (const flag of INITIAL_FLAGS) {
    await FeatureFlag.updateOne(
      { name: flag.name },
      { $setOnInsert: flag },
      { upsert: true }
    );
  }
}

/**
 * Return the flag map { flagName: true/false } for a given user's role
 * and email. Called by /api/flags to send to the frontend.
 */
async function flagsForUser(userRole = 'agent', userEmail = '') {
  const flags = await FeatureFlag.find({}).lean();
  const result = {};
  for (const f of flags) {
    if (!f.enabled) {
      result[f.name] = false;
      continue;
    }
    // If allowedRoles/allowedUsers set, restrict; otherwise enable for everyone.
    const roleOK = f.allowedRoles.length === 0 || f.allowedRoles.includes(userRole);
    const userOK = f.allowedUsers.length === 0 || f.allowedUsers.includes(userEmail);
    result[f.name] = roleOK && userOK;
  }
  return result;
}

/** Toggle a single flag on or off. Admin only. */
async function setFlag(name, enabled) {
  await FeatureFlag.updateOne({ name }, { enabled, updatedAt: new Date() });
  return flagsForUser('admin', '');
}

module.exports = {
  FeatureFlag,
  seedInitialFlags,
  flagsForUser,
  setFlag,
  INITIAL_FLAGS,
};
