// LocalKaam - PWA Offline Shell Test Suite
// Verifies the service worker, manifest, registration wiring, and UI hooks.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('manifest.json is a valid, installable web app manifest', () => {
  const manifest = JSON.parse(read('manifest.json'));
  assert.ok(manifest.name, 'has name');
  assert.ok(manifest.short_name, 'has short_name');
  assert.equal(manifest.display, 'standalone', 'standalone display');
  assert.ok(manifest.start_url, 'has start_url');
  assert.ok(manifest.scope, 'has scope');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'has at least 2 icons');
  manifest.icons.forEach((icon) => {
    assert.ok(icon.src, 'icon has src');
    assert.ok(icon.sizes, 'icon has sizes');
    assert.match(icon.purpose || '', /maskable/, 'at least maskable purpose declared');
  });
  assert.ok(manifest.theme_color, 'has theme_color');
  assert.ok(manifest.background_color, 'has background_color');
});

test('sw.js precaches files that actually exist in the repo', () => {
  const sw = read('sw.js');
  const match = sw.match(/const PRECACHE_URLS = \[([\s\S]*?)\];/);
  assert.ok(match, 'PRECACHE_URLS list found');
  const urls = [...match[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  assert.ok(urls.length >= 5, 'precache list is non-trivial');
  urls.forEach((url) => {
    const file = url === './' || url === './index.html' ? 'index.html' : url.replace(/^\.\//, '');
    assert.ok(fs.existsSync(path.join(ROOT, file)), `precache target exists: ${file}`);
  });
});

test('sw.js never intercepts live API traffic', () => {
  const sw = read('sw.js');
  assert.match(sw, /pathname\.startsWith\('\/api\/'\)/, 'has /api/ passthrough guard');
  assert.match(sw, /request\.method !== 'GET'/, 'only GET is intercepted');
  assert.match(sw, /request\.mode === 'navigate'/, 'navigation fallback strategy present');
  assert.match(sw, /caches\.match\('\.\/index\.html'\)/, 'offline navigations fall back to cached shell');
});

test('sw.js cleans up old cache versions and claims clients', () => {
  const sw = read('sw.js');
  assert.match(sw, /caches\.keys\(\)/, 'lists existing caches on activate');
  assert.match(sw, /caches\.delete\(name\)/, 'deletes stale caches');
  assert.match(sw, /self\.clients\.claim\(\)/, 'claims clients on activate');
  assert.match(sw, /skipWaiting\(\)/, 'activates the new worker immediately');
});

test('service worker is registered from a secure/local context only', () => {
  const pwa = read('pwa.js');
  assert.match(pwa, /'serviceWorker' in navigator/, 'feature-detects service workers');
  assert.match(pwa, /register\('\.\/sw\.js'/, "registers ./sw.js with ./ scope");
  assert.match(pwa, /protocol !== 'https:'/, 'guards non-https origins');
  assert.match(pwa, /\['localhost', '127\.0\.0\.1', '\[::1\]'\]/, 'allows localhost development');
});

test('install pill handles beforeinstallprompt and respects dismissal', () => {
  const pwa = read('pwa.js');
  assert.match(pwa, /beforeinstallprompt/, 'listens for beforeinstallprompt');
  assert.match(pwa, /event\.preventDefault\(\)/, 'prevents the default mini-infobar');
  assert.match(pwa, /INSTALL_DISMISS_KEY/, 'persists dismissal for the session');
  assert.match(pwa, /appinstalled/, 'handles successful install');
  assert.match(pwa, /deferredPrompt\.prompt\(\)/, 'triggers the native install flow');
});

test('offline banner reacts to connectivity and is announced to assistive tech', () => {
  const pwa = read('pwa.js');
  assert.match(pwa, /addEventListener\('offline'/, 'listens for offline');
  assert.match(pwa, /addEventListener\('online'/, 'listens for online');
  assert.match(pwa, /role', 'status'/, 'banner has status role');
  assert.match(pwa, /aria-live', 'polite'/, 'banner is polite aria-live');
});

test('index.html boots the PWA runtime and links the manifest', () => {
  const html = read('index.html');
  assert.match(html, /import \{ PwaService \} from '\.\/pwa\.js'/, 'imports PwaService');
  assert.match(html, /PwaService\.init\(\)/, 'initialises PwaService on boot');
  assert.match(html, /rel="manifest"/, 'links the web app manifest');
});

test('install pill and offline banner styles exist in ui.css', () => {
  const css = read('ui.css');
  assert.match(css, /\.lk-install-pill\{/, 'install pill styles present');
  assert.match(css, /\.lk-offline-banner\{/, 'offline banner styles present');
  assert.match(css, /prefers-reduced-motion:reduce/, 'reduced-motion override present');
  assert.doesNotMatch(css.match(/lk-install-pill\{[\s\S]{0,400}/)[0], /transition:\s*all/, 'no transition: all in pill styles');
});
