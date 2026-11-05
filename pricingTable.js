// LocalKaam Standardized Pricing Table for Indian Home Services Marketplace
// Provides consistent baseline INR price ranges, standard task durations,
// required materials, and safety hazards across primary home service categories.

export const PRICING_TABLE = {
  plumber: {
    name: 'Plumber',
    icon: '🔧',
    tasks: {
      'Leaking Tap & Faucet': {
        price_min: 350,
        price_max: 550,
        duration_minutes: 45,
        materials: ['Teflon tape', 'Rubber washer', 'Thread sealant', 'Spindle valve'],
        urgency_default: 'medium'
      },
      'Pipe Fitting & Leakage': {
        price_min: 500,
        price_max: 950,
        duration_minutes: 75,
        materials: ['CPVC / PVC pipe segment', 'Solvent cement', 'Couplings', 'Teflon tape'],
        urgency_default: 'high'
      },
      'Toilet & Flush Repair': {
        price_min: 450,
        price_max: 850,
        duration_minutes: 60,
        materials: ['Syphon kit', 'Flush valve washer', 'Inlet ball cock', 'Connecting pipe'],
        urgency_default: 'medium'
      },
      'Drainage Unclogging': {
        price_min: 400,
        price_max: 800,
        duration_minutes: 60,
        materials: ['Drain cleaning coil', 'Chemical drain opener', 'Trap seal'],
        urgency_default: 'high'
      },
      'Water Tank & Geyser Pipe Leakage': {
        price_min: 600,
        price_max: 1200,
        duration_minutes: 90,
        materials: ['Braided connection pipes', 'Angle valves', 'Brass union', 'PTFE tape'],
        urgency_default: 'high'
      }
    },
    general_range: { price_min: 350, price_max: 950, duration_minutes: 60 }
  },

  electrician: {
    name: 'Electrician',
    icon: '⚡',
    tasks: {
      'Burnt Socket & Switchboard Repair': {
        price_min: 300,
        price_max: 550,
        duration_minutes: 45,
        materials: ['Modular switch / socket (16A/6A)', 'Insulation tape', 'Copper wire jumper'],
        urgency_default: 'high'
      },
      'MCB Tripping & Short Circuit': {
        price_min: 600,
        price_max: 1300,
        duration_minutes: 90,
        materials: ['Single/Double Pole MCB (C-curve)', 'FR copper wire 2.5/4 sq mm', 'Tester', 'Insulation tape'],
        urgency_default: 'emergency'
      },
      'Ceiling Fan & Light Fitting': {
        price_min: 350,
        price_max: 650,
        duration_minutes: 45,
        materials: ['Ceiling hook', 'Downrod', 'Capacitor 2.5uF', 'Wire connector'],
        urgency_default: 'medium'
      },
      'Exposed Wiring & Sparking': {
        price_min: 500,
        price_max: 1500,
        duration_minutes: 90,
        materials: ['Conduit pipe / casing', 'Heavy duty copper wire', 'Terminal blocks', 'PVC insulation tape'],
        urgency_default: 'emergency'
      },
      'Appliance Plug & Power Point Repair': {
        price_min: 350,
        price_max: 600,
        duration_minutes: 40,
        materials: ['Heavy duty power socket', 'Backbox', 'Insulation tape'],
        urgency_default: 'medium'
      }
    },
    general_range: { price_min: 350, price_max: 1200, duration_minutes: 60 }
  },

  painter: {
    name: 'Painter',
    icon: '🎨',
    tasks: {
      'Wall Touch-up & Putty Repair': {
        price_min: 800,
        price_max: 1500,
        duration_minutes: 120,
        materials: ['Wall putty (Birla/JK)', 'Sandpaper (120/180 grit)', 'Primer', 'Emulsion paint sample'],
        urgency_default: 'low'
      },
      'Waterproofing & Damp Wall Treatment': {
        price_min: 1200,
        price_max: 2500,
        duration_minutes: 180,
        materials: ['Waterproofing chemical (Dr. Fixit/Asian Paints)', 'Mesh tape', 'Damp-proof primer'],
        urgency_default: 'medium'
      },
      'Door & Window Polish': {
        price_min: 900,
        price_max: 1800,
        duration_minutes: 150,
        materials: ['Wood stain', 'PU clear varnish', 'Thinner', 'Buffing pad'],
        urgency_default: 'low'
      },
      'Single Room Repaint': {
        price_min: 2500,
        price_max: 5500,
        duration_minutes: 360,
        materials: ['Tractor / Royale Emulsion 4L', 'Primer', 'Putty', 'Masking tape', 'Roller & brushes'],
        urgency_default: 'low'
      }
    },
    general_range: { price_min: 800, price_max: 2500, duration_minutes: 150 }
  },

  cleaner: {
    name: 'Cleaner',
    icon: '🧹',
    tasks: {
      'Deep Bathroom Scrub & Descaling': {
        price_min: 699,
        price_max: 1299,
        duration_minutes: 90,
        materials: ['Hard-water stain remover', 'Disinfectant acid-free tile cleaner', 'Rotary brush pads'],
        urgency_default: 'medium'
      },
      'Kitchen Degreasing Deep Clean': {
        price_min: 899,
        price_max: 1699,
        duration_minutes: 120,
        materials: ['Heavy duty degreaser', 'Stainless steel scrubber', 'Microfiber wipes', 'Chimney spray'],
        urgency_default: 'medium'
      },
      'Sofa & Carpet Shampooing': {
        price_min: 899,
        price_max: 1599,
        duration_minutes: 90,
        materials: ['Fabric foaming shampoo', 'Vacuum extraction nozzle', 'Anti-allergen sanitizer'],
        urgency_default: 'low'
      },
      'Full Home Deep Cleaning (1-2 BHK)': {
        price_min: 1999,
        price_max: 3999,
        duration_minutes: 240,
        materials: ['Industrial vacuum', 'Single disc scrubbing machine pads', 'Floor cleaner', 'Glass cleaner'],
        urgency_default: 'low'
      }
    },
    general_range: { price_min: 699, price_max: 2000, duration_minutes: 120 }
  },

  carpenter: {
    name: 'Carpenter',
    icon: '🪚',
    tasks: {
      'Door Lock & Latch Replacement': {
        price_min: 350,
        price_max: 650,
        duration_minutes: 45,
        materials: ['Mortise / cylindrical lock set', 'Wood screws', 'Chisel lubricant', 'Striker plate'],
        urgency_default: 'high'
      },
      'Bed & Chair Wooden Joint Repair': {
        price_min: 500,
        price_max: 1100,
        duration_minutes: 75,
        materials: ['Fevicol Marine wood adhesive', 'L-brackets', 'Dowels', 'Wood filler'],
        urgency_default: 'medium'
      },
      'Wardrobe Hinge & Drawer Channel Fix': {
        price_min: 400,
        price_max: 800,
        duration_minutes: 60,
        materials: ['Soft-close auto hinges', 'Telescopic drawer channels (18")', 'Drywall/wood screws'],
        urgency_default: 'medium'
      },
      'Modular Kitchen Fitting Repair': {
        price_min: 650,
        price_max: 1400,
        duration_minutes: 90,
        materials: ['Hydraulic gas struts', 'Handle fittings', 'Tandem box runners'],
        urgency_default: 'medium'
      }
    },
    general_range: { price_min: 400, price_max: 1000, duration_minutes: 60 }
  },

  appliance_repair: {
    name: 'Appliance Repair',
    icon: '🔌',
    tasks: {
      'Washing Machine Drainage / Noise Issue': {
        price_min: 650,
        price_max: 1400,
        duration_minutes: 75,
        materials: ['Drain pump assembly', 'Inlet solenoid valve', 'Belt', 'Vibration dampers'],
        urgency_default: 'high'
      },
      'Refrigerator Cooling & Gas Check': {
        price_min: 800,
        price_max: 1800,
        duration_minutes: 90,
        materials: ['R134a/R600a refrigerant can', 'Relay overload protector', 'Defrost sensor / timer'],
        urgency_default: 'high'
      },
      'Microwave Oven Heating Fault': {
        price_min: 500,
        price_max: 1200,
        duration_minutes: 60,
        materials: ['High voltage diode', 'Fuse 5kV', 'Micro-door switch'],
        urgency_default: 'medium'
      },
      'Water Purifier (RO) Filter Service': {
        price_min: 600,
        price_max: 1300,
        duration_minutes: 60,
        materials: ['Sediment filter', 'Pre-carbon candle', 'RO membrane (75/80 GPD)', 'Flow restrictor'],
        urgency_default: 'medium'
      }
    },
    general_range: { price_min: 600, price_max: 1500, duration_minutes: 75 }
  }
};

/**
 * Get pricing details for a detected service category and task.
 */
export function getPricingForTask(serviceCategory, taskDescription = '') {
  const cat = PRICING_TABLE[serviceCategory] || PRICING_TABLE.plumber;
  
  if (taskDescription) {
    const taskLower = taskDescription.toLowerCase();
    for (const [taskName, taskInfo] of Object.entries(cat.tasks)) {
      if (taskLower.includes(taskName.toLowerCase()) || 
          taskName.toLowerCase().split(' ').some(w => w.length > 3 && taskLower.includes(w))) {
        return {
          category: serviceCategory,
          taskName,
          ...taskInfo
        };
      }
    }
  }

  // Fallback to the first task or general range
  const firstTaskKey = Object.keys(cat.tasks)[0];
  const firstTask = cat.tasks[firstTaskKey];
  return {
    category: serviceCategory,
    taskName: firstTaskKey,
    ...firstTask
  };
}

/**
 * Format prompt text describing the exact price table for the vision model.
 */
export function getPriceTablePromptSummary() {
  const lines = [];
  for (const [catKey, catData] of Object.entries(PRICING_TABLE)) {
    lines.push(`Category: ${catKey} (${catData.name})`);
    for (const [taskName, taskInfo] of Object.entries(catData.tasks)) {
      lines.push(`  - Task: "${taskName}" | INR Range: ₹${taskInfo.price_min} - ₹${taskInfo.price_max} | Est Duration: ${taskInfo.duration_minutes} min | Materials: ${taskInfo.materials.join(', ')}`);
    }
  }
  return lines.join('\n');
}
