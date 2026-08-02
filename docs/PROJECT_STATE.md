# PROJECT_STATE

> **Purpose:** Living document that reflects the current state of the CRM V2 project. Every session starts here.

**Last Updated:** 2026-08-01
**Current Phase:** Phase 0 — Preparation
**Current Task:** Day 1 — Documentation Setup

---

## 🎯 Current Focus

Setting up the foundational documentation, monorepo structure and infrastructure that all future development will depend on. Zero production code changes in Phase 0.

## 📅 Timeline

- **Phase 0** (Preparation): Weeks 1-3 — CURRENT
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
- [x] PROJECT_STATE.md initial version
- [ ] ARCHITECTURE.md initial version
- [ ] DECISIONS.md with initial ADRs
- [ ] CHANGELOG.md initial version
- [ ] FEATURE_PARITY.md initial matrix
- [ ] Monorepo structure planned
- [ ] Staging environment (Netlify site)
- [ ] Staging environment (Render service)
- [ ] Staging environment (MongoDB Atlas cluster)
- [ ] Feature flag system (backend)
- [ ] Feature flag system (frontend hook)
- [ ] Automated backup verification script
- [ ] Backup restore tested end-to-end
- [ ] Unit test framework (Vitest) setup
- [ ] First 10 unit tests on financial calculations
- [ ] Design tokens documented
- [ ] Git workflow + branch protection documented
- [ ] Expo project skeleton created
- [ ] Shared logic package (`packages/shared/`) created
- [ ] Initial migration of finance calculations to shared package
- [ ] Phase 0 review and approval

---

## 🔴 Known Issues (from V1 production CRM)

Documented for future Phase resolution. Not blocking Phase 0.

1. **App.js is 7000+ lines** — will be modularized in Phase 1
2. **Auth is hardcoded** — admin/admin123. Real user roles in Phase 1
3. **WhatsApp integration is manual** — copy-paste. WhatsApp Business API in Phase 8
4. **APK standalone mode broken** — needs SHA256 in assetlinks.json (can be fixed independently)
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

---

## ⚠️ Risks

### Active Risks
- **My context between sessions:** I lose memory between chat sessions. Mitigation: this file + DECISIONS.md are my memory. Every session starts by reading these.
- **Feature-parity fatigue:** Building every feature 2x (web + mobile) is real effort. Mitigation: maximize shared logic layer, invest heavily in that layer's quality.
- **Expo migration cost:** ~3-4 months of the 15-16 month timeline is Expo-related. Real, non-optional if mobile is first-class.
- **Apple/Google account timing:** Not blocking dev, but must be created by Phase 9 start (Week 59).

### Resolved Risks
_(none yet)_

---

## 📝 Next Recommended Task

**Phase 0 Day 1 (continued):** Complete initial documentation set — ARCHITECTURE.md, DECISIONS.md (with first 3 ADRs), CHANGELOG.md, FEATURE_PARITY.md. All in a single commit today. No production code touched.

---

## 🚧 Blockers

_None currently._

---

## 📂 Files Modified This Session

- Created: `docs/PROJECT_STATE.md`
- Created: `docs/ARCHITECTURE.md` (in progress)
- Created: `docs/DECISIONS.md` (in progress)
- Created: `docs/CHANGELOG.md` (in progress)
- Created: `docs/FEATURE_PARITY.md` (in progress)

---

## 🧠 Session Handoff Notes

_Notes I leave for myself for next session._

Nothing yet — this is session 1.

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
