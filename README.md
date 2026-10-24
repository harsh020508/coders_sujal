# LocalKaam — Hyperlocal Blue-Collar Services Marketplace

LocalKaam connects households with trustworthy Mumbai service professionals (electricians, plumbers, carpenters, cleaners, AC technicians, and more) with transparent pricing, hyperlocal matching, multi-step worker onboarding, and real-time appointment booking.

## 🚀 Key Features

- **Multi-Step Worker Onboarding:** Profiles, specialities across 10 categories, service-specific pricing, and online/offline status toggles.
- **Hyperlocal Discovery & Matching:** Location-based search, Haversine distance calculations, calculated ETAs, and Best-Match scoring.
- **Transparent Appointment Booking:** Exact task selection, problem descriptions, date/time slots, and transparent price breakdowns (base price + visiting charges).
- **Real-Time Booking Lifecycle:** State tracking from `Pending confirmation` → `Confirmed` → `Worker en route` → `Worker arrived` → `Job in progress` → `Job completed`.
- **Production Polish:** Stored XSS prevention (`esc()`), secure toast notifications, invoice/receipt generator with `@media print` CSS, and mobile-first responsive design.

## 🛠️ Getting Started

1. Clone or open the project repository.
2. Start a local web server in the project directory:
   ```bash
   python3 -m http.server 8080
   ```
3. Open your browser at **`http://localhost:8080`**.
