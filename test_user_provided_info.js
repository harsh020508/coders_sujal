// test_user_provided_info.js
import { WorkerFrontend } from './worker.js';
import { StorageService } from './storage.js';
import { AuthService } from './authService.js';
import { AuthModal } from './authModal.js';
import assert from 'assert';

console.log('Testing dynamic user-provided worker information flow...\n');

// 1. Simulate user signing in with a custom name at the start
const testUserName = 'Vikram Malhotra';
const testUserPhone = '+91 98111 22334';
const testUserEmail = 'vikram.malhotra@example.com';

const uid = 'usr_test_vikram_123';
AuthService.saveCachedUser({ id: uid, email: testUserEmail }, {
  id: uid,
  full_name: testUserName,
  phone: testUserPhone,
  email: testUserEmail,
  role: 'worker'
});

console.log('1. User profile created in AuthService with name:', testUserName);

// 2. Mock DOM environment
class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.innerHTML = '';
    this.attributes = {};
    this.classList = new Set();
    this.eventListeners = {};
    this.style = {};
  }
  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k]; }
  addEventListener(event, fn) {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(fn);
  }
  querySelector(sel) { return null; }
  querySelectorAll(sel) { return []; }
}

globalThis.document = {
  getElementById: (id) => null,
  createElement: (tag) => new MockElement(tag),
  body: {
    appendChild: (child) => {
      globalThis._lastAppendedModal = child;
    }
  }
};

// 3. Render WorkerFrontend
const container = new MockElement('div');
WorkerFrontend.render(container);

// Verify container HTML has the user's provided name
assert(container.innerHTML.includes(testUserName), `Worker dashboard must contain user's name "${testUserName}"`);
console.log('✔ PASS: Worker dashboard rendered with user-provided name:', testUserName);

// Verify current active worker in storage matches the user's name
const workers = StorageService.getWorkers();
const currentWorker = workers.find(w => w.id === StorageService.getSelectedWorkerId());
assert(currentWorker, 'Active worker must exist in StorageService');
assert.strictEqual(currentWorker.name, testUserName, `Worker name must be "${testUserName}", got "${currentWorker.name}"`);
assert.strictEqual(currentWorker.phone, testUserPhone, `Worker phone must be "${testUserPhone}", got "${currentWorker.phone}"`);
console.log('✔ PASS: StorageService active worker has name and phone provided at start');

// 4. Test showSetupModal
WorkerFrontend.showSetupModal(currentWorker, 1);
assert(globalThis._lastAppendedModal, 'Setup modal must be appended to body');
assert(globalThis._lastAppendedModal.innerHTML.includes(testUserName), `Setup modal must contain user's name "${testUserName}"`);
assert(globalThis._lastAppendedModal.innerHTML.includes(testUserPhone), `Setup modal must contain user's phone "${testUserPhone}"`);
console.log('✔ PASS: Setup pop-up window contains user-provided name and phone in inputs and headers');

console.log('\n======================================================');
console.log('ALL USER-PROVIDED INFORMATION TESTS PASSED (100%)');
console.log('======================================================');
