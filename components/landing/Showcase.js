// components/landing/Showcase.js — tabbed features + comparison.
import { T } from './data.js';

export function tabsHTML() {
  const tabs = T.pillars;
  return `
  <section class="section-container" id="features">
    <h2 class="section-title">Everything your team relies on, working together</h2>
    <p class="section-subtitle">Five tools that replace phone tags, paper bills and masked calls.</p>
    <div class="lk-tabs" data-tabs>
      <div class="lk-tablist" role="tablist" aria-label="Features">
        ${tabs.map((t, i) => `<button type="button" role="tab" id="tab-${t.id}" aria-controls="panel-${t.id}" aria-selected="${i === 0}" data-tab="${t.id}" class="${i === 0 ? 'is-active' : ''}"><i data-lucide="${t.icon}" class="lucide-md"></i> ${t.name}<span class="lk-tab-progress" aria-hidden="true"><span></span></span></button>`).join('')}
      </div>
      <div class="lk-tabpanels">
        ${tabs.map((t, i) => `
        <div class="lk-tabpanel ${i === 0 ? 'is-active' : ''}" role="tabpanel" id="panel-${t.id}" aria-labelledby="tab-${t.id}" ${i === 0 ? '' : 'hidden'}>
          <div class="lk-tab-text"><h3>${t.headline}</h3><p>${t.desc}</p><ul>${t.bullets.map(b => `<li><i data-lucide="check" class="lucide-sm"></i> ${b}</li>`).join('')}</ul><a href="${t.link}" class="settings-link">Explore ${t.name.toLowerCase()} →</a></div>
          <div class="lk-tab-visual" aria-hidden="true"><i data-lucide="${t.icon}" class="lucide-xl"></i><strong>${t.name}</strong><span>${t.bullets[0]}</span><span class="lk-tab-bar"><span style="width:${55 + i * 11}%"></span></span></div>
        </div>`).join('')}
      </div>
    </div>
  </section>`;
}

export function comparisonHTML() {
  return `
  <section class="section-container" id="problem">
    <h2 class="section-title">Why connected work wins</h2>
    <p class="section-subtitle">The old way scatters your home across apps and phone calls.</p>
    <div class="lk-vs">
      <div class="lk-vs-col is-old">
        <h3><i data-lucide="x" class="lucide-md"></i> The old way</h3>
        <ul><li><i data-lucide="x" class="lucide-xs"></i><span><strong>Scattered.</strong> Separate apps, numbers, paper bills.</span></li><li><i data-lucide="clock" class="lucide-xs"></i><span><strong>Manual.</strong> Fixed menus, surge fees, no negotiation.</span></li><li><i data-lucide="turtle" class="lucide-xs"></i><span><strong>Slow.</strong> City-wide strangers, masked calls.</span></li></ul>
      </div>
      <div class="lk-vs-col is-ours">
        <h3><i data-lucide="check" class="lucide-md"></i> With LocalKaam</h3>
        <ul><li><i data-lucide="link" class="lucide-xs"></i><span><strong>Connected.</strong> Book, track, pay, review in one place.</span></li><li><i data-lucide="zap" class="lucide-xs"></i><span><strong>Fast.</strong> Neighbours arrive in ~25 minutes.</span></li><li><i data-lucide="hand-coins" class="lucide-xs"></i><span><strong>Fair.</strong> 0% commission, direct payment.</span></li></ul>
      </div>
    </div>
  </section>`;
}
