# PROJECT_STATE

> **Purpose:** Living document that reflects the current state of the CRM V2 project. Every session starts here.

**Last Updated:** 2026-08-02 (late evening)
**Current Phase:** Phase 0 — Preparation
**Current Task:** Phase 0 Day 2 — Cruise module (schema + pricing + AI OCR) DONE

---

## 🎯 Current Focus

Building the V2 foundation: shared business logic package with unit tests, design tokens as executable code, feature flag system on backend + frontend, monorepo structure. Production V1 CRM untouched throughout.

## 📅 Timeline

- **Phase 0** (Preparation): Weeks 1-3 — CURRENT (Day 2 of ~15)
- **Phase 1** (Foundations): Weeks 4-9
- **Phase 2** (Web UI Reset): Weeks 10-13
- **Phase 3** (Data Layer + First Mobile Screens): Weeks 14-20
- **Phase 4** (Dashboard + Client 360 — Web + Mobile): Weeks 21-28
- **Phase 5** (Deal Detail redesign — Web + Mobile): Weeks 29-38
- **Phase 6** (Finance precision): Weeks 39-46
- **Phase 7** (Amendment + Group Booking): Weeks 47-52
- **Phase 8** (Automation — WhatsApp, Push, AI Command): Weeks 53-58
- **Phase 9** (Mobile polish + App Store): Weeks 59-66
- **Phase 10** (PWA polish): Weeks 67-70

**Estimated V2 completion:** ~15-16 months from start (approximately December 2027).

---

## ✅ Completed Work

### Phase 0
- [x] Docs folder created
- [x] PROJECT_STATE.md (this file)
- [x] ARCHITECTURE.md (target state)
- [x] DECISIONS.md with 15 ADRs (001-015)
- [x] CHANGELOG.md initial version
- [x] FEATURE_PARITY.md initial matrix (extended with UX + travel components on 2026-08-02)
- [x] Monorepo structure created (packages/shared, packages/ui)
- [x] Design tokens as code — packages/ui/tokens/index.js (JS) + tokens.css (web)
- [x] Shared finance package — packages/shared/src/logic/finance/ with 12 exports
- [x] Vitest testing framework installed
- [x] **28 finance unit tests passing** including real Vietnam booking (Kirti Malhotra deal from mockup)
- [x] Feature flag backend service — MongoDB collection + seed + role-scoped read
- [x] Feature flag routes — GET /api/flags, PUT /api/flags/:name, GET /api/flags/all
- [x] Feature flag frontend hook — useFeatureFlag, useFeatureFlags, toggleFeatureFlag
- [x] 13 initial V2 feature flags registered (all OFF in production by default)
- [x] **Cruise module** — schema (11-category cabins, ports, itinerary, deposit schedule), pricing engine (base + port charges + gratuities + add-ons + FX), AI OCR system prompt for cruise screenshots, client service for image → structured vendor. 25 additional tests, all passing (53 total)

### Pending in Phase 0
- [ ] Staging environment (Netlify site) — needs Vishal's account access
- [ ] Staging environment (Render service) — needs Vishal's account access
- [ ] Staging environment (MongoDB Atlas cluster) — needs Vishal's account access
- [ ] Automated backup verification script
- [ ] Backup restore tested end-to-end on staging
- [ ] Zod validator schemas (Deal, Vendor, Payment, Traveller) — Day 3-4
- [ ] Finance breakdown per component (for ADR-014 profit drill-down) — Day 3-4
- [ ] Git workflow + branch protection documented
- [ ] Expo project skeleton — Day 8-10 planned
- [ ] Design tokens integrated into existing App.js (invisible change)
- [ ] Phase 0 review and approval

---

## 🎨 UX Improvements Locked (from Vishal 2026-08-02)

These are approved and now govern all future UI work. See ADRs 009-015 for details.

1. **Sticky finance bar** on Deal Detail (ADR-009)
2. **Accordion sections** — every travel component collapsible (ADR-010)
3. **Floating AI button** bottom-right with 7 actions (ADR-011)
4. **Color-coded timeline** 🟢🟡🔵🔴 (ADR-012)
5. **Mobile is NOT resized desktop** — card-based, bottom nav, thumb targets, camera-first (ADR-013)
6. **Profit drill-down** — click ₹ profit → per-component breakdown incl. TCS/TDS/FX (ADR-014)
7. **11 travel components** — Flights/Trains/Cruises/Transfers/Cabs/Hotels/Attractions/Insurance/Forex/SIM/Extras (ADR-015)

---

## 🔴 Known Issues (from V1 production CRM)

Documented for future Phase resolution. Not blocking Phase 0.

1. **App.js is 7000+ lines** — will be modularized in Phase 1
2. **Auth is hardcoded** — admin/admin123. Real user roles in Phase 1
3. **WhatsApp integration is manual** — copy-paste. WhatsApp Business API in Phase 8
4. **APK standalone mode broken** — needs SHA256 in assetlinks.json
5. **Instagram insights broken** — FB_ACCESS_TOKEN short-lived
6. **No Google Business Profile** — pending after office shift
7. **Titan IMAP blocked** — can send but not read email
8. **No lead source tracking** — Phase 4
9. **No follow-up automation** — Phase 8
10. **No group booking mode** — Phase 7
11. **No multi-currency FX gain/loss** — Phase 6
12. **No TDS/TCS module** — Phase 6
13. **No amendment engine** — Phase 7
14. **No travel-credit liability tracking** — Phase 6
15. **No full audit log** — Phase 1
16. **Land + Activities lumped together** — splitting into 5 explicit sections in Phase 5 with Phase 3 migration script

---

## ⚠️ Risks

### Active Risks
- **Context between sessions:** Mitigated by PROJECT_STATE + DECISIONS files.
- **Feature parity fatigue:** Building every feature 2x. Mitigation: maximize shared logic layer (started this session).
- **Expo migration cost:** ~3-4 months of the 15-16 month timeline.
- **Staging blocker:** Waiting for Vishal to create Netlify site + Render service + Atlas cluster.

### Resolved Risks
- **MongoDB vs PostgreSQL:** ADR-001, MongoDB retained.
- **UI design direction:** Mockups approved 2026-08-02.

---

## 📝 Next Recommended Task

**Phase 0 Day 3-4 — Zod validators + finance breakdown + more tests**

Next session should:
1. Create `packages/shared/src/logic/validators/` with Zod schemas for Deal, Vendor, Payment, Traveller
2. Add `dealFinanceBreakdown()` for ADR-014 profit drill-down (per-component P&L including TCS/TDS/FX)
3. Add ~15 more unit tests: cancellation edge cases, multi-currency, tier + refund combined
4. Ask Vishal for staging environment setup (unblocker for Day 5+)
5. Design tokens integration into existing App.js (import CSS variables — invisible visual change)

---

## 🚧 Blockers

**Vishal action needed:**
- Netlify: create new site connected to `voyage-crm` repo, branch = `staging`
- Render: create new service (free tier fine), branch = `staging`
- MongoDB Atlas: create new M0 free-tier cluster, note the connection string
- Once ready, share the 3 URLs — I'll wire up environment variables

**Not blocking current work:** shared logic + validators + Expo skeleton continue in parallel.

---

## 📂 Files Modified This Session (2026-08-02)

**Created:**
- `docs/DECISIONS.md` — extended from 8 to 15 ADRs (added 009-015 for UX)
- `docs/FEATURE_PARITY.md` — extended with sticky bar, accordion, floating AI, timeline colors, drill-down, new travel components
- `package.json` — workspace root
- `packages/ui/package.json`
- `packages/ui/tokens/index.js` — design tokens as JavaScript
- `packages/ui/tokens/tokens.css` — CSS variables for web
- `packages/shared/package.json`
- `packages/shared/src/index.js` — public API entry
- `packages/shared/src/logic/finance/index.js` — extracted from V1 App.js
- `packages/shared/tests/finance.test.js` — 28 unit tests, all passing
- `backend/services/feature-flags.js` — MongoDB collection + service
- `frontend/src/hooks/useFeatureFlags.js` — React hook + helpers

**Modified (additive only):**
- `backend/server.js` — added 3 new routes and initial flag seeding. Existing routes untouched.

**NOT modified:**
- `frontend/src/App.js` — production code, zero touch this session
- Any V1 business logic — extracted (copied) to shared, original stays

---

## 🧠 Session Handoff Notes

For next Claude session:

1. **Read this file first**, then `docs/DECISIONS.md` (15 ADRs — architecture context).
2. **The 28 finance tests are the source of truth.** If any refactor breaks them, DO NOT edit the test — fix the code. Genuine math changes require CHANGELOG entry + Vishal approval.
3. **Feature flags are seeded but all OFF in prod.** Turn ON only via admin UI after staging tests.
4. **Existing frontend/src/App.js has been UNTOUCHED** by V2 work so far. This is deliberate.
5. **Vishal is co-founder mode.** Push back respectfully on scope creep or process shortcuts.
6. **Staging blocker:** Cannot progress to backup verification until Vishal creates staging infra.
7. **7 UX improvements from 2026-08-02** captured in ADRs 009-015. Every future Deal Detail work references those.

---

## 📖 How to use this file

**At the start of every session:**
1. Read this file top to bottom
2. Read `DECISIONS.md` for architectural context
3. Read the "Session Handoff Notes" for what was in progress
4. Confirm the "Current Task" is still valid

**At the end of every session:**
1. Update "Last Updated" date
2. Move completed items to "Completed Work"
3. Update "Next Recommended Task"
4. Add "Session Handoff Notes" for next time
5. Update "Files Modified This Session"
6. Commit this file along with code changes
