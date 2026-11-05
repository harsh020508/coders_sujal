// test_worker_onboarding_flow.js
import { WorkerFrontend } from './worker.js';
import { StorageService } from './storage.js';
import { REQUIRED_VERIFICATION_DOCUMENTS, CATEGORIES } from './data.js';

console.log('Testing Worker Onboarding & Document Verification Flow...\n');

// 1. Initial State Check
console.log('1. Checking WorkerFrontend state...');
if (typeof WorkerFrontend.showSetupModal !== 'function') {
  console.error('FAILED: WorkerFrontend.showSetupModal is not a function');
  process.exit(1);
}
console.log('✔ PASS: WorkerFrontend.showSetupModal exists and is callable');

// 2. Mock DOM environment for rendering
class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.innerHTML = '';
    this.attributes = {};
    this.classList = new Set();
    this.eventListeners = {};
  }
  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k]; }
  addEventListener(event, fn) {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(fn);
  }
  querySelector(sel) {
    // Basic mock selector
    if (this.innerHTML.includes(sel.replace('#', 'id="').replace('.', 'class="'))) {
      return new MockElement();
    }
    return null;
  }
  querySelectorAll(sel) {
    return [];
  }
}

// 3. Check HTML structure of renderProfileView
console.log('\n2. Testing renderProfileView structure...');
const workers = StorageService.getWorkers();
const testWorker = workers[0];
const profileHtml = WorkerFrontend.renderProfileView(testWorker);

if (!profileHtml.includes('Step 1 of 2: Profile & Specialities')) {
  console.error('FAILED: Step 1 indicator not found in renderProfileView');
  process.exit(1);
}
console.log('✔ PASS: Profile view contains Step 1 banner');

if (!profileHtml.includes('id="save-and-goto-docs-btn"')) {
  console.error('FAILED: "Save & Continue to Manage Documents" button not found');
  process.exit(1);
}
console.log('✔ PASS: Profile view contains "Save & Continue to Manage Documents" button');

if (!profileHtml.includes('name="wp-speciality"')) {
  console.error('FAILED: Specialities category checkboxes not found');
  process.exit(1);
}
console.log('✔ PASS: Profile view contains specialities category checkboxes');

// 4. Check HTML structure of renderVerificationView
console.log('\n3. Testing renderVerificationView structure...');
const verifHtml = WorkerFrontend.renderVerificationView(testWorker);

if (!verifHtml.includes('Step 2 of 2: Manage Documents & Verification Process')) {
  console.error('FAILED: Step 2 indicator not found in renderVerificationView');
  process.exit(1);
}
console.log('✔ PASS: Verification view contains Step 2 banner');

if (!verifHtml.includes('id="back-to-profile-step-btn"')) {
  console.error('FAILED: Back to profile button not found in verification view');
  process.exit(1);
}
console.log('✔ PASS: Verification view contains back to profile button');

if (!verifHtml.includes('id="bottom-goto-overview-btn"')) {
  console.error('FAILED: "Enter Dashboard Overview" button not found');
  process.exit(1);
}
console.log('✔ PASS: Verification view contains "Enter Dashboard Overview" button');

import { esc } from './utils.js';

// 5. Check all 4 required documents
REQUIRED_VERIFICATION_DOCUMENTS.forEach(docMeta => {
  if (!verifHtml.includes(esc(docMeta.title))) {
    console.error(`FAILED: Required document '${docMeta.title}' not found in verification view`);
    process.exit(1);
  }
});
console.log('✔ PASS: All 4 required verification documents are present in Manage Documents view');

// 6. Test full container render HTML structure for sidebar
console.log('\n4. Testing Worker Dashboard layout and sidebar tabs...');
const mockContainer = {
  innerHTML: '',
  querySelector: () => null,
  querySelectorAll: () => []
};

WorkerFrontend.activeView = 'profile';
WorkerFrontend.render(mockContainer);

if (!mockContainer.innerHTML.includes('data-view="profile"')) {
  console.error('FAILED: Profile sidebar tab not found');
  process.exit(1);
}
if (!mockContainer.innerHTML.includes('data-view="manage-documents"')) {
  console.error('FAILED: Manage Documents sidebar tab not found');
  process.exit(1);
}
if (!mockContainer.innerHTML.includes('id="select-worker-manage-docs-btn"')) {
  console.error('FAILED: Manage documents quick box in sidebar not found');
  process.exit(1);
}

// Check sidebar item order: profile should appear before overview
const profileIdx = mockContainer.innerHTML.indexOf('data-view="profile"');
const docsIdx = mockContainer.innerHTML.indexOf('data-view="manage-documents"');
const overviewIdx = mockContainer.innerHTML.indexOf('data-view="overview"');

if (profileIdx === -1 || docsIdx === -1 || overviewIdx === -1) {
  console.error('FAILED: Could not find tab indexes');
  process.exit(1);
}

if (!(profileIdx < docsIdx && docsIdx < overviewIdx)) {
  console.error(`FAILED: Incorrect tab order! profile: ${profileIdx}, docs: ${docsIdx}, overview: ${overviewIdx}`);
  process.exit(1);
}
console.log('✔ PASS: Sidebar correctly places Profile & Specialities and Manage Documents right above Overview');

// 7. Testing showSetupModal DOM generation in mock browser environment
console.log('\n5. Testing showSetupModal modal popup window...');
globalThis.document = {
  getElementById: (id) => null,
  createElement: (tag) => {
    const el = new MockElement(tag);
    el.style = {};
    return el;
  },
  body: {
    appendChild: (child) => {
      globalThis._lastAppendedModal = child;
    }
  }
};

WorkerFrontend.showSetupModal(testWorker, 1);
if (!globalThis._lastAppendedModal || !globalThis._lastAppendedModal.innerHTML.includes('Worker Profile & Document Verification')) {
  console.error('FAILED: Setup modal popup did not render expected title header');
  process.exit(1);
}
console.log('✔ PASS: showSetupModal renders modal popup window with title');

if (!globalThis._lastAppendedModal.innerHTML.includes('id="modal-tab-step1"') || !globalThis._lastAppendedModal.innerHTML.includes('id="modal-tab-step2"')) {
  console.error('FAILED: Stepper tabs Step 1 and Step 2 not found in modal');
  process.exit(1);
}
console.log('✔ PASS: Modal contains Step 1 and Step 2 navigation tabs');

// Test Step 2 direct open
WorkerFrontend.showSetupModal(testWorker, 2);
if (!globalThis._lastAppendedModal.innerHTML.includes('Mandatory') && !globalThis._lastAppendedModal.innerHTML.includes('Uploaded')) {
  console.error('FAILED: Step 2 in setup modal did not render verification documents');
  process.exit(1);
}
console.log('✔ PASS: showSetupModal Step 2 renders verification document cards');

console.log('\n======================================================');
console.log('ALL WORKER ONBOARDING & VERIFICATION TESTS PASSED (100%)');
console.log('======================================================');
