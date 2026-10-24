# LocalKaam — Hyperlocal Blue-Collar Services Marketplace

[![Live Demo](https://img.shields.io/badge/Live-Deployment-brightgreen?style=for-the-badge)](https://coderssujal-rgvepzub3-lucky21.vercel.app/#landing)

LocalKaam is a production-ready, highly polished hyperlocal services marketplace connecting households with trustworthy neighborhood blue-collar professionals (plumbers, electricians, carpenters, cleaners, AC technicians, and more) across Mumbai with transparent pricing, direct pay, multi-step worker onboarding, and real-time appointment tracking.

---

## 🌐 Live Deployment
Experience the live application here: [https://coderssujal-rgvepzub3-lucky21.vercel.app/#landing](https://coderssujal-rgvepzub3-lucky21.vercel.app/#landing)

---

## 🚀 Key Features

1. **Multi-Step Worker Onboarding:**
   - Step 1: Basic profile setup (name, phone, bio, city, locality, service radius, languages).
   - Step 2: Speciality selection across 10 service categories (Electrician, Plumber, Carpenter, Painter, AC Repair, Appliance Repair, Cleaning, Shifting, Pest Control, Handyman).
   - Step 3: Service-specific pricing (fixed price, hourly rate, visiting/inspection charges, est. duration, and certifications).
   - Step 4: Availability & online status toggle (offline workers are strictly hidden from customer discovery).

2. **Hyperlocal Service Discovery & Matching:**
   - Real-time location selection across Mumbai suburbs (Andheri, Bandra, Powai, Juhu, Colaba, Dadar, Thane, Malad).
   - Haversine distance calculations and service-radius filtering with calculated ETAs and Best-Match scoring.
   - Sorting by rating, price, and distance.

3. **Transparent Appointment Booking & Negotiation:**
   - Exact task selection, problem description, service address, and appointment date/time slots.
   - Transparent price breakdown (Service base price + visiting inspection charge).
   - Built-in counter-offer negotiation with explicit customer/worker acceptance and locked agreed pricing.

4. **Real-Time Booking Lifecycle:**
   - State-driven workflow: `Pending confirmation` → `Confirmed` → `Worker en route` → `Worker arrived` → `Job in progress` → `Job completed` (plus `Cancelled` / `Disputed`).
   - Cross-device sync powered by Server-Sent Events (SSE) and SQLite backend persistence.

5. **Stitch Sketchbook Editorial Design System:**
   - Aesthetic warm cream paper canvas (`#fcfaf5`), forest green structural ink (`#1a3300`), highlighter yellow accents (`#ffe95c`), and sticky note mint fills (`#d5f5c2`).
   - Bricolage Grotesque display typography and Inter functional sans-serif.
   - Robust Light & Dark mode support across every page and component.

---

## 🛠️ Technology Stack

- **Backend:** Node.js, Express, SQLite (`node:sqlite`), Server-Sent Events (SSE) real-time event broadcasting.
- **Frontend:** Vanilla JavaScript (ES6+ Modules), HTML5, CSS3, Tailwind CSS.
- **Persistence & Auth:** Browser `sessionStorage` / `localStorage`, Supabase PostgreSQL & Auth client support.

---

## 📂 Project Architecture

```tree
/home/harsh/Downloads/hackathon/
├── server.js              # Unified Node.js backend server (SQLite & SSE sync)
├── index.html             # Application entry point
├── app.js                 # Client-side router, role management, and navigation
├── customer.js            # Customer discovery, worker comparison, booking modal, invoice
├── worker.js              # Worker dashboard, multi-step onboarding, active job controls
├── matching.js            # Haversine distance, ETA, and matching score algorithm
├── bookings.js            # Booking lifecycle state machine & price negotiation rules
├── storage.js             # Unified storage layer (local cache + backend sync)
├── authService.js         # User profile and session management
├── authModal.js           # Professional customer & worker sign-in / registration modal
├── supabaseClient.js      # Supabase client configuration
├── supabaseDataService.js # Supabase PostgreSQL data mapper & realtime synchronizer
├── data.js                # Seeded Mumbai localities, categories, and professionals
├── toast.js               # Animated notification system
├── utils.js               # XSS escaping and debounce utilities
├── styles.css             # Stitch Sketchbook Editorial design tokens & dark mode styles
└── package.json           # Node configuration and startup scripts
```

---

## 🚦 Getting Started & Installation

1. **Clone or open the repository.**
2. **Install dependencies (if required):**
   ```bash
   npm install
   ```
3. **Start the production backend server:**
   ```bash
   npm start
   ```
   *The server will start at **`http://localhost:3000`**.*
4. **Alternatively, start the static preview server:**
   ```bash
   python3 -m http.server 8080
   ```
   *Preview at **`http://localhost:8080`**.*

---

## 👥 Demo Sequence (3-Minute Presentation)

1. **Landing Page:** Open [Live App](https://coderssujal-rgvepzub3-lucky21.vercel.app/#landing). Admire the Stitch editorial design, problem/solution, and features.
2. **Customer Journey:** Click **Get Started** → **Continue as Customer**. Sign in with your name and phone. Search for `"leaking tap"` or select **Plumber**. Compare nearby experts, view profiles, and book an appointment with transparent pricing.
3. **Worker Journey:** Open a separate tab as **Worker** (or switch role). Complete the multi-step onboarding (or view Ramesh Kumar's profile). Set status to **Online**.
4. **Live Synchronization:** Accept the customer's incoming appointment request. Watch the status transition live to `Confirmed`, then progress through `En Route`, `Arrived`, `In Progress`, and `Job Completed`.
5. **Invoice & Review:** Switch back to Customer, view the itemized digital invoice, and submit a 5-star review!
