// LocalKaam — settings sidebar
import { icon } from './icons.js';
import { SETTINGS_CATEGORIES, SETTINGS_SECTIONS } from './settingsConfig.js';

export const SettingsSidebar = {
  render(activeId = 'general') {
    const groups = SETTINGS_CATEGORIES.map((category) => `
      <div class="settings-nav-group" data-group="${category.id}">
        <div class="settings-group-label">${category.label}</div>
        ${category.items.map((item) => `
          <button
            type="button"
            class="settings-nav-item${item.id === activeId ? ' is-active' : ''}"
            data-section="${item.id}"
            aria-current="${item.id === activeId ? 'page' : 'false'}"
          >
            ${icon(item.icon, 17, 'settings-nav-icon')}
            <span>${item.label}</span>
          </button>
        `).join('')}
      </div>
    `).join('');

    return `
      <div class="settings-backdrop" id="settings-backdrop" aria-hidden="true"></div>
      <aside class="settings-sidebar" id="settings-sidebar" aria-label="Settings navigation">
        <div class="settings-sidebar-head">
          <div class="settings-sidebar-title">
            <span class="settings-brand-mark">LK</span>
            <span>
              <strong>Settings</strong>
              <small>LocalKaam</small>
            </span>
          </div>
          <button type="button" class="icon-button settings-sidebar-close" id="settings-sidebar-close" aria-label="Close settings navigation">
            ${icon('close', 18)}
          </button>
        </div>

        <div class="settings-search">
          ${icon('search', 16, 'settings-search-icon')}
          <input
            type="search"
            id="settings-search-input"
            placeholder="Search settings"
            aria-label="Search settings"
            autocomplete="off"
            spellcheck="false"
          >
          <kbd class="settings-search-kbd" id="settings-search-kbd" aria-hidden="true">Ctrl K</kbd>
        </div>

        <nav class="settings-nav" id="settings-nav" aria-label="Settings sections">
          ${groups}
          <p class="settings-nav-empty" id="settings-nav-empty" hidden>No settings match your search.</p>
        </nav>

        <div class="settings-sidebar-foot">
          ${icon('check', 14)}
          <span>Preferences save automatically</span>
        </div>
      </aside>
    `;
  },

  bind(options = {}) {
    const { onNavigate = () => {} } = options;
    const sidebar = document.getElementById('settings-sidebar');
    const backdrop = document.getElementById('settings-backdrop');
    const searchInput = document.getElementById('settings-search-input');
    const nav = document.getElementById('settings-nav');
    const empty = document.getElementById('settings-nav-empty');
    if (!sidebar || !nav) return;

    const isMobile = () => window.matchMedia && window.matchMedia('(max-width: 960px)').matches;

    const open = () => {
      sidebar.classList.add('is-open');
      if (backdrop) backdrop.classList.add('is-open');
      const first = sidebar.querySelector('.settings-nav-item:not([hidden])');
      if (first && isMobile()) window.setTimeout(() => first.focus({ preventScroll: true }), 120);
    };

    const close = () => {
      sidebar.classList.remove('is-open');
      if (backdrop) backdrop.classList.remove('is-open');
    };

    const updateActive = (sectionId) => {
      sidebar.querySelectorAll('.settings-nav-item').forEach((item) => {
        const active = item.getAttribute('data-section') === sectionId;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-current', active ? 'page' : 'false');
      });
      close();
    };

    const navigate = (sectionId) => {
      updateActive(sectionId);
      onNavigate(sectionId);
    };

    nav.querySelectorAll('.settings-nav-item').forEach((item) => {
      item.addEventListener('click', () => navigate(item.getAttribute('data-section')));
    });

    const searchIndex = SETTINGS_SECTIONS.reduce((index, section) => {
      index[section.id] = `${section.label} ${section.description} ${section.keywords} ${section.category}`.toLowerCase();
      return index;
    }, {});

    const filter = () => {
      const query = (searchInput?.value || '').trim().toLowerCase();
      let visible = 0;
      const groups = sidebar.querySelectorAll('.settings-nav-group');

      groups.forEach((group) => {
        let groupVisible = 0;
        group.querySelectorAll('.settings-nav-item').forEach((item) => {
          const sectionId = item.getAttribute('data-section');
          const text = `${item.textContent} ${sectionId} ${searchIndex[sectionId] || ''}`.toLowerCase();
          const match = !query || text.includes(query) || (query.length > 2 && text.replace(/[^a-z0-9]/g, '').includes(query.replace(/[^a-z0-9]/g, '')));
          item.hidden = !match;
          if (match) {
            groupVisible += 1;
            visible += 1;
          }
        });
        group.hidden = groupVisible === 0;
      });

      if (empty) empty.hidden = visible !== 0;
      // Keep the search term visible in the sidebar.
      sidebar.classList.toggle('is-searching', Boolean(query));
    };

    if (searchInput) {
      searchInput.addEventListener('input', filter);
      searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown') {
          const first = nav.querySelector('.settings-nav-item:not([hidden])');
          if (first) {
            event.preventDefault();
            first.focus();
          }
        }
        if (event.key === 'Escape') {
          searchInput.value = '';
          filter();
          searchInput.blur();
        }
        if (event.key === 'Enter') {
          const first = nav.querySelector('.settings-nav-item:not([hidden])');
          if (first) {
            event.preventDefault();
            navigate(first.getAttribute('data-section'));
          }
        }
      });
    }

    nav.addEventListener('keydown', (event) => {
      const items = Array.from(nav.querySelectorAll('.settings-nav-item:not([hidden])'));
      const index = items.indexOf(document.activeElement);
      if (index === -1) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const next = event.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
        items[next].focus();
      }
      if (event.key === 'Home') {
        event.preventDefault();
        items[0].focus();
      }
      if (event.key === 'End') {
        event.preventDefault();
        items[items.length - 1].focus();
      }
    });

    document.getElementById('settings-sidebar-close')?.addEventListener('click', close);
    backdrop?.addEventListener('click', close);
    if (this._escapeHandler) document.removeEventListener('keydown', this._escapeHandler);
    this._escapeHandler = (event) => {
      if (event.key === 'Escape' && sidebar.classList.contains('is-open')) close();
    };
    document.addEventListener('keydown', this._escapeHandler);

    // Expose a small controller for the page shell.
    this.controller = { open, close, filter, updateActive, focusSearch: () => searchInput?.focus() };
    return this.controller;
  }
};
