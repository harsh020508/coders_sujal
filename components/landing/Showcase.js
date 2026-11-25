// components/landing/Showcase.js — service grid + editorial asymmetric bento grid.
// Kept contracts: #services, .lk-services-grid, .lk-service-card[data-category], #usps, SERVICES_12.
export const SERVICES_12 = [
  ['cleaning', 'sparkles', 'Home Cleaning', 'Deep clean every room, kitchen, bathroom &amp; sofa.', true, 'From ₹499', './assets/img/cleaning.webp'],
  ['plumber', 'droplets', 'Plumbing', 'Fix leaks, clear blockages &amp; sort water tank issues.', false, 'From ₹280', './assets/img/plumber.webp'],
  ['electrician', 'zap', 'Electrical Repairs', 'Wiring, switches, fans &amp; fault diagnosis.', false, 'From ₹320', './assets/img/electrician.webp'],
  ['ac_repair', 'snowflake', 'AC Servicing', 'Install, refill gas &amp; deep-service your unit.', false, 'From ₹499', './assets/img/ac_repair.webp'],
  ['carpenter', 'hammer', 'Carpentry', 'Doors, furniture, locks &amp; custom woodwork.', false, 'From ₹380', './assets/img/carpenter.webp'],
  ['painter', 'paint-roller', 'Painting', 'Fresh coats, neat touch-ups &amp; waterproofing.', false, 'From ₹650', './assets/img/painter.webp'],
  ['appliance_repair', 'plug-zap', 'Appliance Repair', 'Washers, fridges, microwaves &amp; RO systems.', false, 'From ₹350', './assets/img/appliance_repair.webp'],
  ['pest_control', 'bug', 'Pest Control', 'Cockroaches, termites &amp; mosquito treatment.', false, 'From ₹699', './assets/img/pest_control.webp'],
  ['other', 'leaf', 'Gardening', 'Plant care, pruning &amp; balcony upkeep.', false, 'From ₹299', './assets/img/other.webp'],
  ['shifting', 'truck', 'Moving &amp; Packing', 'Local shifting with safe, careful packing.', false, 'From ₹1,499', './assets/img/shifting.webp'],
  ['other', 'scissors', 'Salon at Home', 'Haircuts, grooming &amp; beauty at your door.', false, 'From ₹249', './assets/img/other.webp'],
  ['other', 'wrench', 'General Maintenance', 'Hanging, drilling &amp; everyday fixes.', false, 'From ₹199', './assets/img/other.webp']
];

export function servicesHTML() {
  return `
  <section class="lk-section" id="services" tabindex="-1">
    <div class="lk-section-inner">
      <div class="lk-section-head">
        <div>
          <p class="lk-eyebrow">Services</p>
          <h2 class="lk-section-title">Everything your home needs.</h2>
        </div>
        <p class="lk-section-sub">From a leaking tap to a full repaint — book a verified local pro for the job.</p>
      </div>
      <div class="lk-services-grid">
        ${SERVICES_12.map((s, i) => `
          <article class="lk-service-card" role="button" tabindex="0" data-category="${s[0]}" aria-label="Book ${s[2]}" style="--card-index: ${i};">
            <span class="lk-card-spotlight" aria-hidden="true"></span>
            <div class="lk-service-thumb">
              <img src="${s[6]}" alt="" loading="lazy" decoding="async" class="lk-service-img" />
              <span class="lk-service-icon"><i data-lucide="${s[1]}" class="lucide-md"></i></span>
            </div>
            <div class="lk-service-body">
              <div class="lk-service-header-row">
                <h3>${s[2]}${s[4] ? ' <span class="lk-badge-popular">Most popular</span>' : ''}</h3>
                <span class="lk-service-rate-pill">${s[5]}</span>
              </div>
              <p>${s[3]}</p>
            </div>
            <span class="lk-service-arrow" aria-hidden="true"><i data-lucide="arrow-right" class="lucide-xs"></i></span>
          </article>`).join('')}
      </div>
    </div>
  </section>`;
}

export function whyHTML() {
  return `
  <section class="lk-section lk-section-tint" id="usps">
    <div class="lk-section-inner">
      <div class="lk-section-head">
        <div>
          <p class="lk-eyebrow">Why LocalKaam</p>
          <h2 class="lk-section-title">Built for households. Fair to pros.</h2>
        </div>
        <p class="lk-section-sub">A straightforward marketplace: no middlemen, no inflated prices, no surprises.</p>
      </div>
      <div class="lk-bento-grid lk-feature-grid">
        <article class="lk-bento-card lk-feature-card lk-bento-verified" style="--card-index: 0;">
          <span class="lk-card-spotlight" aria-hidden="true"></span>
          <div class="lk-feature-head">
            <span class="lk-feature-icon"><i data-lucide="shield-check" class="lucide-md"></i></span>
            <span class="lk-badge-soft">KYC + Police Verification</span>
          </div>
          <h3>Verified professionals</h3>
          <p>Every pro is ID-checked. Reviews only unlock after a confirmed completed job — no fakes.</p>
          <div class="lk-bento-visual lk-bento-kyc" aria-hidden="true">
            <div class="lk-micro-chip lk-chip-green"><i data-lucide="check-circle" class="lucide-xs"></i> Aadhaar KYC Verified</div>
            <div class="lk-micro-chip lk-chip-yellow"><i data-lucide="key" class="lucide-xs"></i> In-App OTP Handshake</div>
            <div class="lk-micro-badge"><i data-lucide="award" class="lucide-xs"></i> 100% Completed Jobs Rated</div>
          </div>
        </article>

        <article class="lk-bento-card lk-feature-card lk-bento-pricing" style="--card-index: 1;">
          <span class="lk-card-spotlight" aria-hidden="true"></span>
          <div class="lk-feature-head">
            <span class="lk-feature-icon"><i data-lucide="receipt" class="lucide-md"></i></span>
            <span class="lk-badge-soft">0% Commission</span>
          </div>
          <h3>Transparent pricing</h3>
          <p>See the agreed price before you tap confirm. No booking fee, no hidden platform charge.</p>
          <div class="lk-bento-visual lk-bento-quote-flow" aria-hidden="true">
            <div class="lk-quote-flow">
              <span class="lk-flow-pill lk-flow-strike">Initial Quote ₹400</span>
              <span class="lk-flow-arrow"><i data-lucide="arrow-right" class="lucide-xs"></i></span>
              <span class="lk-flow-pill lk-flow-agreed">Counter ₹350 Agreed</span>
            </div>
            <div class="lk-micro-chip lk-chip-mint"><i data-lucide="sparkles" class="lucide-xs"></i> Platform cut: ₹0 · 100% to pro</div>
          </div>
        </article>

        <article class="lk-bento-card lk-feature-card lk-bento-schedule" style="--card-index: 2;">
          <span class="lk-card-spotlight" aria-hidden="true"></span>
          <div class="lk-feature-head">
            <span class="lk-feature-icon"><i data-lucide="calendar-check" class="lucide-md"></i></span>
            <span class="lk-badge-soft">Flexible Booking</span>
          </div>
          <h3>Book on your schedule</h3>
          <p>Pick a slot that suits you, reschedule in a tap if plans change, reminders handled automatically.</p>
          <div class="lk-bento-visual lk-bento-slots" aria-hidden="true">
            <div class="lk-slot-strip">
              <span class="lk-slot-chip is-selected"><i data-lucide="clock" class="lucide-xs"></i> Today · 4:00 PM</span>
              <span class="lk-slot-chip">Tomorrow · 10:30 AM</span>
            </div>
            <div class="lk-micro-chip lk-chip-soft"><i data-lucide="bell" class="lucide-xs"></i> Auto-reminder 30 min before</div>
          </div>
        </article>

        <article class="lk-bento-card lk-feature-card lk-bento-direct" style="--card-index: 3;">
          <span class="lk-card-spotlight" aria-hidden="true"></span>
          <div class="lk-feature-head">
            <span class="lk-feature-icon"><i data-lucide="heart-handshake" class="lucide-md"></i></span>
            <span class="lk-badge-soft">No Middleman Call Center</span>
          </div>
          <h3>Direct communication</h3>
          <p>Chat or call your pro right from the booking screen — no call centre in the middle.</p>
          <div class="lk-bento-visual lk-bento-chat" aria-hidden="true">
            <div class="lk-chat-bubble lk-chat-worker">
              <span class="lk-chat-sender">Ravi (Pro)</span>
              <p class="lk-chat-text">"Namaste! Reaching your society gate in 5 mins."</p>
            </div>
            <div class="lk-chat-bubble lk-chat-user">
              <p class="lk-chat-text">"Gate security informed. Building B, 402."</p>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>`;
}
