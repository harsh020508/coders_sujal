// components/landing/Landing.js — assembles the 16-section landing.
// Services panel + comparison table + CTA band preserved from prior build.
import { announcementBarHTML } from './AnnouncementBar.js';
import { navHTML, drawerHTML, shortcutsModalHTML } from './Navbar.js';
import { heroHTML } from './Hero.js';
import { tabsHTML, comparisonHTML } from './Showcase.js';
import { integrationsHTML, bentoHTML, statsHTML, testimonialsHTML, builtForHTML } from './Proof.js';
import { timelineHTML, faqHTML, ctaHTML, resourcesHTML, footerHTML } from './Convert.js';

export function landingHTML({ theme, t, CATEGORIES, esc }) {
  return `
  <a class="lk-skip" href="#services">Skip to content</a>
  ${announcementBarHTML()}
  ${drawerHTML()}
  ${navHTML(theme)}
  <main id="lk-main">
  ${heroHTML()}
  ${tabsHTML()}
  ${comparisonHTML()}
  <section class="section-container" id="services">
    <div class="lk-services-panel">
      <div class="lk-sp-left">
        <h3>${t('services_title', 'Ten trades, ready near you.')}</h3>
        <p>Every pro is ID-verified and rated only on completed jobs. Pick a trade to see who is available in your locality today.</p>
        <div class="lk-sp-pills">${CATEGORIES.map(c => `<button type="button" class="lk-pill" data-category="${esc(c.id)}">${esc(c.name)}</button>`).join('')}</div>
        <button class="btn lk-sp-cta" id="sp-cta-btn">Browse professionals <i data-lucide="arrow-right" class="lucide-sm"></i></button>
      </div>
      <div class="lk-sp-grid">
        ${CATEGORIES.slice(0, 6).map(c => `<button type="button" class="lk-tile" data-category="${esc(c.id)}" aria-label="Book ${esc(c.name)} nearby"><i data-lucide="${esc(c.lucideIcon || 'wrench')}" class="lucide-lg"></i><strong>${esc(c.name)}</strong></button>`).join('')}
      </div>
    </div>
  </section>
  <section class="lk-metrics stats-grid" aria-label="Marketplace facts"><div class="stat-card"><span class="stat-card-label">Service categories</span><h3>10+</h3></div><div class="stat-card"><span class="stat-card-label">Platform commission</span><h3>0%</h3></div><div class="stat-card"><span class="stat-card-label">Average arrival</span><h3>~25m</h3></div><div class="stat-card"><span class="stat-card-label">Paid to pros</span><h3>100%</h3></div></section>
  ${integrationsHTML()}
  ${bentoHTML()}
  ${statsHTML()}
  ${testimonialsHTML()}
  ${builtForHTML()}
  <section class="section-container" id="comparison-table" style="display:none"></section>
  ${timelineHTML()}
  ${faqHTML()}
  ${ctaHTML()}
  ${resourcesHTML()}
  </main>
  ${footerHTML()}
  ${shortcutsModalHTML()}`;
}
