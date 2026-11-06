// components/landing/Hero.js — centered hero matching user reference design.
export function heroHTML() {
  return `
  <section class="landing-hero lk-hero-center" aria-labelledby="hero-title">
    <div class="hero-inner-centered">
      <h1 id="hero-title">Good Help Lives<br>on Your Street.</h1>
      <div class="hero-accent-dash" aria-hidden="true"></div>
      <div class="hero-cta">
        <button class="btn btn-primary btn-hero-primary" id="hero-find-pro-btn">Find Professionals <i data-lucide="arrow-right" class="lucide-sm"></i></button>
        <button class="btn btn-outline btn-hero-secondary" id="hero-explore-btn">Explore Services</button>
      </div>
    </div>
  </section>`;
}
