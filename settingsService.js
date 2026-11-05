// LocalKaam — Settings service
// Persists user preferences to localStorage and applies them to the document.
import { StorageService } from './storage.js';

const STORAGE_KEY = 'localkaam_settings_v2';
const LEGACY_KEY = 'localkaam_settings';

export const ACCENT_COLORS = [
  { id: 'default', name: 'Theme default', value: '', dark: '' },
  { id: 'forest', name: 'Forest', value: '#1a3300', dark: '#a8d879' },
  { id: 'terracotta', name: 'Terracotta', value: '#b5491f', dark: '#f2a592' },
  { id: 'teal', name: 'Teal', value: '#0f6b62', dark: '#5fd0c2' },
  { id: 'indigo', name: 'Indigo', value: '#45439a', dark: '#a5a3ec' },
  { id: 'plum', name: 'Plum', value: '#7a2f5e', dark: '#e59ac6' }
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

function rgbToHex(r, g, b) {
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(r), clamp(g), clamp(b)].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
  else if (max === gn) h = ((bn - rn) / d + 2) * 60;
  else h = ((rn - gn) / d + 4) * 60;
  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
  const sn = Math.max(0, Math.min(100, s)) / 100;
  const ln = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

function adjustLightness(hex, deltaPoints) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return hslToHex(hsl.h, hsl.s, hsl.l + deltaPoints);
}

function rgbaOf(hex, alpha) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
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
  return rgbToHex(next.r, next.g, next.b);
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

function contrastRatio(hexA, hexB) {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Build a theme-aware accent palette so every picker colour stays readable
// on both light and dark surfaces, and so the ui.css "peacock" tokens follow
// the same accent instead of staying frozen teal.
export function getAccentPalette(baseHex, resolvedTheme) {
  const cleaned = String(baseHex || '').trim();
  if (!cleaned) return null;
  const rgb = hexToRgb(cleaned);
  if (!rgb) return null;
  const isDark = resolvedTheme === 'dark';
  const preset = ACCENT_COLORS.find((c) => String(c.value || '').toLowerCase() === cleaned.toLowerCase());

  let lightPrimary = cleaned.toLowerCase();
  // Light surfaces (cream #fbf9f4): keep luminance <= 0.25 so accent text
  // clears WCAG AA (4.5:1) on cream. Deepen pale customs (e.g. yellow)
  // in steps rather than a single nudge.
  let guard = 0;
  while (relativeLuminance(lightPrimary) > 0.25 && guard < 4) {
    lightPrimary = adjustLightness(lightPrimary, -10);
    guard += 1;
  }

  let darkPrimary;
  if (preset && preset.dark) {
    darkPrimary = preset.dark;
  } else {
    // Dark surfaces (#0f120e / #1e231c): lift the hue to a light, readable
    // tone while keeping its character. Near-neutral greys map to a warm
    // light greige so they don't turn blue/green.
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const sat = hsl.s < 6 ? 18 : Math.max(48, Math.min(78, hsl.s));
    darkPrimary = hslToHex(hsl.h, sat, 72);
  }

  const primary = isDark ? darkPrimary : lightPrimary;
  // Hover darkens/lightens proportionally so very dark accents (forest,
  // L~15) don't collapse to near-black and very light ones don't blow out.
  const pRgb = hexToRgb(primary);
  const pHsl = pRgb ? rgbToHsl(pRgb.r, pRgb.g, pRgb.b) : null;
  const hover = pHsl
    ? hslToHex(pHsl.h, pHsl.s, isDark ? Math.min(88, pHsl.l + 8) : Math.max(6, pHsl.l * 0.78))
    : primary;
  const primaryRgb = pRgb;
  const accentLight = primaryRgb ? rgbaOf(primary, isDark ? 0.2 : 0.14) : primary;
  const peacock100 = primaryRgb ? rgbaOf(primary, isDark ? 0.3 : 0.18) : accentLight;
  // Text on top of the primary fill (primary buttons, checked chips).
  const contrast = contrastRatio(primary, '#121411') >= contrastRatio(primary, '#ffffff')
    ? '#121411'
    : '#ffffff';

  return {
    base: cleaned,
    lightPrimary,
    darkPrimary,
    primary,
    hover,
    accentLight,
    peacock100,
    peacock700: pHsl
      ? hslToHex(pHsl.h, pHsl.s, isDark ? Math.min(90, pHsl.l + 10) : Math.max(6, pHsl.l * 0.7))
      : primary,
    contrast,
    focus: rgbaOf(primary, 0.35)
  };
}

const ACCENT_CSS_VARS = [
  '--accent-primary',
  '--accent-hover',
  '--accent-light',
  '--accent-contrast',
  '--accent-primary-light',
  '--accent-primary-dark',
  '--peacock-50',
  '--peacock-100',
  '--peacock-500',
  '--peacock-600',
  '--peacock-700',
  '--focus'
];

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
      document.documentElement.style.colorScheme = resolved;
    } catch (e) {}
    try {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', resolved === 'dark' ? '#0f120e' : '#fbf9f4');
    } catch (e) {}
    try {
      if (StorageService && StorageService.setTheme) StorageService.setTheme(resolved);
    } catch (e) {}
    // Accent lightness/alpha depends on the resolved surface, so a theme
    // switch (including system changes) must re-derive the accent palette.
    this.applyAccent();
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
    ACCENT_CSS_VARS.forEach((name) => root.style.removeProperty(name));
    if (!color) return;
    const palette = getAccentPalette(color, this.getResolvedTheme());
    if (!palette) return;
    root.style.setProperty('--accent-primary', palette.primary);
    root.style.setProperty('--accent-hover', palette.hover);
    root.style.setProperty('--accent-light', palette.accentLight);
    root.style.setProperty('--accent-contrast', palette.contrast);
    root.style.setProperty('--accent-primary-light', palette.lightPrimary);
    root.style.setProperty('--accent-primary-dark', palette.darkPrimary);
    // Bridge to the parallel ui.css token system ("peacock") so buttons,
    // chips, category tiles, focus rings, toasts and search all follow the
    // same accent in both modes.
    root.style.setProperty('--peacock-50', palette.accentLight);
    root.style.setProperty('--peacock-100', palette.peacock100);
    root.style.setProperty('--peacock-500', palette.primary);
    root.style.setProperty('--peacock-600', palette.hover);
    root.style.setProperty('--peacock-700', palette.peacock700);
    root.style.setProperty('--focus', palette.focus);
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
