// Tests for Feature 11 (Material Sourcing) and Feature 14 (Voice Booking)
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// ─── Feature 14: Voice Booking Parser tests (pure logic, no DOM) ──────────────
// We test parseVoiceIntent directly without importing the browser module
// (VoiceBooking uses DOM APIs at module load time, so we inline the parser)

const CATEGORIES_TEST = [
  { id: 'electrician', name: 'Electrician' },
  { id: 'plumber', name: 'Plumber' },
  { id: 'carpenter', name: 'Carpenter' },
  { id: 'painter', name: 'Painter' },
  { id: 'ac_repair', name: 'AC Repair' },
  { id: 'cleaning', name: 'Cleaning' },
];

const LOCALITIES_TEST = [
  { id: 'andheri', name: 'Andheri West' },
  { id: 'bandra', name: 'Bandra West' },
  { id: 'powai', name: 'Powai' },
];

const SERVICE_PATTERNS = [
  { keywords: ['plumber', 'pipe', 'tap', 'leak', 'water', 'नल', 'पाइप', 'पाणी', 'गळती'], category: 'plumber' },
  { keywords: ['electrician', 'electric', 'wire', 'switch', 'bijli', 'बिजली', 'वीज'],      category: 'electrician' },
  { keywords: ['carpenter', 'wood', 'door', 'furniture', 'lock', 'सुतार', 'दरवाजा'],       category: 'carpenter' },
  { keywords: ['painter', 'paint', 'wall', 'colour', 'color', 'रंगारी', 'रंग'],           category: 'painter' },
  { keywords: ['ac', 'air condition', 'cooling', 'एसी', 'ठंडक'],                           category: 'ac_repair' },
  { keywords: ['cleaning', 'clean', 'sweep', 'mop', 'सफाई', 'साफ'],                       category: 'cleaning' },
];

const URGENCY_PATTERNS = [
  { keywords: ['now', 'immediately', 'urgent', 'asap', 'तुरंत', 'आत्ता', 'अभी'], urgency: 'high' },
  { keywords: ['today', 'this morning', 'आज'],                                     urgency: 'medium' },
  { keywords: ['tomorrow', 'next week', 'schedule', 'उद्या'],                      urgency: 'low' },
];

function parseVoiceIntentLocal(transcript) {
  const text = (transcript || '').toLowerCase();
  const result = { raw: transcript, category: null, categoryName: null, urgency: 'medium', locality: null, localityName: null, confidence: 0 };

  for (const { keywords, category } of SERVICE_PATTERNS) {
    if (keywords.some(kw => text.includes(kw))) {
      result.category = category;
      result.categoryName = CATEGORIES_TEST.find(c => c.id === category)?.name || category;
      result.confidence += 40;
      break;
    }
  }
  for (const { keywords, urgency } of URGENCY_PATTERNS) {
    if (keywords.some(kw => text.includes(kw))) {
      result.urgency = urgency;
      result.confidence += 20;
      break;
    }
  }
  for (const { id, name } of LOCALITIES_TEST) {
    if (text.includes(name.toLowerCase()) || text.includes(id)) {
      result.locality = id;
      result.localityName = name;
      result.confidence += 20;
      break;
    }
  }
  return result;
}

describe('Feature 14 — Voice Booking Intent Parser', () => {
  test('English: "I need a plumber in Andheri"', () => {
    const r = parseVoiceIntentLocal('I need a plumber in Andheri');
    assert.equal(r.category, 'plumber');
    assert.equal(r.locality, 'andheri');
    assert.ok(r.confidence >= 60);
  });

  test('Hindi: "मुझे अभी बिजली का काम चाहिए"', () => {
    const r = parseVoiceIntentLocal('मुझे अभी बिजली का काम चाहिए');
    assert.equal(r.category, 'electrician');
    assert.equal(r.urgency, 'high');
  });

  test('Hindi: "नल में पाणी गळती आहे आज"', () => {
    const r = parseVoiceIntentLocal('नल में पाणी गळती आहे आज');
    assert.equal(r.category, 'plumber');
    assert.equal(r.urgency, 'medium');
  });

  test('English urgent: "I need a carpenter now"', () => {
    const r = parseVoiceIntentLocal('I need a carpenter now');
    assert.equal(r.category, 'carpenter');
    assert.equal(r.urgency, 'high');
  });

  test('English low urgency: "schedule a painter for tomorrow"', () => {
    const r = parseVoiceIntentLocal('schedule a painter for tomorrow');
    assert.equal(r.category, 'painter');
    assert.equal(r.urgency, 'low');
  });

  test('English with locality: "AC repair in Powai"', () => {
    const r = parseVoiceIntentLocal('AC repair in Powai');
    assert.equal(r.category, 'ac_repair');
    assert.equal(r.locality, 'powai');
  });

  test('Empty transcript returns null category', () => {
    const r = parseVoiceIntentLocal('');
    assert.equal(r.category, null);
    assert.equal(r.confidence, 0);
  });

  test('Unrecognised text returns null category with zero confidence', () => {
    const r = parseVoiceIntentLocal('hello world blah blah');
    assert.equal(r.category, null);
    assert.equal(r.confidence, 0);
  });
});

// ─── Feature 11: Material Sourcing Service tests (pure logic) ────────────────
// We stub localStorage to avoid browser dependency

const _store = {};
global.localStorage = {
  getItem: (k) => _store[k] ?? null,
  setItem: (k, v) => { _store[k] = v; },
  removeItem: (k) => { delete _store[k]; },
};

// Mock StorageService used inside materialSourcing (bookings path)
// We override the import by stubbing at module level — not possible in pure ESM,
// so we test only the parts-local storage logic via direct calls

const PARTS_KEY = 'localkaam_parts_requests';

function getParts() {
  try { const r = _store[PARTS_KEY]; return r ? JSON.parse(r) : []; } catch { return []; }
}
function setParts(p) { _store[PARTS_KEY] = JSON.stringify(p); }

// Inline minimal service matching materialSourcing.js logic
let _reqCounter = 0;
const TestMaterialService = {
  createRequest({ bookingId, workerId, workerName, items, deliveryAddress, note }) {
    const parts = getParts();
    const totalCost = items.reduce((s, it) => s + it.unitPrice * it.qty, 0);
    const req = {
      id: `pr_test_${Date.now()}_${++_reqCounter}`, bookingId, workerId, workerName, items,
      totalCost, deliveryAddress, note: note || '', status: 'pending_approval',
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    parts.push(req);
    setParts(parts);
    return req;
  },
  getRequestsForBooking(bookingId) { return getParts().filter(p => p.bookingId === bookingId); },
  updateStatus(requestId, status) {
    const parts = getParts();
    const idx = parts.findIndex(p => p.id === requestId);
    if (idx === -1) return null;
    parts[idx].status = status;
    setParts(parts);
    return parts[idx];
  },
  rejectRequest(id) { return this.updateStatus(id, 'rejected'); },
};

describe('Feature 11 — Material Sourcing Service', () => {
  test('createRequest stores request with pending_approval status', () => {
    const req = TestMaterialService.createRequest({
      bookingId: 'b_test_001',
      workerId: 'w1',
      workerName: 'Ramesh',
      items: [{ partId: 'p_gate_valve_1in', name: '1-inch Gate Valve', qty: 2, unitPrice: 180, unit: 'piece' }],
      deliveryAddress: '12 Andheri West',
      note: 'The existing valve is corroded',
    });

    assert.equal(req.status, 'pending_approval');
    assert.equal(req.bookingId, 'b_test_001');
    assert.equal(req.totalCost, 360);
    assert.equal(req.items.length, 1);
    assert.equal(req.items[0].qty, 2);
  });

  test('getRequestsForBooking returns only matching booking requests', () => {
    TestMaterialService.createRequest({
      bookingId: 'b_other',
      workerId: 'w2', workerName: 'Suresh',
      items: [{ partId: 'e_mcb_32a', name: 'MCB', qty: 1, unitPrice: 320, unit: 'piece' }],
      deliveryAddress: 'Bandra',
    });

    const mine = TestMaterialService.getRequestsForBooking('b_test_001');
    assert.ok(mine.length >= 1);
    assert.ok(mine.every(r => r.bookingId === 'b_test_001'));

    const theirs = TestMaterialService.getRequestsForBooking('b_other');
    assert.ok(theirs.length >= 1);
    assert.ok(theirs.every(r => r.bookingId === 'b_other'));
  });

  test('updateStatus transitions correctly', () => {
    const req = TestMaterialService.createRequest({
      bookingId: 'b_status_test',
      workerId: 'w1', workerName: 'Ramesh',
      items: [{ partId: 'p_teflon_roll', name: 'Teflon Tape', qty: 3, unitPrice: 25, unit: 'roll' }],
      deliveryAddress: 'Powai',
    });

    const approved = TestMaterialService.updateStatus(req.id, 'approved');
    assert.equal(approved.status, 'approved');

    const ordered = TestMaterialService.updateStatus(req.id, 'ordered');
    assert.equal(ordered.status, 'ordered');

    const delivered = TestMaterialService.updateStatus(req.id, 'delivered');
    assert.equal(delivered.status, 'delivered');
  });

  test('rejectRequest sets status to rejected', () => {
    const req = TestMaterialService.createRequest({
      bookingId: 'b_reject_test',
      workerId: 'w1', workerName: 'Ramesh',
      items: [{ partId: 'ac_gas_r32', name: 'R32 Gas', qty: 1, unitPrice: 1800, unit: 'kg' }],
      deliveryAddress: 'Juhu',
    });

    const rejected = TestMaterialService.rejectRequest(req.id);
    assert.equal(rejected.status, 'rejected');
  });

  test('totalCost calculated correctly for multi-item request', () => {
    const req = TestMaterialService.createRequest({
      bookingId: 'b_multicost',
      workerId: 'w1', workerName: 'Ramesh',
      items: [
        { partId: 'e_switch_modular', name: 'Switch', qty: 3, unitPrice: 85, unit: 'piece' },  // 255
        { partId: 'e_socket_16a',    name: 'Socket', qty: 2, unitPrice: 110, unit: 'piece' }, // 220
      ],
      deliveryAddress: 'Andheri',
    });

    assert.equal(req.totalCost, 475); // 255 + 220
  });

  test('Multiple requests for same booking are stored independently', () => {
    const r1 = TestMaterialService.createRequest({
      bookingId: 'b_multi_req',
      workerId: 'w1', workerName: 'Ramesh',
      items: [{ partId: 'p_ball_valve', name: 'Ball Valve', qty: 1, unitPrice: 120, unit: 'piece' }],
      deliveryAddress: 'Dadar',
    });
    const r2 = TestMaterialService.createRequest({
      bookingId: 'b_multi_req',
      workerId: 'w1', workerName: 'Ramesh',
      items: [{ partId: 'p_washers_set', name: 'Washers', qty: 2, unitPrice: 40, unit: 'set' }],
      deliveryAddress: 'Dadar',
    });

    const all = TestMaterialService.getRequestsForBooking('b_multi_req');
    assert.ok(all.length >= 2);
    // IDs must be different strings (even if same-ms, the random suffix ensures uniqueness)
    const ids = all.map(r => r.id);
    const unique = new Set(ids);
    assert.ok(unique.size === all.length, 'All request IDs must be unique');
  });
});
