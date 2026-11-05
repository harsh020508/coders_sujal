// components/landing/Navbar.js — mega-menu nav + mobile drawer markup.
// Keyboard: g then h = home, g then p = #services (Shift+? opens cheatsheet).
export function navHTML(theme) {
  return `
  <header class="navbar lk-navbar">
    <div class="nav-brand" id="nav-home-logo" role="button" tabindex="0">
      <div class="nav-logo">LK</div>
      <div class="nav-title">LocalKaam</div>
    </div>
    <nav class="nav-links" aria-label="Primary">
      <div class="nav-item">
        <button class="nav-link nav-menu-btn" aria-haspopup="true" aria-expanded="false" aria-controls="menu-platform">Platform <i data-lucide="chevron-down" class="lucide-xs"></i></button>
        <div class="mega" id="menu-platform" role="menu">
          ${[
            ['search', 'Discover pros', 'Verified pros by trade and locality', '#services'],
            ['calendar-check', 'Book & negotiate', 'Agree time and price with counter-offers', '#how-it-works'],
            ['map-pin', 'Track live', 'Milestone updates from accept to invoice', '#how-it-works'],
            ['hand-coins', 'Pay direct', '0% commission, direct to the pro', '#comparison'],
            ['star', 'Review', 'Ratings only on completed jobs', '#how-it-works'],
            ['shield-check', 'Verified trust', 'ID checks and completed-job reviews', '#problem']
          ].map(x => `<a class="mega-item" href="${x[3]}" role="menuitem"><span class="mega-icon"><i data-lucide="${x[0]}" class="lucide-md"></i></span><span><strong>${x[1]}</strong><small>${x[2]}</small></span></a>`).join('')}
        </div>
      </div>
      <div class="nav-item">
        <button class="nav-link nav-menu-btn" aria-haspopup="true" aria-expanded="false" aria-controls="menu-pricing">Pricing <i data-lucide="chevron-down" class="lucide-xs"></i></button>
        <div class="mega mega-sm" id="menu-pricing" role="menu">
          <a class="mega-item" href="#comparison" role="menuitem"><span class="mega-icon"><i data-lucide="percent" class="lucide-md"></i></span><span><strong>0% commission</strong><small>Pros keep 100% of agreed price</small></span></a>
          <a class="mega-item" href="#faq" role="menuitem"><span class="mega-icon"><i data-lucide="circle-help" class="lucide-md"></i></span><span><strong>How pricing works</strong><small>Quotes, counter-offers, surge-free</small></span></a>
        </div>
      </div>
      <a class="nav-link" href="#built-for">Built For</a>
      <a class="nav-link" href="#integrations">Integrations</a>
      <a class="nav-link" href="#resources">Resources</a>
    </nav>
    <div class="nav-actions">
      <button class="theme-toggle" id="theme-toggle-btn" aria-label="Toggle theme">
        <i data-lucide="${theme === 'dark' ? 'sun' : 'moon'}" class="lucide-sm"></i>
      </button>
      <button class="btn btn-outline btn-sm" id="nav-signin-btn"><i data-lucide="user" class="lucide-xs"></i> Log in</button>
      <button class="btn btn-primary btn-sm" id="get-started-btn">Get started <i data-lucide="arrow-right" class="lucide-xs"></i></button>
      <button class="nav-hamburger" id="nav-hamburger" aria-label="Open menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>`;
}

export function drawerHTML() {
  return `
  <div class="mobile-nav-overlay" id="mobile-nav-overlay"></div>
  <div class="mobile-nav-drawer lk-drawer" id="mobile-nav-drawer" role="dialog" aria-label="Menu">
    <div class="lk-drawer-head">
      <div class="nav-logo">LK</div>
      <strong>LocalKaam</strong>
      <button class="mobile-nav-close" id="mobile-nav-close" aria-label="Close menu">✕</button>
    </div>
    ${[
      ['Platform', '#services'], ['Pricing', '#comparison'], ['Built For', '#built-for'],
      ['Integrations', '#integrations'], ['Resources', '#resources']
    ].map(x => `<a class="nav-link lk-drawer-link" href="${x[1]}">${x[0]}</a>`).join('')}
    <div class="lk-drawer-actions">
      <button class="btn btn-outline btn-full" id="mobile-nav-signin-btn">Log in</button>
      <button class="btn btn-primary btn-full" id="mobile-get-started-btn">Get started</button>
      <button class="theme-toggle" id="mobile-theme-toggle-btn" style="width:100%;justify-content:center;">Toggle theme</button>
    </div>
  </div>`;
}

export function shortcutsModalHTML() {
  return `
  <div class="lk-modal-backdrop" id="shortcuts-backdrop" hidden>
    <div class="lk-modal-card" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
      <div class="lk-modal-head">
        <h2 id="shortcuts-title" style="font-size:1.1rem;margin:0;">Keyboard shortcuts</h2>
        <button class="mobile-nav-close" id="shortcuts-close" aria-label="Close shortcuts">✕</button>
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
