# LocalKaam — Hyperlocal Blue-Collar Services Marketplace

[![Live Demo](https://img.shields.io/badge/Live-Deployment-brightgreen?style=for-the-badge)](https://coderssujal-rgvepzub3-lucky21.vercel.app/#landing)
[![Database](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)
[![Sync](https://img.shields.io/badge/Realtime-WebSockets-blue?style=for-the-badge)](https://supabase.com/docs/guides/realtime)

LocalKaam is a production-ready hyperlocal services marketplace connecting households with trustworthy neighborhood blue-collar professionals (plumbers, electricians, carpenters, cleaners, AC technicians, and more) across Mumbai with transparent pricing, direct pay, multi-step worker onboarding, and real-time appointment tracking.

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
| **Worker** | `ramesh.worker@localkaam.in` | `Password@123` | **Ramesh Kumar** (Verified Plumber & Electrician, ID: `w1`) |

---

## ⚙️ Environment Variables

Set these environment variables in your Vercel Project Settings (`Settings > Environment Variables`) and locally in `.env`:

| Variable Name | Required | Description | Example / Current Production Value |
| :--- | :---: | :--- | :--- |
| `VITE_SUPABASE_URL` | **Yes** | Your Supabase Project HTTPS URL | `https://dcijrqwoxkazggouvhdn.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | Public Supabase Anon API key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Optional | Supabase publishable identifier | `sb_publishable_OWfosp_8VvcCS0Exlwm1vA_EFjLBBjP` |

*(See `.env.example` in the repository root for the ready-to-copy template).*

---

## 🛠️ Architecture & Cross-Device Sync

1. **Frontend Hosting (Vercel CDN):** Deployed as a high-speed static web app serving ES6+ modules (`app.js`, `customer.js`, `worker.js`, etc.) with zero cold starts.
2. **Database (Supabase PostgreSQL):** Relational schema spanning 6 tables (`profiles`, `workers`, `worker_services`, `bookings`, `reviews`, `complaints`) with foreign keys, constraints, and performance indexes.
3. **Cross-Device Live Sync (Supabase Realtime):** Uses native WebSocket channels (`localkaam-realtime-sync`) on Postgres publication events (`postgres_changes`). When a customer books or a worker accepts on Device A, Device B receives the update in <100ms without polling.
4. **Server-Side Security & State Enforcement:**
   - **Row Level Security (RLS):** Enabled on all tables. Offline workers are strictly hidden from customer discovery; customers see their own bookings; workers see assigned jobs.
   - **Trigger Validation (`validate_booking_transition`):** Enforces legal state machine transitions server-side (`Pending confirmation` → `Confirmed` → `Worker en route` → `Worker arrived` → `Job in progress` → `Job completed`).
   - **Price Lock:** Enforces that once an appointment is confirmed, `agreed_price` is strictly locked in the database against tampering.

---

## 🚀 Supabase Database Setup (1-Minute Step)

If setting up a fresh database:
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** > **New Query**.
3. Open [`supabase_schema.sql`](./supabase_schema.sql) in this repo, copy its entire contents, paste it into the SQL editor, and click **Run**.
4. The script is completely **idempotent**: it creates tables, triggers, RLS policies, realtime publications, and pre-seeds 8 verified Mumbai service professionals.

---

## 📂 Project Structure

```tree
repo/
├── index.html              # Main HTML entry point (CDN scripts & config)
├── config.js               # Client runtime environment configuration
├── .env.example            # Environment variables template
├── app.js                  # Client-side router, role management, and navigation
├── customer.js             # Customer discovery, worker comparison, booking modal, invoice
├── worker.js               # Worker dashboard, multi-step onboarding, active job controls
├── matching.js             # Haversine distance, ETA, and matching score algorithm
├── bookings.js             # Booking lifecycle state machine & price negotiation rules
├── storage.js              # Unified storage layer (local cache + Supabase Realtime sync)
├── authService.js          # Authentication service (Email/Password, Google OAuth, Demo logins)
├── authModal.js            # Customer & worker sign-in / registration modal
├── supabaseClient.js       # Supabase client manager & connection tester
├── supabaseDataService.js  # Supabase PostgreSQL CRUD data mapper & realtime listener
├── supabaseSetupModal.js   # In-app setup modal with connection test & schema copy
├── supabase_schema.sql     # Complete PostgreSQL DDL, triggers, RLS, and seed data
├── data.js                 # Initial Mumbai localities, categories, and professionals
├── toast.js                # Animated feedback toast notifications
├── utils.js                # XSS sanitization and debounce utilities
├── styles.css              # Stitch Sketchbook Editorial design tokens
└── package.json            # Node configuration
```

---

## 👥 Demo Sequence (Evaluating Cross-Device Sync)

1. **Device / Window 1 (Customer):**
   - Open [coderssujal-rgvepzub3-lucky21.vercel.app](https://coderssujal-rgvepzub3-lucky21.vercel.app/#landing).
   - Click **Get Started** → **Continue as Customer** (or sign in as `customer.demo@localkaam.in`).
   - Search for **"Leaking Tap"** or click **Plumber**.
   - Select **Ramesh Kumar** → click **Book Now**.
   - Enter problem details and propose an offer (e.g. ₹400) → click **Confirm & Request Booking**.
2. **Device / Window 2 (Worker):**
   - Open the site in a separate browser window or phone as **Worker** (or sign in as `ramesh.worker@localkaam.in`).
   - Go to **Booking Requests** tab: The request from Aarav Mehta appears live!
   - Click **Accept Request** (or send a counter-offer).
3. **Live Status Flow:**
   - On the Worker device, click **En Route** → **Arrived** → **Start Job** → **Complete Job**.
   - Watch the Customer's **My Bookings** view update instantly in real-time across both screens!
   - On the Customer device, click **Invoice** to view the itemized digital invoice, then submit a 5-star review.
