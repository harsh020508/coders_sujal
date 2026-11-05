// LocalKaam Enhanced Data Models with Additional Categories

export const REQUIRED_VERIFICATION_DOCUMENTS = [
  {
    type: 'identity_proof',
    title: 'Government Identity Proof',
    subtitle: 'Aadhaar Card, PAN Card, Voter ID, or Passport (Mandatory KYC)',
    required: true,
    icon: '🪪',
    demoFileName: 'Aadhaar_Govt_ID_Verified.pdf'
  },
  {
    type: 'address_proof',
    title: 'Local Address Proof',
    subtitle: 'Electricity Bill, Ration Card, or Rent Agreement (Mumbai Resident)',
    required: true,
    icon: '🏠',
    demoFileName: 'Mumbai_Electricity_Bill_Verified.pdf'
  },
  {
    type: 'trade_license',
    title: 'Trade License / Technical Qualification',
    subtitle: 'ITI Certificate, Vocational Training, or Government Trade License',
    required: true,
    icon: '📜',
    demoFileName: 'ITI_Trade_License_Certified.pdf'
  },
  {
    type: 'experience_evidence',
    title: 'Experience Proof & Work Portfolio',
    subtitle: 'Contractor Reference Letter, Work Completion Slips, or Photos of Past Jobs',
    required: false,
    icon: '💼',
    demoFileName: 'Contractor_Experience_Letter.pdf'
  }
];

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
    lucideIcon: 'zap',
    image: './assets/img/electrician.webp',
    description: 'Wiring, switches, appliance installation & fuse repairs.',
    subcategories: ['Wiring Repair', 'Switchboard Installation', 'Fan Installation', 'Lighting Installation', 'Electrical Fault Diagnosis', 'New Electrical Fittings']
  },
  { 
    id: 'plumber', 
    name: 'Plumber', 
    icon: '🔧',
    lucideIcon: 'droplets',
    image: './assets/img/plumber.webp',
    description: 'Leaking taps, pipe fittings, water tanks & bathroom fixes.',
    subcategories: ['Leaking Tap & Faucet', 'Pipe Fitting & Leakage', 'Water Tank Cleaning', 'Geyser Installation & Repair', 'Toilet & Flush Repair', 'Drainage Unclogging']
  },
  { 
    id: 'carpenter', 
    name: 'Carpenter', 
    icon: '🪚',
    lucideIcon: 'hammer',
    image: './assets/img/carpenter.webp',
    description: 'Furniture repair, door locks, custom cabinets & assembly.',
    subcategories: ['Door Locks & Hinges', 'Bed & Sofa Repair', 'Wardrobe Customization', 'Modular Kitchen Fitting', 'Wooden Shelves & Racks']
  },
  { 
    id: 'painter', 
    name: 'Painter', 
    icon: '🎨',
    lucideIcon: 'paint-roller',
    image: './assets/img/painter.webp',
    description: 'Wall painting, touch-ups, waterproofing & polish.',
    subcategories: ['Interior Wall Painting', 'Exterior Waterproofing', 'Wood Polish & Varnishing', 'Texture & Accent Walls', 'Wall Putty & Primer']
  },
  { 
    id: 'ac_repair', 
    name: 'AC repair & servicing', 
    icon: '❄️',
    lucideIcon: 'snowflake',
    image: './assets/img/ac_repair.webp',
    description: 'AC installation, gas refilling, deep servicing & repair.',
    subcategories: ['Split AC Servicing', 'Window AC Repair', 'Gas Refilling & Leak Check', 'AC Installation & Uninstallation', 'PCB Repair']
  },
  { 
    id: 'appliance_repair', 
    name: 'Appliance repair', 
    icon: '🔌',
    lucideIcon: 'plug-zap',
    image: './assets/img/appliance_repair.webp',
    description: 'Washing machine, refrigerator, microwave & purifier repair.',
    subcategories: ['Washing Machine Repair', 'Refrigerator Servicing', 'Microwave Oven Repair', 'Water Purifier (RO) Service']
  },
  { 
    id: 'cleaning', 
    name: 'Cleaning & housekeeping', 
    icon: '🧹',
    lucideIcon: 'spray-can',
    image: './assets/img/cleaning.webp',
    description: 'Deep home cleaning, sofa & mattress shampooing.',
    subcategories: ['Full Home Deep Cleaning', 'Kitchen & Bathroom Scrub', 'Sofa & Carpet Shampooing', 'Water Tank Deep Clean']
  },
  { 
    id: 'shifting', 
    name: 'Home shifting', 
    icon: '📦',
    lucideIcon: 'truck',
    image: './assets/img/shifting.webp',
    description: 'Packers, movers, local shifting & furniture transport.',
    subcategories: ['Local Household Shifting', 'Office Relocation', 'Single Item Transport', 'Packing & Unpacking']
  },
  { 
    id: 'pest_control', 
    name: 'Pest control', 
    icon: '🐜',
    lucideIcon: 'bug',
    image: './assets/img/pest_control.webp',
    description: 'Cockroach, mosquito, termite & rodent extermination.',
    subcategories: ['Cockroach & Ant Treatment', 'Termite Proofing', 'Mosquito Fogging', 'Rodent Control']
  },
  { 
    id: 'other', 
    name: 'Handyman & custom tasks', 
    icon: '🛠️',
    lucideIcon: 'drill',
    image: './assets/img/other.webp',
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
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
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
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
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
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
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
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
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
  },
  {
  "id": "w5",
  "name": "Amit Chawla",
  "phone": "+91 98199 55667",
  "bio": "Residential electrician and lighting specialist. Fast fault diagnosis and safe fittings in Dadar and South Mumbai.",
  "city": "Mumbai",
  "baseLocality": "dadar",
  "serviceArea": "Dadar West, Matunga, Prabhadevi",
  "serviceRadius": 8,
  "experience": 7,
  "languages": [
    "Hindi",
    "Marathi",
    "English"
  ],
  "workingHours": {
    "start": "09:00",
    "end": "19:00"
  },
  "workingDays": [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
  ],
  "available": true,
  "pauseNewBookings": false,
  "profileCompleted": true,
  "verificationStatus": "Verified",
  "ratingAverage": 4.8,
  "ratingCount": 31,
  "avatar": "",
  "specialities": {
    "electrician": {
      "tasks": [
        "Electrical Fault Diagnosis",
        "Lighting Installation",
        "New Electrical Fittings"
      ],
      "pricingMethod": "hourly",
      "startingPrice": 320,
      "visitingCharge": 100,
      "estDuration": "1-2 hours",
      "experience": 7,
      "certifications": "Wireman License A Grade"
    }
  },
  "skills": [
    "Electrical Fault Diagnosis",
    "Lighting Installation",
    "New Electrical Fittings"
  ]
},
  {
  "id": "w6",
  "name": "Manoj Yadav",
  "phone": "+91 98205 66778",
  "bio": "Expert plumber handling drainage unclogging, water tank sanitization, and flush repairs in Malad and Kandivali.",
  "city": "Mumbai",
  "baseLocality": "malad",
  "serviceArea": "Malad West, Kandivali, Goregaon",
  "serviceRadius": 9,
  "experience": 9,
  "languages": [
    "Hindi",
    "Bhojpuri"
  ],
  "workingHours": {
    "start": "08:00",
    "end": "20:00"
  },
  "workingDays": [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
  ],
  "available": true,
  "pauseNewBookings": false,
  "profileCompleted": true,
  "verificationStatus": "Verified",
  "ratingAverage": 4.7,
  "ratingCount": 45,
  "avatar": "",
  "specialities": {
    "plumber": {
      "tasks": [
        "Drainage Unclogging",
        "Water Tank Cleaning",
        "Toilet & Flush Repair"
      ],
      "pricingMethod": "hourly",
      "startingPrice": 280,
      "visitingCharge": 100,
      "estDuration": "1-2 hours",
      "experience": 9,
      "certifications": "Certified Sanitary Technician"
    }
  },
  "skills": [
    "Drainage Unclogging",
    "Water Tank Cleaning",
    "Toilet & Flush Repair"
  ]
},
  {
  "id": "w7",
  "name": "Santosh Mhatre",
  "phone": "+91 98337 77889",
  "bio": "Custom woodwork, bed & sofa repair, and modular kitchen fittings across Thane and Central Suburbs.",
  "city": "Mumbai",
  "baseLocality": "thane",
  "serviceArea": "Thane West, Mulund, Bhandup",
  "serviceRadius": 10,
  "experience": 12,
  "languages": [
    "Marathi",
    "Hindi"
  ],
  "workingHours": {
    "start": "09:00",
    "end": "19:30"
  },
  "workingDays": [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
  ],
  "available": true,
  "pauseNewBookings": false,
  "profileCompleted": true,
  "verificationStatus": "Verified",
  "ratingAverage": 4.9,
  "ratingCount": 62,
  "avatar": "",
  "specialities": {
    "carpenter": {
      "tasks": [
        "Bed & Sofa Repair",
        "Wooden Shelves & Racks",
        "Door Locks & Hinges"
      ],
      "pricingMethod": "fixed",
      "startingPrice": 380,
      "visitingCharge": 120,
      "estDuration": "2-3 hours",
      "experience": 12,
      "certifications": "Senior Carpenter Guild"
    }
  },
  "skills": [
    "Bed & Sofa Repair",
    "Wooden Shelves & Racks",
    "Door Locks & Hinges"
  ]
},
  {
  "id": "w8",
  "name": "Dilip Sawant",
  "phone": "+91 98920 88990",
  "bio": "Interior wall painting, texture accent walls, and waterproofing specialist with 11 years in Mumbai high-rises.",
  "city": "Mumbai",
  "baseLocality": "andheri",
  "serviceArea": "Andheri West, Bandra, Goregaon",
  "serviceRadius": 12,
  "experience": 11,
  "languages": [
    "Marathi",
    "Hindi",
    "English"
  ],
  "workingHours": {
    "start": "08:30",
    "end": "18:30"
  },
  "workingDays": [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
  ],
  "available": true,
  "pauseNewBookings": false,
  "profileCompleted": true,
  "verificationStatus": "Verified",
  "ratingAverage": 4.8,
  "ratingCount": 39,
  "avatar": "",
  "specialities": {
    "painter": {
      "tasks": [
        "Interior Wall Painting",
        "Texture & Accent Walls",
        "Wall Putty & Primer"
      ],
      "pricingMethod": "fixed",
      "startingPrice": 750,
      "visitingCharge": 150,
      "estDuration": "4-8 hours",
      "experience": 11,
      "certifications": "Master Painter Certification (Asian Paints)"
    }
  },
  "skills": [
    "Interior Wall Painting",
    "Texture & Accent Walls",
    "Wall Putty & Primer"
  ]
},
  {
  "id": "w9",
  "name": "Arvind Tambe",
  "phone": "+91 98218 99001",
  "bio": "Exterior waterproofing, wall touch-ups, and wood polish varnishing for vintage and modern homes.",
  "city": "Mumbai",
  "baseLocality": "colaba",
  "serviceArea": "Colaba, Fort, Marine Lines",
  "serviceRadius": 8,
  "experience": 8,
  "languages": [
    "Hindi",
    "Marathi"
  ],
  "workingHours": {
    "start": "09:00",
    "end": "18:00"
  },
  "workingDays": [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
  ],
  "available": true,
  "pauseNewBookings": false,
  "profileCompleted": true,
  "verificationStatus": "Verified",
  "ratingAverage": 4.6,
  "ratingCount": 24,
  "avatar": "",
  "specialities": {
    "painter": {
      "tasks": [
        "Exterior Waterproofing",
        "Wood Polish & Varnishing",
        "Interior Wall Painting"
      ],
      "pricingMethod": "fixed",
      "startingPrice": 650,
      "visitingCharge": 100,
      "estDuration": "3-6 hours",
      "experience": 8,
      "certifications": "Waterproofing Specialist"
    }
  },
  "skills": [
    "Exterior Waterproofing",
    "Wood Polish & Varnishing",
    "Interior Wall Painting"
  ]
},
  {
  "id": "w10",
  "name": "Imran Shaikh",
  "phone": "+91 98335 11002",
  "bio": "Certified HVAC cooling expert. Split AC deep servicing, PCB repair, and gas refilling across Bandra and Juhu.",
  "city": "Mumbai",
  "baseLocality": "bandra",
  "serviceArea": "Bandra West, Khar, Santacruz, Juhu",
  "serviceRadius": 10,
  "experience": 9,
  "languages": [
    "Hindi",
    "Urdu",
    "English"
  ],
  "workingHours": {
    "start": "08:00",
    "end": "20:30"
  },
  "workingDays": [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun"
  ],
  "available": true,
  "pauseNewBookings": false,
  "profileCompleted": true,
  "verificationStatus": "Verified",
  "ratingAverage": 4.9,
  "ratingCount": 78,
  "avatar": "",
  "specialities": {
    "ac_repair": {
      "tasks": [
        "Split AC Servicing",
        "PCB Repair",
        "AC Installation & Uninstallation"
      ],
      "pricingMethod": "fixed",
      "startingPrice": 499,
      "visitingCharge": 150,
      "estDuration": "1-2 hours",
      "experience": 9,
      "certifications": "Daikin & Voltas Authorized Service Partner"
    }
  },
  "skills": [
    "Split AC Servicing",
    "PCB Repair",
    "AC Installation & Uninstallation"
  ]
},
  {
  "id": "w11",
  "name": "Deepak Jadhav",
  "phone": "+91 98192 22113",
  "bio": "Washing machine, refrigerator, and microwave oven repair specialist with multi-brand parts in stock.",
  "city": "Mumbai",
  "baseLocality": "powai",
  "serviceArea": "Powai, Ghatkopar, Kanjurmarg",
  "serviceRadius": 10,
  "experience": 7,
  "languages": [
    "Marathi",
    "Hindi",
    "English"
  ],
  "workingHours": {
    "start": "09:00",
    "end": "19:00"
  },
  "workingDays": [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
  ],
  "available": true,
  "pauseNewBookings": false,
  "profileCompleted": true,
  "verificationStatus": "Verified",
  "ratingAverage": 4.7,
  "ratingCount": 36,
  "avatar": "",
  "specialities": {
    "appliance_repair": {
      "tasks": [
        "Washing Machine Repair",
        "Refrigerator Servicing",
        "Microwave Oven Repair"
      ],
      "pricingMethod": "fixed",
      "startingPrice": 350,
      "visitingCharge": 150,
      "estDuration": "1-2 hours",
      "experience": 7,
      "certifications": "Consumer Appliance Technical Guild"
    }
  },
  "skills": [
    "Washing Machine Repair",
    "Refrigerator Servicing",
    "Microwave Oven Repair"
  ]
},
  {
  "id": "w12",
  "name": "Rakesh Verma",
  "phone": "+91 97022 33224",
  "bio": "Water purifier (RO) installation & filter replacements. Fast doorstep diagnostics in Andheri and Jogeshwari.",
  "city": "Mumbai",
  "baseLocality": "andheri",
  "serviceArea": "Andheri West, Jogeshwari, Oshiwara",
  "serviceRadius": 8,
  "experience": 4,
  "languages": [
    "Hindi",
    "English"
  ],
  "workingHours": {
    "start": "09:30",
    "end": "18:30"
  },
  "workingDays": [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
  ],
  "available": true,
  "pauseNewBookings": false,
  "profileCompleted": true,
  "verificationStatus": "Pending",
  "ratingAverage": 4.5,
  "ratingCount": 14,
  "avatar": "",
  "specialities": {
    "appliance_repair": {
      "tasks": [
        "Water Purifier (RO) Service",
        "Microwave Oven Repair"
      ],
      "pricingMethod": "fixed",
      "startingPrice": 300,
      "visitingCharge": 100,
      "estDuration": "1 hour",
      "experience": 4,
      "certifications": "Water Filtration Technician"
    }
  },
  "skills": [
    "Water Purifier (RO) Service",
    "Microwave Oven Repair"
  ]
},
  {
  "id": "w13",
  "name": "Meena Kamble",
  "phone": "+91 98201 44335",
  "bio": "Kitchen & bathroom scrub specialist. Deep cleaning, carpet shampooing, and water tank sanitation.",
  "city": "Mumbai",
  "baseLocality": "dadar",
  "serviceArea": "Dadar, Parel, Worli",
  "serviceRadius": 9,
  "experience": 6,
  "languages": [
    "Marathi",
    "Hindi"
  ],
  "workingHours": {
    "start": "08:00",
    "end": "17:00"
  },
  "workingDays": [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
  ],
  "available": true,
  "pauseNewBookings": false,
  "profileCompleted": true,
  "verificationStatus": "Verified",
  "ratingAverage": 4.8,
  "ratingCount": 52,
  "avatar": "",
  "specialities": {
    "cleaning": {
      "tasks": [
        "Kitchen & Bathroom Scrub",
        "Full Home Deep Cleaning",
        "Water Tank Deep Clean"
      ],
      "pricingMethod": "fixed",
      "startingPrice": 799,
      "visitingCharge": 0,
      "estDuration": "3-4 hours",
      "experience": 6,
      "certifications": "Professional Housekeeping Certified"
    }
  },
  "skills": [
    "Kitchen & Bathroom Scrub",
    "Full Home Deep Cleaning",
    "Water Tank Deep Clean"
  ]
},
  {
  "id": "w14",
  "name": "Ganesh Shinde",
  "phone": "+91 98925 55446",
  "bio": "Local household shifting, single item transport, and careful furniture packing with covered tempo vehicles.",
  "city": "Mumbai",
  "baseLocality": "thane",
  "serviceArea": "Thane West, Mulund, Powai, Airoli",
  "serviceRadius": 20,
  "experience": 8,
  "languages": [
    "Marathi",
    "Hindi"
  ],
  "workingHours": {
    "start": "07:30",
    "end": "20:00"
  },
  "workingDays": [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun"
  ],
  "available": true,
  "pauseNewBookings": false,
  "profileCompleted": true,
  "verificationStatus": "Verified",
  "ratingAverage": 4.9,
  "ratingCount": 67,
  "avatar": "",
  "specialities": {
    "shifting": {
      "tasks": [
        "Local Household Shifting",
        "Single Item Transport",
        "Packing & Unpacking"
      ],
      "pricingMethod": "fixed",
      "startingPrice": 1499,
      "visitingCharge": 200,
      "estDuration": "3-6 hours",
      "experience": 8,
      "certifications": "Commercial Goods Carrier Permit"
    }
  },
  "skills": [
    "Local Household Shifting",
    "Single Item Transport",
    "Packing & Unpacking"
  ]
},
  {
  "id": "w15",
  "name": "Bharat Movers",
  "phone": "+91 98338 66557",
  "bio": "Apartment and office relocation. Complete packing, unpacking, and heavy furniture transport across Greater Mumbai.",
  "city": "Mumbai",
  "baseLocality": "andheri",
  "serviceArea": "Andheri West, Bandra, Goregaon, Borivali",
  "serviceRadius": 25,
  "experience": 10,
  "languages": [
    "Hindi",
    "Gujarati",
    "English"
  ],
  "workingHours": {
    "start": "07:00",
    "end": "21:00"
  },
  "workingDays": [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun"
  ],
  "available": true,
  "pauseNewBookings": false,
  "profileCompleted": true,
  "verificationStatus": "Verified",
  "ratingAverage": 4.7,
  "ratingCount": 84,
  "avatar": "",
  "specialities": {
    "shifting": {
      "tasks": [
        "Office Relocation",
        "Local Household Shifting",
        "Packing & Unpacking"
      ],
      "pricingMethod": "fixed",
      "startingPrice": 2200,
      "visitingCharge": 300,
      "estDuration": "4-8 hours",
      "experience": 10,
      "certifications": "Registered Mumbai Movers Guild"
    }
  },
  "skills": [
    "Office Relocation",
    "Local Household Shifting",
    "Packing & Unpacking"
  ]
},
  {
  "id": "w16",
  "name": "Naresh Solanki",
  "phone": "+91 98210 77668",
  "bio": "Safe odorless cockroach & ant gel treatment, termite proofing, and rodent control for residential apartments.",
  "city": "Mumbai",
  "baseLocality": "juhu",
  "serviceArea": "Juhu, Vile Parle, Santacruz, Khar",
  "serviceRadius": 10,
  "experience": 8,
  "languages": [
    "Gujarati",
    "Hindi",
    "English"
  ],
  "workingHours": {
    "start": "08:30",
    "end": "19:00"
  },
  "workingDays": [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
  ],
  "available": true,
  "pauseNewBookings": false,
  "profileCompleted": true,
  "verificationStatus": "Verified",
  "ratingAverage": 4.8,
  "ratingCount": 43,
  "avatar": "",
  "specialities": {
    "pest_control": {
      "tasks": [
        "Cockroach & Ant Treatment",
        "Termite Proofing",
        "Mosquito Fogging"
      ],
      "pricingMethod": "fixed",
      "startingPrice": 699,
      "visitingCharge": 100,
      "estDuration": "1-2 hours",
      "experience": 8,
      "certifications": "CIB&RC Government Approved Pest Operator"
    }
  },
  "skills": [
    "Cockroach & Ant Treatment",
    "Termite Proofing",
    "Mosquito Fogging"
  ]
},
  {
  "id": "w17",
  "name": "Prakash D'Souza",
  "phone": "+91 98196 88779",
  "bio": "Termite proofing, mosquito fogging, and residential rodent control using child-safe and pet-safe products.",
  "city": "Mumbai",
  "baseLocality": "bandra",
  "serviceArea": "Bandra West, Khar, Mahim",
  "serviceRadius": 8,
  "experience": 6,
  "languages": [
    "English",
    "Hindi",
    "Konkani"
  ],
  "workingHours": {
    "start": "09:00",
    "end": "18:30"
  },
  "workingDays": [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
  ],
  "available": true,
  "pauseNewBookings": false,
  "profileCompleted": true,
  "verificationStatus": "Verified",
  "ratingAverage": 4.7,
  "ratingCount": 30,
  "avatar": "",
  "specialities": {
    "pest_control": {
      "tasks": [
        "Termite Proofing",
        "Rodent Control",
        "Cockroach & Ant Treatment"
      ],
      "pricingMethod": "fixed",
      "startingPrice": 750,
      "visitingCharge": 120,
      "estDuration": "1-3 hours",
      "experience": 6,
      "certifications": "IPCA Certified Pest Specialist"
    }
  },
  "skills": [
    "Termite Proofing",
    "Rodent Control",
    "Cockroach & Ant Treatment"
  ]
},
  {
  "id": "w18",
  "name": "Sanjay Kadam",
  "phone": "+91 97003 99880",
  "bio": "Handyman for wall drilling, television mounting, curtain rods, mirror hanging, and custom household fixtures.",
  "city": "Mumbai",
  "baseLocality": "andheri",
  "serviceArea": "Andheri West, Lokhandwala, Oshiwara, Versova",
  "serviceRadius": 9,
  "experience": 7,
  "languages": [
    "Marathi",
    "Hindi"
  ],
  "workingHours": {
    "start": "08:30",
    "end": "19:30"
  },
  "workingDays": [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
  ],
  "available": true,
  "pauseNewBookings": false,
  "profileCompleted": true,
  "verificationStatus": "Verified",
  "ratingAverage": 4.8,
  "ratingCount": 47,
  "avatar": "",
  "specialities": {
    "other": {
      "tasks": [
        "Drilling & Wall Hanging",
        "Curtain Rod Installation",
        "General Handyman Support"
      ],
      "pricingMethod": "hourly",
      "startingPrice": 250,
      "visitingCharge": 100,
      "estDuration": "1-2 hours",
      "experience": 7,
      "certifications": "Bosch Power Tools Certified Handyman"
    }
  },
  "skills": [
    "Drilling & Wall Hanging",
    "Curtain Rod Installation",
    "General Handyman Support"
  ]
},
  {
  "id": "w19",
  "name": "Babu Lal",
  "phone": "+91 98207 00991",
  "bio": "Reliable neighborhood handyman. Mirror hanging, lock replacement, curtain fitting, and all quick household repairs.",
  "city": "Mumbai",
  "baseLocality": "malad",
  "serviceArea": "Malad West, Goregaon, Kandivali",
  "serviceRadius": 8,
  "experience": 10,
  "languages": [
    "Hindi",
    "Rajasthani"
  ],
  "workingHours": {
    "start": "09:00",
    "end": "20:00"
  },
  "workingDays": [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat"
  ],
  "available": true,
  "pauseNewBookings": false,
  "profileCompleted": true,
  "verificationStatus": "Verified",
  "ratingAverage": 4.7,
  "ratingCount": 35,
  "avatar": "",
  "specialities": {
    "other": {
      "tasks": [
        "Drilling & Wall Hanging",
        "General Handyman Support"
      ],
      "pricingMethod": "hourly",
      "startingPrice": 220,
      "visitingCharge": 100,
      "estDuration": "1-2 hours",
      "experience": 10,
      "certifications": "Experienced Urban Handyman"
    }
  },
  "skills": [
    "Drilling & Wall Hanging",
    "General Handyman Support"
  ]
}
];

// Attach geo coordinates to seeded workers so the live map can plot them even
// though the worker records themselves do not store latitude/longitude.
const LOCALITY_COORDS = LOCALITIES.reduce((acc, l) => {
  acc[l.id] = { lat: l.lat, lng: l.lng };
  return acc;
}, {});
const DEMO_CITY = { lat: 19.0760, lng: 72.8777 };

INITIAL_WORKERS.forEach((w, index) => {
  const coords = LOCALITY_COORDS[w.baseLocality] || DEMO_CITY;
  const jitter = ((index % 7) - 3) * 0.0035;
  if (w.lat == null) w.lat = Number((coords.lat + jitter).toFixed(5));
  if (w.lng == null) w.lng = Number((coords.lng - jitter).toFixed(5));
  if (!w.location) w.location = { type: 'Point', coordinates: [w.lng, w.lat] };
});

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
