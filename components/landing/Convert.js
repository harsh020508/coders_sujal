// components/landing/Convert.js — how it works, FAQ, final CTA, footer.
export function howHTML() {
  return `
  <section class="section-container" id="how-it-works">
    <div style="text-align:center;max-width:760px;margin:0 auto 36px;"><h2 class="section-title">Get the Right Help in Three Simple Steps.</h2></div>
    <div class="lk-steps-grid">
      ${[
        ['search', 'Choose Your Service', 'Select the service you need and tell us a little about the job.'],
        ['list-filter', 'Find Your Professional', 'Explore available professionals and compare profiles and details.'],
        ['calendar-check', 'Book With Confidence', 'Choose a convenient time and confirm your service.']
      ].map((s, i) => `<article class="lk-step-card"><span class="lk-step-num">${i + 1}</span><span class="lk-icon"><i data-lucide="${s[0]}" class="lucide-lg"></i></span><h3>${s[1]}</h3><p>${s[2]}</p></article>`).join('')}
    </div>
  </section>`;
}

export function faqHTML() {
  const qa = [
    ['How can I book a professional?', 'Pick a service, choose your locality, and confirm a slot. No account is needed to browse.'],
    ['Are professionals verified?', 'Pros are ID-verified and rated only on completed jobs.'],
    ['How is service pricing calculated?', 'Pros set their own base rates. You see the price before confirming — no platform fee.'],
    ['Can I choose my preferred professional?', 'Yes. Save favourites and rebook them in one tap.'],
    ['Can I reschedule a booking?', 'Yes — message your pro directly or reschedule from your booking.'],
    ['What happens if I need customer support?', 'Use the help centre or complaints flow from your booking for fast help.']
  ];
  return `
  <section class="section-container" id="faq">
    <div style="text-align:center;max-width:760px;margin:0 auto 36px;"><h2 class="section-title">Questions, Answered.</h2></div>
    <div class="lk-faq" data-faq>
      ${qa.map((x, i) => `<div class="settings-faq"><button type="button" class="lk-faq-q" aria-expanded="${i === 0}" aria-controls="faq-a-${i}" id="faq-q-${i}">${x[0]}<i data-lucide="chevron-down" class="lucide-sm"></i></button><div class="lk-faq-a" id="faq-a-${i}" role="region" aria-labelledby="faq-q-${i}" ${i === 0 ? '' : 'hidden'}><p>${x[1]}</p></div></div>`).join('')}
    </div>
  </section>`;
}

export function finalCTAHTML() {
  return `
  <section class="lk-cta">
    <div class="lk-cta-inner"><div><h2>Ready When You Are.</h2><p>Your home deserves the right care. Find a trusted professional and get your next task taken care of.</p></div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;"><button class="btn btn-lg" id="cta-find-pro-btn" style="background:var(--color-highlighter-yellow);color:#1a3300;border:none;">Find a Professional <i data-lucide="arrow-right" class="lucide-sm"></i></button><button class="btn btn-outline btn-lg" id="cta-explore-btn" style="color:var(--accent-contrast,#fff);border-color:currentColor;">Explore Services</button></div></div>
  </section>`;
}

export function footerHTML() {
  const cols = [
    ['Services', ['Cleaning', 'Plumbing', 'Electrical', 'AC Repair', 'Painting', 'Carpentry']],
    ['Company', ['About Us', 'How It Works', 'Contact']],
    ['Support', ['Help Center', 'FAQs', 'Privacy Policy', 'Terms and Conditions']],
    ['For Professionals', ['Become a Partner', 'Professional Resources']]
  ];
  return `
  <footer class="lk-footer">
    <div class="lk-footer-grid">
      <div><div class="nav-logo">LK</div><strong>LocalKaam</strong><p>Good help lives on your street. Verified local pros, fair prices, direct payment.</p></div>
      ${cols.map(c => `<nav aria-label="${c[0]}"><h4>${c[0]}</h4>${c[1].map(l => `<a href="#services">${l}</a>`).join('')}</nav>`).join('')}
    </div>
    <div class="lk-footer-bottom"><span>© 2026 LocalKaam. All rights reserved.</span><span><a href="#faq">Privacy</a> · <a href="#faq">Terms</a></span></div>
  </footer>`;
}
