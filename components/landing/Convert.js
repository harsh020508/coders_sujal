// components/landing/Convert.js — timeline, FAQ, CTA, resources, footer.
export function timelineHTML() {
  return `
  <section class="section-container" id="how-it-works">
    <h2 class="section-title">Get running in under 30 days</h2>
    <p class="section-subtitle">From first search to a pro you trust on speed-dial.</p>
    <div class="lk-timeline" data-timeline>
      <div class="lk-timeline-line" aria-hidden="true"><span data-timeline-fill></span></div>
      ${[
        ['Today', 'Day 0', ['Pick your locality', 'Shortlist 2–3 pros', 'Send your first brief']],
        ['Day 14', 'First job done', ['Agree price & slot', 'Track live to invoice', 'Leave first review']],
        ['Day 30', 'Your go-to list', ['Save favourites', 'Rebook in one tap', 'Share with your society']]
      ].map(x => `<article class="lk-mile"><span class="lk-mile-badge">${x[0]} · ${x[1]}</span><ul>${x[2].map(b => `<li><i data-lucide="check" class="lucide-xs"></i> ${b}</li>`).join('')}</ul></article>`).join('')}
    </div>
  </section>`;
}

export function faqHTML() {
  const qa = [
    ['How much does LocalKaam cost?', 'Browsing and booking are free. Pros set their own prices and keep 100% — we take 0% commission on every job.'],
    ['Is there a free plan?', 'Yes. Customers browse free; pros list free. No paid tiers, no unlocks.'],
    ['Do I need a contract?', 'No. Book per job. Pros manage availability themselves; you can rebook favourites anytime.'],
    ['How does the trial work?', 'There is nothing to trial. Your first booking is the trial — full tracking, invoice and review included.'],
    ['How are pros verified?', 'ID verification plus ratings that only count on completed jobs. Look for the verified badge and job history.'],
    ['What if a pro does not show up?', 'Message them directly, reschedule, or file a complaint from the booking. Support sees the full history.'],
    ['Can I negotiate the price?', 'Yes — use the counter-offer flow. Both sides confirm before anyone travels.'],
    ['How fast can someone arrive?', 'Average is ~25 minutes in Mumbai localities; pick later slots if you prefer.']
  ];
  return `
  <section class="section-container" id="faq">
    <h2 class="section-title">Questions, answered</h2>
    <p class="section-subtitle">No contracts, no fine print. Just the basics.</p>
    <div class="lk-faq" data-faq>
      ${qa.map((x, i) => `<div class="settings-faq"><button type="button" class="lk-faq-q" aria-expanded="${i === 0}" aria-controls="faq-a-${i}" id="faq-q-${i}">${x[0]}<i data-lucide="chevron-down" class="lucide-sm"></i></button><div class="lk-faq-a" id="faq-a-${i}" role="region" aria-labelledby="faq-q-${i}" ${i === 0 ? '' : 'hidden'}><p>${x[1]}</p></div></div>`).join('')}
    </div>
  </section>`;
}

export function ctaHTML() {
  return `
  <section class="lk-cta">
    <div class="lk-cta-inner"><div><h2>Ready when you are.</h2><p>Pick a trade and see who is available in your locality today. No account needed to browse.</p></div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;"><button class="btn btn-lg" id="cta-find-pro-btn" style="background:var(--color-highlighter-yellow);color:#1a3300;border:none;">Start free <i data-lucide="arrow-right" class="lucide-sm"></i></button><button class="btn btn-outline btn-lg" id="cta-demo-btn" style="color:var(--accent-contrast,#fff);border-color:currentColor;">Book a demo</button></div></div>
  </section>`;
}

export function resourcesHTML() {
  return `
  <section class="section-container" id="resources">
    <h2 class="section-title">Free resources</h2>
    <p class="section-subtitle">Guides for homeowners and pros — no email walls.</p>
    <div class="lk-resources">
      ${[
        ['field-notes', 'Guide', 'The fair-price checklist', 'Base rates, visiting charges and what a counter-offer should look like. [PLACEHOLDER]', '#comparison'],
        ['shield-check', 'Report', 'Trust & safety in Mumbai', 'How ID checks and completed-job reviews keep both sides safe. [PLACEHOLDER]', '#problem'],
        ['hand-coins', 'Playbook', 'For pros: set your rate', 'How top-rated LocalKaam pros price slots and keep 100%. [PLACEHOLDER]', '#how-it-works']
      ].map(x => `<article class="lk-resource"><span class="lk-resource-img"><i data-lucide="${x[0]}" class="lucide-xl"></i></span><span class="lk-tag">${x[1]}</span><h3>${x[2]}</h3><p>${x[3]}</p><a href="${x[4]}" class="settings-link">Read →</a></article>`).join('')}
    </div>
  </section>`;
}

export function footerHTML() {
  const cols = [
    ['Products', [['Discover', '#services'], ['Book & negotiate', '#how-it-works'], ['Track live', '#how-it-works'], ['Reviews', '#testimonials']]],
    ['Company', [['About', '#problem'], ['Why us', '#usps'], ['Comparison', '#comparison'], ['Careers', '#how-it-works']]],
    ['Resources', [['FAQ', '#faq'], ['Guides', '#resources'], ['Support', '#how-it-works'], ['Pricing', '#comparison']]],
    ['Built For', [['Homeowners', '#services'], ['Societies', '#built-for'], ['Pros', '#how-it-works'], ['Property managers', '#built-for']]],
    ['Support', [['Help centre', '#faq'], ['Complaints', '#how-it-works'], ['Safety', '#problem'], ['Contact', '#how-it-works']]]
  ];
  return `
  <footer class="lk-footer">
    <div class="lk-footer-grid">
      <div><div class="nav-logo">LK</div><strong>LocalKaam</strong><p>Hyperlocal marketplace for Mumbai's blue-collar professionals. Direct prices, direct payment, zero commission.</p><div class="lk-badges"><span class="lk-badge">App Store [PLACEHOLDER]</span> <span class="lk-badge">Google Play [PLACEHOLDER]</span></div></div>
      ${cols.map(c => `<nav aria-label="${c[0]}"><h4>${c[0]}</h4>${c[1].map(l => `<a href="${l[1]}">${l[0]}</a>`).join('')}</nav>`).join('')}
    </div>
    <div class="lk-footer-bottom"><span>© 2026 LocalKaam Inc. All rights reserved.</span><span><a href="#problem">Privacy</a> · <a href="#problem">Terms</a> · <a href="#problem">Security</a></span><span>${['twitter', 'instagram', 'linkedin', 'youtube'].map(s => `<i data-lucide="${s}" class="lucide-sm"></i>`).join(' ')}</span></div>
  </footer>`;
}
