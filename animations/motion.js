// animations/motion.js — central motion config (single source of truth).
// Tweak speed/easing here. CSS mirrors these values in animations/motion.css
// via custom properties so both languages stay in sync — keep them aligned.
//
// Goals: Apple-smooth (spring/out cubic-beziers, 60fps transform+opacity
// only) + Duolingo-playful (squish .96, overshoot pop, pressed shadow).
// Respect prefers-reduced-motion everywhere via prefersReducedMotion().

export const MOTION = {
  // Global intensity multiplier (0 = calm/minimal, 1 = default, 1.5 = extra playful).
  intensity: 1,
  durations: {
    press: 120, // micro-interactions: button squish, chip tap
    hover: 220, // hovers, lifts
    med: 280, // cards, dropdowns
    reveal: 650, // scroll reveals (fade+rise)
    page: 500, // route transitions
    toast: 280
  },
  eases: {
    out: 'cubic-bezier(0.22, 1, 0.36, 1)', // Apple out-expo — most glides
    soft: 'cubic-bezier(0.16, 1, 0.3, 1)', // gentle decel
    inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // overshoot ~1.56
    snap: 'cubic-bezier(0, 0, 0, 1)'
  },
  springs: {
    press: { stiffness: 500, damping: 28, mass: 0.8 }, // GSAP spring config (steps 2+)
    pop: { stiffness: 320, damping: 18, mass: 0.9 },
    float: { stiffness: 120, damping: 16, mass: 1 }
  }
};

export function prefersReducedMotion() {
  try {
    return typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  } catch (e) {
    return false;
  }
}

export function setIntensity(value) {
  MOTION.intensity = value;
  try {
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--motion-intensity', String(value));
    }
  } catch (e) {}
  return value;
}

export function initMotion() {
  // Tag <html> so CSS can gate fancy motion while keeping a calm fallback.
  try {
    const root = document.documentElement;
    root.classList.toggle('motion-calm', prefersReducedMotion());
    root.style.setProperty('--motion-intensity', String(MOTION.intensity));
  } catch (e) {}
  return MOTION;
}

export default MOTION;
