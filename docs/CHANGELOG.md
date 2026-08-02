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

## [Unreleased] — V2.0.0-alpha.1 (Phase 0 in progress)

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
