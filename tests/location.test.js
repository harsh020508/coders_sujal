// Service Location type-ahead: suggestions are only cities with available
// workers, unknown cities match nothing, and a worker out of radius is
// correctly reported as not available in the customer's city.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MatchingService } from '../matching.js';
import { INITIAL_WORKERS, LOCALITIES } from '../data.js';

test('1. Typing a city name matches its locality', () => {
  assert.equal(MatchingService.findLocalityByName('Andheri West')?.id, 'andheri');
  assert.equal(MatchingService.findLocalityByName('andheri')?.id, 'andheri');
  assert.equal(MatchingService.findLocalityByName('bandra')?.id, 'bandra');
  assert.equal(MatchingService.findLocalityByName('THANE')?.id, 'thane');
});

test('2. Unknown cities match nothing (popup path)', () => {
  assert.equal(MatchingService.findLocalityByName('Delhi'), null);
  assert.equal(MatchingService.findLocalityByName('Goa'), null);
  assert.equal(MatchingService.findLocalityByName(''), null);
  assert.equal(MatchingService.findLocalityByName('ab'), null);
});

test('3. Available localities only include cities with online workers', () => {
  const available = MatchingService.getAvailableLocalities(INITIAL_WORKERS);
  assert.ok(available.length > 0);
  for (const l of available) assert.ok(l.workerCount > 0, `${l.id} has workers`);
  // If every worker in a city goes offline/paused, it drops out
  const allOffline = INITIAL_WORKERS.map(w => ({ ...w, available: w.baseLocality === 'colaba' ? false : w.available }));
  assert.equal(MatchingService.getAvailableLocalities(allOffline).some(l => l.id === 'colaba'), false);
});

test('4. Far-away worker is not available in the customer city', () => {
  const thaneWorker = INITIAL_WORKERS.find(w => w.baseLocality === 'thane' && w.serviceRadius <= 10);
  assert.ok(thaneWorker, 'need a short-radius Thane worker for this test');
  // Colaba is ~28 km from Thane — outside a 10 km radius
  assert.equal(MatchingService.isWorkerAvailableIn(thaneWorker, 'colaba'), false);
  // …but Thane itself is served (Powai is ~13 km away, also outside 10 km)
  assert.equal(MatchingService.isWorkerAvailableIn(thaneWorker, 'thane'), true);
  assert.equal(MatchingService.isWorkerAvailableIn(thaneWorker, 'powai'), false);
});

test('5. Offline workers are never available anywhere', () => {
  const offline = { ...INITIAL_WORKERS[0], available: false };
  assert.equal(MatchingService.isWorkerAvailableIn(offline, offline.baseLocality), false);
});
