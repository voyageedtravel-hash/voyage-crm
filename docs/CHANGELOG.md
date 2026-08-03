# CHANGELOG

> **Purpose:** Professional changelog of every meaningful change to the CRM. Reverse chronological.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Versioning:
- **V1.x.x** — current production CRM (legacy versioning, may not be tracked here retroactively)
- **V2.0.0** — target end state of the current project
- **Interim tags:** V2.0.0-alpha.N during Phase 0-3, V2.0.0-beta.N during Phase 4-8, V2.0.0-rc.N during Phase 9-10

Every entry includes:
- **Date**
- **Feature/change**
- **Files modified**
- **Reason**
- **Breaking change:** Yes / No
- **Status:** Production Ready / Staging Only / Behind Feature Flag
- **Version**

---

## [Unreleased] — V2.0.0-alpha.3 (Phase 0 continuation)

### Added
- **[2026-08-02 late] Cruise module — schema, pricing, AI OCR extraction**
  - **Files modified:** `packages/shared/src/logic/cruises/index.js` (new), `packages/shared/src/logic/ai-prompts/cruise-ocr.js` (new), `packages/shared/src/services/cruise-ocr-client.js` (new), `packages/shared/tests/cruises.test.js` (new, 25 tests), `packages/shared/src/index.js`, `packages/shared/package.json`, `docs/FEATURE_PARITY.md`
  - **Reason:** Cruises are a first-class travel component in V2 (ADR-015) with pricing structure fundamentally different from hotels or flights: per-person double-occupancy base fare + mandatory port charges + gratuities per person per night + optional add-ons (beverage/wifi/dining packages). This module delivers three connected pieces:
    1. Full cruise vendor schema covering ship, voyage, cabin, itinerary, all pricing lines, deposit + balance schedule, cancellation policy, documents. Supports Indian lines (Cordelia INR) and international (Royal Caribbean USD) with automatic currency conversion.
    2. `cruisePriceBreakdown()` — computes base fare + port charges + gratuities + add-ons + grand total + per-person breakdown for client quotes. Automatically applies exchange rate. Respects explicit costPrice/sellingPrice overrides for special vendor rates.
    3. AI OCR system prompt + client service that takes a cruise-line booking screenshot, extracts structured JSON via Claude Sonnet 4.6 vision, validates it (confidence check, missing-gratuities check, totals sanity-check against screenshot claim), and produces a preview-ready vendor record. Follows preview→confirm→apply discipline per ADR-011.
  - **25 unit tests** including real Cordelia 3N Mumbai-Diu (INR ₹60,600 verified), family with 2 adults + 2 children with kids-price differentiation, single-traveller supplement, Royal Caribbean 7N Bahamas in USD @ 86 INR rate, override behaviour when Vishal locks a special vendor rate, and OCR-to-vendor conversion.
  - **Cumulative test count:** 53 tests (28 finance + 25 cruises), all passing.
  - **Breaking change:** No (new module, no existing code modified)
  - **Status:** Production Ready (library only; UI in Phase 3-5)
  - **Version:** V2.0.0-alpha.3

## [V2.0.0-alpha.2] — 2026-08-02 (Phase 0 Day 2)

### Added
- **[2026-08-02] Shared design tokens (JS + CSS)**
  - **Files modified:** `packages/ui/tokens/index.js`, `packages/ui/tokens/tokens.css`, `packages/ui/package.json`
  - **Reason:** Single source of truth for colors, spacing, typography, radius, shadows, motion. Will be consumed by web (React) via CSS import and mobile (Expo) via JS import. Extracted from approved mockups. Includes mobile-specific spacing overrides per ADR-013.
  - **Breaking change:** No
  - **Status:** Production Ready (new files, not yet imported by App.js)
  - **Version:** V2.0.0-alpha.2

- **[2026-08-02] Shared finance package with 28 unit tests**
  - **Files modified:** `packages/shared/src/index.js`, `packages/shared/src/logic/finance/index.js`, `packages/shared/tests/finance.test.js`, `packages/shared/package.json`, `package.json`
  - **Reason:** Extracted 12 finance functions (num, sum, toINR, fmtINR, bookedTierOf, tierSellINR, allVendors, cancelCompute, dealFinance, siblingsOf, generateDealNumber, enquiryIdOf) from V1 App.js into a testable shared package. Behaviour is byte-identical to V1. 28 unit tests including a real Vietnam booking scenario (Kirti Malhotra deal from the approved mockup) verify math correctness. All 28 tests pass.
  - **Breaking change:** No (V1 App.js still uses its own copies of these functions)
  - **Status:** Production Ready (new package, not yet imported by App.js)
  - **Version:** V2.0.0-alpha.2

- **[2026-08-02] Feature flag system (backend + frontend)**
  - **Files modified:** `backend/services/feature-flags.js` (new), `backend/server.js` (additive routes), `frontend/src/hooks/useFeatureFlags.js` (new)
  - **Reason:** Every V2 module ships behind a flag per ADR-005. Backend has a `feature_flags` MongoDB collection with role/user-scoped enabling. Frontend has `useFeatureFlag(name)` React hook with in-memory caching. 13 initial V2 flags registered and seeded: newDashboard, newDealDetail, stickyFinanceBar, accordionSections, floatingAIButton, profitDrilldown, timelineColors, newTravelComponents, businessMonth, strictSchema, auditLog, clientMaster, vendorMaster. All start OFF in production.
  - **Breaking change:** No (only new routes, only new frontend file)
  - **Status:** Production Ready (deployable; flags all OFF)
  - **Version:** V2.0.0-alpha.2

- **[2026-08-02] 7 UX improvement ADRs (009-015)**
  - **Files modified:** `docs/DECISIONS.md`, `docs/FEATURE_PARITY.md`, `docs/PROJECT_STATE.md`
  - **Reason:** Vishal's Deal Detail feedback locked in as architectural decisions: sticky finance bar (ADR-009), accordion sections (ADR-010), floating AI button (ADR-011), color-coded timeline (ADR-012), mobile-not-resized-desktop (ADR-013), profit drill-down (ADR-014), extended 11-component travel list (ADR-015).
  - **Breaking change:** No (docs only)
  - **Status:** Production Ready
  - **Version:** V2.0.0-alpha.2

## [V2.0.0-alpha.1] — 2026-08-01 (Phase 0 Day 1)

### Added
- **[2026-08-01] Documentation foundation**
  - **Files modified:** `docs/PROJECT_STATE.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/CHANGELOG.md`, `docs/FEATURE_PARITY.md`
  - **Reason:** Establishing the source-of-truth documents that every future session and every future developer will use. Written before any code changes.
  - **Breaking change:** No
  - **Status:** Production Ready (docs only, no code impact)
  - **Version:** V2.0.0-alpha.1

---

## [V1.x.x] — Production (pre-V2 project)

Not tracked retroactively in this file. Recent significant additions to V1:

- **2026-07-30:** Combined multi-destination proposal button
- **2026-07-30:** Payables grouped by vendor name across deals
- **2026-07-30:** Backup + restore system with daily 2 AM IST cron
- **2026-07-29:** AI Salary Advisor with commitments memory
- **2026-07-29:** Month picker landing + auto-injected system rows in ledger
- **2026-07-29:** GST recurring rule + month freeze with password unlock
- **2026-07-28:** Accounts foundation, deal IDs `VE-YYMM-XXXX`, forfeit tracking
- **2026-07-28:** Dashboard KPI cards clickable with per-deal breakdown
- **2026-07-28:** Trains tab (domestic + international, multi-city, PNR)

---

## Change Log Discipline

For every completed task:

1. **When** to add: as soon as the task is completed and merged to `main` (production) or `staging`.
2. **Where** to add: under the appropriate version heading. Create new version headings when tagging a release.
3. **What** to include: date, one-line summary, files modified, reason, breaking-change status, deploy status, version.
4. **Style:**
   - Categorize under: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.
   - Present-tense verbs ("Add" not "Added" — wait, actually convention is past-tense heading, present-tense description).
   - Concise, factual, no marketing language.

### Example of a good entry

```
### Added
- **[2026-11-15] Business month toggle on dashboard reports**
  - **Files modified:** `packages/web/src/modules/reports/BusinessMonthToggle.jsx`,
    `packages/shared/src/logic/finance/businessMonth.ts`,
    `packages/web/src/modules/dashboard/Dashboard.jsx`
  - **Reason:** Vishal requires 16-15 accounting cycle for internal salary and commission planning; calendar month retained for GST filings.
  - **Breaking change:** No — toggle defaults to calendar month, opt-in for business month
  - **Status:** Behind Feature Flag `businessMonth`, enabled for admin role in staging
  - **Version:** V2.0.0-beta.3
```

### Example of a bad entry (avoid)

```
### Added
- Business month feature. Very cool. Made things better!
```
