# Audit results
## Counts
- innerHTML uses: 46 across files (app.js:7, authModal.js:2, customer.js:28, supabaseSetupModal.js:1, toast.js:1, worker.js:6, worker_new_features.js:1)
- !important: 13
- hard-coded colours: 10
- <img> tags: 5 (without alt: 0)
- clickable non-buttons: 1 (category-card in app.js with role="button" tabindex="0")

## Emoji in UI code
- app.js:124: <button class="mobile-nav-close" id="mobile-nav-close" aria-label="Close menu">✕</button>
- app.js:221: <span>📍 <strong>1.8 km</strong> away (~18m)</span>
- app.js:341: <th style="background:rgba(255,233,92,0.15);color:var(--text-primary);">LocalKaam ✦</th>
- app.js:350: <td style="background:rgba(255,233,92,0.06);"><span style="color:#10b981;font-weight:700;">✓ In-app Counter Offers</span></td>
- app.js:351: <td>❌ Rigid fixed rates</td><td>❌ Fixed rates</td><td>⚠️ Unstructured haggling</td>
- app.js:356: <td>❌ 20–35% cut</td><td>❌ 25% cut</td><td>Paid lead ads</td>
- app.js:360: <td style="background:rgba(255,233,92,0.06);"><span style="color:#10b981;font-weight:700;">✓ ~25 min ETA</span></td>
- app.js:361: <td>⚠️ City-wide pool</td><td>⚠️ City-wide pool</td><td>❌ No ETA guarantees</td>
- app.js:365: <td style="background:rgba(255,233,92,0.06);"><span style="color:#10b981;font-weight:700;">✓ Live status milestones</span></td>
- app.js:366: <td>✓ App tracking</td><td>⚠️ Basic SMS</td><td>❌ None</td>
- app.js:370: <td style="background:rgba(255,233,92,0.06);"><span style="color:#10b981;font-weight:700;">✓ Direct phone &amp; booking</span></td>
- app.js:371: <td>❌ Masked calls</td><td>❌ Masked calls</td><td>⚠️ Spam directory</td>
- app.js:514: <button class="mobile-nav-close" id="mobile-nav-close">✕</button>
- authModal.js:71: ⚡ Continue as ${isWorker ? 'Worker Pro (Instant Access)' : 'Customer (Instant Access)'}
- customer.js:41: <span>🔍</span>
(Total: 108 occurrences across data.js, toast.js, and legacy fallbacks)

## Icon references (.icon)
- app.js:323: <i data-lucide="${u.icon}" class="lucide-md"></i>
- app.js:392: <i data-lucide="${s.icon}" class="lucide-sm"></i>

## CSS Health (styles.css)
- !important count: 13
- z-index declarations: 4
- @media queries: 5
- Hard-coded hex colors outside var definitions: 10

## Screens found (name, file, function that renders it)
- Landing page: app.js -> App.renderLandingPage()
- Role selection: app.js -> App.renderRoleSelect()
- Customer view (workers, filters, search, bookings, history, help, complaints): customer.js -> CustomerFrontend.render()
- Booking modal & confirmation: customer.js -> CustomerFrontend.openBookingModal() / confirmBooking()
- Auth modal (login, register, customer/worker tabs): authModal.js -> AuthModal.render() / open()
- Worker dashboard (overview, jobs, earnings, profile, verification): worker.js -> WorkerFrontend.render()
- Supabase setup modal: supabaseSetupModal.js

## Top 40 class names JS depends on (DO NOT RENAME)
- btn (88)
- btn-sm (42)
- form-control (41)
- form-label (39)
- btn-primary (37)
- btn-outline (37)
- lucide-xs (35)
- lucide-sm (20)
- form-select (16)
- sidebar-item (14)
- btn-xs (14)
- modal-card (12)
- modal-close (12)
- nav-link (10)
- badge (10)
- btn-full (9)
- ? (9)
- dashboard-header (9)
- metric-card (8)
- nav-logo (6)
- table-container (6)
- data-table (6)
- theme-toggle (5)
- section-container (5)
- section-title (5)
- section-subtitle (5)
- sidebar-badge (5)
- empty-state (5)
- badge-accepted (4)
- stat-card (4)
- lucide-md (4)
- lucide-lg (4)
- === (4)
- worker-meta-item (4)
- skill-tag (4)
- btn-danger (4)
- app-container (3)
- navbar (3)
- nav-brand (3)
- nav-title (3)
