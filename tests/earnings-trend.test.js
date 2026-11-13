// LocalKaam - 30-Day Earnings Trend Test Suite
// Covers the date-bucketing math and the static SVG sparkline builder.

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDailyEarningsBuckets, buildEarningsSparklineSVG } from '../worker_new_features.js';

const NOW = new Date(2026, 10, 13, 18, 0, 0); // Fri 13 Nov 2026, fixed for determinism

test('buildDailyEarningsBuckets: creates exactly N date-accurate buckets ending today', () => {
  const buckets = buildDailyEarningsBuckets([], 30, NOW);
  assert.equal(buckets.length, 30);
  const first = buckets[0].date;
  const last = buckets[29].date;
  assert.equal(first.getTime(), new Date(2026, 9, 15).getTime(), 'starts 30 days back (15 Oct)');
  assert.equal(last.getTime(), new Date(2026, 10, 13).getTime(), 'ends today at midnight (13 Nov)');
  assert.equal(buckets[29].label, '13 Nov');
});

test('buildDailyEarningsBuckets: jobs land in the right day bucket', () => {
  const jobs = [
    { id: 'j1', agreedPrice: 500, completedAt: new Date(2026, 10, 13, 9, 30).toISOString() },  // today
    { id: 'j2', agreedPrice: 300, completedAt: new Date(2026, 10, 13, 15, 0).toISOString() },  // today
    { id: 'j3', agreedPrice: 700, completedAt: new Date(2026, 10, 11, 12, 0).toISOString() },  // 2 days ago
    { id: 'j4', agreedPrice: 999, completedAt: new Date(2026, 9, 1).toISOString() }            // outside window
  ];
  const buckets = buildDailyEarningsBuckets(jobs, 30, NOW);
  const today = buckets[29];
  const twoDaysAgo = buckets[27];

  assert.equal(today.total, 800, 'today sums 500 + 300');
  assert.equal(today.count, 2);
  assert.equal(twoDaysAgo.total, 700);
  assert.equal(twoDaysAgo.count, 1);
  const windowTotal = buckets.reduce((a, b) => a + b.total, 0);
  assert.equal(windowTotal, 1500, 'the out-of-window job is excluded');
});

test('buildDailyEarningsBuckets: falls back to createdAt and skips invalid dates', () => {
  const jobs = [
    { id: 'j1', agreedPrice: 250, createdAt: new Date(2026, 10, 12).toISOString() }, // no completedAt
    { id: 'j2', agreedPrice: 400, completedAt: 'not-a-date' },
    { id: 'j3', agreedPrice: 100 }
  ];
  const buckets = buildDailyEarningsBuckets(jobs, 7, NOW);
  assert.equal(buckets[5].total, 250, 'createdAt fallback bucketed');
  const windowTotal = buckets.reduce((a, b) => a + b.total, 0);
  assert.equal(windowTotal, 250, 'invalid/missing dates ignored without throwing');
});

test('buildDailyEarningsBuckets: clamps N to a sane range', () => {
  assert.equal(buildDailyEarningsBuckets([], 0, NOW).length, 1);
  assert.equal(buildDailyEarningsBuckets([], -5, NOW).length, 1);
  assert.equal(buildDailyEarningsBuckets([], 500, NOW).length, 120);
  assert.equal(buildDailyEarningsBuckets([], 'abc', NOW).length, 30);
});

test('buildEarningsSparklineSVG: renders a static accessible chart (no SMIL animation)', () => {
  const jobs = [
    { agreedPrice: 500, completedAt: new Date(2026, 10, 13).toISOString() },
    { agreedPrice: 800, completedAt: new Date(2026, 10, 5).toISOString() }
  ];
  const buckets = buildDailyEarningsBuckets(jobs, 14, NOW);
  const svg = buildEarningsSparklineSVG(buckets);

  assert.match(svg, /<svg/, 'is an SVG');
  assert.match(svg, /viewBox="0 0 520 200"/, 'default viewBox');
  assert.match(svg, /<polyline/, 'trend line present');
  assert.match(svg, /aria-label="[^"]*₹1300[^"]*"/, 'aria-label carries the total');
  assert.match(svg, /aria-label="[^"]*2 active days[^"]*"/, 'aria-label carries active-day count');
  assert.doesNotMatch(svg, /<animate/, 'static SVG: no SMIL animations (reduced-motion safe)');
  assert.match(svg, /<circle/, 'data-point dots rendered');
  assert.match(svg, /13 Nov: ₹500/, 'title tooltip for today');
});

test('buildEarningsSparklineSVG: empty trend renders a friendly placeholder', () => {
  const buckets = buildDailyEarningsBuckets([], 30, NOW);
  const svg = buildEarningsSparklineSVG(buckets);
  assert.match(svg, /No completed jobs in the last 30 days/, 'placeholder message');
  assert.doesNotMatch(svg, /<polyline/, 'no trend line without data');
});

test('buildEarningsSparklineSVG: non-array input degrades to empty state, never throws', () => {
  const svg = buildEarningsSparklineSVG(null);
  assert.match(svg, /<svg/, 'still valid SVG');
  assert.match(svg, /No completed jobs/, 'empty state');
});
