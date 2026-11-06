// components/landing/Showcase.js — compact services (12) + why choose us.
export const SERVICES_12 = [
  ['cleaning', 'sparkles', 'Home Cleaning', 'Deep cleaning, kitchens, bathrooms & sofas.'],
  ['plumber', 'droplets', 'Plumbing', 'Leaks, blockages, fittings & water tanks.'],
  ['electrician', 'zap', 'Electrical Repairs', 'Wiring, switches, fans & fault finding.'],
  ['ac_repair', 'snowflake', 'AC Servicing', 'Installation, gas refill & deep service.'],
  ['appliance_repair', 'plug-zap', 'Appliance Repair', 'Washers, fridges, microwaves & RO.'],
  ['painter', 'paint-roller', 'Painting', 'Fresh coats, touch-ups & waterproofing.'],
  ['carpenter', 'hammer', 'Carpentry', 'Doors, furniture, locks & custom woodwork.'],
  ['pest_control', 'bug', 'Pest Control', 'Cockroaches, termites & mosquitoes.'],
  ['other', 'leaf', 'Gardening', 'Plant care, pruning & balcony upkeep.'],
  ['shifting', 'truck', 'Moving and Packing', 'Local shifting with careful packing help.'],
  ['other', 'scissors', 'Salon at Home', 'Haircuts, grooming & door-step service.'],
  ['other', 'wrench', 'General Maintenance', 'Hanging, fixing & everyday repairs.']
];

export function servicesHTML() {
  return `
  <section class="section-container" id="services">
    <div class="lk-section-head">
      <span class="services-kicker">Services We Provide</span>
      <h2 class="section-title">Everything Your Home Needs, All in One Place.</h2>
      <p class="section-subtitle">Verified local specialists ready for everyday household jobs, repairs, and maintenance.</p>
    </div>
    <div class="lk-services-grid compact-services-grid">
      ${SERVICES_12.map(s => `
        <article class="lk-service-card compact-service-card" role="button" tabindex="0" data-category="${s[0]}" aria-label="Book ${s[2]}">
          <span class="lk-service-icon"><i data-lucide="${s[1]}" class="lucide-md"></i></span>
          <div class="lk-service-body">
            <h3>${s[2]}</h3>
            <p>${s[3]}</p>
          </div>
          <span class="lk-service-arrow" aria-hidden="true"><i data-lucide="arrow-right" class="lucide-xs"></i></span>
        </article>`).join('')}
    </div>
  </section>`;
}

export function whyHTML() {
  const feats = [
    ['shield-check', 'Verified Professionals', 'ID-verified pros, rated only on completed jobs.'],
    ['indian-rupee', 'Transparent Pricing', 'You see the full price before you confirm — no hidden platform fees.'],
    ['calendar-check', 'Book on Your Schedule', 'Pick a reliable time slot that fits your schedule.'],
    ['heart-handshake', 'Direct Communication', 'Chat directly with your pro from arrival to completion.']
  ];
  return `
  <section class="section-container" id="usps">
    <div class="lk-section-head">
      <h2 class="section-title">Why Good Service Makes All the Difference.</h2>
      <p class="section-subtitle">A straightforward, transparent marketplace designed for households and pros.</p>
    </div>
    <div class="lk-why-grid">
      ${feats.map(f => `<article class="lk-why-card">
        <span class="lk-card-icon"><i data-lucide="${f[0]}" class="lucide-lg"></i></span>
        <h3>${f[1]}</h3>
        <p>${f[2]}</p>
      </article>`).join('')}
    </div>
  </section>`;
}
