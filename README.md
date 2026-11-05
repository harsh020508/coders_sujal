# LocalKaam — Hyperlocal Blue-Collar Services Marketplace

[![Live Demo](https://img.shields.io/badge/Live-Deployment-brightgreen?style=for-the-badge)](https://coderssujal-rgvepzub3-lucky21.vercel.app/#landing)
[![Database](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)
[![Sync](https://img.shields.io/badge/Realtime-WebSockets-blue?style=for-the-badge)](https://supabase.com/docs/guides/realtime)
[![UI/UX](https://img.shields.io/badge/Design%20System-v3.0%20Peacock%20%26%20Marigold-0E7C86?style=for-the-badge)](./ui.css)

> **Problem:** Traditional gig aggregators charge 25–40% commissions, squeeze worker earnings, enforce rigid fixed rates, and mask direct contact between urban households and pros.  
> **Solution:** LocalKaam is a direct hyperlocal marketplace with zero platform tax, upfront transparent pricing, built-in price counter-offers, background-verified neighborhood pros, and real-time appointment milestone tracking across Mumbai.

---

## 🌐 Live Deployment & Production URL
- **Production Site:** [https://coderssujal-rgvepzub3-lucky21.vercel.app/#landing](https://coderssujal-rgvepzub3-lucky21.vercel.app/#landing)
- **Supabase Backend:** PostgreSQL with Row Level Security (RLS) & Supabase Realtime Channels.

---

## 👥 Demo Accounts (Evaluator Quick Access)

You can sign in immediately using either the 1-click Quick Login buttons in the app or the credentials below:

| Account Type | Email | Password | Persona & Role |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer.demo@localkaam.in` | `Password@123` | **Aarav Mehta** (Andheri West Household) |
| **Worker** | `ramesh.worker@localkaam.in` | `Password@123` | **Rajesh Kumar** (Verified Plumber & Electrician, ID: `w1`) |

*(Instant 1-click guest access buttons are also built directly into the Auth Modal).*

---

## 🛡️ Honesty & Trust: What is Real vs. Simulated

| Feature | Implementation Status | Technical Details |
| :--- | :---: | :--- |
| **Supabase PostgreSQL & RLS** | **Real** | 6 relational tables with Row-Level Security, custom triggers, and foreign keys |
| **Cross-Device Realtime Sync** | **Real** | Native WebSocket channels (`localkaam-realtime-sync`) with <100ms sync |
| **Authentication & Sessions** | **Real** | Supabase Auth (Email/Password, Google OAuth, session token validation) |
| **Price Negotiation Engine** | **Real** | Interactive proposal and counter-offer state machine with price locking |
| **Distance & ETA Calculation** | **Real** | Haversine formula calculation over Mumbai GPS coordinates |
| **Verification Milestones** | **Demo Simulation** | Phone OTP and Aadhaar ID checks are simulated in demo mode for presentation |

---

## 💎 Design System & UI Architecture

LocalKaam's frontend follows the **"Trust you can see"** design specification:
- **Palette:** Peacock `#0E7C86` (brand/actions), Marigold `#F2A33A` (single focal CTA), Verified Green `#0F7A4F`, Paper surfaces `#FFFFFF` / `#F6F8F9`.
- **Typography:** Bricolage Grotesque (display headings), Inter (clean body UI), JetBrains Mono (OTP/ID codes).
- **The Signature Verification Seal:** Verified pros get a distinctive green double-ring around their avatar with an anchored check seal. The worker dashboard features an interactive verification milestone stepper.
- **Icon Mutation Observer (`icons.js`):** Automatically detects newly injected Lucide icons in any modal, dropdown, or async view and renders crisp SVGs without blank icons.
- **Offline & Resilience Layer:** Local WebP images under 75 KB each with `onerror` fallbacks to initials avatars, plus fallback data cache when Supabase is offline.

---

## 📂 Project Structure

```tree
repo/
├── index.html              # Main HTML entry point (pinned CDNs & metadata)
├── ui.css                  # Modern design system (tokens, buttons, modals, seals, steppers)
├── ui.js                   # UI component helpers (avatar, rating, searchTasks, trapFocus)
├── icons.js                # MutationObserver for automatic Lucide icon updates
├── config.js               # Client runtime environment configuration
├── app.js                  # Client router, hero task-search, and category grid
├── customer.js             # Customer discovery, worker cards, booking modal, invoices
├── worker.js               # Worker dashboard, stat tiles, verification stepper, job controls
├── matching.js             # Haversine distance, ETA, and matching score algorithm
├── bookings.js             # Booking lifecycle state machine & price negotiation rules
├── storage.js              # Unified storage layer (local cache + Supabase Realtime sync)
├── authService.js          # Authentication service (Email/Password, Google OAuth, Demo logins)
├── authModal.js            # Customer & worker sign-in / registration modal with trapFocus
├── supabaseClient.js       # Supabase client manager & connection tester
├── supabaseDataService.js  # Supabase PostgreSQL CRUD data mapper & realtime listener
├── data.js                 # 10 Mumbai categories & 19 seeded neighborhood professionals
├── toast.js                # Accessible toast notification system
├── utils.js                # XSS sanitization and debounce utilities
├── styles.css              # Core typography and baseline stylesheets
├── assets/img/             # Localized high-speed WebP category imagery
└── package.json            # Node configuration & test runner
```

---

## 👥 Demo Sequence (90-Second Golden Path)

1. **Discover Service via Task Search:**
   - On the landing page, type **"tap"** in the hero search box and select **"Leaking Tap & Faucet"** (or click the quick chip).
2. **Review Verified Professionals:**
   - The worker list loads verified neighborhood pros first, showing the **green verification seal**, rating stars, and starting rates.
3. **Request a Visit:**
   - Click **Request a visit** on Rajesh Kumar. Review the 3-step modal, add problem details or a custom price offer, and click **Send request**.
   - Watch the smooth confirmation view with verified check animation and success toast.
4. **Switch to Worker Dashboard:**
   - Switch to Worker role (`ramesh.worker@localkaam.in`). The incoming request appears immediately in **Incoming Requests**.
   - Click **Accept Job** (or send a counter-offer).
5. **Live Verification Stepper:**
   - Observe the **"Your Verification"** stepper on the worker dashboard illustrating the complete trust verification pipeline.
6. **Cross-Device Status Progression:**
   - Step through **I'm On My Way** → **Confirm Arrival** → **Start Job** → **Complete Job**.
   - Digital invoice is generated and earnings dashboard updates in real time.
