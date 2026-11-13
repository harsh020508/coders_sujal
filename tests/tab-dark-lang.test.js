import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoDir = path.resolve(__dirname, '..');

test('1. Multi-tab isolation: StorageService isolates role per tab via hash and sessionStorage', async () => {
  // Mock window & sessionStorage
  global.window = {
    location: { hash: '#customer' }
  };
  global.sessionStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  };
  global.localStorage = {
    _data: { localkaam_current_role: 'worker' }, // Other tab wrote 'worker' to localStorage
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  };

  const { StorageService } = await import('../storage.js');

  // Even though localStorage has 'worker' (set by Tab 2), this tab has '#customer' hash
  assert.strictEqual(StorageService.getCurrentRole(), 'customer', 'Tab 1 should retain customer role from its hash');

  // Now clear hash and set sessionStorage for this tab
  global.window.location.hash = '';
  global.sessionStorage.setItem('localkaam_current_role', 'settings');
  assert.strictEqual(StorageService.getCurrentRole(), 'settings', 'Tab should retain settings role from sessionStorage');
});

test('2. Multi-tab isolation: Guest session is tab-isolated and preserved across simulated refresh', async () => {
  global.window = { location: { hash: '#worker' } };
  global.sessionStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  };
  global.localStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  };

  const { AuthService } = await import('../authService.js');
  AuthService.loginGuest('worker');

  const guestSession = JSON.parse(global.sessionStorage.getItem('localkaam_guest_session'));
  assert.ok(guestSession, 'Guest session should be saved in sessionStorage');
  assert.strictEqual(guestSession.user.user_metadata.role, 'worker');

  // Simulate refresh: re-instantiate or test restore
  const restored = AuthService._restoreGuestSession();
  assert.strictEqual(restored, true, 'Guest session should be restored from tab sessionStorage');
  assert.strictEqual(AuthService.getProfile().role, 'worker');
});

test('3. Dark mode: styles.css contains Leaflet map and form dark mode rules', () => {
  const styles = fs.readFileSync(path.join(repoDir, 'styles.css'), 'utf8');
  assert.ok(styles.includes('[data-theme="dark"] .leaflet-tile'), 'Missing dark mode leaflet tile styling');
  assert.ok(styles.includes('[data-theme="dark"] .leaflet-popup-content-wrapper'), 'Missing dark mode leaflet popup styling');
  assert.ok(styles.includes('[data-theme="dark"] .form-select'), 'Missing dark mode form-select styling');
  assert.ok(styles.includes('.worker-stat-badge'), 'Missing worker stat badge styles');
});

test('4. Dark mode: customer.js and worker.js do not have glaring light inline backgrounds', () => {
  const customer = fs.readFileSync(path.join(repoDir, 'customer.js'), 'utf8');
  assert.ok(!customer.includes('background: #f0fdf4; border: 1.5px solid #bbf7d0;'), 'Customer arrival OTP box should use theme-aware colors');

  const worker = fs.readFileSync(path.join(repoDir, 'worker.js'), 'utf8');
  assert.ok(!worker.includes('background:#e0f2fe;color:#0284c7;'), 'Worker stat cards should use theme-aware classes');
});

test('5. Language: i18n translates key terms and provides language selectors', async () => {
  const { i18n, PHRASE_DICTIONARY } = await import('../i18n.js');
  
  assert.ok(PHRASE_DICTIONARY.hi['Platform'], 'Hindi dictionary should have Platform');
  assert.ok(PHRASE_DICTIONARY.hi['Switch Role'] || PHRASE_DICTIONARY.hi['Switch Mode'], 'Hindi dictionary should have switch role/mode');
  assert.ok(PHRASE_DICTIONARY.mr['Platform'], 'Marathi dictionary should have Platform');
  assert.ok(PHRASE_DICTIONARY.gu['Platform'], 'Gujarati dictionary should have Platform');

  const selectorHtml = i18n.renderLanguageSelector('test-picker');
  assert.ok(selectorHtml.includes('id="test-picker"'), 'renderLanguageSelector should render selector element');
  assert.ok(selectorHtml.includes('value="hi"'), 'renderLanguageSelector should include Hindi');
  assert.ok(selectorHtml.includes('value="mr"'), 'renderLanguageSelector should include Marathi');
});

test('6. Universal i18n: All 5 supported regional languages have complete dictionary coverage', async () => {
  const { PHRASE_DICTIONARY, SUPPORTED_LANGUAGES } = await import('../i18n.js');
  const regionalCodes = ['hi', 'mr', 'gu', 'ta', 'te'];

  // Verify all supported languages are registered
  for (const code of regionalCodes) {
    assert.ok(SUPPORTED_LANGUAGES.some(l => l.code === code), `Missing ${code} in SUPPORTED_LANGUAGES`);
    const dict = PHRASE_DICTIONARY[code];
    assert.ok(dict, `Missing dictionary for language: ${code}`);

    // Check critical landing phrases
    const criticalPhrases = [
      'Expert help,',
      'just around the corner.',
      'No hidden fees.',
      'Ever.',
      'Home Cleaning',
      'Plumbing',
      'Electrical Repairs',
      'AC Servicing',
      'Three steps. No phone calls.',
      'How do I book a professional?',
      'What you agree is what you pay',
      'Pros keep 100% of the job price',
      'Verified professionals',
      'Share this 6-digit code with the professional',
      'Help Centre & Support'
    ];

    for (const phrase of criticalPhrases) {
      assert.ok(dict[phrase], `Language "${code}" missing translation for: "${phrase}"`);
      assert.notStrictEqual(dict[phrase], phrase, `Language "${code}" has untranslated placeholder for: "${phrase}"`);
    }
  }
});

test('7. Universal i18n: translateDOM translates split <br> headers and dynamic DOM elements', async () => {
  const { i18n } = await import('../i18n.js');
  
  // Create a minimal mock DOM environment to verify translateDOM
  class MockNode {
    constructor(nodeValue, parent = null) {
      this.nodeValue = nodeValue;
      this.parentElement = parent;
    }
  }

  class MockElement {
    constructor(tagName, innerHTML = '') {
      this.tagName = tagName.toUpperCase();
      this.children = [];
      this.classList = { contains: () => false };
      this._innerHTML = innerHTML;
      this._attrs = {};
      this.childNodes = [];
    }
    get innerHTML() { return this._innerHTML; }
    set innerHTML(val) { this._innerHTML = val; }
    getAttribute(name) { return this._attrs[name] || null; }
    setAttribute(name, val) { this._attrs[name] = String(val); }
    querySelector(sel) {
      if (sel === 'br' && this._innerHTML.includes('<br>')) return new MockElement('BR');
      return null;
    }
    querySelectorAll(sel) {
      if (sel.includes('input') || sel.includes('textarea')) return [];
      if (sel.includes('title') || sel.includes('aria-label')) return [];
      if (this.querySelector('br')) return [this];
      return [];
    }
  }

  // Test Hindi translation of hero title containing <br>
  i18n.setLanguage('hi');
  const h1 = new MockElement('H1', 'Expert help,<br>just around the corner.');
  h1.children = [new MockElement('BR')];

  // Mock global document & NodeFilter
  const prevDoc = global.document;
  const prevFilter = global.NodeFilter;
  try {
    global.document = {
      body: h1,
      documentElement: { setAttribute: () => {} },
      querySelectorAll: () => [],
      createTreeWalker: (root) => {
        const textNode1 = new MockNode('Expert help,', root);
        const textNode2 = new MockNode('just around the corner.', root);
        const nodes = [textNode1, textNode2];
        let idx = 0;
        return {
          nextNode: () => nodes[idx++] || null
        };
      }
    };
    global.NodeFilter = { SHOW_TEXT: 4 };

    i18n.translateDOM(h1);
    assert.ok(h1.innerHTML.includes('विशेषज्ञ मदद'), 'Hero title should be translated to Hindi');
    assert.ok(h1.innerHTML.includes('बस आपके पास।'), 'Hero title split line should be translated to Hindi');

    // Switch to English and confirm no errors
    i18n.setLanguage('en');
    assert.strictEqual(i18n.getLanguage(), 'en');
  } finally {
    global.document = prevDoc;
    global.NodeFilter = prevFilter;
  }
});
