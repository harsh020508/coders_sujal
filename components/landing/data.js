// components/landing/data.js — curated content for the LocalKaam marketing landing.
// Production-grade structured data for services, localities, pricing, and proofs.
export const T = {
  brand: 'LocalKaam',
  oneLine: 'Hyperlocal help for Mumbai homes.',
  pillars: [
    {
      id: 'discover', icon: 'search', name: 'Discover',
      headline: 'Find the right person in your lane',
      desc: 'Search by trade and locality. Real ratings, real wages, real distances — no city-wide strangers.',
      bullets: ['Verified IDs on every pro', 'Ratings only on completed jobs', '~25 min average arrival'],
      link: '#services'
    },
    {
      id: 'book', icon: 'calendar-check', name: 'Book',
      headline: 'Agree a time and a price upfront',
      desc: 'Pick a slot, describe the work, accept the quote — or send a counter-offer. Both sides confirm.',
      bullets: ['Counter-offers built in', 'Slot choice with reminders', 'Escalation to support'],
      link: '#how-it-works'
    },
    {
      id: 'track', icon: 'map-pin', name: 'Track',
      headline: 'Watch the job happen, live',
      desc: 'Accepted, en route, arrived, in progress, done — status on your screen, not over the phone.',
      bullets: ['Live milestone updates', 'Direct phone & chat', 'Digital invoice'],
      link: '#how-it-works'
    },
    {
      id: 'pay', icon: 'hand-coins', name: 'Pay direct',
      headline: 'The pro keeps 100% of what you pay',
      desc: 'No commission, no surge fee, no middleman cut. What you agree is what the pro receives.',
      bullets: ['0% platform commission', 'Direct payment only', 'Transparent base rates'],
      link: '#essential'
    },
    {
      id: 'review', icon: 'star', name: 'Review',
      headline: 'Reviews you can actually trust',
      desc: 'Only finished jobs can be reviewed. No paid placements, no ghost ratings.',
      bullets: ['Verified-only reviews', 'Response rate in one place', 'Report & support flow'],
      link: '#how-it-works'
    }
  ],
  testimonials: [
    { metric: 'Arrived in 22 min', quote: 'The electrician arrived in 22 minutes. No haggling, the price was what I saw on screen. Brilliant.', name: 'Priya Nair', role: 'Customer · Bandra West' },
    { metric: '+40% earnings', quote: 'I make 40% more than when I used other apps. No cuts, no tricks.', name: 'Ravi Sharma', role: 'Plumber · LocalKaam Pro' },
    { metric: 'Done by noon', quote: 'Booked a deep clean for Sunday morning. Done by noon. The app even asked me to rate before they left.', name: 'Meera Joshi', role: 'Customer · Powai' }
  ],
  pricePresets: [
    { id: 'tap_fix', label: 'Tap & Pipe Fix', price: 450, category: 'plumber', icon: 'droplets' },
    { id: 'ac_service', label: 'Split AC Deep Service', price: 799, category: 'ac_repair', icon: 'snowflake' },
    { id: 'fault_check', label: 'Electrical Fault Check', price: 350, category: 'electrician', icon: 'zap' },
    { id: 'deep_clean', label: '2BHK Deep Clean', price: 2499, category: 'cleaning', icon: 'sparkles' }
  ],
  localityDetails: {
    andheri: {
      name: 'Andheri West',
      zone: 'Western Suburbs',
      eta: '~18 min',
      activePros: 42,
      topPro: { name: 'Rajesh Kumar', trade: 'Master Plumber', rating: '4.8', jobs: 42 },
      popular: [
        { id: 'plumber', name: 'Plumbing', rate: 'From ₹280' },
        { id: 'electrician', name: 'Electrical', rate: 'From ₹320' },
        { id: 'cleaning', name: 'Home Cleaning', rate: 'From ₹499' },
        { id: 'ac_repair', name: 'AC Service', rate: 'From ₹499' }
      ]
    },
    bandra: {
      name: 'Bandra West',
      zone: 'Western Suburbs',
      eta: '~15 min',
      activePros: 38,
      topPro: { name: 'Suresh Sharma', trade: 'Electrician & HVAC', rating: '4.9', jobs: 38 },
      popular: [
        { id: 'electrician', name: 'Electrical', rate: 'From ₹350' },
        { id: 'ac_repair', name: 'AC Service', rate: 'From ₹599' },
        { id: 'cleaning', name: 'Home Cleaning', rate: 'From ₹599' },
        { id: 'carpenter', name: 'Carpentry', rate: 'From ₹400' }
      ]
    },
    powai: {
      name: 'Powai',
      zone: 'Central Suburbs',
      eta: '~22 min',
      activePros: 29,
      topPro: { name: 'Vijay Patil', trade: 'Master Carpenter', rating: '4.7', jobs: 29 },
      popular: [
        { id: 'carpenter', name: 'Carpentry', rate: 'From ₹400' },
        { id: 'appliance_repair', name: 'Appliance Repair', rate: 'From ₹350' },
        { id: 'cleaning', name: 'Home Cleaning', rate: 'From ₹499' },
        { id: 'plumber', name: 'Plumbing', rate: 'From ₹300' }
      ]
    },
    juhu: {
      name: 'Juhu',
      zone: 'Western Suburbs',
      eta: '~20 min',
      activePros: 31,
      topPro: { name: 'Sunita Gawde', trade: 'Deep Cleaning Specialist', rating: '4.9', jobs: 56 },
      popular: [
        { id: 'cleaning', name: 'Home Cleaning', rate: 'From ₹599' },
        { id: 'ac_repair', name: 'AC Service', rate: 'From ₹499' },
        { id: 'painter', name: 'Painting', rate: 'From ₹750' },
        { id: 'electrician', name: 'Electrical', rate: 'From ₹350' }
      ]
    },
    malad: {
      name: 'Malad West',
      zone: 'Western Suburbs',
      eta: '~24 min',
      activePros: 35,
      topPro: { name: 'Manoj Yadav', trade: 'Drainage & Plumbing Pro', rating: '4.7', jobs: 45 },
      popular: [
        { id: 'plumber', name: 'Plumbing', rate: 'From ₹280' },
        { id: 'cleaning', name: 'Home Cleaning', rate: 'From ₹450' },
        { id: 'electrician', name: 'Electrical', rate: 'From ₹300' },
        { id: 'carpenter', name: 'Carpentry', rate: 'From ₹350' }
      ]
    },
    colaba: {
      name: 'Colaba',
      zone: 'South Mumbai',
      eta: '~25 min',
      activePros: 24,
      topPro: { name: 'Arvind Tambe', trade: 'Waterproofing & Painter', rating: '4.6', jobs: 24 },
      popular: [
        { id: 'painter', name: 'Painting', rate: 'From ₹650' },
        { id: 'plumber', name: 'Plumbing', rate: 'From ₹350' },
        { id: 'electrician', name: 'Electrical', rate: 'From ₹350' },
        { id: 'carpenter', name: 'Carpentry', rate: 'From ₹450' }
      ]
    },
    dadar: {
      name: 'Dadar West',
      zone: 'Central Mumbai',
      eta: '~18 min',
      activePros: 45,
      topPro: { name: 'Amit Chawla', trade: 'Residential Electrician', rating: '4.8', jobs: 31 },
      popular: [
        { id: 'electrician', name: 'Electrical', rate: 'From ₹320' },
        { id: 'cleaning', name: 'Home Cleaning', rate: 'From ₹499' },
        { id: 'plumber', name: 'Plumbing', rate: 'From ₹300' },
        { id: 'pest_control', name: 'Pest Control', rate: 'From ₹699' }
      ]
    },
    thane: {
      name: 'Thane West',
      zone: 'Thane Region',
      eta: '~26 min',
      activePros: 52,
      topPro: { name: 'Santosh Mhatre', trade: 'Senior Carpenter', rating: '4.9', jobs: 62 },
      popular: [
        { id: 'carpenter', name: 'Carpentry', rate: 'From ₹380' },
        { id: 'ac_repair', name: 'AC Service', rate: 'From ₹499' },
        { id: 'painter', name: 'Painting', rate: 'From ₹600' },
        { id: 'shifting', name: 'Shifting', rate: 'From ₹1,499' }
      ]
    }
  },
  howSteps: [
    {
      step: '01',
      title: 'Choose a service',
      desc: 'Tell us what needs fixing and where you are. You\'ll see a clear starting price straight away — no estimate surprises.',
      preview: {
        badge: 'Step 01 Live Preview',
        heading: 'Clear Upfront Base Price',
        category: 'Plumbing · Tap Leak Fix',
        startingAt: 'Starting from ₹280',
        note: 'Zero booking fee · Standard rate sheet visible upfront'
      }
    },
    {
      step: '02',
      title: 'Pick your professional',
      desc: 'Browse local pros by rating, distance and completed jobs. Read real reviews, then choose with confidence.',
      preview: {
        badge: 'Step 02 Live Preview',
        heading: 'Nearby Verified Pro & Counter-Offer',
        proName: 'Rajesh Kumar',
        proTrade: 'Master Plumber · 8 yrs exp · 4.8 ★',
        offerPill: 'Quote ₹350 → Agreed ₹320 (Direct)',
        eta: 'Arrival ETA ~18 min'
      }
    },
    {
      step: '03',
      title: 'Confirm a time',
      desc: 'Agree the price, lock in a slot, and follow the job live from en-route to done.',
      preview: {
        badge: 'Step 03 Live Preview',
        heading: 'Live Milestones & Secure Handshake',
        slot: 'Slot: Today, 3:30 PM',
        otp: 'Arrival OTP #5821',
        payment: 'Pay ₹320 direct via UPI/Cash upon completion'
      }
    }
  ],
  localities: [
    { name: 'Andheri West', group: 'west' }, { name: 'Juhu', group: 'west' }, { name: 'Bandra', group: 'west' },
    { name: 'Versova', group: 'west' }, { name: 'Powai', group: 'central' }, { name: 'Ghatkopar', group: 'central' },
    { name: 'Chembur', group: 'harbour' }, { name: 'Colaba', group: 'harbour' }, { name: 'Thane', group: 'east' },
    { name: 'Kalyan', group: 'east' }
  ],
  builtFor: ['Homeowners', 'Society managers', 'Property managers', 'Working professionals', 'Seniors', 'Pros & trades', 'Small businesses', 'Families']
};
