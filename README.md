# LocalKaam — Hyperlocal Blue-Collar Services Marketplace

LocalKaam connects households with trustworthy Mumbai service professionals (electricians, plumbers, carpenters, cleaners, AC technicians, and more) with transparent pricing, hyperlocal matching, multi-step worker onboarding, real-time appointment booking, Supabase integration, and SQLite backend persistence.

## 🚀 Key Features

- **Multi-Step Worker Onboarding:** Profiles, specialities across 10 categories, service-specific pricing, past experience, certifications, and online/offline status toggles.
- **Hyperlocal Discovery & Matching:** Location-based search, Haversine distance calculations, calculated ETAs, and Best-Match scoring. Offline workers are strictly hidden.
- **Transparent Appointment Booking:** Exact task selection, problem descriptions, date/time slots, and transparent price breakdowns.
- **Real-Time Booking Lifecycle:** State tracking from `Pending confirmation` → `Confirmed` → `Worker en route` → `Worker arrived` → `Job in progress` → `Job completed`.
- **Backend & Supabase Integration:** SQLite persistence, REST API sync, Server-Sent Events (SSE) real-time updates, and Supabase client support.

## 🛠️ Getting Started

1. Start the backend server:
   ```bash
   npm start
   ```
2. Open your browser at **`http://localhost:3000`** (or use static preview on port 8080).
