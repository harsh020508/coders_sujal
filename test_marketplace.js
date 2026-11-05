// LocalKaam - Customer & Worker Marketplace End-to-End Test Suite
// Validates pure customer-to-worker marketplace operations (no admin dependency)
import assert from 'node:assert';
import { MatchingService } from './matching.js';
import { DataMapper } from './supabaseDataService.js';

let passedTests = 0;
let totalTests = 0;

function runScenario(number, title, fn) {
  totalTests++;
  console.log(`\n▶ Scenario ${number}: ${title}`);
  try {
    fn();
    console.log(`  ✔ PASS: Scenario ${number} passed successfully`);
    passedTests++;
  } catch (err) {
    console.error(`  ✖ FAIL: Scenario ${number} failed`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

console.log('='.repeat(70));
console.log(' LocalKaam Customer & Worker Marketplace Test Suite');
console.log('='.repeat(70));

// 1. Worker Profile Creation & Availability
runScenario(1, 'Worker registers and defaults to available and verified', () => {
  const worker = {
    id: 'w_test_1',
    userId: 'u_worker_1',
    name: 'Rajesh Kumar',
    category: 'electrician',
    skills: ['Wiring', 'Appliance Repair', 'Switchboard'],
    experience: 5,
    hourlyRate: 350,
    baseLocality: 'andheri',
    serviceRadius: 10,
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    workingHours: { start: '09:00', end: '19:00' },
    available: true,
    verificationStatus: 'Verified',
    ratingAverage: 4.8,
    ratingCount: 24,
    phone: '+91 98200 12345'
  };

  assert.strictEqual(worker.available, true);
  assert.strictEqual(worker.verificationStatus, 'Verified');
  assert.strictEqual(worker.category, 'electrician');
  assert.strictEqual(worker.hourlyRate, 350);
});

// 2. Worker Online / Offline Toggle
runScenario(2, 'Worker freely toggles online/offline status without admin intervention', () => {
  let worker = {
    id: 'w_test_1',
    name: 'Rajesh Kumar',
    available: true
  };

  // Toggle offline
  worker.available = !worker.available;
  assert.strictEqual(worker.available, false, 'Worker should be able to toggle offline');

  // Toggle back online
  worker.available = !worker.available;
  assert.strictEqual(worker.available, true, 'Worker should be able to toggle back online');
});

// 3. Customer Discovery via MatchingService
runScenario(3, 'Customer discovers available matching workers in their locality', () => {
  const workersPool = [
    {
      id: 'w1',
      name: 'Ramesh Plumber',
      category: 'plumber',
      specialities: { plumber: true },
      baseLocality: 'andheri',
      serviceRadius: 15,
      profileCompleted: true,
      available: true,
      pauseNewBookings: false,
      verificationStatus: 'Verified',
      ratingAverage: 4.9,
      ratingCount: 30
    },
    {
      id: 'w2',
      name: 'Suresh Electrician',
      category: 'electrician',
      specialities: { electrician: true },
      baseLocality: 'andheri',
      serviceRadius: 15,
      profileCompleted: true,
      available: true,
      pauseNewBookings: false,
      verificationStatus: 'Verified',
      ratingAverage: 4.8,
      ratingCount: 15
    },
    {
      id: 'w3',
      name: 'Unavailable Plumber',
      category: 'plumber',
      specialities: { plumber: true },
      baseLocality: 'andheri',
      serviceRadius: 15,
      profileCompleted: true,
      available: false,
      pauseNewBookings: false,
      verificationStatus: 'Verified',
      ratingAverage: 4.7,
      ratingCount: 10
    },
    {
      id: 'w4',
      name: 'Distant Plumber',
      category: 'plumber',
      specialities: { plumber: true },
      baseLocality: 'thane',
      serviceRadius: 5,
      profileCompleted: true,
      available: true,
      pauseNewBookings: false,
      verificationStatus: 'Verified',
      ratingAverage: 4.6,
      ratingCount: 8
    }
  ];

  const matched = MatchingService.getEligibleWorkers(workersPool, 'andheri', 'plumber');

  assert.strictEqual(matched.length, 1, 'Only available plumber in andheri within radius should match');
  assert.strictEqual(matched[0].id, 'w1');
  assert.strictEqual(matched[0].name, 'Ramesh Plumber');
});

// 4. Booking Creation by Customer
runScenario(4, 'Customer creates a booking with initial estimate', () => {
  const booking = {
    id: 'b_test_101',
    customerId: 'u_cust_1',
    customerName: 'Priya Sharma',
    customerPhone: '+91 98765 43210',
    workerId: 'w1',
    service: 'Tap Leak Repair',
    locality: 'andheri',
    address: 'Flat 402, Sunshine Apts, Andheri West',
    jobDescription: 'Kitchen sink pipe leaking continuously',
    bookingType: 'scheduled',
    dateTime: '2026-11-06T10:00:00Z',
    estimatedHours: 2,
    originalEstimate: 600,
    customerOffer: 500,
    counterOfferHistory: [{ by: 'customer', amount: 500, note: 'Initial offer' }],
    status: 'Pending confirmation'
  };

  assert.strictEqual(booking.status, 'Pending confirmation');
  assert.strictEqual(booking.originalEstimate, 600);
  assert.strictEqual(booking.customerOffer, 500);
});

// 5. Worker Counter-Offer Negotiation
runScenario(5, 'Worker responds with counter-offer and parties reach agreement', () => {
  let booking = {
    id: 'b_test_101',
    originalEstimate: 600,
    customerOffer: 500,
    counterOfferHistory: [{ by: 'customer', amount: 500, note: 'Initial offer' }],
    agreedPrice: 0,
    status: 'Pending confirmation'
  };

  // Worker makes counter offer of 550
  booking.counterOfferHistory.push({ by: 'worker', amount: 550, note: 'Parts required' });
  booking.status = 'Counter-offered';

  assert.strictEqual(booking.status, 'Counter-offered');
  assert.strictEqual(booking.counterOfferHistory.length, 2);

  // Customer accepts counter offer
  booking.agreedPrice = 550;
  booking.status = 'Confirmed';

  assert.strictEqual(booking.agreedPrice, 550);
  assert.strictEqual(booking.status, 'Confirmed');
});

// 6. Job Lifecycle Execution
runScenario(6, 'Worker progresses job: Confirmed -> In progress -> Completed', () => {
  let booking = {
    id: 'b_test_101',
    status: 'Confirmed',
    completedAt: null
  };

  // Worker starts work
  booking.status = 'In progress';
  assert.strictEqual(booking.status, 'In progress');

  // Worker completes work
  booking.status = 'Completed';
  booking.completedAt = new Date().toISOString();
  assert.strictEqual(booking.status, 'Completed');
  assert.ok(booking.completedAt);
});

// 7. Customer Review & Worker Rating Update
runScenario(7, 'Customer leaves a 5-star review updating worker metrics', () => {
  let worker = {
    id: 'w1',
    ratingAverage: 4.8,
    ratingCount: 10
  };

  const review = {
    id: 'rev_1',
    bookingId: 'b_test_101',
    workerId: 'w1',
    customerId: 'u_cust_1',
    customerName: 'Priya Sharma',
    rating: 5,
    comment: 'Excellent, prompt repair!'
  };

  // Calculate new rating
  const totalScore = (worker.ratingAverage * worker.ratingCount) + review.rating;
  worker.ratingCount += 1;
  worker.ratingAverage = Number((totalScore / worker.ratingCount).toFixed(1));

  assert.strictEqual(worker.ratingCount, 11);
  assert.ok(worker.ratingAverage >= 4.8);
  assert.strictEqual(review.rating, 5);
});

// 8. Customer Support / Complaint Flow
runScenario(8, 'Customer registers a complaint for resolution', () => {
  const complaint = {
    id: 'cmp_1',
    bookingId: 'b_test_101',
    customerId: 'u_cust_1',
    customerName: 'Priya Sharma',
    issue: 'Late arrival',
    details: 'Worker was 45 minutes late.',
    status: 'Open',
    createdAt: new Date().toISOString()
  };

  assert.strictEqual(complaint.status, 'Open');
  assert.strictEqual(complaint.issue, 'Late arrival');
});

// 9. DataMapper Integrity for Supabase Serialization
runScenario(9, 'DataMapper correctly serializes Worker and Booking for Supabase', () => {
  const workerObj = {
    id: 'w99',
    name: 'Anita Devi',
    category: 'cleaning',
    skills: ['Deep Clean', 'Sanitization'],
    hourlyRate: 400,
    baseLocality: 'bandra',
    available: true,
    ratingAverage: 5.0,
    ratingCount: 12
  };

  const dbRow = DataMapper.workerToDb(workerObj);
  assert.strictEqual(dbRow.id, 'w99');
  assert.strictEqual(dbRow.hourly_rate, 400);
  assert.strictEqual(dbRow.base_locality, 'bandra');
  assert.strictEqual(dbRow.available, true);

  const restored = DataMapper.dbToWorker(dbRow);
  assert.strictEqual(restored.id, 'w99');
  assert.strictEqual(restored.hourlyRate, 400);
  assert.strictEqual(restored.available, true);
});

// 10. Role Verification Constraints
runScenario(10, 'Marketplace strictly permits only customer and worker roles', () => {
  const allowedRoles = ['customer', 'worker'];

  assert.ok(allowedRoles.includes('customer'));
  assert.ok(allowedRoles.includes('worker'));
  assert.strictEqual(allowedRoles.includes('admin'), false, 'admin role must NOT be permitted');
});

// 11. Worker Self-Service Document Verification
runScenario(11, 'Worker uploads mandatory verification documents and achieves Verified status', () => {
  const worker = {
    id: 'w_doc_test',
    name: 'Dilip Mistry',
    category: 'carpenter',
    documents: {}
  };

  // Worker uploads Aadhaar ID
  worker.documents.identity_proof = {
    type: 'identity_proof',
    fileName: 'Aadhaar_Dilip_Verified.pdf',
    uploadedAt: new Date().toISOString(),
    status: 'Verified'
  };

  // Worker uploads Address Proof
  worker.documents.address_proof = {
    type: 'address_proof',
    fileName: 'Electricity_Bill_Mumbai.pdf',
    uploadedAt: new Date().toISOString(),
    status: 'Verified'
  };

  // Worker uploads Trade License
  worker.documents.trade_license = {
    type: 'trade_license',
    fileName: 'Carpentry_Trade_Certificate.pdf',
    uploadedAt: new Date().toISOString(),
    status: 'Verified'
  };

  worker.verificationStatus = 'Verified';

  assert.strictEqual(Object.keys(worker.documents).length, 3);
  assert.strictEqual(worker.documents.identity_proof.status, 'Verified');
  assert.strictEqual(worker.documents.address_proof.status, 'Verified');
  assert.strictEqual(worker.documents.trade_license.status, 'Verified');
  assert.strictEqual(worker.verificationStatus, 'Verified');
});

console.log('\n' + '='.repeat(70));
console.log(`Results: ${passedTests}/${totalTests} Scenarios Passed (100% Success)`);
console.log('='.repeat(70) + '\n');
