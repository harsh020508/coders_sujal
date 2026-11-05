// LocalKaam — Settings service
// Persists user preferences to localStorage and applies them to the document.
import { StorageService } from './storage.js';

const STORAGE_KEY = 'localkaam_settings_v2';
const LEGACY_KEY = 'localkaam_settings';

export const ACCENT_COLORS = [
  { id: 'default', name: 'Theme default', value: '' },
  { id: 'forest', name: 'Forest', value: '#1a3300' },
  { id: 'terracotta', name: 'Terracotta', value: '#b5491f' },
  { id: 'teal', name: 'Teal', value: '#0f6b62' },
  { id: 'indigo', name: 'Indigo', value: '#45439a' },
  { id: 'plum', name: 'Plum', value: '#7a2f5e' }
];

export const FONT_SIZES = [
  { id: 'small', name: 'Small' },
  { id: 'medium', name: 'Medium' },
  { id: 'large', name: 'Large' }
];

export const DENSITIES = [
  { id: 'comfortable', name: 'Comfortable' },
  { id: 'compact', name: 'Compact' }
];

export const THEMES = [
  { id: 'light', name: 'Light' },
  { id: 'dark', name: 'Dark' },
  { id: 'system', name: 'System' }
];

const DEFAULT_SETTINGS = {
  version: 2,
  general: {
    language: 'en',
    defaultLanding: 'last',
    enterKey: 'submit'
  },
  appearance: {
    theme: 'light',
    accentColor: '',
    fontSize: 'medium',
    density: 'comfortable'
  },
  notifications: {
    enabled: true,
    email: true,
    push: false,
    importantUpdates: true,
    bookingUpdates: true,
    promotions: false
  },
  profile: {
    displayName: '',
    username: '',
    email: '',
    bio: '',
    phone: '',
    locality: '',
    avatarUrl: ''
  },
  privacy: {
    profileVisibility: 'public',
    showEmail: false,
    showOnlineStatus: true,
    activityStatus: false
  },
  personalization: {
    personalizedJobs: true,
    personalizedServices: true,
    smartRecommendations: true,
    weeklyDigest: false,
    recentlyViewed: true
  },
  security: {
    loginAlerts: true,
    sessionTimeout: 30,
    twoFactorEnabled: false
  },
  shortcuts: {
    enabled: true,
    openSettings: 'ctrl+,',
    search: 'ctrl+k',
    toggleTheme: 'ctrl+shift+l'
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeDeep(base, patch) {
  const output = clone(base);
  if (!isPlainObject(patch)) return output;
  Object.keys(patch).forEach((key) => {
    const value = patch[key];
    if (isPlainObject(value) && isPlainObject(output[key])) {
      output[key] = mergeDeep(output[key], value);
    } else if (value !== undefined) {
      output[key] = value;
    }
  });
  return output;
}

function readJson(key) {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function safeRead(key) {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch (e) {
    return null;
  }
}

function hexToRgb(hex) {
  const cleaned = String(hex || '').replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
  return {
    r: parseInt(cleaned.slice(0, 2), 16),
    g: parseInt(cleaned.slice(2, 4), 16),
    b: parseInt(cleaned.slice(4, 6), 16)
  };
}

function shade(hex, amount) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  const next = {
    r: clamp(rgb.r + amount),
    g: clamp(rgb.g + amount),
    b: clamp(rgb.b + amount)
  };
  return `#${[next.r, next.g, next.b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const channel = (value) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

function migrateLegacy(legacy) {
  if (!isPlainObject(legacy)) return {};
  const migrated = {};

  if (legacy.theme) migrated.appearance = { ...(migrated.appearance || {}), theme: legacy.theme };
  if (legacy.accentColor) migrated.appearance = { ...(migrated.appearance || {}), accentColor: legacy.accentColor };
  if (legacy.fontSize) migrated.appearance = { ...(migrated.appearance || {}), fontSize: legacy.fontSize };
  if (legacy.density) migrated.appearance = { ...(migrated.appearance || {}), density: legacy.density };
  if (isPlainObject(legacy.appearance)) {
    migrated.appearance = { ...(migrated.appearance || {}), ...legacy.appearance };
  }
  if (legacy.language) migrated.general = { ...(migrated.general || {}), language: legacy.language };
  if (legacy.enterKey) migrated.general = { ...(migrated.general || {}), enterKey: legacy.enterKey };
  if (isPlainObject(legacy.general)) {
    migrated.general = { ...(migrated.general || {}), ...legacy.general };
  }
  ['notifications', 'privacy', 'personalization', 'security'].forEach((key) => {
    if (isPlainObject(legacy[key])) migrated[key] = legacy[key];
  });
  if (isPlainObject(legacy.profile)) {
    migrated.profile = {
      displayName: legacy.profile.displayName || '',
      username: legacy.profile.username || '',
      email: legacy.profile.email || '',
      bio: legacy.profile.bio || '',
      phone: legacy.profile.phone || '',
      locality: legacy.profile.locality || '',
      avatarUrl: legacy.profile.avatarUrl || ''
    };
  }
  return migrated;
}

class SettingsManager {
  constructor() {
    this.settings = clone(DEFAULT_SETTINGS);
    this.lastSavedAt = null;
    this._systemQuery = null;
    this._systemHandler = null;
    this._storageHandler = null;
    this._initialized = false;
    this.currentSection = 'general';
  }

  init() {
    if (this._initialized) {
      this.applyAll();
      return this.settings;
    }
    this._initialized = true;
    this.load();
    this.applyAll();
    this.bindSystemTheme();
    this.bindCrossTabSync();
    return this.settings;
  }

  load() {
    const stored = readJson(STORAGE_KEY);
    if (stored) {
      this.settings = mergeDeep(DEFAULT_SETTINGS, stored);
      this.lastSavedAt = stored._savedAt || null;
    } else {
      const legacy = readJson(LEGACY_KEY);
      this.settings = mergeDeep(DEFAULT_SETTINGS, migrateLegacy(legacy));

      // Preserve an existing theme choice made through the old navbar toggle.
      if (!this.settings.appearance.accentColor) {
        const legacyTheme = safeRead('localkaam_theme');
        if (legacyTheme === 'dark' || legacyTheme === 'light') {
          this.settings.appearance.theme = legacyTheme;
        }
      }
      this.save({ silent: true });
    }

    // Merge any profile data that is only available from the auth cache.
    if (!this.settings.profile.email) {
      const auth = readJson('localkaam_cached_user');
      if (auth && auth.profile) {
        this.settings.profile.email = auth.profile.email || '';
        this.settings.profile.displayName = this.settings.profile.displayName || auth.profile.full_name || '';
        this.settings.profile.phone = this.settings.profile.phone || auth.profile.phone || '';
        this.settings.profile.locality = this.settings.profile.locality || auth.profile.locality || '';
      }
    }

    return this.settings;
  }

  save(options = {}) {
    const { silent = false } = options;
    this.settings._savedAt = new Date().toISOString();
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      }
      this.lastSavedAt = this.settings._savedAt;
      if (!silent) this.applyAll();
      return { success: true, savedAt: this.lastSavedAt };
    } catch (e) {
      console.error('[Settings] Could not save settings:', e);
      return { success: false, error: e };
    }
  }

  get(path, fallback) {
    if (!path) return this.settings;
    const parts = String(path).split('.');
    let current = this.settings;
    for (const part of parts) {
      if (current === null || current === undefined) return fallback;
      current = current[part];
    }
    return current === undefined ? fallback : current;
  }

  set(path, value) {
    const parts = String(path).split('.');
    let current = this.settings;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const part = parts[i];
      if (!isPlainObject(current[part])) current[part] = {};
      current = current[part];
    }
    current[parts[parts.length - 1]] = value;
    return this;
  }

  update(patch, options = {}) {
    this.settings = mergeDeep(this.settings, patch);
    return this.save(options);
  }

  reset(options = {}) {
    const { keepProfile = true } = options;
    const preserved = keepProfile
      ? { profile: clone(this.settings.profile) }
      : {};
    this.settings = mergeDeep(DEFAULT_SETTINGS, preserved);
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    this.save({ silent: true });
    this.applyAll();
    return this.settings;
  }

  resetAppearance() {
    this.settings.appearance = clone(DEFAULT_SETTINGS.appearance);
    this.save();
    return this.settings.appearance;
  }

  // ----- Theme ------------------------------------------------------------

  getSystemTheme() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (e) {
      return 'light';
    }
  }

  getResolvedTheme() {
    const preference = this.get('appearance.theme', 'light');
    if (preference === 'system') return this.getSystemTheme();
    return preference === 'dark' ? 'dark' : 'light';
  }

  setTheme(theme, options = {}) {
    const next = THEMES.some((item) => item.id === theme) ? theme : 'light';
    this.set('appearance.theme', next);
    if (options.render !== false) this.save();
    else this.applyTheme();
    return next;
  }

  applyTheme() {
    if (typeof document === 'undefined') return;
    const resolved = this.getResolvedTheme();
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.setAttribute('data-theme-preference', this.get('appearance.theme', 'light'));
    try {
      if (StorageService && StorageService.setTheme) StorageService.setTheme(resolved);
    } catch (e) {}
  }

  bindSystemTheme() {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    if (this._systemQuery) return;
    try {
      this._systemQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this._systemHandler = () => {
        if (this.get('appearance.theme') === 'system') this.applyTheme();
      };
      if (this._systemQuery.addEventListener) {
        this._systemQuery.addEventListener('change', this._systemHandler);
      } else if (this._systemQuery.addListener) {
        this._systemQuery.addListener(this._systemHandler);
      }
    } catch (e) {}
  }

  // ----- Appearance -------------------------------------------------------

  setAccentColor(color) {
    this.set('appearance.accentColor', color || '');
    this.save();
    return color || '';
  }

  setFontSize(size) {
    this.set('appearance.fontSize', size);
    this.save();
    return size;
  }

  setDensity(density) {
    this.set('appearance.density', density);
    this.save();
    return density;
  }

  applyAccent() {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const color = this.get('appearance.accentColor', '');
    if (!color) {
      root.style.removeProperty('--accent-primary');
      root.style.removeProperty('--accent-hover');
      root.style.removeProperty('--accent-light');
      root.style.removeProperty('--accent-contrast');
      return;
    }
    const rgb = hexToRgb(color);
    if (!rgb) return;
    const dark = this.getResolvedTheme() === 'dark';
    const luminance = relativeLuminance(color);
    root.style.setProperty('--accent-primary', color);
    root.style.setProperty('--accent-hover', shade(color, luminance > 0.5 ? -24 : 28));
    root.style.setProperty('--accent-light', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${dark ? 0.22 : 0.14})`);
    root.style.setProperty('--accent-contrast', luminance > 0.55 ? '#121411' : '#ffffff');
  }

  applyFontSize() {
    if (typeof document === 'undefined') return;
    const size = this.get('appearance.fontSize', 'medium');
    const px = size === 'small' ? '15px' : size === 'large' ? '18px' : '16px';
    document.documentElement.style.fontSize = px;
  }

  applyDensity() {
    if (typeof document === 'undefined' || !document.body) return;
    const density = this.get('appearance.density', 'comfortable');
    document.body.classList.toggle('density-compact', density === 'compact');
  }

  applyAll() {
    this.applyTheme();
    this.applyAccent();
    this.applyFontSize();
    this.applyDensity();
  }

  // ----- Shortcuts --------------------------------------------------------

  getShortcut(action) {
    return this.get(`shortcuts.${action}`, '');
  }

  shortcutLabel(action) {
    const raw = this.getShortcut(action);
    if (!raw) return '—';
    return raw
      .split('+')
      .map((part) => {
        if (part === 'ctrl') return 'Ctrl';
        if (part === 'shift') return 'Shift';
        if (part === 'alt') return 'Alt';
        if (part === 'meta') return 'Cmd';
        if (part === ',') return ',';
        return part.toUpperCase();
      })
      .join(' + ');
  }

  // ----- Cross-tab sync ---------------------------------------------------

  bindCrossTabSync() {
    if (typeof window === 'undefined' || this._storageHandler) return;
    this._storageHandler = (event) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          this.settings = mergeDeep(DEFAULT_SETTINGS, JSON.parse(event.newValue));
          this.applyAll();
        } catch (e) {}
      }
    };
    window.addEventListener('storage', this._storageHandler);
  }
}

export const SettingsService = new SettingsManager();
export const Settings = SettingsService;
