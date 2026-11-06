import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('styles.css contains mobile responsive overrides for AI diagnosis and cards', () => {
  const css = fs.readFileSync(path.join(__dirname, '../styles.css'), 'utf8');

  // Photo diagnosis mobile responsiveness
  assert.ok(css.includes('.photo-preview-grid'), 'styles.css should have .photo-preview-grid');
  assert.ok(css.includes('.diagnosis-actions-wrap'), 'styles.css should have .diagnosis-actions-wrap');
  assert.ok(css.includes('.photo-dropzone-actions'), 'styles.css should have .photo-dropzone-actions');

  // Quick action cards mobile stack
  assert.ok(css.includes('.quick-action-card'), 'styles.css should have .quick-action-card');

  // Worker card footers mobile stack
  assert.ok(css.includes('.ui-worker__foot'), 'styles.css should have .ui-worker__foot');
});

test('photoDiagnosis.js uses fluid responsive layout without hardcoded inline grid columns', () => {
  const js = fs.readFileSync(path.join(__dirname, '../photoDiagnosis.js'), 'utf8');

  // Must not force fixed 280px 1fr grid inline
  assert.equal(
    js.includes('grid-template-columns: 280px 1fr;'),
    false,
    'photoDiagnosis.js should not force inline 280px 1fr grid overriding mobile CSS'
  );

  // Must include fluid clamp padding and diagnosis-actions-wrap
  assert.ok(js.includes('clamp(12px,'), 'photoDiagnosis.js should use clamp padding for mobile viewports');
  assert.ok(js.includes('diagnosis-actions-wrap'), 'photoDiagnosis.js should use diagnosis-actions-wrap class');
  assert.ok(js.includes('photo-dropzone-actions'), 'photoDiagnosis.js should use photo-dropzone-actions class');
});

test('landing-premium.css maintains compact 2-column grid on mobile viewports', () => {
  const css = fs.readFileSync(path.join(__dirname, '../landing-premium.css'), 'utf8');

  assert.ok(
    css.includes('.lk-services-grid') && css.includes('repeat(2, 1fr)'),
    'landing-premium.css should support 2-column mobile services grid'
  );
  assert.ok(
    css.includes('max-width: 330px'),
    'landing-premium.css should only fall back to 1-column on extreme narrow viewports <= 330px'
  );
});

test('customer.js protects attached AI diagnosis preview against mobile overflow', () => {
  const js = fs.readFileSync(path.join(__dirname, '../customer.js'), 'utf8');

  assert.ok(
    js.includes('word-break: break-word'),
    'customer.js should use word-break: break-word for AI diagnosis issue titles'
  );
  assert.ok(
    js.includes('minmax(min(100%, 260px), 1fr)'),
    'customer.js should use fluid minmax for quick action cards'
  );
});
