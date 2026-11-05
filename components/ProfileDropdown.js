// LocalKaam — profile menu
// A single, accessible profile menu used by the customer, worker and settings shells.
import { AuthService } from '../authService.js';
import { Settings } from '../settingsService.js';
import { StorageService } from '../storage.js';
import { Toast } from '../toast.js';
import { icon, avatarMarkup } from './icons.js';
import { esc } from '../utils.js';
import { i18n, t } from '../i18n.js';

export const ProfileDropdown = {
  trigger: null,
  menu: null,
  _globalBound: false,

  mount(container) {
    if (!container) return;
    const profile = this.getDisplayProfile();
    const name = profile.displayName || profile.full_name || 'User';
    const plan = profile.plan || 'Free plan';

    container.innerHTML = `
      <button
        type="button"
        class="profile-trigger"
        id="profile-menu-trigger"
        aria-haspopup="menu"
        aria-expanded="false"
        aria-controls="profile-menu"
      >
        ${avatarMarkup(profile, 'sm')}
        <span class="profile-trigger-meta">
          <span class="profile-trigger-name">${esc(name)}</span>
          <span class="profile-trigger-plan">${esc(plan)}</span>
        </span>
        <span class="profile-trigger-chevron">${icon('chevron-down', 15)}</span>
      </button>
    `;

    this.trigger = container.querySelector('#profile-menu-trigger');
    if (!this.trigger) return;

    this.trigger.addEventListener('click', (event) => {
      event.stopPropagation();
      this.toggle();
    });

    this.trigger.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.open(true);
      }
    });

    this.bindGlobalListeners();
  },

  getDisplayProfile() {
    const authProfile = AuthService.getProfile() || {};
    const settingsProfile = Settings.get('profile', {}) || {};
    const name = settingsProfile.displayName || authProfile.full_name || authProfile.name || '';
    const email = authProfile.email || settingsProfile.email || '';
    return {
      ...authProfile,
      displayName: name,
      full_name: name,
      email,
      phone: settingsProfile.phone || authProfile.phone || '',
      locality: settingsProfile.locality || authProfile.locality || '',
      avatar_url: settingsProfile.avatarUrl || authProfile.avatar_url || '',
      role: authProfile.role || (authProfile.user_metadata && authProfile.user_metadata.role) || 'customer',
      plan: authProfile.plan || 'Free plan'
    };
  },

  refresh() {
    const root = document.getElementById('profile-menu-root');
    if (root) this.mount(root);
  },

  toggle() {
    if (this.menu) this.close();
    else this.open(false);
  },

  open(focusFirst) {
    this.close(false);
    if (!this.trigger) return;
    this.menu = this.buildMenu();
    document.body.appendChild(this.menu);
    i18n.translateDOM(this.menu);
    this.trigger.setAttribute('aria-expanded', 'true');
    this.position();
    const firstItem = this.menu.querySelector('[role="menuitem"]');
    if (firstItem && focusFirst) {
      window.requestAnimationFrame(() => firstItem.focus());
    }
  },

  close(returnFocus = true) {
    const focusWasInside = Boolean(this.menu && document.activeElement && this.menu.contains(document.activeElement));
    if (this.menu) {
      this.menu.remove();
      this.menu = null;
    }
    if (this.trigger) {
      this.trigger.setAttribute('aria-expanded', 'false');
      if (returnFocus && focusWasInside) {
        this.trigger.focus({ preventScroll: true });
      }
    }
  },

  position() {
    if (!this.menu || !this.trigger) return;
    const rect = this.trigger.getBoundingClientRect();
    const menuRect = this.menu.getBoundingClientRect();
    const gutter = 10;
    let left = rect.right - menuRect.width;
    let top = rect.bottom + 8;

    if (left < gutter) left = gutter;
    if (left + menuRect.width > window.innerWidth - gutter) {
      left = window.innerWidth - menuRect.width - gutter;
    }
    if (top + menuRect.height > window.innerHeight - gutter) {
      const above = rect.top - menuRect.height - 8;
      top = above > gutter ? above : Math.max(gutter, window.innerHeight - menuRect.height - gutter);
    }

    this.menu.style.left = `${Math.max(gutter, left)}px`;
    this.menu.style.top = `${Math.max(gutter, top)}px`;
  },

  buildMenu() {
    const profile = this.getDisplayProfile();
    const role = StorageService.getCurrentRole();
    const settingsSection = localStorage.getItem('localkaam_settings_section') || 'general';
    const active = this.getActiveItem(role, settingsSection);

    const menu = document.createElement('div');
    menu.className = 'profile-menu';
    menu.id = 'profile-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-labelledby', 'profile-menu-trigger');

    const item = (action, iconName, label, hint = '', extraClass = '') => `
      <button
        type="button"
        class="profile-menu-item ${extraClass}"
        role="menuitem"
        tabindex="-1"
        data-action="${action}"
        ${active === action ? 'aria-current="page"' : ''}
      >
        <span class="profile-menu-icon">${icon(iconName, 17)}</span>
        <span class="profile-menu-label">${label}</span>
        ${hint ? `<span class="profile-menu-hint">${hint}</span>` : ''}
        ${active === action ? `<span class="profile-menu-active">${icon('check', 14)}</span>` : ''}
      </button>
    `;

    menu.innerHTML = `
      <div class="profile-menu-head">
        ${avatarMarkup(profile, 'md')}
        <div class="profile-menu-identity">
          <strong>${esc(profile.displayName || profile.full_name || 'User')}</strong>
          <span>${esc(profile.email || 'Local account')}</span>
          <span class="profile-plan-pill">${esc(profile.role === 'worker' ? 'Worker' : 'Customer')} · ${esc(profile.plan)}</span>
        </div>
      </div>
      <div class="profile-menu-group">
        ${item('upgrade', 'upgrade', 'Upgrade Plan', 'Free')}
      </div>
      <div class="profile-menu-separator" role="separator"></div>
      <div class="profile-menu-group">
        ${item('personalization', 'sparkles', 'Personalization')}
        ${item('profile', 'user', 'Profile')}
        ${item('settings', 'sliders', 'Settings')}
        ${item('help', 'help', 'Help')}
      </div>
      <div class="profile-menu-separator" role="separator"></div>
      <div class="profile-menu-group">
        ${item('logout', 'logout', 'Log Out', '', 'is-danger')}
      </div>
    `;

    menu.querySelectorAll('[role="menuitem"]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        this.handleAction(button.getAttribute('data-action'));
      });
    });

    menu.addEventListener('keydown', (event) => this.onMenuKeydown(event));
    return menu;
  },

  getActiveItem(role, settingsSection) {
    if (role !== 'settings') return '';
    if (settingsSection === 'profile') return 'profile';
    if (settingsSection === 'personalization') return 'personalization';
    if (settingsSection === 'help-support') return 'help';
    return 'settings';
  },

  onMenuKeydown(event) {
    const items = Array.from(this.menu.querySelectorAll('[role="menuitem"]'));
    const index = items.indexOf(document.activeElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key === 'Tab') {
      this.close(false);
      return;
    }
    if (!items.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = event.key === 'ArrowDown'
        ? (index + 1 + items.length) % items.length
        : (index - 1 + items.length) % items.length;
      items[next].focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      items[0].focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      items[items.length - 1].focus();
    }
  },

  handleAction(action) {
    if (action === 'logout') {
      this.confirmLogout();
      return;
    }
    if (action === 'upgrade') {
      this.close(false);
      this.showUpgradeDialog();
      return;
    }
    const sectionMap = {
      profile: 'profile',
      settings: 'general',
      personalization: 'personalization',
      help: 'help-support'
    };
    const section = sectionMap[action] || 'general';
    this.close(false);
    window.dispatchEvent(new CustomEvent('locakaam:open-settings', { detail: { section } }));
  },

  confirmLogout() {
    this.close(false);
    this.openDialog({
      title: 'Log out of LocalKaam?',
      body: '<p class="lk-dialog-copy">Your saved preferences stay on this device. You can sign back in at any time.</p>',
      confirmLabel: 'Log out',
      danger: true,
      onConfirm: async () => {
        await AuthService.signOut();
        Toast.show('You have been logged out.', 'info');
        window.dispatchEvent(new CustomEvent('locakaam:logout'));
      }
    });
  },

  showUpgradeDialog() {
    this.openDialog({
      title: 'LocalKaam plans',
      body: `
        <p class="lk-dialog-copy">LocalKaam is free to use during the hackathon build. Paid plans are not available yet because no billing provider is connected.</p>
        <div class="plan-list">
          <div class="plan-row is-current">
            <div>
              <strong>Free</strong>
              <span>Browse, book and manage local services.</span>
            </div>
            <span class="plan-state">Current plan</span>
          </div>
          <div class="plan-row">
            <div>
              <strong>Pro</strong>
              <span>Priority matching and advanced tools. Planned.</span>
            </div>
            <span class="plan-state">Coming soon</span>
          </div>
        </div>
      `,
      confirmLabel: 'Got it',
      onConfirm: () => {}
    });
  },

  openDialog({ title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, onConfirm }) {
    const existing = document.getElementById('lk-action-dialog');
    if (existing) existing.remove();

    const dialog = document.createElement('dialog');
    dialog.id = 'lk-action-dialog';
    dialog.className = 'lk-dialog';
    dialog.innerHTML = `
      <div class="lk-dialog-inner">
        <div class="lk-dialog-head">
          <h2>${esc(title)}</h2>
          <button type="button" class="icon-button lk-dialog-close" aria-label="Close dialog">${icon('close', 18)}</button>
        </div>
        <div class="lk-dialog-body">${body}</div>
        <div class="lk-dialog-actions">
          ${danger || cancelLabel ? `<button type="button" class="btn btn-outline btn-sm" data-dialog-cancel>${esc(cancelLabel)}</button>` : ''}
          <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'} btn-sm" data-dialog-confirm>${esc(confirmLabel)}</button>
        </div>
      </div>
    `;
    document.body.appendChild(dialog);
    i18n.translateDOM(dialog);

    const close = () => {
      dialog.close();
      dialog.remove();
    };

    dialog.querySelector('.lk-dialog-close').addEventListener('click', close);
    dialog.querySelector('[data-dialog-cancel]')?.addEventListener('click', close);
    dialog.querySelector('[data-dialog-confirm]').addEventListener('click', async () => {
      const button = dialog.querySelector('[data-dialog-confirm]');
      button.disabled = true;
      try {
        await onConfirm();
      } finally {
        close();
      }
    });
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) close();
    });
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      close();
    });
    dialog.showModal();
    window.setTimeout(() => dialog.querySelector('[data-dialog-cancel]')?.focus() || dialog.querySelector('[data-dialog-confirm]')?.focus(), 40);
  },

  bindGlobalListeners() {
    if (this._globalBound) return;
    this._globalBound = true;

    document.addEventListener('click', (event) => {
      if (!this.menu) return;
      if (this.menu.contains(event.target) || (this.trigger && this.trigger.contains(event.target))) return;
      this.close(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.menu) {
        event.preventDefault();
        this.close();
      }
    });

    const reposition = () => {
      if (this.menu) this.position();
    };
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
  }
};
