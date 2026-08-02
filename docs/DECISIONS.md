# DECISIONS

> **Purpose:** Architecture Decision Records (ADRs). Every non-trivial architectural choice is recorded here so future us understands WHY.

**Last Updated:** 2026-08-01

---

## ADR Template

Every ADR uses this structure:

```
## ADR-NNN: Title
**Date:** YYYY-MM-DD
**Status:** Proposed / Accepted / Superseded by ADR-XXX / Deprecated

**Problem:**
What issue prompted this decision?

**Options considered:**
- Option A: ...
- Option B: ...
- Option C: ...

**Final decision:**
What we chose.

**Reasoning:**
Why we chose it. What trade-offs we accepted.

**Future impact:**
What this locks us into. What escape hatches exist.
```

---

## ADR-001: MongoDB stays. No migration to PostgreSQL.
**Date:** 2026-08-01
**Status:** Accepted

**Problem:**
External advice (ChatGPT) suggested migrating financial data to PostgreSQL for stronger consistency guarantees. V1 uses MongoDB Atlas.

**Options considered:**
- **A. Migrate to PostgreSQL** — traditional financial data storage, strong ACID.
- **B. Stay on MongoDB with transaction support** — MongoDB 4.0+ supports multi-document ACID transactions.
- **C. Hybrid** — MongoDB for main data, PostgreSQL only for finance.

**Final decision:** B. Stay on MongoDB.

**Reasoning:**
- MongoDB transaction API available since 4.0 (2018) — production-proven.
- Real financial products (Stripe, Robinhood) run on MongoDB in significant parts of their stack.
- Migration cost is 3+ months of engineering with high risk of data corruption.
- Team of one developer cannot maintain two databases.
- The problem being solved (financial atomicity) is a code discipline issue, not a database engine issue.

**Future impact:**
- Locked into MongoDB for foreseeable future.
- Must write financial writes using session transactions from Phase 6 onward.
- If we grow to 500+ users and MongoDB becomes a real bottleneck, revisit — but not before.

---

## ADR-002: Expo (React Native) for mobile apps
**Date:** 2026-08-01
**Status:** Accepted

**Problem:**
Blueprint mandates native Android + iOS apps. Team is 4 people, one developer. Need to choose mobile framework.

**Options considered:**
- **A. React Native (pure)** — Meta's mobile framework, most JavaScript ecosystem sharing.
- **B. Expo (React Native + tooling)** — RN with pre-built modules for camera, notifications, biometric, EAS Build cloud service.
- **C. Capacitor (Ionic)** — wraps existing React web app as native. 95% code reuse.
- **D. Flutter** — Dart-based, distinct ecosystem, best mobile performance.
- **E. Native (Swift + Kotlin)** — highest quality, 3 codebases.

**Final decision:** B. Expo.

**Reasoning:**
- Team of one cannot maintain 2-3 codebases (rules out A partially, and E entirely).
- Capacitor apps feel web-ish; blueprint demands premium native feel (rules out C).
- Flutter would require rewriting existing React code from scratch (rules out D).
- Expo provides:
  - Single codebase for iOS + Android + web (via expo-router)
  - Pre-built camera, biometric, push notification modules
  - EAS Build (cloud iOS builds — no Mac required)
  - Over-the-air updates for logic changes (no App Store review needed)
  - Mature, used by Bluesky, Notion mobile, Cameo
- Existing React business logic (~60-70%) is directly portable to shared package consumed by both.

**Trade-offs accepted:**
- 3-4 months of the 15-16 month timeline is Expo migration work.
- UI markup must be written twice (web `<div>` vs RN `<View>`) — logic shared, presentation not.
- Some rare native features (deep OS integration) still not accessible.

**Future impact:**
- Locked into React ecosystem for both web and mobile.
- Any team member added must know React + TypeScript.
- Mobile releases go through App Store + Play Store review (weeks initially).

---

## ADR-003: Monorepo with shared logic package
**Date:** 2026-08-01
**Status:** Accepted

**Problem:**
Web frontend and mobile app share business logic (finance calculations, validators, API client). Duplicating this logic causes drift and bugs.

**Options considered:**
- **A. Two separate repos, copy-paste shared code** — simplest to start, terrible long-term.
- **B. Two separate repos, publish shared as npm package** — clean but heavy for a single developer.
- **C. Monorepo with npm/pnpm workspaces** — one repo, multiple packages, shared package imported by both.

**Final decision:** C. Monorepo with workspaces.

**Reasoning:**
- Single developer productivity: one commit updates logic + web + mobile atomically.
- No versioning overhead between packages.
- Modern tooling (pnpm workspaces, Turborepo) handles this well.
- Existing repo `voyage-crm` becomes the monorepo root — no repo migration.

**Structure:**
- `packages/shared/` — business logic used by both
- `packages/ui/` — design tokens + component primitives (web + native)
- `packages/web/` — existing React CRA app (moved into packages/)
- `packages/mobile/` — new Expo app
- `backend/` — unchanged Node/Express (stays at repo root, could move to packages/ later)

**Future impact:**
- Requires workspace-aware tooling (already standard).
- CI setup slightly more complex (test all changed packages).
- Team members must understand the workspace model.

---

## ADR-004: Feature parity between web and mobile is the default
**Date:** 2026-08-01
**Status:** Accepted

**Problem:**
My initial recommendation was that mobile is "read-heavy" and web is "write-heavy." Vishal explicitly rejected this — mobile must be a first-class product supporting 80-90% of workflows.

**Options considered:**
- **A. Reduced mobile (companion app)** — my initial recommendation, rejected.
- **B. Feature parity by default, deviations documented** — every feature works on all platforms unless a specific reason exists.
- **C. Mobile-first, desktop as enhancement** — every feature designed for mobile first, desktop adds convenience.

**Final decision:** B. Feature parity by default.

**Reasoning:**
- Vishal frequently travels and needs to run business from mobile.
- Reduced mobile creates two products for the team to learn.
- Feature-parity default forces us to think about mobile UX from Day 1 rather than as an afterthought.
- Desktop retains richer experiences for bulk operations, large tables, complex reports — but never has features mobile lacks.

**Enforcement:**
- `FEATURE_PARITY.md` tracks every feature's status on web / iOS / Android.
- Any feature marked "web only" requires a documented technical reason in that file.
- CI check (future): warn if a new feature ships to only one platform without an entry in FEATURE_PARITY.md.

**Future impact:**
- Every feature costs more (must design + build for two UI patterns).
- Design system investment is higher (must define components for both).
- Business benefit: users have consistent capability everywhere.

---

## ADR-005: Feature flags for every V2 module
**Date:** 2026-08-01
**Status:** Accepted

**Problem:**
Any change to a working production system risks breaking users. Need a safety mechanism that doesn't require redeploy.

**Options considered:**
- **A. No flags, careful staging testing** — traditional, risky.
- **B. Custom feature flag collection in MongoDB** — simple, controllable.
- **C. Third-party service (LaunchDarkly, Unleash)** — powerful but paid, external dependency.

**Final decision:** B. Custom MongoDB collection.

**Reasoning:**
- We have MongoDB already.
- Our needs are modest (single-tenant, ~10 users) — LaunchDarkly's targeting engine is overkill.
- Simple implementation: `feature_flags` collection with `{name, enabled, allowedRoles}`.
- Backend endpoint `/api/flags` returns current state per user.
- Frontend hook `useFeatureFlag('name')` gates UI.

**Discipline required:**
- Every new module ships behind a flag initially.
- Flags have a "delete by" date in comments.
- Quarterly cleanup: any flag that's been on 100% for 90 days is removed and code path made permanent.

**Future impact:**
- Slight code overhead for every gated feature (worth it).
- Small performance cost per page load (one API call, cached).
- Complete safety net: any V2 problem is one toggle away from resolution.

---

## ADR-006: Documentation lives in the repo, not external tools
**Date:** 2026-08-01
**Status:** Accepted

**Problem:**
Where does project documentation live? Notion, Confluence, or in the repo?

**Options considered:**
- **A. Notion or similar SaaS** — nice UI, external dependency, drifts from code.
- **B. Docs in repo as Markdown** — versioned with code, no external tool, less pretty.
- **C. Docs on a hosted wiki** — separate maintenance.

**Final decision:** B. In the repo, as Markdown files, under `docs/`.

**Reasoning:**
- Docs versioned alongside code — PR that changes architecture also updates ARCHITECTURE.md.
- No third-party service to lose access to.
- Markdown is universally readable (GitHub renders it, editors handle it).
- Single source of truth: repo state is project state.
- Zero cost.

**Files maintained:**
- `PROJECT_STATE.md` — where we are now
- `ARCHITECTURE.md` — target state
- `DECISIONS.md` — this file
- `CHANGELOG.md` — what shipped, when
- `FEATURE_PARITY.md` — web/iOS/Android feature matrix
- `DEPLOY.md` — deploy + rollback procedures
- `SETUP.md` — new developer onboarding

**Discipline required:**
- Every PR that touches architecture updates the relevant doc.
- PR template asks: "Which doc did you update?"

---

## ADR-007: Staging environment on free tiers of existing services
**Date:** 2026-08-01
**Status:** Accepted

**Problem:**
Staging environment needed for safe testing. Cost should be minimal.

**Final decision:**
- Staging Netlify site: use Netlify Pro's ability to host multiple sites (already paying, no incremental cost).
- Staging Render backend: use existing account, add a new service (Render Pro allows multiple services).
- Staging MongoDB: new free-tier M0 cluster (0.5 GB, sufficient for staging).
- Staging domain: `staging.voyage-crm.com` subdomain.

**Cost:** ₹0 additional per month.

**Reasoning:**
- User already pays Netlify Pro + Render Pro + Anthropic API. Extract maximum value from existing subscriptions.
- Free-tier MongoDB M0 is 0.5 GB — enough for seeded test data.

**Trade-offs:**
- Staging MongoDB has no automatic backups (M0 limitation) — acceptable for staging.
- Free tier occasionally hits limits — acceptable for staging.

**Future impact:**
- Zero recurring cost until we outgrow (unlikely until team has 5+ developers).

---

## ADR-008: Business Month toggle, not replacement
**Date:** 2026-08-01
**Status:** Accepted

**Problem:**
Blueprint mandates 16th-to-15th business month cycle for finance. V1 currently uses calendar months. Changing calculations wholesale would disrupt existing accounting.

**Options considered:**
- **A. Replace calendar month with business month everywhere** — clean but disruptive.
- **B. Add business month as a toggle option alongside calendar month** — both available.
- **C. Business month for finance only, calendar month for operations** — split usage.

**Final decision:** B. Toggle option, both available.

**Reasoning:**
- Different reports serve different purposes. GST filing needs calendar month (government mandate). Internal salary/commission needs business month if that's Vishal's cash-flow cycle.
- Toggle lets users pick based on the report they're viewing.
- Doesn't disrupt historical data.
- Reversible if we learn business month isn't actually needed.

**Requires understanding:** Vishal to confirm the specific accounting reason for 16-15 cycle so we implement correctly (documented as a blocker to resolve in Phase 6).

**Future impact:**
- Slight UI complexity (a toggle in reports).
- Requires implementing month boundary logic in shared logic package.

---

## Decisions Pending

These decisions have been raised but not yet made. To be resolved before their blocking phase begins.

- **Should sensitive fields be encrypted at rest?** — Phase 3
- **What's the exact business reason for 16-15 month cycle?** — Phase 6
- **httpOnly cookie auth vs localStorage JWT?** — Phase 6
- **Multi-tenancy: is Voyage-Ed CRM ever going to be sold as SaaS?** — affects data model, unresolved
- **Which Node version and package manager?** — resolve in Phase 0 Day 2 (recommendation: Node 20 LTS + pnpm)
- **TypeScript adoption strategy?** — currently JS. Recommendation: TypeScript for `packages/shared/` from Day 1, gradual migration of web/mobile

---

## Change History

- **2026-08-01**: Initial ADRs 001-008 created after Phase 0 Day 1 planning approved.
