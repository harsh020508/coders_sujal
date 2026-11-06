import { test } from 'node:test';
import assert from 'node:assert/strict';
import { landingHTML } from '../components/landing/Landing.js';
import { SERVICES_12 } from '../components/landing/Showcase.js';
import { CATEGORIES } from '../data.js';

test('landing HTML includes required landmarks and CTAs', () => {
  const html = landingHTML({ theme: 'light' });
  const required = [
    'id="services"',
    'id="usps"',
    'id="how-it-works"',
    'id="faq"',
    'id="discovery"',
    'id="hero-find-pro-btn"',
    'id="get-started-btn"',
    'id="nav-signin-btn"',
    'id="nav-hamburger"',
    'id="mobile-nav-drawer"',
    'id="theme-toggle-btn"',
    'id="cta-find-pro-btn"',
    'data-category=',
    'data-locality='
  ];
  for (const needle of required) {
    assert.ok(html.includes(needle), `landing HTML missing ${needle}`);
  }
  assert.equal(html.includes('#comparison'), false, 'dead #comparison anchors should be gone');
  assert.equal(html.includes('#built-for'), false, 'dead #built-for anchors should be gone');
  assert.equal(html.includes('#integrations'), false, 'dead #integrations anchors should be gone');
  assert.equal(html.includes('[PLACEHOLDER]'), false, 'placeholder copy should not ship');
});

test('landing service cards map to real category ids', () => {
  const ids = new Set(CATEGORIES.map((c) => c.id));
  assert.ok(SERVICES_12.length >= 10, 'expected a full service grid');
  for (const [id, icon, name] of SERVICES_12) {
    assert.ok(ids.has(id), `unknown category "${id}" for "${name}"`);
    assert.ok(icon && name, `service ${id} needs an icon and name`);
  }
});

test('dark theme landing still renders a theme toggle icon', () => {
  const html = landingHTML({ theme: 'dark' });
  assert.ok(html.includes('data-lucide="sun"'));
});
