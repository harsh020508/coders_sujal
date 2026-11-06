// Map sanity: every worker must have valid Mumbai coordinates so Leaflet
// can place a marker, and the distance math must be sane.
import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_WORKERS } from '../data.js';
import { CustomerMap, getCategoryStyle, DEMO_CITY_CENTER } from '../customerMap.js';

test('1. Every worker has valid coordinates inside Mumbai bounds', () => {
  assert.ok(INITIAL_WORKERS.length > 0);
  for (const w of INITIAL_WORKERS) {
    assert.ok(Number.isFinite(w.lat) && w.lat >= 18.8 && w.lat <= 19.4, `${w.id} lat ${w.lat}`);
    assert.ok(Number.isFinite(w.lng) && w.lng >= 72.7 && w.lng <= 73.3, `${w.id} lng ${w.lng}`);
  }
});

test('2. Haversine distance: demo centre to Andheri is ~5 km, to itself is 0', () => {
  const andheri = { lat: 19.1136, lng: 72.8258 };
  const d = CustomerMap.haversine(DEMO_CITY_CENTER.lat, DEMO_CITY_CENTER.lng, andheri.lat, andheri.lng);
  assert.ok(d > 4 && d < 7, `expected ~5km, got ${d}`);
  assert.equal(CustomerMap.haversine(DEMO_CITY_CENTER.lat, DEMO_CITY_CENTER.lng, DEMO_CITY_CENTER.lat, DEMO_CITY_CENTER.lng), 0);
});

test('3. Category styles exist for every service the map filter offers', () => {
  for (const cat of ['plumber', 'electrician', 'carpenter', 'painter', 'cleaner', 'appliance_repair']) {
    const style = getCategoryStyle(cat);
    assert.ok(style.color, `${cat} has a colour`);
    assert.ok(style.icon, `${cat} has an icon`);
  }
  assert.equal(getCategoryStyle('unknown_cat'), getCategoryStyle('default'));
});

test('4. Most workers are online so the map is not empty by default', () => {
  const online = INITIAL_WORKERS.filter(w => w.available && !w.pauseNewBookings);
  assert.ok(online.length >= 10, `only ${online.length} online workers`);
});
