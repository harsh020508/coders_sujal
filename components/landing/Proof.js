// components/landing/Proof.js — dark essential, stats, discovery, testimonials.
import { T } from './data.js';

export function essentialHTML() {
  return `
  <section class="lk-essential" id="essential">
    <div class="lk-essential-inner">
      <div class="lk-essential-left">
        <h2>Essential Home Services, Made Simple.</h2>
        <p>From quick fixes to complete home care, find the right service for every job.</p>
        <div class="lk-popular">${['Plumbing', 'Electrical', 'Cleaning', 'AC Repair', 'Painting', 'Carpentry'].map(n => `<span>${n}</span>`).join('')}</div>
        <button type="button" class="btn lk-yellow-btn" id="essential-cta">Explore All Services <i data-lucide="arrow-right" class="lucide-sm"></i></button>
      </div>
      <div class="lk-essential-cards">
        <article><i data-lucide="zap" class="lucide-lg"></i><h3>Quick fixes</h3><p>Tap, fan, fuse and fitting jobs.</p></article>
        <article><i data-lucide="sparkles" class="lucide-lg"></i><h3>Complete home care</h3><p>Deep clean to full repaint.</p></article>
        <article><i data-lucide="calendar-check" class="lucide-lg"></i><h3>Your schedule</h3><p>Pick a slot that suits you.</p></article>
      </div>
    </div>
  </section>`;
}

export function statsHTML() {
  return `
  <section class="lk-stats-band" aria-label="Verified platform facts">
    ${[['10', '+', 'Service Categories'], ['0', '%', 'Commission'], ['25', 'm', 'Average Arrival'], ['100', '%', 'Paid Direct to Pros']].map(x => `<div class="lk-stat"><h3 data-count="${x[0]}" data-count-suffix="${x[1]}">${x[0]}${x[1]}</h3><p>${x[2]}</p></div>`).join('')}
  </section>
  <p class="lk-stats-note">Verified from platform data. Jobs and rating counts are not shown until confirmed.</p>`;
}

export function discoveryHTML() {
  const localities = [['andheri', 'Andheri West'], ['bandra', 'Bandra West'], ['powai', 'Powai'], ['juhu', 'Juhu'], ['malad', 'Malad West'], ['colaba', 'Colaba'], ['dadar', 'Dadar West'], ['thane', 'Thane West']];
  return `
  <section class="section-container" id="discovery">
    <div style="text-align:center;max-width:760px;margin:0 auto 28px;">
      <h2 class="section-title">Find Professionals in Your Neighborhood.</h2>
      <p class="section-subtitle">Discover local experts who are ready to help with your everyday home-service needs.</p>
      <p class="lk-locality-note">Near: <strong id="locality-current">Andheri West</strong></p>
    </div>
    <div class="lk-locality-chips" role="group" aria-label="Choose your locality" data-locality-chips>
      ${localities.map(l => `<button type="button" data-locality="${l[0]}" aria-pressed="false">${l[1]}</button>`).join('')}
    </div>
    <div class="lk-discovery-services">${['Cleaning', 'Plumbing', 'Electrical', 'AC Repair', 'Painting', 'Carpentry'].map(n => `<span>${n}</span>`).join('')}</div>
  </section>`;
}

export function testimonialsHTML() {
  return `
  <section class="section-container" id="testimonials" aria-roledescription="carousel" aria-label="Testimonials">
    <h2 class="section-title">What Our Customers Say.</h2>
    <p class="section-subtitle">Examples below are placeholders — real customer reviews will appear here.</p>
    <div class="lk-carousel" data-carousel>
      <div class="lk-track">
        ${T.testimonials.map(q => `<figure class="lk-quote"><div class="lk-stars" aria-label="5 out of 5 stars">★★★★★</div><blockquote>“${q.quote}”</blockquote><figcaption><span class="lk-ava" aria-hidden="true"><i data-lucide="user" class="lucide-md"></i></span><span><strong>${q.name}</strong><small>${q.role} · ${q.metric}</small></span></figcaption></figure>`).join('')}
      </div>
      <div class="lk-carousel-nav"><button type="button" aria-label="Previous" data-prev>←</button><span class="lk-dots">${T.testimonials.map((_, i) => `<button type="button" aria-label="Slide ${i + 1}" data-dot="${i}" class="${i === 0 ? 'is-active' : ''}"></button>`).join('')}</span><button type="button" aria-label="Next" data-next>→</button></div>
    </div>
  </section>`;
}
