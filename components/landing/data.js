// components/landing/data.js — [PLACEHOLDER] content for the marketing
// landing. Replace stats, testimonials and locality names with real data.
// Marked placeholders are safe to ship and easy to find-replace.
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
      link: '#comparison'
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
    { metric: 'Booked in 20 min', quote: 'Booked a plumber for our society block in twenty minutes. The price never moved after the quote.', name: 'Ayesha K.', role: 'Homeowner, Andheri West' },
    { metric: 'Paid in full', quote: 'As a pro, clients pay me directly. No 25% cut means I can quote fairly and still earn more.', name: 'Rajesh K.', role: 'Master electrician, 8 yrs' },
    { metric: 'Live tracking', quote: 'Status updates told me exactly when he arrived. Invoice, payment, review — all in one place.', name: 'Meera S.', role: 'Customer, Juhu' }
  ],
  localities: [
    { name: 'Andheri West', group: 'west' }, { name: 'Juhu', group: 'west' }, { name: 'Bandra', group: 'west' },
    { name: 'Versova', group: 'west' }, { name: 'Powai', group: 'central' }, { name: 'Ghatkopar', group: 'central' },
    { name: 'Chembur', group: 'harbour' }, { name: 'Colaba', group: 'harbour' }, { name: 'Thane', group: 'east' },
    { name: 'Kalyan', group: 'east' }
  ],
  builtFor: ['Homeowners', 'Society managers', 'Property managers', 'Working professionals', 'Seniors', 'Pros & trades', 'Small businesses', 'Families']
};
