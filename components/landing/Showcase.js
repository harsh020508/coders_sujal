// components/landing/Showcase.js — service grid + why LocalKaam (v3).
// Kept contracts: #services, .lk-service-card[data-category], #usps.
export const SERVICES_12 = [
  ['cleaning', 'sparkles', 'Home Cleaning', 'Deep clean every room, kitchen, bathroom &amp; sofa.', true],
  ['plumber', 'droplets', 'Plumbing', 'Fix leaks, clear blockages &amp; sort water tank issues.', false],
  ['electrician', 'zap', 'Electrical Repairs', 'Wiring, switches, fans &amp; fault diagnosis.', false],
  ['ac_repair', 'snowflake', 'AC Servicing', 'Install, refill gas &amp; deep-service your unit.', false],
  ['carpenter', 'hammer', 'Carpentry', 'Doors, furniture, locks &amp; custom woodwork.', false],
  ['painter', 'paint-roller', 'Painting', 'Fresh coats, neat touch-ups &amp; waterproofing.', false],
  ['appliance_repair', 'plug-zap', 'Appliance Repair', 'Washers, fridges, microwaves &amp; RO systems.', false],
  ['pest_control', 'bug', 'Pest Control', 'Cockroaches, termites &amp; mosquito treatment.', false],
  ['other', 'leaf', 'Gardening', 'Plant care, pruning &amp; balcony upkeep.', false],
  ['shifting', 'truck', 'Moving &amp; Packing', 'Local shifting with safe, careful packing.', false],
  ['other', 'scissors', 'Salon at Home', 'Haircuts, grooming &amp; beauty at your door.', false],
  ['other', 'wrench', 'General Maintenance', 'Hanging, drilling &amp; everyday fixes.', false]
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
            <span class="lk-service-icon"><i data-lucide="${s[1]}" class="lucide-md"></i></span>
            <div class="lk-service-body">
              <h3>${s[2]}${s[4] ? ' <span class="lk-badge-popular">Most popular</span>' : ''}</h3>
              <p>${s[3]}</p>
            </div>
            <span class="lk-service-arrow" aria-hidden="true"><i data-lucide="arrow-right" class="lucide-xs"></i></span>
          </article>`).join('')}
      </div>
    </div>
  </section>`;
}

export function whyHTML() {
  const feats = [
    ['shield-check', 'Verified professionals', 'Every pro is ID-checked. Reviews only unlock after a confirmed completed job — no fakes.'],
    ['receipt', 'Transparent pricing', 'See the agreed price before you tap confirm. No booking fee, no hidden platform charge.'],
    ['calendar-check', 'Book on your schedule', 'Pick a slot that suits you, reschedule in a tap if plans change, reminders handled automatically.'],
    ['heart-handshake', 'Direct communication', 'Chat or call your pro right from the booking screen — no call centre in the middle.']
  ];
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
      <div class="lk-feature-grid">
        ${feats.map((f, i) => `<article class="lk-feature-card" style="--card-index: ${i};">
          <span class="lk-card-spotlight" aria-hidden="true"></span>
          <span class="lk-feature-icon"><i data-lucide="${f[0]}" class="lucide-md"></i></span>
          <h3>${f[1]}</h3>
          <p>${f[2]}</p>
        </article>`).join('')}
      </div>
    </div>
  </section>`;
}
