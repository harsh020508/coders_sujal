// components/landing/Hero.js — clean product-led hero (v3).
// Kept contracts: #hero-title, #hero-find-pro-btn, #hero-explore-btn.
export function heroHTML() {
  return `
  <section class="lk-hero" aria-labelledby="hero-title">
    <div class="lk-ambient-mesh" aria-hidden="true">
      <div class="lk-orb lk-orb-1"></div>
      <div class="lk-orb lk-orb-2"></div>
    </div>
    <div class="lk-hero-inner">
      <div class="lk-hero-copy" data-reveal="up">
        <p class="lk-eyebrow"><span class="lk-eyebrow-line" aria-hidden="true"></span>Mumbai's most trusted home services</p>
        <h1 id="hero-title" class="lk-hero-title">Expert help,<br>just around the corner.</h1>
        <p class="lk-hero-sub">Book verified plumbers, electricians, cleaners &amp; more in your neighbourhood. Fair prices, no middlemen, ~25&nbsp;min arrival.</p>
        <div class="lk-hero-actions">
          <button class="btn lk-btn-primary" id="hero-find-pro-btn">Find a professional <i data-lucide="arrow-right" class="lucide-sm"></i></button>
          <button class="btn lk-btn-secondary" id="hero-explore-btn">Browse services</button>
        </div>
        <ul class="lk-hero-proof" aria-label="What every booking includes">
          <li><i data-lucide="check" class="lucide-xs"></i>ID-verified pros</li>
          <li><i data-lucide="check" class="lucide-xs"></i>Prices agreed upfront</li>
          <li><i data-lucide="check" class="lucide-xs"></i>0% commission</li>
        </ul>
      </div>
      <div class="lk-hero-visual" aria-hidden="true">
        <div class="lk-pro-card" data-reveal="up">
          <div class="lk-card-specular" aria-hidden="true"></div>
          <div class="lk-pro-available-badge">
            <span class="lk-job-dot"><span class="lk-sonar-ping"></span></span>Available now
          </div>
          <div class="lk-pro-top">
            <span class="lk-avatar">RS</span>
            <div class="lk-pro-id">
              <strong>Ravi Sharma</strong>
              <span><i data-lucide="map-pin" class="lucide-xs"></i>Plumber · Andheri West</span>
            </div>
            <span class="lk-verified"><i data-lucide="shield-check" class="lucide-xs"></i>Verified</span>
          </div>
          <div class="lk-pro-rating">
            <span class="lk-stars">★★★★★</span>
            <strong>4.9</strong>
            <span>· 312 completed jobs</span>
          </div>
          <div class="lk-pro-facts">
            <div><span>Starts from</span><strong>₹250</strong></div>
            <div><span>Arrives in</span><strong>~25 min</strong></div>
            <div><span>Next slot</span><strong>Today, 3:45 PM</strong></div>
          </div>
          <div class="lk-pro-job">
            <span class="lk-job-status"><span class="lk-job-dot"></span>Booking confirmed</span>
            <span>Today, 3:45 PM</span>
          </div>
          <div class="lk-pro-actions">
            <span class="lk-pro-btn">Book this pro</span>
            <span class="lk-pro-msg"><i data-lucide="message-square" class="lucide-xs"></i>Message</span>
          </div>
        </div>
        <div class="lk-pro-mini-card" data-reveal="up">
          <i data-lucide="trending-up" class="lucide-xs"></i>
          <span><strong>94 bookings</strong> this week in Andheri</span>
        </div>
        <p class="lk-pro-note"><i data-lucide="banknote" class="lucide-xs"></i>Payment goes directly to your pro.</p>
      </div>
    </div>
  </section>`;
}

export function trustStripHTML() {
  const items = [
    ['shield-check', 'ID-verified professionals'],
    ['receipt', 'Prices agreed upfront'],
    ['percent', '0% platform commission'],
    ['banknote', 'Paid directly to pros'],
    ['map-pin', 'Live job updates']
  ];
  return `
  <section class="lk-trust" aria-label="How LocalKaam works">
    <div class="lk-trust-inner">
      ${items.map(([icon, label], i) => `<span class="lk-trust-item" style="--stagger-index: ${i};"><i data-lucide="${icon}" class="lucide-sm"></i>${label}</span>`).join('')}
    </div>
  </section>`;
}
