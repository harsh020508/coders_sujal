// components/landing/Proof.js — integrations marquee, bento, stats,
// testimonials carousel, built-for strip.
import { T } from './data.js';

export function integrationsHTML() {
  const row = (items) => `<div class="lk-marquee-track">${items.concat(items).map(x => `<span class="lk-logo" data-group="${x.group}">${x.name}</span>`).join('')}</div>`;
  const a = T.localities.slice(0, 5); const b = T.localities.slice(5);
  const chips = ['all', 'west', 'central', 'east', 'harbour'];
  return `
  <section class="section-container" id="integrations">
    <h2 class="section-title">Works with the streets you already love</h2>
    <p class="section-subtitle">Every locality, every lane — pros who already know your building.</p>
    <div class="lk-filter" role="group" aria-label="Filter localities">${chips.map((c, i) => `<button type="button" data-filter="${c}" class="${i === 0 ? 'is-active' : ''}">${c === 'all' ? 'All' : c[0].toUpperCase() + c.slice(1)}</button>`).join('')}</div>
    <div class="lk-marquee" data-marquee><div class="lk-marquee-row lk-marquee-a">${row(a)}</div><div class="lk-marquee-row lk-marquee-b">${row(b)}</div></div>
  </section>`;
}

export function bentoHTML() {
  return `
  <section class="section-container" id="bento">
    <h2 class="section-title">Made for the job, not the dashboard</h2>
    <p class="section-subtitle">Small tools that do one thing well — built for the phone in your pocket.</p>
    <div class="lk-bento">
      <div class="lk-bento-tile lk-bento-wide"><h3>Price before they show up</h3><p>Base rate, visiting charge and final bill — always visible.</p><span class="lk-mini lk-mini-price"><strong>₹350<span>/hr</span></strong><small>Counter-offer sent</small></span></div>
      <div class="lk-bento-tile"><h3>Live milestones</h3><p>Accepted to invoice.</p><span class="lk-mini lk-mini-steps"><span class="done">Accepted</span><span class="done">On the way</span><span class="now">In progress</span></span></div>
      <div class="lk-bento-tile"><h3>Reviews with receipts</h3><p>Only completed jobs count.</p><span class="lk-mini lk-mini-rate">4.9★ · 42 jobs</span></div>
      <div class="lk-bento-tile lk-bento-tall lk-polaroid"><span class="lk-polaroid-img"><i data-lucide="wrench" class="lucide-xl"></i></span><h3>&nbsp;</h3><small>Field kit, ready</small></div>
      <div class="lk-bento-tile"><h3>Direct chat</h3><p>No masked numbers.</p></div>
    </div>
  </section>`;
}

export function statsHTML() {
  return `
  <section class="lk-stats-band" aria-label="Key numbers">
    ${[
      ['1200', '+', 'Jobs completed [PLACEHOLDER]'],
      ['0', '%', 'Commission, always'],
      ['25', 'm', 'Average arrival'],
      ['4.9', '★', 'Average pro rating']
    ].map(x => `<div class="lk-stat"><h3 data-count="${x[0]}" data-count-prefix="" data-count-suffix="${x[1]}">${x[0]}${x[1]}</h3><p>${x[2]}</p></div>`).join('')}
  </section>`;
}

export function testimonialsHTML() {
  return `
  <section class="section-container" id="testimonials" aria-roledescription="carousel" aria-label="Testimonials">
    <h2 class="section-title">What neighbours say</h2>
    <p class="section-subtitle">Plac­eholders — swap in real stories with photos when ready.</p>
    <div class="lk-carousel" data-carousel>
      <div class="lk-track">
        ${T.testimonials.map(q => `<figure class="lk-quote"><span class="lk-metric">${q.metric}</span><blockquote>“${q.quote}”</blockquote><figcaption><span class="lk-ava" aria-hidden="true">${q.name.replace('[PLACEHOLDER] ', '').slice(0, 1)}</span><span><strong>${q.name}</strong><small>${q.role}</small></span></figcaption></figure>`).join('')}
      </div>
      <div class="lk-carousel-nav"><button type="button" aria-label="Previous testimonial" data-prev>←</button><span class="lk-dots">${T.testimonials.map((_, i) => `<button type="button" aria-label="Go to slide ${i + 1}" data-dot="${i}" class="${i === 0 ? 'is-active' : ''}"></button>`).join('')}</span><button type="button" aria-label="Next testimonial" data-next>→</button></div>
    </div>
  </section>`;
}

export function builtForHTML() {
  return `
  <section class="lk-builtfor" id="built-for" aria-label="Built for">
    <div class="lk-marquee lk-marquee-slow pause-hover"><div class="lk-marquee-track">${T.builtFor.concat(T.builtFor).map(n => `<span class="lk-pill-chip">${n}</span>`).join('')}</div></div>
  </section>`;
}
