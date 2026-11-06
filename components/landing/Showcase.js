// components/landing/Showcase.js — services (12) + why choose us.
export const SERVICES_12 = [
  ['cleaning', 'sparkles', 'Home Cleaning', 'Deep cleaning, kitchens, bathrooms & sofas.'],
  ['plumber', 'droplets', 'Plumbing', 'Leaks, blockages, fittings & water tanks.'],
  ['electrician', 'zap', 'Electrical Repairs', 'Wiring, switches, fans & fault finding.'],
  ['ac_repair', 'snowflake', 'AC Servicing', 'Installation, gas refill & deep service.'],
  ['appliance_repair', 'plug-zap', 'Appliance Repair', 'Washers, fridges, microwaves & RO.'],
  ['painter', 'paint-roller', 'Painting', 'Fresh coats, touch-ups & waterproofing.'],
  ['carpenter', 'hammer', 'Carpentry', 'Doors, furniture, locks & custom work.'],
  ['pest_control', 'bug', 'Pest Control', 'Cockroaches, termites & mosquitoes.'],
  ['other', 'leaf', 'Gardening', 'Plant care, pruning & balcony upkeep.'],
  ['shifting', 'truck', 'Moving and Packing', 'Local shifting with packing help.'],
  ['other', 'scissors', 'Salon at Home', 'Haircuts & grooming at your door.'],
  ['other', 'wrench', 'General Maintenance', 'Hanging, fixing & small repairs.']
];

export function servicesHTML() {
  return `
  <section class="section-container" id="services">
    <div style="max-width:760px;margin:0 auto 36px;text-align:center;">
      <h2 class="section-title">Everything Your Home Needs, All in One Place.</h2>
      <p class="section-subtitle">Find reliable professionals for everyday household jobs, essential repairs, and home maintenance without the hassle.</p>
    </div>
    <div class="lk-services-grid">
      ${SERVICES_12.map(s => `<article class="lk-service-card"><span class="lk-service-icon"><i data-lucide="${s[1]}" class="lucide-lg"></i></span><h3>${s[2]}</h3><p>${s[3]}</p><button type="button" class="lk-service-btn" data-category="${s[0]}">Explore <i data-lucide="arrow-right" class="lucide-xs"></i></button></article>`).join('')}
    </div>
  </section>`;
}

export function whyHTML() {
  const feats = [
    ['shield-check', 'Verified Professionals', 'Reviewed pros with relevant skills and experience.'],
    ['indian-rupee', 'Transparent Pricing', 'See charges before you confirm your booking.'],
    ['calendar-check', 'Convenient Scheduling', 'Pick a time that fits your daily routine.'],
    ['heart-handshake', 'Reliable Support', 'Help with bookings and service questions.']
  ];
  return `
  <section class="section-container" id="usps">
    <div style="max-width:760px;margin:0 auto 36px;text-align:center;">
      <h2 class="section-title">Why Good Service Makes All the Difference.</h2>
    </div>
    <div class="lk-why-grid">
      ${feats.map(f => `<article class="lk-why-card"><span class="lk-card-icon"><i data-lucide="${f[0]}" class="lucide-lg"></i></span><h3>${f[1]}</h3><p>${f[2]}</p></article>`).join('')}
    </div>
  </section>`;
}
