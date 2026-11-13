// LocalKaam - En-Route Transit Path Test Suite
// Pure math for the live-drive animation: the worker marker must follow the
// rendered route corner-by-corner, with sane behaviour at the edges.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  haversineDistance,
  cumulativePathDistances,
  positionAlongPath,
  ROUTE_TRANSIT_DEMO_MS,
  CustomerMap
} from '../customerMap.js';

test('haversineDistance: 1 degree of latitude is ~111.2 km, identical points are 0', () => {
  const d = haversineDistance(0, 0, 1, 0);
  assert.ok(d > 110000 && d < 112000, `expected ~111km, got ${d}`);
  assert.equal(haversineDistance(19.076, 72.8777, 19.076, 72.8777), 0);
});

test('cumulativePathDistances: starts at 0, monotonic, correct length', () => {
  const coords = [[19.076, 72.8777], [19.1136, 72.8258], [19.2, 72.85]];
  const cum = cumulativePathDistances(coords);
  assert.equal(cum.length, 3);
  assert.equal(cum[0], 0);
  assert.ok(cum[1] > 0, 'first segment positive');
  assert.ok(cum[2] > cum[1], 'monotonically increasing');
});

test('positionAlongPath: endpoints and midpoint of a straight path', () => {
  const a = [19.0, 72.8];
  const b = [19.1, 72.8]; // due north of a
  const path = [a, b];

  assert.deepEqual(positionAlongPath(path, 0), a, 'progress 0 is the origin');
  assert.deepEqual(positionAlongPath(path, 1), b, 'progress 1 is the destination');

  const mid = positionAlongPath(path, 0.5);
  assert.ok(Math.abs(mid[0] - 19.05) < 1e-9, `midpoint lat ~19.05, got ${mid[0]}`);
  assert.ok(Math.abs(mid[1] - 72.8) < 1e-9, 'midpoint lng unchanged');
});

test('positionAlongPath: L-shaped route turns the corner at the travelled-distance fraction', () => {
  // Two near-equal legs: north 1°, then east 1° (east leg is marginally
  // shorter because meridians converge, so "half" is not exactly the corner —
  // distance-along-path is the correct measure, not raw progress).
  const path = [[0, 0], [1, 0], [1, 1]];
  const cum = cumulativePathDistances(path);
  const legLen = cum[1];

  // The exact corner fraction: travelled distance = length of leg 1
  const cornerProgress = legLen / cum[2];
  const at = positionAlongPath(path, cornerProgress);
  assert.ok(Math.abs(at[0] - 1) < 1e-9, 'lat at corner');
  assert.ok(Math.abs(at[1] - 0) < 1e-9, 'lng at corner');

  // Half the route is within a hair of the corner (asymmetric legs)
  const halfway = positionAlongPath(path, 0.5);
  assert.ok(Math.abs(halfway[0] - 1) < 1e-3, 'lat within 0.1% of the corner');

  // progress 0.75 is partway along leg 2
  const onLeg2 = positionAlongPath(path, 0.75);
  assert.ok(Math.abs(onLeg2[0] - 1) < 1e-9, 'stays on leg-2 latitude');
  assert.ok(onLeg2[1] > 0 && onLeg2[1] < 1, 'partway along leg 2');
});

test('positionAlongPath: clamps out-of-range progress', () => {
  const path = [[19.0, 72.8], [19.1, 72.8]];
  assert.deepEqual(positionAlongPath(path, -5), path[0], 'negative progress clamps to origin');
  assert.deepEqual(positionAlongPath(path, 7), path[1], 'progress >1 clamps to destination');
});

test('positionAlongPath: degenerate paths never throw', () => {
  assert.equal(positionAlongPath([], 0.5), null, 'empty path → null');
  const single = [[19.07, 72.87]];
  assert.deepEqual(positionAlongPath(single, 0.3), single[0], 'single point returned as-is');

  // Zero-length path (all identical points) falls back to the last point
  const flat = [[19.07, 72.87], [19.07, 72.87], [19.07, 72.87]];
  assert.deepEqual(positionAlongPath(flat, 0.5), flat[2], 'zero-length path → last point');
});

test('demo transit duration is defined and stage-friendly (15-40s)', () => {
  assert.ok(ROUTE_TRANSIT_DEMO_MS >= 15000 && ROUTE_TRANSIT_DEMO_MS <= 40000,
    `got ${ROUTE_TRANSIT_DEMO_MS}ms`);
});

test('estimate helper: ~20 km Mumbai route is under an hour at city speed', () => {
  const coords = [[19.076, 72.8777], [19.1136, 72.8258]]; // ~5 km
  const mins = CustomerMap._estimateRouteMinutes(coords);
  assert.ok(mins >= 2 && mins < 40, `5km route should be 2-40min, got ${mins}`);
});
