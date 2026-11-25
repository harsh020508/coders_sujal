# LocalKaam Design Quick Reference

Use these guidelines when building new features or updating existing ones.

---

## 🎨 Color

```css
/* Surfaces */
background: white (light) or #0f0f0f (dark)
background: var(--surface-raised)

/* Text */
color: var(--text-primary)   /* Headlines, body */
color: var(--text-secondary) /* Labels, meta */
color: var(--text-muted)     /* Hints, disabled */

/* Accent (use sparingly) */
color: var(--accent)         /* Primary button, selection */
background: var(--accent)
background: var(--accent-light) /* Subtle highlight */

/* Borders */
border: 1px solid var(--border-default)
```

---

## 📏 Spacing (4px grid)

```css
/* Use multiples of 4 */
gap: 4px;         /* Tight */
gap: 8px;         /* Close */
gap: 12px;        /* Cozy */
gap: 16px;        /* Normal */
gap: 24px;        /* Separated */
gap: 32px;        /* Distinct */

/* Padding by density */
padding: 16px;    /* Compact (sidebar, nav) */
padding: 20px;    /* Cards */
padding: 24px;    /* Page sections */
padding: 32px;    /* Hero areas */
```

---

## 🔤 Typography

```css
/* Family */
font-family: 'Inter', sans-serif;
font-family: var(--font-mono); /* For numbers, code */

/* Sizes */
font-size: 0.75rem;   /* 12px - tiny labels */
font-size: 0.875rem;  /* 14px - secondary text */
font-size: 1rem;      /* 16px - body */
font-size: 1.125rem;  /* 18px - subheadings */
font-size: 1.5rem;    /* 24px - headings */

/* Weights (only 3) */
font-weight: 400;     /* Normal body text */
font-weight: 500;     /* Medium labels */
font-weight: 600;     /* Semibold headings */

/* Case */
text-transform: none; /* Sentence case everywhere */
```

---

## 🎯 Icons

```html
<!-- Use lucide icons only -->
<i data-lucide="user" class="lucide-xs"></i>
<i data-lucide="map" class="lucide-sm"></i>

<!-- Size classes -->
.lucide-xs { font-size: 16px; }
.lucide-sm { font-size: 18px; }

<!-- Color matches text role -->
color: var(--text-secondary); /* Most icons */
```

---

## ✍️ Copy Guidelines

### Headlines
❌ "Find Verified Professionals"  
✅ "Tradespeople in Mumbai"

❌ "Welcome back, User! 👋"  
✅ "Welcome, User"

### Descriptions
❌ "Upload a picture of any broken fixture..."  
✅ "Upload a picture of the issue..."

❌ "Expert electricians with upfront pricing"  
✅ "Electricians with fixed rates"

### Buttons
❌ "Request a visit →"  
✅ "Book visit"

❌ "Discover Services"  
✅ "Browse services"

### Labels
❌ "Active Bookings"  
✅ "Scheduled"

❌ "Workers Nearby"  
✅ "Available"

### Rules
- No emoji in interface text
- No exclamation marks (!)
- No hype words: expert, supercharge, revolutionize
- No "AI-powered" badges
- Sentence case everywhere
- Keep it specific to LocalKaam

---

## 🎬 Motion

```css
/* Transitions */
transition: color 150ms var(--ease);
transition: background 200ms var(--ease);
transition: transform 150ms var(--ease);

/* Never use */
transition: all; ❌

/* Easing */
--ease: cubic-bezier(0.4, 0, 0.2, 1);

/* Durations */
150ms /* Fast hover */
200ms /* Normal state change */
300ms /* Entrance */

/* No looping animations */
animation: pulse; ❌
```

---

## 🧩 Components

### Metric Card
```html
<div class="metric-card">
  <div class="metric-card-header">
    <span>Available</span>
    <i data-lucide="users" class="lucide-xs"></i>
  </div>
  <h2>24</h2>
</div>
```

### Button
```html
<!-- Primary -->
<button class="btn btn-primary">Book now</button>

<!-- Secondary -->
<button class="btn btn-secondary">View details</button>

<!-- No arrows or emoji -->
❌ [Book now →]
✅ [Book now]
```

### Status Badge
```html
<!-- Quiet, semantic only -->
<span class="badge badge-success">Verified</span>
<span class="badge badge-warning">In review</span>

<!-- No decoration badges -->
❌ <span class="badge">New ✨</span>
❌ <span class="badge">Gemini</span>
```

### Status Dot
```html
<!-- Signature detail for online/offline -->
<span class="status-dot online"></span> Online
<span class="status-dot offline"></span> Offline
```

---

## 📐 Radius (nested)

```css
/* Controls */
border-radius: 6px;   /* Small buttons, inputs */

/* Cards */
border-radius: 10px;  /* Compact cards */
border-radius: 14px;  /* Standard cards */

/* Panels */
border-radius: 18px;  /* Hero cards, modals */

/* Nested rule */
/* inner-radius = outer-radius - padding */
/* If card is 14px and padding is 16px: inner = 14-16 = keep 6px minimum */
```

---

## 🎭 Dark Mode

```css
[data-theme="dark"] {
  --text-primary: var(--graphite-50);
  --text-secondary: var(--graphite-400);
  --surface-base: #0f0f0f;
  --border-default: rgba(255, 255, 255, 0.08);
  
  /* Accent stays same */
  --accent: #f59e0b;
  
  /* Semantic backgrounds translucent */
  --success-bg: rgba(22, 163, 74, 0.15);
}
```

---

## ✅ Quick Checks

Before shipping any UI:

- [ ] All spacing values are multiples of 4px
- [ ] No emoji in text or labels
- [ ] Icons are lucide, consistent size
- [ ] Copy is specific to LocalKaam
- [ ] Headlines use sentence case
- [ ] Only 3 font weights used
- [ ] Accent used sparingly
- [ ] No looping animations
- [ ] Transitions name specific properties
- [ ] Radius is nested correctly

---

## 🎯 Signature Details

These are unique to LocalKaam — use them consistently:

1. **Distance rings** on map (circles showing km)
2. **Verification checkmarks** (phone → ID → skill → seal)
3. **₹ symbol** in all earnings/pricing
4. **Status dots** for online/offline
5. **OTP badges** for arrival verification
6. **Mumbai localities** in uppercase abbreviations

---

## 📚 Full Documentation

For complete guidelines, see:
- `UNSLOP_COMPLETE.md` — Full summary
- `UNSLOP_EXAMPLES.md` — Before/after comparisons
- `unslop-tokens.css` — All design tokens

---

**Keep the interface direct, reliable, and specific to LocalKaam's Mumbai service model.**
