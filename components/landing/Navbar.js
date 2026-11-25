import { i18n } from '../../i18n.js';

// components/landing/Navbar.js — mega-menu nav + mobile drawer markup.
// Keyboard: g then h = home, g then p = #services (Shift+? opens cheatsheet).

export function navHTML(theme) {
  return `
  <header class="navbar lk-navbar" role="banner">
    <div class="nav-brand" id="nav-home-logo" role="button" tabindex="0" aria-label="LocalKaam Home">
      <div class="nav-logo" aria-hidden="true">LK</div>
      <div class="nav-title">LocalKaam</div>
    </div>
    <nav class="nav-links" aria-label="Primary navigation">
      <div class="nav-item">
        <button type="button" class="nav-link nav-menu-btn" aria-haspopup="true" aria-expanded="false" aria-controls="menu-platform">
          Platform <i data-lucide="chevron-down" class="lucide-xs" aria-hidden="true"></i>
        </button>
        <div class="mega" id="menu-platform" role="menu" aria-label="Platform features">
          ${[
            ['search', 'Discover pros', 'Verified pros by trade and locality', '#services'],
            ['calendar-check', 'Book & negotiate', 'Agree time and price with counter-offers', '#how-it-works'],
            ['map-pin', 'Track live', 'Milestone updates from accept to invoice', '#how-it-works'],
            ['hand-coins', 'Pay direct', '0% commission, direct to the pro', '#usps'],
            ['star', 'Review', 'Ratings only on completed jobs', '#how-it-works'],
            ['shield-check', 'Verified trust', 'ID checks and completed-job reviews', '#usps']
          ].map(x => `<a class="mega-item" href="${x[3]}" role="menuitem"><span class="mega-icon"><i data-lucide="${x[0]}" class="lucide-md" aria-hidden="true"></i></span><span><strong>${x[1]}</strong><small>${x[2]}</small></span></a>`).join('')}
        </div>
      </div>
      <div class="nav-item">
        <button type="button" class="nav-link nav-menu-btn" aria-haspopup="true" aria-expanded="false" aria-controls="menu-pricing">
          Pricing <i data-lucide="chevron-down" class="lucide-xs" aria-hidden="true"></i>
        </button>
        <div class="mega mega-sm" id="menu-pricing" role="menu" aria-label="Pricing overview">
          <a class="mega-item" href="#usps" role="menuitem"><span class="mega-icon"><i data-lucide="percent" class="lucide-md" aria-hidden="true"></i></span><span><strong>0% commission</strong><small>Pros keep 100% of agreed price</small></span></a>
          <a class="mega-item" href="#faq" role="menuitem"><span class="mega-icon"><i data-lucide="circle-help" class="lucide-md" aria-hidden="true"></i></span><span><strong>How pricing works</strong><small>Quotes, counter-offers, surge-free</small></span></a>
        </div>
      </div>
      <a class="nav-link" href="#discovery">Neighbourhoods</a>
      <a class="nav-link" href="#how-it-works">How it works</a>
      <a class="nav-link" href="#faq">Help</a>
    </nav>
    <div class="nav-actions">
      <div class="nav-lang-picker-wrapper">
        ${i18n.renderLanguageSelector('landing-lang-picker', 'nav-lang-select')}
      </div>
      <button type="button" class="theme-toggle" id="theme-toggle-btn" aria-label="Toggle colour theme" title="Toggle colour theme">
        <i data-lucide="${theme === 'dark' ? 'sun' : 'moon'}" class="lucide-sm" aria-hidden="true"></i>
      </button>
      <button type="button" class="btn btn-outline btn-sm" id="nav-signin-btn"><i data-lucide="user" class="lucide-xs" aria-hidden="true"></i> Log in</button>
      <button type="button" class="btn btn-primary btn-sm" id="get-started-btn">Get started <i data-lucide="arrow-right" class="lucide-xs" aria-hidden="true"></i></button>
      <button type="button" class="nav-hamburger" id="nav-hamburger" aria-label="Open menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>`;
}

export function drawerHTML() {
  return `
  <div class="mobile-nav-overlay" id="mobile-nav-overlay" aria-hidden="true"></div>
  <div class="mobile-nav-drawer lk-drawer" id="mobile-nav-drawer" role="dialog" aria-modal="true" aria-label="Navigation Menu">
    <div class="lk-drawer-head">
      <div class="nav-logo" aria-hidden="true">LK</div>
      <strong>LocalKaam</strong>
      <button type="button" class="mobile-nav-close" id="mobile-nav-close" aria-label="Close menu">✕</button>
    </div>
    <div class="lk-drawer-links" role="navigation" aria-label="Mobile Navigation">
      ${[
        ['Services', '#services'],
        ['Why LocalKaam', '#usps'],
        ['Neighbourhoods', '#discovery'],
        ['How it works', '#how-it-works'],
        ['Help & FAQ', '#faq']
      ].map(x => `<a class="nav-link lk-drawer-link" href="${x[1]}">${x[0]}</a>`).join('')}
    </div>
    <div class="lk-drawer-actions">
      <div class="nav-lang-picker-wrapper" style="margin-bottom:8px;">
        ${i18n.renderLanguageSelector('mobile-landing-lang-picker', 'nav-lang-select')}
      </div>
      <button type="button" class="btn btn-outline btn-full" id="mobile-nav-signin-btn">Log in</button>
      <button type="button" class="btn btn-primary btn-full" id="mobile-get-started-btn">Get started</button>
      <button type="button" class="theme-toggle btn-full" id="mobile-theme-toggle-btn"><i data-lucide="sun-moon" class="lucide-sm" aria-hidden="true"></i>Switch theme</button>
    </div>
  </div>`;
}

export function shortcutsModalHTML() {
  return `
  <div class="lk-modal-backdrop" id="shortcuts-backdrop" hidden>
    <div class="lk-modal-card" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
      <div class="lk-modal-head">
        <h2 id="shortcuts-title" style="font-size:1.1rem;margin:0;">Keyboard shortcuts</h2>
        <button type="button" class="mobile-nav-close" id="shortcuts-close" aria-label="Close shortcuts">✕</button>
      </div>
      <table class="data-table"><tbody>
        <tr><td><span class="settings-kbd">g</span> then <span class="settings-kbd">h</span></td><td>Home</td></tr>
        <tr><td><span class="settings-kbd">g</span> then <span class="settings-kbd">p</span></td><td>Services</td></tr>
        <tr><td><span class="settings-kbd">Shift</span> + <span class="settings-kbd">?</span></td><td>This cheatsheet</td></tr>
        <tr><td><span class="settings-kbd">Esc</span></td><td>Close menus &amp; dialogs</td></tr>
      </tbody></table>
    </div>
  </div>`;
}
