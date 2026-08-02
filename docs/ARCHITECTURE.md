# ARCHITECTURE

> **Purpose:** Target state of the Voyage-Ed CRM V2 architecture. Updated when architectural decisions change.

**Version:** 2.0-alpha
**Last Updated:** 2026-08-01

---

## Design Principles

1. **Single source of truth for business logic.** All financial calculations, cancellation rules, proposal generation, and validation live in `packages/shared/`. Never duplicated between web and mobile.

2. **Feature parity is the default.** Web, iOS, and Android should support the same features. Deviations require documented justification in `FEATURE_PARITY.md`.

3. **Progressive enhancement, not adaptive reduction.** Mobile UIs are designed for the mobile form factor, not a reduced version of desktop. Desktop UIs use additional screen space, not different features.

4. **Fail-safe over move-fast.** Every change ships behind a feature flag. Every deploy is reversible in under 5 minutes. Production is never used as a testing environment.

5. **Deterministic before AI.** If a rule can be expressed as business logic, it is. AI is used for OCR extraction, natural-language input parsing, and cached daily insights. Never for arithmetic.

6. **Documentation is code.** PROJECT_STATE, ARCHITECTURE, DECISIONS, CHANGELOG, FEATURE_PARITY are maintained continuously. Outdated docs are considered technical debt.

---

## System Overview

```
┌───────────────────────────────────────────────────────────────┐
│                      USERS                                     │
│  Desktop browser  │  Android app  │  iOS app  │  PWA          │
└──────────┬─────────────────┬──────────────┬─────────┬─────────┘
           │                 │              │         │
           ▼                 ▼              ▼         ▼
┌──────────────────┐  ┌────────────────────────────────────┐
│  Web frontend    │  │  Mobile app (Expo → iOS + Android) │
│  (React CRA)     │  │  (React Native + Expo)             │
│  Netlify         │  │  EAS Build → App Stores            │
└─────────┬────────┘  └───────────────┬───────────────────┘
          │                           │
          │  Both consume:            │
          │  ┌──────────────────────┐ │
          └─▶│  @voyage/shared      │◀┘
             │  Business logic      │
             │  Types, validators   │
             │  API + AI clients    │
             └──────────┬───────────┘
                        │
                        ▼
             ┌──────────────────────┐
             │  Backend (Node/Express)│
             │  Render Pro           │
             │  REST + WebSockets    │
             └──────────┬───────────┘
                        │
                        ▼
             ┌──────────────────────┐
             │  MongoDB Atlas       │
             │  + Collections       │
             │  + Change streams    │
             └──────────────────────┘
```

---

## Monorepo Structure (Target)

```
voyage-crm/                              ← Root (existing repo)
│
├── packages/
│   ├── shared/                          ← Cross-platform business logic
│   │   ├── src/
│   │   │   ├── logic/
│   │   │   │   ├── finance/            ← calculations, business month
│   │   │   │   ├── cancellation/       ← 4-field cancel engine
│   │   │   │   ├── forfeit/            ← forfeit tracking
│   │   │   │   ├── proposals/          ← HTML/PDF generation logic
│   │   │   │   ├── ledger/             ← auto-injection rules
│   │   │   │   └── validators/         ← Zod schemas for Deal, Client, Vendor
│   │   │   ├── services/
│   │   │   │   ├── api-client.ts       ← axios wrapper
│   │   │   │   └── ai-client.ts        ← Anthropic wrapper
│   │   │   ├── types/                  ← shared TypeScript types
│   │   │   ├── utils/                  ← date, currency, formatters
│   │   │   └── constants/              ← BRAND colors, statuses, etc.
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui/                              ← Design system (design tokens + shared primitives)
│   │   ├── src/
│   │   │   ├── tokens/                 ← colors, spacing, typography constants
│   │   │   ├── web/                    ← Web primitives (Shadcn-based)
│   │   │   └── native/                 ← RN primitives (equivalent components)
│   │   └── package.json
│   │
│   ├── web/                             ← Existing React app (evolves gradually)
│   │   ├── src/
│   │   │   ├── modules/                ← post-refactor screens
│   │   │   │   ├── dashboard/
│   │   │   │   ├── deals/
│   │   │   │   ├── accounts/
│   │   │   │   ├── proposals/
│   │   │   │   ├── reports/
│   │   │   │   ├── clients/
│   │   │   │   └── vendors/
│   │   │   ├── App.js                  ← thin router only (post-refactor)
│   │   │   └── index.js
│   │   ├── public/
│   │   └── package.json
│   │
│   └── mobile/                          ← Expo app for iOS + Android
│       ├── app/                         ← expo-router file-based routing
│       │   ├── (auth)/
│       │   │   └── login.tsx
│       │   ├── (tabs)/                  ← main tabs
│       │   │   ├── dashboard.tsx
│       │   │   ├── deals.tsx
│       │   │   ├── clients.tsx
│       │   │   └── more.tsx
│       │   ├── deal/[id].tsx           ← deal detail
│       │   ├── scan/
│       │   │   ├── passport.tsx
│       │   │   ├── ticket.tsx
│       │   │   └── voucher.tsx
│       │   └── _layout.tsx
│       ├── components/                  ← RN-specific UI (uses @voyage/ui/native)
│       ├── hooks/                       ← RN-specific hooks
│       ├── app.json                     ← Expo config
│       └── package.json
│
├── backend/                             ← Node/Express (unchanged from V1, extended)
│   ├── src/
│   │   ├── controllers/                 ← route handlers
│   │   ├── services/                    ← business logic (NEW critical layer)
│   │   │   ├── finance/
│   │   │   ├── cancellation/
│   │   │   ├── vendors/
│   │   │   ├── audit/                   ← audit log service
│   │   │   ├── notifications/           ← WhatsApp, email, push
│   │   │   └── feature-flags/           ← flag evaluation
│   │   ├── models/                      ← Mongoose schemas
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── jobs/                        ← backup cron, backup verify, daily AI insights
│   │   ├── utils/
│   │   └── server.js
│   ├── backup.js                        ← existing, will move to jobs/
│   └── package.json
│
├── docs/                                ← Project documentation (source of truth)
│   ├── PROJECT_STATE.md
│   ├── ARCHITECTURE.md                  ← this file
│   ├── DECISIONS.md                     ← ADRs
│   ├── CHANGELOG.md
│   ├── FEATURE_PARITY.md
│   ├── DEPLOY.md                        ← deploy + rollback procedures
│   └── SETUP.md                         ← how to onboard new developer
│
├── scripts/                             ← one-off scripts
│   ├── verify-backup.js
│   └── seed-staging.js
│
├── .github/
│   ├── workflows/                       ← CI: lint, test, build
│   └── PULL_REQUEST_TEMPLATE.md
│
├── package.json                         ← workspace root (npm/pnpm workspaces)
├── netlify.toml                         ← existing
└── README.md
```

---

## Database (MongoDB Atlas)

### Existing Collections (V1)
- `leads` — the core deal entity
- `users` — hardcoded admin currently
- `counters` — auto-increment for deal numbers
- `chatlogs` — legacy chatbot storage

### New Collections (V2, added incrementally in phases)
- `clients` — Phase 4 — one row per unique client, aggregates trips + preferences
- `vendors` — Phase 3 — supplier master (Grand Gold Hotel appears once, not embedded per deal)
- `payments` — Phase 3 — split from deals for scale (audit log + growth)
- `audit_logs` — Phase 1 — who changed what, when, from where
- `travel_credits` — Phase 6 — voucher liability tracking
- `notifications_queue` — Phase 8 — WhatsApp/email/push queue
- `feature_flags` — Phase 0 — flag state per user role
- `accounts` — Phase 6 — currently in localStorage, will move to MongoDB
- `daily_insights_cache` — Phase 8 — AI Command Center cached output

### Indexes (V2 target)
- `leads.enquiryId` — sibling deal lookup
- `leads.clientName + status` — dashboard filtering
- `leads.travelDate` — upcoming departures
- `leads.dealNumber` — unique, sparse
- `clients.phone` — deduplication
- `vendors.name + kind` — supplier lookup
- `audit_logs.timestamp` — descending, for recent activity views
- `payments.dealId` — join back to deal
- `feature_flags.name` — flag evaluation

---

## Authentication (V2)

- JWT-based (retained from V1)
- Real user table with roles: `admin`, `sales_manager`, `sales_agent`, `accountant`, `viewer`
- Password hashed with bcrypt (retained from V1)
- Mobile: JWT stored in Expo SecureStore
- Web: JWT in localStorage (with plan to move to httpOnly cookies in Phase 6)
- Biometric login on mobile (Phase 9): unlocks stored JWT via Face ID / Touch ID / fingerprint

---

## AI Integration Strategy

Three modes, strictly controlled:

**1. On-demand (user-initiated click)**
- AI Cancellation Assistant
- AI Ledger Entry Assistant
- AI Salary Advisor
- Trains/Passport/Ticket OCR extraction
- Cost: proportional to usage. Predictable.

**2. Cached daily (background job)**
- AI Command Center insights (dashboard summary text)
- Runs at 6 AM IST via cron. Result cached until next day.
- Cost: ~₹5-10/day maximum.

**3. Extract only (OCR)**
- Camera scans → Anthropic vision API → structured data
- Justified: replaces manual data entry.

**Never:**
- AI on every dashboard load
- AI health scores per booking
- AI on every form field
- AI for arithmetic

**Monthly AI budget target:** ₹3,000-6,000 total.

---

## Deployment

### Environments
1. **Development** — localhost, individual developer's machine
2. **Staging** — `staging.voyage-crm.com` (subdomain, new Netlify site), separate Render service, separate MongoDB Atlas free-tier cluster
3. **Production** — current `voyage-crm.com` (Netlify) + `voyage-crm.onrender.com` (Render Pro)

### Deploy Flow
```
Developer → dev → push to staging branch
                → auto-deploy to staging
                → 3-day staging test
                → PR to main (requires review)
                → auto-deploy to production
```

### Rollback (all within 5 minutes)
- **Netlify:** previous deploy one click via Netlify UI
- **Render:** last 3 deploys tagged, one-click revert
- **MongoDB:** Point-in-Time Recovery (paid tier, added in Phase 3 before finance work)
- **Feature flags:** disable without any redeploy

---

## Mobile Distribution (Phase 9)

- **iOS App Store** — Apple Developer account ($99/year, created when Phase 9 begins)
- **Google Play Store** — Google Play Developer account ($25 one-time, same timing)
- **EAS Build** — Expo cloud build service (free tier: 30 builds/month, sufficient initially)
- **Over-the-air updates** — via Expo Updates. Business logic changes ship without App Store review.
- **PWA** — served from Netlify, installable on any device

---

## Backend API Contract

Base URL:
- Production: `https://voyage-crm.onrender.com`
- Staging: `https://voyage-crm-staging.onrender.com`

REST endpoints organized by resource. Same endpoints consumed by web and mobile. Versioned via URL path (`/api/v1/...`) starting in Phase 3.

### V1 Endpoints (retained)
- `POST /api/auth/login`
- `GET/POST/PUT/DELETE /api/leads[/:id]`
- `POST /api/chat` (Anthropic proxy, 25MB body limit)
- `GET /api/backup/download`
- `POST /api/backup/send-now`
- `POST /api/backup/restore` (100MB body limit)
- `GET /health`

### V2 Endpoints (added by phase)
- `/api/flags` — Phase 0
- `/api/audit-logs` — Phase 1
- `/api/users` (real user management) — Phase 1
- `/api/vendors` — Phase 3
- `/api/clients` — Phase 4
- `/api/payments` — Phase 3
- `/api/travel-credits` — Phase 6
- `/api/insights/daily` — Phase 8
- `/api/notifications/*` — Phase 8

---

## Security Model

### Current (V1)
- JWT with hardcoded admin/admin123 — MUST BE REPLACED in Phase 1
- CORS: currently permissive
- HTTPS: enforced by Netlify + Render

### Target (V2, complete by Phase 3)
- Real password reset flow (email token)
- Password strength requirements
- Rate limiting on auth endpoints
- CORS restricted to known origins (web app + mobile bundle IDs)
- Sensitive fields (passport numbers, payment refs) encrypted at rest
- Audit log of every write operation
- Session timeout: 30 days rolling, 90 days absolute
- Biometric re-auth for sensitive operations on mobile (large payment updates, deletions)

---

## Performance Targets

### Web
- Dashboard first contentful paint: <2 seconds on 3G
- Deal detail load: <1 second on wifi
- Bundle size: <300 KB gzipped initially, <500 KB by V2 completion

### Mobile
- App launch to first interactive screen: <2 seconds
- Screen transitions: 60 fps
- Camera scan latency: <3 seconds end-to-end (capture → AI → populated form)
- Offline reads: instant (from local cache)
- Background sync: within 30 seconds of network return

### Backend
- P95 API response time: <500ms
- Uptime target: 99.5% (Render Pro)
- Database query P95: <200ms

---

## Change History

- **2026-08-01**: Initial version. Post-approval of Expo architecture and feature-parity philosophy.
