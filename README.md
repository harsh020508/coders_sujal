# LocalKaam

Hyperlocal marketplace for verified home-service professionals in Mumbai.

Households book electricians, plumbers, carpenters, cleaners and other neighbourhood trades with upfront prices, in-app counter-offers, live job milestones and **0% platform commission**. Pros keep 100% of the agreed amount.

**Live site:** https://coderssujal.vercel.app

---

## Why it exists

Typical aggregators take 25-40% commission, hide phone numbers and lock both sides into rigid rates. LocalKaam is a direct street-level marketplace:

- Transparent base rates before you confirm
- Built-in price negotiation (offer / counter-offer)
- Verified neighbourhood pros, not a city-wide stranger pool
- Live status: requested, accepted, en route, arrived (OTP), in progress, complete
- Digital invoice and earnings dashboard

---

## Quick start

```bash
# Clone
git clone https://github.com/harsh020508/coders_sujal.git
cd coders_sujal

# Optional: copy env for local API features
cp .env.example .env

# Run tests
npm test

# Frontend-only preview (static files)
npm run serve

# Full local API (SQLite + photo diagnosis + OTP)
npm start
```

Then open http://localhost:8080 (static) or http://localhost:3000 (Node server).

No build step. The app is ES modules served as static files, with an optional Node server for OTP, notifications and AI photo diagnosis.

---

## Demo accounts

Use the 1-click guest buttons in the auth modal, or sign in with:

| Role | Email | Password | Persona |
| --- | --- | --- | --- |
| Customer | `customer.demo@localkaam.in` | `Password@123` | Aarav Mehta, Andheri West |
| Worker | `ramesh.worker@localkaam.in` | `Password@123` | Rajesh Kumar, plumber & electrician (`w1`) |

---

## 90-second walkthrough

1. On the landing page, click **Explore** on Plumbing (or any trade). Sign in as customer if prompted.
2. The customer dashboard lists verified neighbourhood pros first (green verification seal, rating, starting rate).
3. Open **Rajesh Kumar**, add a short problem note or a custom offer, then **Send request**.
4. Switch to the worker account. The request appears under **Incoming Requests**. Accept it (or send a counter-offer).
5. Step the job: **I'm On My Way** -> **Confirm Arrival** (customer shares the 6-digit in-app OTP) -> **Start Job** -> **Complete Job**.
6. Invoice and earnings update immediately. Open a second browser to see realtime sync.

---

## What is real vs simulated

| Capability | Status | Notes |
| --- | --- | --- |
| Supabase Auth (email/password, Google OAuth, sessions) | Real | Falls back to labelled demo/guest mode if keys are missing |
| PostgreSQL + Row Level Security | Real | Schema in `supabase_schema.sql` and follow-up migrations |
| Cross-device sync | Real | Supabase Realtime, with localStorage fallback and cross-tab `storage` events |
| Matching, distance, ETA | Real | Haversine over Mumbai locality coordinates |
| Price negotiation state machine | Real | Offer / counter / lock in `bookings.js` |
| Arrival OTP | Real on Node/Vercel API | Hash-only storage; customer sees the code in-app (no SMS) |
| Photo diagnosis | Real when Gemini keys are set | Otherwise a clearly labelled demo result |
| Phone / Aadhaar KYC | Demo simulation | Shown as a verification stepper, not a live UIDAI check |

---

## Architecture

```
Browser (static ES modules)
  app.js                 router + theme + landing bind
  components/landing/    marketing page (hero, services, proof, FAQ)
  customer.js            discovery, booking, invoices, map
  worker.js              jobs, earnings, verification, OTP entry
  authModal.js           sign-in / register / guest
  storage.js             cache + Supabase sync
  animations/            motion, Lenis scroll, GSAP reveals

Optional Node server (server.js) or Vercel serverless (api/)
  /api/store             persistence fallback
  /api/notifications     in-app notification fan-out
  /api/otp               arrival OTP issue / verify
  /api/analyze-photo     Gemini vision diagnosis
  /api/customer-care     OpenRouter help replies
```

Hash routes: `#landing` `#role-select` `#customer` `#worker` `#settings`.

Customer and worker dashboards are lazy-loaded so the landing page paints immediately.

---

## Project layout

```
index.html                 App shell, fonts, Leaflet, Lucide, boot
app.js                     Router, shells, landing event wiring
components/landing/        Landing sections + bind.js
animations/                Motion tokens, scroll, reveals, polish
customer.js / worker.js    Role dashboards
authService.js             Auth, OAuth PKCE, guest sessions
storage.js                 Unified storage + realtime
bookings.js                Booking lifecycle + OTP hash
matching.js                Distance, ETA, eligibility
notificationService.js     Bell, toasts, live events
settingsService.js         Theme, accent, shortcuts
i18n.js                    English / Hindi / Marathi
data.js                    Categories, localities, seeded pros
server.js                  Local API + SQLite
api/                       Vercel functions
supabase_*.sql             Schema and migrations
tests/                     Node test runner
```

---

## Configuration

Copy `.env.example` to `.env`. Client keys (if you self-host Supabase) go in `config.js`. Server-only keys never use a `VITE_` prefix:

| Variable | Used by |
| --- | --- |
| `PORT` | `server.js` (default 3000) |
| `GEMINI_API_KEY` / `GEMINI_API_KEYS` | Photo diagnosis |
| `OPENROUTER_API_KEYS` | Customer-care replies |
| `DEMO_MODE` | Force labelled demo AI results |

On Vercel, set the same server keys under Project > Settings > Environment Variables. `.env` is gitignored and is not uploaded.

---

## Tests

```bash
npm test
```

Coverage includes auth, notifications, arrival OTP (server + frontend), live sync, map maths, locality matching, and landing markup (required IDs, real category ids, no placeholder copy).

---

## Design

- **Ink / paper** surfaces with a single accent (default forest + marigold CTA)
- **Typography:** Bricolage Grotesque (headings), Inter (UI), JetBrains Mono (OTP)
- **Icons:** Lucide via `icons.js` mutation observer
- **Motion:** spring press on buttons, Lenis inertia scroll, GSAP scroll reveals, all gated by `prefers-reduced-motion`
- **Theme:** light / dark / system, persisted in settings, applied before first paint

---

## Stack

JavaScript ES modules, vanilla DOM, Leaflet (OSM), Supabase (Auth + Postgres + Realtime), optional Node 22 `node:sqlite` server, Vercel static + serverless.

---

## License

MIT. See `package.json`.
