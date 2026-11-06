// components/landing/Hero.js — hero + trust + visual composition.
export function heroHTML() {
  return `
  <section class="landing-hero lk-hero-center" aria-labelledby="hero-title">
    <p class="lk-eyebrow">Home services · Mumbai</p>
    <h1 id="hero-title">Good Help Lives<br>on <span class="highlight">Your Street.</span></h1>
    <p class="lk-lede">From home cleaning and repairs to everyday maintenance, discover trusted local professionals who make your life easier.</p>
    <div class="hero-cta"><button class="btn btn-primary btn-lg" id="hero-find-pro-btn">Find Professionals <i data-lucide="arrow-right" class="lucide-sm"></i></button><button class="btn btn-outline btn-lg" id="hero-explore-btn">Explore Services</button></div>
    <div class="lk-trust lk-trust-center">
      <span><i data-lucide="shield-check" class="lucide-sm"></i> Verified Professionals</span>
      <span><i data-lucide="indian-rupee" class="lucide-sm"></i> Transparent Pricing</span>
      <span><i data-lucide="calendar-check" class="lucide-sm"></i> Convenient Booking</span>
    </div>
    <div class="lk-hero-visual" aria-hidden="true"><div class="lk-hv-card"><i data-lucide="zap" class="lucide-lg"></i><strong>Electrical</strong><span>From ₹350</span></div><div class="lk-hv-card"><i data-lucide="sparkles" class="lucide-lg"></i><strong>Cleaning</strong><span>Verified</span></div><div class="lk-hv-card"><i data-lucide="droplets" class="lucide-lg"></i><strong>Plumbing</strong><span>Top rated</span></div><div class="lk-hv-card"><i data-lucide="paint-roller" class="lucide-lg"></i><strong>Painting</strong><span>Near you</span></div></div>
  </section>`;
}
