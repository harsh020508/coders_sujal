// components/landing/Hero.js — hero + social proof strip.
export function heroHTML() {
  return `
  <section class="landing-hero lk-hero-center" aria-labelledby="hero-title">
    <p class="lk-eyebrow">Mumbai · Hyperlocal marketplace</p>
    <h1 id="hero-title">Good help lives<br>on <span class="highlight">your street.</span></h1>
    <p class="lk-lede">Tell us what needs fixing. We match you with verified plumbers, electricians, carpenters and more in your locality. They set their own prices and keep 100% — no commission, no surge fee.</p>
    <div class="hero-cta"><button class="btn btn-primary btn-lg" id="hero-find-pro-btn">Find a professional <i data-lucide="arrow-right" class="lucide-sm"></i></button><button class="btn btn-outline btn-lg" id="hero-explore-btn">See how it works</button></div>
    <p class="lk-hero-note">No credit card required · Free to browse</p>
    <div class="lk-product-mock" aria-hidden="true"><div class="lk-mock-top"><span class="dot"></span><span class="dot"></span><span class="dot"></span><em>Live booking — Andheri West</em></div><div class="lk-mock-row"><div><strong>Electrician · 1.8 km</strong><span>Accepted → On the way → In progress</span></div><b>₹350/hr</b></div><div class="lk-mock-progress"><span></span></div></div>
    <div class="lk-trust"><span><i data-lucide="shield-check" class="lucide-sm"></i> Verified pros</span><span><i data-lucide="map-pin" class="lucide-sm"></i> ~25 min nearby</span><span><i data-lucide="indian-rupee" class="lucide-sm"></i> 0% commission</span></div>
  </section>
  <section class="lk-proof" aria-label="Trusted in your neighbourhood">
    <p><strong>1,200+</strong> jobs completed <span class="lk-proof-note">[PLACEHOLDER]</span> across</p>
    <div class="lk-proof-row">${['Andheri West', 'Juhu', 'Bandra', 'Powai', 'Thane', 'Chembur'].map(n => `<span class="lk-proof-logo">${n} <a href="#testimonials">Read their story →</a></span>`).join('')}</div>
  </section>`;
}
