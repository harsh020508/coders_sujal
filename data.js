// LocalKaam Enhanced Data Models with Additional Categories

export const LOCALITIES = [
  { id: 'andheri', name: 'Andheri West', lat: 19.1136, lng: 72.8258, zone: 'Western Suburbs', city: 'Mumbai' },
  { id: 'bandra', name: 'Bandra West', lat: 19.0596, lng: 72.8295, zone: 'Western Suburbs', city: 'Mumbai' },
  { id: 'powai', name: 'Powai', lat: 19.1176, lng: 72.9060, zone: 'Central Suburbs', city: 'Mumbai' },
  { id: 'juhu', name: 'Juhu', lat: 19.1075, lng: 72.8263, zone: 'Western Suburbs', city: 'Mumbai' },
  { id: 'malad', name: 'Malad West', lat: 19.1874, lng: 72.8484, zone: 'Western Suburbs', city: 'Mumbai' },
  { id: 'colaba', name: 'Colaba', lat: 18.9067, lng: 72.8147, zone: 'South Mumbai', city: 'Mumbai' },
  { id: 'dadar', name: 'Dadar West', lat: 19.0178, lng: 72.8478, zone: 'Central Mumbai', city: 'Mumbai' },
  { id: 'thane', name: 'Thane West', lat: 19.2183, lng: 72.9781, zone: 'Thane Region', city: 'Mumbai' }
];

// Enhanced categories with more services including complaint categories
export const CATEGORIES = [
  { 
    id: 'electrician', 
    name: 'Electrician', 
    icon: '⚡', 
    description: 'Wiring, switches, appliance installation & fuse repairs.',
    subcategories: ['Wiring Repair', 'Switchboard Installation', 'Fan Installation', 'Lighting Installation', 'Electrical Fault Diagnosis', 'New Electrical Fittings']
  },
  { 
    id: 'plumber', 
    name: 'Plumber', 
    icon: '🔧', 
    description: 'Leaking taps, pipe fittings, water tanks & bathroom fixes.',
    subcategories: ['Leaking Tap & Faucet', 'Pipe Fitting & Leakage', 'Water Tank Cleaning', 'Geyser Installation & Repair', 'Toilet & Flush Repair', 'Drainage Unclogging']
  },
  { 
    id: 'carpenter', 
    name: 'Carpenter', 
    icon: '🪑', 
    description: 'Furniture repair, door locks, custom cabinets & assembly.',
    subcategories: ['Door Locks & Hinges', 'Bed & Sofa Repair', 'Wardrobe Customization', 'Modular Kitchen Fitting', 'Wooden Shelves & Racks']
  },
  { 
    id: 'painter', 
    name: 'Painter', 
    icon: '🎨', 
    description: 'Wall painting, touch-ups, waterproofing & polish.',
    subcategories: ['Interior Wall Painting', 'Exterior Waterproofing', 'Wood Polish & Varnishing', 'Texture & Accent Walls', 'Wall Putty & Primer']
  },
  { 
    id: 'ac_repair', 
    name: 'AC repair and servicing', 
    icon: '❄️', 
    description: 'AC installation, gas refilling, deep servicing & repair.',
    subcategories: ['Split AC Servicing', 'Window AC Repair', 'Gas Refilling & Leak Check', 'AC Installation & Uninstallation', 'PCB Repair']
  },
  { 
    id: 'appliance_repair', 
    name: 'Appliance repair', 
    icon: '🔋', 
    description: 'Washing machine, refrigerator, microwave & water purifier repair.',
    subcategories: ['Washing Machine Repair', 'Refrigerator Servicing', 'Microwave Oven Repair', 'Water Purifier (RO) Service']
  },
  { 
    id: 'cleaning', 
    name: 'Cleaning and housekeeping', 
    icon: '🧹', 
    description: 'Deep home cleaning, sofa & mattress shampooing.',
    subcategories: ['Full Home Deep Cleaning', 'Kitchen & Bathroom Scrub', 'Sofa & Carpet Shampooing', 'Water Tank Deep Clean']
  },
  { 
    id: 'shifting', 
    name: 'Home shifting', 
    icon: '📦', 
    description: 'Packers, movers, local shifting & furniture transport.',
    subcategories: ['Local Household Shifting', 'Office Relocation', 'Single Item Transport', 'Packing & Unpacking']
  },
  { 
    id: 'pest_control', 
    name: 'Pest control', 
    icon: '🐛', 
    description: 'Cockroach, mosquito, termite & rodent extermination.',
    subcategories: ['Cockroach & Ant Treatment', 'Termite Proofing', 'Mosquito Fogging', 'Rodent Control']
  },
  { 
    id: 'other', 
    name: 'Other services', 
    icon: '🛠️', 
    description: 'Bespoke handymen tasks, drill hanging, lock assembly & maintenance.',
    subcategories: ['Drilling & Wall Hanging', 'Curtain Rod Installation', 'General Handyman Support']
  }
];

// Customer complaint categories
export const COMPLAINT_CATEGORIES = [
  { id: 'did_not_arrive', name: 'Worker did not arrive', icon: '🚫', description: 'Worker did not show up for scheduled appointment' },
  { id: 'arrived_late', name: 'Worker arrived late', icon: '⏰', description: 'Worker arrived significantly after scheduled time' },
  { id: 'poor_quality', name: 'Poor-quality work', icon: '❌', description: 'Service work was below expected quality standards' },
  { id: 'incomplete_service', name: 'Incomplete service', icon: '⭕', description: 'Service work was not fully completed' },
  { id: 'unexpected_charges', name: 'Unexpected or excessive charges', icon: '💰', description: 'Unexpected or unusually high charges' },
  { id: 'unprofessional', name: 'Unprofessional behaviour', icon: '🚸', description: 'Worker showed unprofessional or disrespectful behavior' },
  { id: 'payment_issue', name: 'Payment-related issue', icon: '💳', description: 'Issues with payment processing or refunds' },
  { id: 'misconduct_safety', name: 'Misconduct or safety concern', icon: '⚠️', description: 'Safety concerns or misconduct during service' },
  { id: 'other', name: 'Other', icon: '❓', description: 'Other issues not covered by above categories' }
];

// Help centre support ticket categories
export const SUPPORT_CATEGORIES = [
  { id: 'booking', name: 'Booking assistance', description: 'Help with booking services, scheduling, and appointments' },
  { id: 'payment', name: 'Payment and pricing issues', description: 'Issues with payments, pricing, refunds, and billing' },
  { id: 'late_no_show', name: 'Late arrival or no-show', description: 'Worker arrived late or did not show up' },
  { id: 'cancellation', name: 'Cancellation and rescheduling', description: 'Help with cancellations and rescheduling bookings' },
  { id: 'quality', name: 'Service quality issues', description: 'Problems with service quality or standards' },
  { id: 'account', name: 'Account and profile assistance', description: 'Help with account management and profile issues' },
  { id: 'safety', name: 'Safety-related concerns', description: 'Safety issues or concerns during service' },
  { id: 'general', name: 'General queries', description: 'General questions and information' }
];

export const INITIAL_WORKERS = [
  {
    id: 'w1',
    name: 'Rajesh Kumar',
    phone: '+91 98211 44551',
    bio: 'Punctual, certified master plumber and residential electrician with 8+ years experience across Western Mumbai.',
    city: 'Mumbai',
    baseLocality: 'andheri',
    serviceArea: 'Andheri West, Juhu, Lokhandwala, Versova',
    serviceRadius: 10,
    experience: 8,
    languages: ['Hindi', 'Marathi', 'English'],
    workingHours: { start: '08:30', end: '20:00' },
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    available: true,
    pauseNewBookings: false,
    profileCompleted: true,
    verificationStatus: 'Verified',
    ratingAverage: 4.8,
    ratingCount: 42,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    specialities: {
      plumber: {
        tasks: ['Leaking Tap & Faucet', 'Pipe Fitting & Leakage', 'Geyser Installation & Repair'],
        pricingMethod: 'hourly',
        startingPrice: 300,
        visitingCharge: 100,
        estDuration: '1-2 hours',
        experience: 8,
        certifications: 'Certified Master Plumber (ITI Mumbai)'
      },
      electrician: {
        tasks: ['Switchboard Installation', 'Fan Installation', 'Wiring Repair'],
        pricingMethod: 'hourly',
        startingPrice: 350,
        visitingCharge: 150,
        estDuration: '1 hour',
        experience: 6,
        certifications: 'Licensed Electrical Contractor'
      }
    },
    skills: ['Leaking Tap', 'Pipe Fitting', 'Switchboard', 'Fan Installation']
  },
  {
    id: 'w2',
    name: 'Suresh Sharma',
    phone: '+91 98332 11223',
    bio: 'Licensed electrical contractor specializing in safe home wiring, AC repairs, and smart home fixtures.',
    city: 'Mumbai',
    baseLocality: 'bandra',
    serviceArea: 'Bandra West, Khar, Santacruz',
    serviceRadius: 8,
    experience: 6,
    languages: ['Hindi', 'English'],
    workingHours: { start: '09:00', end: '19:00' },
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    available: true,
    pauseNewBookings: false,
    profileCompleted: true,
    verificationStatus: 'Verified',
    ratingAverage: 4.9,
    ratingCount: 38,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    specialities: {
      electrician: {
        tasks: ['Wiring Repair', 'Switchboard Installation', 'Lighting Installation', 'Electrical Fault Diagnosis'],
        pricingMethod: 'hourly',
        startingPrice: 350,
        visitingCharge: 100,
        estDuration: '1-3 hours',
        experience: 6,
        certifications: 'State Electrical License Grade A'
      },
      ac_repair: {
        tasks: ['Split AC Servicing', 'Gas Refilling & Leak Check', 'AC Installation'],
        pricingMethod: 'fixed',
        startingPrice: 599,
        visitingCharge: 150,
        estDuration: '1.5 hours',
        experience: 5,
        certifications: 'HVAC Certified Technician'
      }
    },
    skills: ['Wiring', 'Switchboard', 'Split AC Servicing', 'Gas Refilling']
  },
  {
    id: 'w3',
    name: 'Vijay Patil',
    phone: '+91 98922 33445',
    bio: 'Master carpenter proficient in modular furniture assembly, sleek woodwork, and precision door locks.',
    city: 'Mumbai',
    baseLocality: 'powai',
    serviceArea: 'Powai, Chandivali, Vikhroli',
    serviceRadius: 12,
    experience: 10,
    languages: ['Hindi', 'Marathi', 'English'],
    workingHours: { start: '09:00', end: '18:00' },
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    available: true,
    pauseNewBookings: false,
    profileCompleted: true,
    verificationStatus: 'Verified',
    ratingAverage: 4.7,
    ratingCount: 29,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    specialities: {
      carpenter: {
        tasks: ['Door Locks & Hinges', 'Bed & Sofa Repair', 'Wardrobe Customization', 'Modular Kitchen Fitting'],
        pricingMethod: 'fixed',
        startingPrice: 400,
        visitingCharge: 150,
        estDuration: '2-4 hours',
        experience: 10,
        certifications: 'Master Woodwork Guild'
      }
    },
    skills: ['Door Locks', 'Bed Repair', 'Wardrobe Customization', 'Modular Kitchen']
  },
  {
    id: 'w4',
    name: 'Sunita Gawde',
    phone: '+91 97001 22334',
    bio: 'Professional deep cleaning specialist equipped with eco-friendly solutions and advanced sanitization gear.',
    city: 'Mumbai',
    baseLocality: 'juhu',
    serviceArea: 'Juhu, Andheri, Vile Parle',
    serviceRadius: 10,
    experience: 5,
    languages: ['Marathi', 'Hindi', 'English'],
    workingHours: { start: '08:00', end: '18:00' },
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    available: true,
    pauseNewBookings: false,
    profileCompleted: true,
    verificationStatus: 'Verified',
    ratingAverage: 4.9,
    ratingCount: 56,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    specialities: {
      cleaning: {
        tasks: ['Full Home Deep Cleaning', 'Kitchen & Bathroom Scrub', 'Sofa & Carpet Shampooing'],
        pricingMethod: 'fixed',
        startingPrice: 999,
        visitingCharge: 0,
        estDuration: '3-5 hours',
        experience: 5,
        certifications: 'Eco-Sanitization Certified'
      }
    },
    skills: ['Full Home Deep Cleaning', 'Kitchen & Bathroom Scrub', 'Sofa & Carpet Shampooing']
  }
];

export const INITIAL_BOOKINGS = [
  {
    id: 'BK-10492',
    workerId: 'w1',
    customerName: 'Aarav Mehta',
    customerPhone: '+91 98765 43210',
    serviceCategory: 'plumber',
    serviceTask: 'Leaking Tap & Faucet',
    locality: 'andheri',
    address: 'Flat 402, Titanium Heights, Andheri West',
    jobDescription: 'Kitchen mixer faucet leaking continuously, requires cartridge or washer replacement.',
    bookingType: 'scheduled',
    appointmentDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    appointmentTime: '10:00 AM - 12:00 PM',
    estimatedHours: 1,
    basePrice: 300,
    visitingCharge: 100,
    customerOffer: 350,
    counterOfferHistory: [
      { sender: 'customer', amount: 350, note: 'Initial customer offer: ₹350' },
      { sender: 'worker', amount: 400, note: 'Includes genuine ceramic spindle washer + 30-day guarantee' }
    ],
    agreedPrice: 400,
    status: 'Pending confirmation',
    reviewId: null,
    complaintId: null,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: null
  },
  {
    id: 'BK-10381',
    workerId: 'w1',
    customerName: 'Aarav Mehta',
    customerPhone: '+91 98765 43210',
    serviceCategory: 'electrician',
    serviceTask: 'Switchboard Installation',
    locality: 'andheri',
    address: 'Flat 402, Titanium Heights, Andheri West',
    jobDescription: 'Installed 8-module modular switchboard with heavy appliance MCB and surge protection.',
    bookingType: 'scheduled',
    appointmentDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    appointmentTime: '02:00 PM - 04:00 PM',
    estimatedHours: 1.5,
    basePrice: 350,
    visitingCharge: 150,
    customerOffer: null,
    counterOfferHistory: [],
    agreedPrice: 500,
    status: 'Job completed',
    reviewId: 'REV-10381',
    complaintId: null,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    completedAt: new Date(Date.now() - 82800000).toISOString()
  }
];

export const INITIAL_REVIEWS = [
  {
    id: 'REV-10381',
    bookingId: 'BK-10381',
    workerId: 'w1',
    customerId: 'cust-aarav',
    customerName: 'Aarav Mehta',
    rating: 5,
    comment: 'Rajesh arrived right on time, explained the MCB specifications clearly, and finished the switchboard installation with zero mess. Highly recommended!',
    createdAt: new Date(Date.now() - 80000000).toISOString()
  }
];

export const INITIAL_COMPLAINTS = [];
