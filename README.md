# LocalKaam — Hyperlocal Blue-Collar Services Marketplace

[![Live Website](https://img.shields.io/badge/Live%20Platform-coderssujal.vercel.app-1a3300?style=for-the-badge&logo=vercel&logoColor=white)](https://coderssujal.vercel.app)
[![Architecture](https://img.shields.io/badge/Architecture-Vanilla%20ES%20Modules-ffe95c?style=for-the-badge&labelColor=1a3300&color=ffe95c)](https://coderssujal.vercel.app)
[![Display Rate](https://img.shields.io/badge/Display%20Rate-Locked%20120Hz-d5f5c2?style=for-the-badge&labelColor=1a3300&color=d5f5c2)](https://coderssujal.vercel.app)
[![Tests](https://img.shields.io/badge/Tests-73%20Passing%20(100%25)-10b981?style=for-the-badge&labelColor=1a3300&color=10b981)](https://coderssujal.vercel.app)
[![License](https://img.shields.io/badge/License-MIT-gray?style=for-the-badge)](LICENSE)

> **Good help lives on your street.**  
> LocalKaam is a direct street-level marketplace connecting Mumbai households with verified neighborhood electricians, plumbers, carpenters, appliance technicians, and home cleaners with upfront transparent rates, bilateral price negotiation, live job milestones, and **0% platform commission**. Pros keep 100% of what they earn.

---

## ⚡ Experience LocalKaam Live

👉 **Launch Platform:** **[https://coderssujal.vercel.app](https://coderssujal.vercel.app)**

Instant 1-click sandbox access is available directly from the sign-in modal for both roles:

| Role | Demo Persona | Neighborhood | Highlights |
| :--- | :--- | :--- | :--- |
| **Customer** | Aarav Mehta | Andheri West, Mumbai | Browse 12+ trades, send direct offers, live arrival OTP, digital invoices |
| **Service Pro** | Rajesh Kumar | Andheri West, Mumbai | 0% commission, online/offline switch, arrival OTP verification, instant payout requests |

---

## 💡 The Problem & The LocalKaam Solution

Traditional aggregators take **25% to 40% commission** from blue-collar technicians, mask customer contact numbers, and enforce rigid, inflated corporate pricing. LocalKaam replaces the middleman with a transparent neighborhood exchange:

| Traditional Aggregators | LocalKaam Marketplace |
| :--- | :--- |
| ❌ 25% – 40% platform commission deductions | ✅ **0% platform commission** — workers keep 100% of earnings |
| ❌ Rigid, non-negotiable prices set by algorithm | ✅ **Direct price transparency** with built-in offer / counter-offer negotiation |
| ❌ Distant dispatch across the entire city | ✅ **Hyperlocal matching** by Mumbai neighborhood & walking distance |
| ❌ Opaque fees, hidden surge charges | ✅ **Clear itemized digital receipts** in INR with instant breakdown |
| ❌ Heavy apps with slow load times | ✅ **Instant first-paint** with native 120 FPS hardware-accelerated motion |

---

## 🚀 Key Product Features

### 🏡 For Households (Customers)
- **Compact Service Discovery**: Browse 12 curated service categories (Plumbing, Electrical, Carpentry, Painting, Appliance Care, Cleaning, AC Service, Roofing, Pest Control, Locksmith, Gardening, and Home Deep Clean).
- **Locality-Aware Worker Matching**: Real-time distance and estimated arrival calculations across Mumbai localities (Andheri, Bandra, Powai, Juhu, Dadar, Thane, Borivali, etc.).
- **Interactive 4-Step Booking**: Structured guided flow: *Task & Category → Job Details → Appointment Slot → Pricing & Review*.
- **Bilateral Price Negotiation**: Submit custom price proposals or review and accept counter-offers in real-time.
- **In-App Arrival OTP**: Secure arrival verification via 6-digit in-app code (no SMS delivery lag or fees).
- **Interactive Street Map**: On-demand Leaflet & OpenStreetMap visualization with live route estimation and proximity pins.

### 🛠️ For Service Professionals (Workers)
- **100% Retained Earnings**: Zero platform fees or hidden commission cuts.
- **Live Availability Switch**: 1-tap instant Online / Offline toggle with persistent status sync.
- **Job Lifecycle Controls**: Status-aware milestone actions: *Accept / Counter → On My Way → Verify Arrival OTP → Start Job → Complete Job*.
- **Credential Verification**: Transparent badge preview (simulated Aadhaar/PAN KYC and skill certification checks).
- **Instant Payout Requests**: Instant settlements to UPI or direct bank transfer (IMPS/NEFT) with verified digital receipts.

---

## 🎨 Stitch Sketchbook Design System

Built on the **Stitch Sketchbook** visual identity — friendly, tactile, warm, and editorial:

- **Cream Surfaces (`#fcfaf5`)**: Warm, calming background that avoids sterile corporate white.
- **Forest Ink (`#1a3300`)**: Deep organic ink for high-contrast, effortless readability (WCAG AAA compliant at 11.4:1).
- **Highlighter Yellow (`#ffe95c`)**: Vibrant, restrained accents for primary calls-to-action and active badges.
- **Mint Supportive Green (`#d5f5c2`)**: Positive status badges and trust metrics.
- **Locked 120Hz Smoothness**: Native GPU-composited scrolling with zero scroll-jacking lag, 0ms input latency, and hardware-accelerated transitions (`transform: translate3d`).
- **Dark Mode & Multilingual**: Flawless light/dark/system theme switching with full translations in **English, हिन्दी (Hindi), and मराठी (Marathi)**.

---

## 🏗️ Architecture & Technology Stack

LocalKaam is engineered with **zero framework bloat** — 100% vanilla JavaScript ES modules with native browser APIs:

```
┌─────────────────────────────────────────────────────────────┐
│                 Client (Vanilla ES Modules)                 │
│  app.js                 Router, App Shell & Theme Engine    │
│  components/landing/    Marketing Hero, Services & FAQ      │
│  customer.js            Discovery, Discovery Map & Booking  │
│  worker.js              Job Lifecycle, OTP & Payouts        │
│  authModal.js           Supabase Auth & Guest Sandbox       │
│  tokens.css             Design Tokens (Colors, Radius, Z)   │
│  animations/            120Hz Native Motion & Reveal Engine │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌─────────────────────────────┐┌──────────────────────────────┐
│  Supabase Cloud Services    ││   Vercel Serverless / Node   │
│  • GoTrue Authentication    ││  • In-App Arrival OTP Engine │
│  • PostgreSQL + RLS         ││  • Realtime Notification SSE │
│  • Supabase Realtime Sync   ││  • Gemini Vision Diagnostics │
└─────────────────────────────┘└──────────────────────────────┘
```

- **Frontend**: Native HTML5, CSS custom properties (`tokens.css`), ES Modules (no framework overhead).
- **Maps**: Leaflet + OpenStreetMap (loaded asynchronously strictly on demand).
- **Icons**: Lucide SVG Icons.
- **Authentication**: Supabase Auth (Email/Password, Google OAuth PKCE) with fallback guest sandbox.
- **Database**: PostgreSQL with Row-Level Security (RLS) & local SQLite fallback.
- **Offline & PWA**: Web App Manifest (`manifest.json`), high-resolution SVG maskable icons, and `<noscript>` fallback.

---

## 🛡️ Trust, Security & Verification Transparency

| Capability | Implementation | Behavior |
| :--- | :--- | :--- |
| **Authentication** | Supabase Auth + OAuth PKCE | Real JWT sessions; guest sandbox mode clearly badged with persistent banner |
| **Arrival OTP** | Cryptographic Hash Verification | Real single-use 6-digit code with 10-attempt lockout and expiry window |
| **Distance & ETA** | Haversine Formula | Calculated from exact latitude/longitude coordinates across Mumbai localities |
| **Price Negotiation** | State Machine Engine | Real bilateral offer/counter-offer state transitions |
| **Data Privacy** | Row-Level Security (RLS) | Private customer details and worker credentials protected against unauthorized access |
| **Photo Diagnosis** | Google Gemini Vision API | Automated repair triage when API keys configured; labelled demo fallback |

---

## 🧪 Quality Assurance & Test Coverage

LocalKaam includes comprehensive test coverage with **73 automated test assertions across 8 test suites** (100% passing):

- `tests/auth.test.js` — Authentication, session restoration, role sanitization, and security isolation.
- `tests/notifications.test.js` — Real-time Server-Sent Events (SSE) notification fan-out and multi-tab deduplication.
- `tests/otp.test.js` — In-app arrival OTP issuance, cryptographic hash checks, rate-limiting, and single-use locking.
- `tests/otp-frontend.test.js` — In-app code rendering and worker verification modal workflows.
- `tests/live-sync.test.js` — Cross-tab storage listeners and synchronized live state transitions.
- `tests/map.test.js` — Mumbai coordinate validation and Haversine distance computations.
- `tests/location.test.js` — Locality type-ahead filtering and active worker availability validation.
- `tests/landing.test.js` — Semantic landmark verification, service category mapping, and theme persistence.

---

## 📄 License

LocalKaam is open-source software licensed under the [MIT License](LICENSE).
