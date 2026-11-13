// components/landing/Proof.js — pricing standard, localities, testimonials (v3).
// Kept contracts: #essential, #essential-cta, #discovery, #locality-current,
// [data-locality], [data-count].
import { T } from './data.js';

export function essentialHTML() {
  return `
  <section class="lk-standard" id="essential">
    <div class="lk-standard-inner">
      <div class="lk-standard-copy">
        <p class="lk-eyebrow lk-eyebrow-light">The LocalKaam standard</p>
        <h2 class="lk-standard-title">No hidden fees.<br>Ever.</h2>
        <p class="lk-standard-sub">You agree the price with your pro before the job starts. We don't add a commission, a booking fee or a surge charge on top — not now, not ever.</p>
        <ul class="lk-check-list">
          <li><i data-lucide="check" class="lucide-xs"></i>What you agree is what you pay</li>
          <li><i data-lucide="check" class="lucide-xs"></i>Pros keep 100% of the job price</li>
          <li><i data-lucide="check" class="lucide-xs"></i>No card details stored by us</li>
        </ul>
        <button type="button" class="btn lk-btn-yellow" id="essential-cta">Explore all services <i data-lucide="arrow-right" class="lucide-sm"></i></button>
      </div>
      <div class="lk-price-card" aria-label="Example job payment breakdown">
        <span class="lk-card-spotlight" aria-hidden="true"></span>
        <p class="lk-price-label">Example job</p>
        <div class="lk-price-row"><span>Agreed price</span><strong>₹450</strong></div>
        <div class="lk-price-row"><span>Platform fee</span><strong class="lk-price-zero">₹0</strong></div>
        <div class="lk-price-row lk-price-total"><span>Ravi receives</span><strong>₹450</strong></div>
        <p class="lk-price-note"><i data-lucide="banknote" class="lucide-xs"></i>Paid directly to the pro after the job.</p>
      </div>
    </div>
    <div class="lk-standard-stats">
      ${[['10', '+', 'Service categories'], ['0', '%', 'Commission'], ['25', ' min', 'Average arrival'], ['100', '%', 'Paid direct to pros']].map((x, i) => `
        <div class="lk-stat" style="--card-index: ${i};">
          <h3 data-count="${x[0]}" data-count-suffix="${x[1]}">${x[0]}${x[1]}</h3>
          <p>${x[2]}</p>
        </div>`).join('')}
    </div>
  </section>`;
}

export function discoveryHTML() {
  const localities = [['andheri', 'Andheri West'], ['bandra', 'Bandra West'], ['powai', 'Powai'], ['juhu', 'Juhu'], ['malad', 'Malad West'], ['colaba', 'Colaba'], ['dadar', 'Dadar West'], ['thane', 'Thane West']];
  return `
  <section class="lk-section" id="discovery">
    <div class="lk-section-inner">
      <div class="lk-section-head">
        <div>
          <p class="lk-eyebrow">Neighbourhoods</p>
          <h2 class="lk-section-title">Help that is actually nearby.</h2>
        </div>
        <p class="lk-section-sub">Pick your locality so we only show professionals who cover your area. We're live across Western, Central and Harbour Mumbai.</p>
      </div>
      <div class="lk-discovery-panel">
        <div class="lk-discovery-head">
          <span class="lk-discovery-label">Your locality</span>
          <strong id="locality-current">Andheri West</strong>
        </div>
        <div class="lk-locality-chips" role="group" aria-label="Choose your locality" data-locality-chips>
          ${localities.map(l => `<button type="button" data-locality="${l[0]}" aria-pressed="false">${l[1]}</button>`).join('')}
        </div>
        <div class="lk-discovery-foot">
          <span class="lk-discovery-label">Popular nearby</span>
          <div class="lk-discovery-services">${['Cleaning', 'Plumbing', 'Electrical', 'AC Repair', 'Painting', 'Carpentry'].map(n => `<span>${n}</span>`).join('')}</div>
        </div>
      </div>
    </div>
  </section>`;
}

export function testimonialsHTML() {
  return `
  <section class="lk-section lk-section-tint" id="testimonials" aria-label="Testimonials">
    <div class="lk-section-inner">
      <div class="lk-section-head">
        <div>
          <p class="lk-eyebrow">Word of mouth</p>
          <h2 class="lk-section-title">Trusted in the neighbourhood.</h2>
        </div>
        <p class="lk-section-sub">What households and professionals say after using LocalKaam.</p>
      </div>
      <div class="lk-quote-grid">
        ${T.testimonials.map((q, i) => `<figure class="lk-quote" style="--card-index: ${i};">
          <span class="lk-card-spotlight" aria-hidden="true"></span>
          <div class="lk-stars" aria-label="5 out of 5 stars">★★★★★</div>
          <blockquote>"${q.quote}"</blockquote>
          <figcaption>
            <span class="lk-ava" aria-hidden="true">${q.name.charAt(0)}</span>
            <span><strong>${q.name}</strong><small>${q.role}</small></span>
          </figcaption>
        </figure>`).join('')}
      </div>
    </div>
  </section>`;
}
