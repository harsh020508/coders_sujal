// components/landing/Proof.js — pricing standard, localities, testimonials.
// Kept contracts: #essential, #essential-cta, #discovery, #locality-current,
// [data-locality], [data-count], [data-category].
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
      <div class="lk-price-card" aria-label="Interactive Direct-Pay Breakdown &amp; Commission Calculator">
        <span class="lk-card-spotlight" aria-hidden="true"></span>
        <div class="lk-price-card-head">
          <p class="lk-price-label">Example job payment breakdown</p>
          <span class="lk-badge-mint">0% Middleman Cut</span>
        </div>

        <div class="lk-price-presets" role="group" aria-label="Quick price presets">
          <button type="button" class="lk-preset-pill is-active" data-price-preset="450">₹450 Tap Fix</button>
          <button type="button" class="lk-preset-pill" data-price-preset="799">₹799 AC Service</button>
          <button type="button" class="lk-preset-pill" data-price-preset="1499">₹1,499 Shifting</button>
          <button type="button" class="lk-preset-pill" data-price-preset="2499">₹2,499 2BHK Clean</button>
        </div>

        <div class="lk-calc-slider-box">
          <div class="lk-calc-slider-labels">
            <span>Job Amount</span>
            <strong id="calc-slider-display">₹450</strong>
          </div>
          <input type="range" id="price-calc-range" class="lk-calc-range" min="250" max="4000" step="50" value="450" aria-label="Job price in rupees" />
          <div class="lk-calc-slider-ticks">
            <span>₹250</span>
            <span>₹2,000</span>
            <span>₹4,000</span>
          </div>
        </div>

        <div class="lk-price-breakdown">
          <div class="lk-price-row">
            <span>Agreed price</span>
            <strong id="calc-agreed">₹450</strong>
          </div>
          <div class="lk-price-row">
            <span>LocalKaam fee</span>
            <strong class="lk-price-zero" id="calc-fee">₹0</strong>
          </div>
          <div class="lk-price-row lk-price-total">
            <span>Pro receives</span>
            <strong id="calc-pro-receives">₹450</strong>
          </div>
          <div class="lk-price-comparison">
            <span class="lk-comp-label">Typical aggregator (25% cut):</span>
            <strong class="lk-comp-loss" id="calc-other-cut">₹113 lost to platform cut</strong>
          </div>
        </div>

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
  const localities = [
    ['andheri', 'Andheri West'],
    ['bandra', 'Bandra West'],
    ['powai', 'Powai'],
    ['juhu', 'Juhu'],
    ['malad', 'Malad West'],
    ['colaba', 'Colaba'],
    ['dadar', 'Dadar West'],
    ['thane', 'Thane West']
  ];
  const initial = T.localityDetails.andheri;

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
          <div class="lk-discovery-title-wrap">
            <span class="lk-discovery-label">Your locality</span>
            <strong id="locality-current">${initial.name}</strong>
          </div>
          <div class="lk-discovery-meta-row">
            <span class="lk-meta-pill" id="locality-zone">${initial.zone}</span>
            <span class="lk-meta-stat"><i data-lucide="clock" class="lucide-xs"></i> Avg arrival <strong id="locality-eta">${initial.eta}</strong></span>
            <span class="lk-meta-stat"><i data-lucide="users" class="lucide-xs"></i> <strong id="locality-pros">${initial.activePros} active pros</strong></span>
          </div>
        </div>

        <div class="lk-locality-chips" role="group" aria-label="Choose your locality" data-locality-chips>
          ${localities.map((l, idx) => {
            const d = T.localityDetails[l[0]];
            return `<button type="button" data-locality="${l[0]}" data-zone="${d.zone}" data-eta="${d.eta}" data-pros="${d.activePros} active pros" data-pro-name="${d.topPro.name}" data-pro-trade="${d.topPro.trade}" data-pro-rating="${d.topPro.rating}" data-pro-jobs="${d.topPro.jobs}" class="${idx === 0 ? 'is-active' : ''}" aria-pressed="${idx === 0 ? 'true' : 'false'}">${l[1]}</button>`;
          }).join('')}
        </div>

        <div class="lk-discovery-featured-pro" id="locality-featured-pro">
          <div class="lk-snippet-avatar">${initial.topPro.name.split(' ').map(p => p[0]).join('')}</div>
          <div class="lk-snippet-body">
            <div class="lk-snippet-header">
              <strong>${initial.topPro.name}</strong>
              <span class="lk-snippet-rating"><i data-lucide="star" class="lucide-xs"></i> ${initial.topPro.rating}</span>
            </div>
            <p class="lk-snippet-details">${initial.topPro.trade} · ${initial.topPro.jobs} jobs completed in ${initial.name}</p>
          </div>
        </div>

        <div class="lk-discovery-foot">
          <span class="lk-discovery-label">Popular nearby (tap to book)</span>
          <div class="lk-discovery-services" id="discovery-services-list">
            ${initial.popular.map(svc => `
              <button type="button" class="lk-discovery-service-btn" data-category="${svc.id}" aria-label="Book ${svc.name} in ${initial.name}">
                <span>${svc.name}</span>
                <span class="lk-discovery-rate">${svc.rate}</span>
              </button>
            `).join('')}
          </div>
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
          <div class="lk-quote-top-row">
            <div class="lk-stars" aria-label="5 out of 5 stars">★★★★★</div>
            <span class="lk-quote-metric"><i data-lucide="sparkles" class="lucide-xs"></i> ${q.metric}</span>
          </div>
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
