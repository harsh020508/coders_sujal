// components/landing/Hero.js — clean product-led hero with interactive Mumbai pro showcase (v3).
// Preserved contracts: #hero-title, #hero-find-pro-btn, #hero-explore-btn, #hero-card-book-btn, #hero-card-quote-btn.

export const HERO_PROS = [
  {
    idx: 0,
    name: 'Ravi Sharma',
    trade: 'Plumber',
    locality: 'Andheri West',
    category: 'plumber',
    avatar: 'RS',
    startsFrom: '₹250',
    eta: '~25 min',
    nextSlot: 'Today, 3:45 PM',
    rating: '4.9',
    jobs: '312 jobs',
    status: 'Booking confirmed',
    substatus: 'Today, 3:45 PM',
    negotiation: 'Quote ₹350 → Counter ₹300 → Agreed ₹320',
    meta: 'OTP #4829 ready',
    badge: 'Available now',
    areaStats: '94 bookings this week in Andheri'
  },
  {
    idx: 1,
    name: 'Vikram Sawant',
    trade: 'Electrician',
    locality: 'Bandra West',
    category: 'electrician',
    avatar: 'VS',
    startsFrom: '₹220',
    eta: '~18 min',
    nextSlot: 'Today, 4:15 PM',
    rating: '4.9',
    jobs: '248 jobs',
    status: 'En route · 1.2 km',
    substatus: 'Today, 4:15 PM',
    negotiation: 'Switchboard fix ₹400 → Direct ₹0 fee',
    meta: 'En route · 1.2 km',
    badge: 'En route now',
    areaStats: '78 bookings this week in Bandra'
  },
  {
    idx: 2,
    name: 'Sunita More',
    trade: 'Home Cleaning',
    locality: 'Powai',
    category: 'cleaning',
    avatar: 'SM',
    startsFrom: '₹499',
    eta: '~22 min',
    nextSlot: 'Today, 4:30 PM',
    rating: '4.8',
    jobs: '410 jobs',
    status: 'Ready to dispatch',
    substatus: 'Slot Today, 4:30 PM',
    negotiation: '2BHK Deep Clean ₹2,200 · 100% to pro',
    meta: 'Slot Today, 4:30 PM',
    badge: 'Top Rated Pro',
    areaStats: '112 bookings this week in Powai'
  }
];

export function heroHTML() {
  const p0 = HERO_PROS[0];
  return `
  <section class="lk-hero" aria-labelledby="hero-title">
    <div class="lk-ambient-mesh" aria-hidden="true">
      <div class="lk-orb lk-orb-1"></div>
      <div class="lk-orb lk-orb-2"></div>
    </div>
    <div class="lk-hero-inner">
      <div class="lk-hero-copy">
        <p class="lk-eyebrow"><span class="lk-eyebrow-line" aria-hidden="true"></span>Mumbai home services</p>
        <h1 id="hero-title" class="lk-hero-title">Local workers in your area</h1>
        <p class="lk-hero-sub">Verified plumbers, electricians and cleaners. Fixed prices, direct payment, arrives in ~25 minutes.</p>
        <div class="lk-hero-actions">
          <button class="btn lk-btn-primary" id="hero-find-pro-btn">Find someone <i data-lucide="arrow-right" class="lucide-sm"></i></button>
          <button class="btn lk-btn-secondary" id="hero-explore-btn">Browse trades</button>
        </div>
        <ul class="lk-hero-proof" aria-label="What every booking includes">
          <li><i data-lucide="check" class="lucide-xs"></i>ID verified</li>
          <li><i data-lucide="check" class="lucide-xs"></i>Price agreed upfront</li>
          <li><i data-lucide="check" class="lucide-xs"></i>Direct payment</li>
        </ul>
      </div>
      <div class="lk-hero-visual">
        <div class="lk-hero-pro-tabs" role="tablist" aria-label="Featured neighbourhood professionals">
          ${HERO_PROS.map((p, i) => `
            <button type="button" role="tab" class="lk-hero-pro-tab${i === 0 ? ' is-active' : ''}" data-hero-pro="${p.idx}" id="hero-tab-${p.idx}" aria-selected="${i === 0 ? 'true' : 'false'}" aria-controls="hero-pro-card">
              <span class="lk-hero-tab-pill">${p.trade}</span>
              <span class="lk-hero-tab-name">${p.name.split(' ')[0]} · ${p.locality.split(' ')[0]}</span>
            </button>
          `).join('')}
        </div>
        <div class="lk-pro-card-tilt">
          <div class="lk-pro-card lk-card-spotlight" id="hero-pro-card">
            <div class="lk-card-specular" aria-hidden="true"></div>
            <div class="lk-pro-available-badge" id="hero-card-badge">
              <span class="lk-job-dot"><span class="lk-sonar-ping"></span></span><span id="hero-badge-text">${p0.badge}</span>
            </div>
            <div class="lk-pro-top">
              <span class="lk-avatar" id="hero-pro-avatar">${p0.avatar}</span>
              <div class="lk-pro-id">
                <strong id="hero-pro-name">${p0.name}</strong>
                <span><i data-lucide="map-pin" class="lucide-xs"></i><span id="hero-pro-meta">${p0.trade} · ${p0.locality}</span></span>
              </div>
              <span class="lk-verified"><i data-lucide="shield-check" class="lucide-xs"></i>Verified</span>
            </div>
            <div class="lk-pro-rating">
              <span class="lk-stars">★★★★★</span>
              <strong id="hero-pro-rating">${p0.rating}</strong>
              <span id="hero-pro-jobs">· ${p0.jobs}</span>
            </div>
            <div class="lk-pro-facts">
              <div><span>Starts from</span><strong id="hero-pro-price">${p0.startsFrom}</strong></div>
              <div><span>Arrives in</span><strong id="hero-pro-eta">${p0.eta}</strong></div>
              <div><span>Next slot</span><strong id="hero-pro-slot">${p0.nextSlot}</strong></div>
            </div>
            <div class="lk-pro-job">
              <span class="lk-job-status"><span class="lk-job-dot"></span><span id="hero-pro-status">${p0.status}</span></span>
              <span id="hero-pro-substatus">${p0.substatus}</span>
            </div>
            <div class="lk-pro-negotiation" id="hero-negotiation-pill" aria-label="Live price agreement">
              <span class="lk-pro-nego-tag"><i data-lucide="handshake" class="lucide-xs"></i>Direct Agree</span>
              <span class="lk-pro-nego-text" id="hero-nego-text">${p0.negotiation}</span>
            </div>
            <div class="lk-pro-live-detail" id="hero-live-detail" aria-label="Arrival status">
              <span class="lk-pro-otp-badge" id="hero-otp-badge"><i data-lucide="shield-check" class="lucide-xs"></i><span id="hero-meta-text">${p0.meta}</span></span>
              <span class="lk-pro-eta-badge" id="hero-eta-badge"><i data-lucide="navigation" class="lucide-xs"></i><span id="hero-eta-text">${p0.eta}</span></span>
            </div>
            <div class="lk-pro-actions">
              <button type="button" class="btn lk-btn-primary lk-pro-btn" id="hero-card-book-btn" data-hero-category="${p0.category}">Book now <i data-lucide="arrow-right" class="lucide-xs"></i></button>
              <button type="button" class="btn lk-btn-secondary lk-pro-msg" id="hero-card-quote-btn" aria-expanded="false" title="Toggle live counter-offer and arrival OTP details"><i data-lucide="receipt" class="lucide-xs"></i><span class="lk-quote-btn-label">Quote & OTP</span></button>
            </div>
          </div>
        </div>
        <div class="lk-pro-mini-card">
          <i data-lucide="trending-up" class="lucide-xs"></i>
          <span id="hero-pro-areastats"><strong>94 bookings</strong> this week in Andheri</span>
        </div>
        <p class="lk-pro-note"><i data-lucide="banknote" class="lucide-xs"></i>Direct payment to your tradesperson. No platform fee.</p>
      </div>
    </div>
  </section>`;
}

export function trustStripHTML() {
  const items = [
    ['shield-check', 'ID verified'],
    ['receipt', 'Price agreed upfront'],
    ['percent', 'No platform fee'],
    ['banknote', 'Direct payment'],
    ['map-pin', 'Live updates']
  ];
  return `
  <section class="lk-trust" aria-label="How LocalKaam works">
    <div class="lk-trust-inner">
      ${items.map(([icon, label], i) => `<span class="lk-trust-item" style="--stagger-index: ${i};"><i data-lucide="${icon}" class="lucide-sm"></i>${label}</span>`).join('')}
    </div>
  </section>`;
}
