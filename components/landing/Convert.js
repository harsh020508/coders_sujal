// components/landing/Convert.js — how it works, FAQ, final CTA, footer (v3).
// Kept contracts: #how-it-works, #faq with [data-faq] > .lk-faq-item >
// .lk-faq-q / .lk-faq-a (aria-expanded + hidden), #cta-find-pro-btn,
// #cta-explore-btn.
export function howHTML() {
  return `
  <section class="lk-section" id="how-it-works">
    <div class="lk-section-inner">
      <div class="lk-section-head">
        <div>
          <p class="lk-eyebrow">How it works</p>
          <h2 class="lk-section-title">Three steps. No phone calls.</h2>
        </div>
        <p class="lk-section-sub">From search to invoice — everything happens in one place.</p>
      </div>
      <ol class="lk-steps">
        ${[
          ['search', 'Choose a service', 'Tell us what needs fixing and where you are. You\'ll see a clear starting price straight away — no estimate surprises.'],
          ['list-filter', 'Pick your professional', 'Browse local pros by rating, distance and completed jobs. Read real reviews, then choose with confidence.'],
          ['calendar-check', 'Confirm a time', 'Agree the price, lock in a slot, and follow the job live from en-route to done.']
        ].map((s, i) => `<li class="lk-step-card" style="--card-index: ${i};">
          <span class="lk-card-spotlight" aria-hidden="true"></span>
          <span class="lk-step-num">${String(i + 1).padStart(2, '0')}</span>
          <span class="lk-step-icon"><i data-lucide="${s[0]}" class="lucide-md"></i></span>
          <h3>${s[1]}</h3>
          <p>${s[2]}</p>
        </li>`).join('')}
      </ol>
    </div>
  </section>`;
}

export function faqHTML() {
  const qa = [
    ['How do I book a professional?', 'Simple — pick a service, enter your locality and choose a time slot. You can browse profiles and prices without even creating an account.'],
    ['Are professionals properly verified?', 'Yes. Every pro on LocalKaam is ID-verified before their first job. Reviews only appear after a job is marked complete — so ratings you see are genuinely earned.'],
    ['How is pricing calculated?', 'Pros set their own base rates, and you agree the final price before confirming. There\'s no booking fee, no platform commission, no surprises.'],
    ['Can I choose the same professional again?', 'Absolutely. Save your favourite pros and rebook them in a couple of taps — they\'ll already know where you live.'],
    ['What if I need to reschedule?', 'No problem. Message your pro directly from the booking, or reschedule from the app. Life happens — we\'re flexible.'],
    ['What if something goes wrong?', 'Every booking has a built-in support and complaints flow. Raise an issue directly from your booking and we\'ll step in to resolve it quickly.']
  ];
  return `
  <section class="lk-section" id="faq">
    <div class="lk-section-inner lk-faq-layout">
      <div class="lk-faq-intro">
        <p class="lk-eyebrow">Good to know</p>
        <h2 class="lk-section-title">Questions, answered.</h2>
        <p class="lk-section-sub">Everything households and pros ask before a first booking.</p>
        <a class="lk-text-link" href="#how-it-works">See how a booking works <i data-lucide="arrow-right" class="lucide-xs"></i></a>
      </div>
      <div class="lk-faq" data-faq>
        ${qa.map((x, i) => `<div class="lk-faq-item">
          <button type="button" class="lk-faq-q" aria-expanded="${i === 0}" aria-controls="faq-a-${i}" id="faq-q-${i}">${x[0]}<i data-lucide="chevron-down" class="lucide-sm"></i></button>
          <div class="lk-faq-a" id="faq-a-${i}" role="region" aria-labelledby="faq-q-${i}" ${i === 0 ? '' : 'hidden'}><p>${x[1]}</p></div>
        </div>`).join('')}
      </div>
    </div>
  </section>`;
}

export function finalCTAHTML() {
  return `
  <section class="lk-cta" aria-labelledby="cta-title">
    <div class="lk-cta-inner">
      <p class="lk-eyebrow lk-eyebrow-light">Ready when you are</p>
      <h2 class="lk-cta-title" id="cta-title">Your neighbourhood pro is waiting.</h2>
      <p class="lk-cta-sub">Tell us what needs fixing. We'll show you ID-verified pros near you, with upfront prices and no hidden fees.</p>
      <div class="lk-cta-actions">
        <button class="btn lk-btn-yellow" id="cta-find-pro-btn">Find a professional <i data-lucide="arrow-right" class="lucide-sm"></i></button>
        <button class="btn lk-btn-ghost-light" id="cta-explore-btn">Explore services</button>
      </div>
    </div>
  </section>`;
}

export function footerHTML() {
  const cols = [
    ['Services', [['Cleaning', '#services'], ['Plumbing', '#services'], ['Electrical', '#services'], ['AC Repair', '#services'], ['Painting', '#services'], ['Carpentry', '#services']]],
    ['Company', [['Why LocalKaam', '#usps'], ['How it works', '#how-it-works'], ['Neighbourhoods', '#discovery']]],
    ['Support', [['Help centre', '#faq'], ['FAQs', '#faq'], ['Report a problem', '#faq']]],
    ['For professionals', [['Become a partner', '#how-it-works'], ['How payouts work', '#usps']]]
  ];
  return `
  <footer class="lk-footer">
    <div class="lk-footer-inner">
      <div class="lk-footer-grid">
        <div class="lk-footer-brand">
          <div class="lk-footer-logo"><span class="nav-logo">LK</span><strong>LocalKaam</strong></div>
          <p>Good help lives on your street. Verified local pros, fair prices, direct payment.</p>
          <p class="lk-footer-place">Mumbai, Maharashtra</p>
          <p class="lk-footer-tagline">Made with ♥ in Mumbai</p>
        </div>
        ${cols.map(c => `<nav aria-label="${c[0]}"><h4>${c[0]}</h4>${c[1].map(([l, href]) => `<a href="${href}">${l}</a>`).join('')}</nav>`).join('')}
      </div>
      <div class="lk-footer-bottom"><span>© 2026 LocalKaam. All rights reserved.</span><span><a href="#faq">Privacy</a><a href="#faq">Terms</a><a href="#faq">Contact</a></span></div>
    </div>
  </footer>`;
}
