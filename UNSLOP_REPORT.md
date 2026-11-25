# LocalKaam Unslop Report

**Applied by**: Kiro AI using unslop skill by @heydamir  
**Date**: November 25, 2026  
**License**: CC BY 4.0

---

## Direction

**Product**: LocalKaam connects homeowners with verified local tradespeople in Mumbai for immediate home repairs and services.

**Character**: Direct, reliable, neighborhood-focused. Like a trusted local directory meets real-time dispatch.

**World**: Mumbai neighborhoods, street-level service, verification badges, distance markers, local currency. Warm grey neutrals (Mumbai concrete and dust).

**Moments**:
- Live worker map with actual distance rings
- Verification timeline with real milestones (phone, ID, skill review)  
- Earnings chart for workers showing daily patterns

**Signature**: Distance rings on map, ₹ symbol in earnings, verification checkmark pattern, OTP status dots.

---

## Changes Applied (9 Passes)

### 1. Spacing

- **Before**: Inconsistent gaps (`0.25rem`, `0.5rem`, `1rem`, `1.75rem`)
- **After**: Everything on 4px grid (`4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `32px`)
- Padding follows density: compact panels 16px, cards 20-24px, page edges 24-32px
- Navigation rows 32-36px tall with 2-4px between them
- Tokens file created with complete spacing scale

### 2. Color

- **Before**: Mixed accent usage, possible purple gradients, colored badges
- **After**: One graphite ramp (Mumbai concrete tint), three text roles (primary/secondary/muted)
- Accent: warm amber `#f59e0b` from Mumbai service world
- Surfaces stay neutral, color lives in the moments (map, charts, verification)
- Borders are quiet hairlines at 8% opacity
- **Removed**: "Gemini" and "OSM Free" colored badges
- **Removed**: Any hue gradients, glows, colored shadows

### 3. Icons

- **Before**: Mixed emoji (👤, 🗺️, ⭐, 💬) + lucide icons
- **After**: Consistent lucide icons throughout, one size (16-18px), one stroke (1.5)
- Icons take text color role (usually secondary or muted)
- Removed emoji from labels and interface elements

### 4. Copy

- **Headlines**:
  - Before: "Find Verified Professionals"
  - After: "Tradespeople in Mumbai" (specific to product)
  
  - Before: "Welcome back, Damir! 👋"
  - After: "Welcome, Ramesh Kumar" (no emoji greeting)
  
  - Before: "Active Bookings" / "Completed Jobs"
  - After: "Scheduled" / "Completed" (shorter labels)

- **Descriptions**:
  - Before: "Upload a picture of any broken fixture. AI identifies category, likely materials & Mumbai rate estimate."
  - After: "Upload a picture of the issue. The system identifies the trade needed and estimates Mumbai market rates."
  
- **Buttons**:
  - Before: "Diagnose →" / "Open Map →" / "Request a visit"
  - After: "Upload photo" / "Open map" / "Book visit"

- **Status**:
  - Before: "Online (Accepting Jobs)" / "Offline (Click to Go Online)"
  - After: "Online" / "Go online"
  
  - Before: "Online & Discoverable"
  - After: "Online"

- **Removed**:
  - Exclamation marks from interface text
  - Hype words like "expert", "AI-powered" badges
  - Greeting headlines with emoji
  - Arrow symbols (→) from button text
  - "New ✨" style badges

### 5. Type

- **Font**: Inter (kept, it's part of the brand)
- **Sizes**: Established scale from 0.75rem to 1.875rem
- **Weights**: 400 (normal), 500 (medium), 600 (semibold) only
- **Case**: Sentence case everywhere
  - Before: "NAVIGATION", "Browse by Category"
  - After: "Navigation", "Browse by trade"
- Numbers use tabular-nums for alignment
- No italic for emphasis

### 6. Layout

- Kept all sections and feature order
- Dashboard proportions: sidebar 240-280px, fluid content capped ~1440px
- Action cards in asymmetric grid (not everything centered)
- Quick action cards maintain 2-column responsive grid
- Text blocks align left, centered only for 1-2 short lines

### 7. Details

- Metric cards: clean structure with label/value/icon
- Status dots: small circles for online/offline states
- Verification timeline: stepped list with consistent spacing
- Charts sit on muted grid with muted mono labels
- Counts become quiet text instead of glowing pills
- Hover states: small surface step with hairline highlight

### 8. Visuals

- No decorative filler (no glossy blobs, orbs, nebulas)
- Map moment: distance rings and real-time tracking
- Verification moment: timeline with checkmarks
- Dashboard moments come from actual data (earnings chart, verification progress)
- Product photos and worker avatars are the visual elements

### 9. Motion

- Removed `animate-pulse`, `animate-ping` on non-live elements
- Removed `transition-all` and bouncy springs
- Transition specific properties: `color`, `background`, `border`, `opacity`, `transform`
- One easing curve: `cubic-bezier(0.4, 0, 0.2, 1)`
- Durations: 150ms (fast), 200ms (base), 300ms (slow)
- Hover: quick color change, Press: tiny scale down

---

## Files Changed

1. **unslop-tokens.css** (created)
   - Complete design token system
   - Spacing scale (4px grid)
   - Graphite color ramp
   - Typography scale
   - Transition values

2. **css_enhancements.css** (updated)
   - Applied spacing tokens
   - Removed gradient backgrounds
   - Cleaned up badge styles
   - Fixed dark mode color contrast

3. **customer.js** (updated)
   - Headlines: "Tradespeople in Mumbai" vs "Find Verified Professionals"
   - Labels: "Available/Scheduled/Completed" vs "Workers Nearby/Active Bookings/Completed Jobs"
   - Removed badge decorations from feature cards
   - Shorter button text: "Upload photo" vs "Diagnose →"
   - Removed emoji from copy
   - Cleaned search placeholder text
   - Removed hype from empty states

4. **worker.js** (updated)
   - Removed greeting emoji from welcome message
   - Simplified status text: "Online" vs "Online (Accepting Jobs)"
   - Verification section: shorter labels
   - Button text: "Go online" vs "Offline (Click to Go Online)"
   - Requests heading: lowercase "requests" vs "Requests"
   - Empty state: "No requests" vs "No requests yet"

5. **components/landing/Hero.js** (updated)
   - Eyebrow: "Mumbai home services" vs "Mumbai's most trusted home services"
   - Headline: "Tradespeople in your neighborhood" vs "Expert help, just around the corner"
   - Subhead: removed "Fair prices, no middlemen" hype
   - Button: "Find someone" vs "Find a professional"
   - Button: "Browse trades" vs "Browse services"
   - Proof list: "ID verified" vs "ID-verified pros"
   - Proof list: "Direct payment" vs "0% commission"
   - Card button: "Book now" vs "Book this pro"
   - Card button: "Quote & OTP" vs "Live quote & OTP"
   - Footer note: "No platform fee" vs "0% platform commission"
   - Trust strip: shorter labels throughout

---

## Checklist ✓

- [x] Direction written and followed in every pass
- [x] Every spacing value on 4px scale
- [x] Icons, labels, numbers aligned in columns
- [x] One tinted neutral ramp, three text roles, one accent
- [x] No hue gradients, no glows, no gradient text
- [x] No emoji used as icons or decoration
- [x] Headlines specific to LocalKaam (not template text)
- [x] No exclamation marks in interface
- [x] No hype words (seamless, supercharge, revolutionize)
- [x] Badges quiet (removed "New ✨" style)
- [x] Sentence case throughout
- [x] Consistent icon sizes and stroke weight
- [x] Nested radius (inner = outer - padding)
- [x] No looping or bouncy motion
- [x] One easing curve
- [x] Signature details present (distance rings, verification steps, ₹ symbol)

---

## What Was NOT Changed

- Product name (LocalKaam)
- Logo (kept as-is)
- Features and functionality (all features remain)
- Section order (discover, map, bookings, etc.)
- Real data and content
- Mumbai locality focus
- Worker verification system
- OTP arrival verification
- Material sourcing feature
- Photo diagnosis capability

---

## Result

The interface now has:
- **One bright element**: Map with distance rings, or verification timeline with checkmarks
- **Quiet chrome**: Navigation, buttons and text use tinted neutrals and one amber accent
- **Clear idea**: Mumbai neighborhood service marketplace with verified tradespeople
- **Text on calm space**: Headlines sit in organized layouts with clear hierarchy
- **Real product**: Shows actual Mumbai localities, rupee pricing, verification milestones
- **Signature detail**: Distance markers, verification checkmarks, rupee symbol appear consistently

The screen could not fit another product—these details are specific to LocalKaam's Mumbai street-level service model.

---

## Credits

Unslopped using the **unslop skill** by **Damir Sokolovsky** (@heydamir)  
Skill: https://github.com/heydamir/unslop  
License: CC BY 4.0

Applied by Kiro AI in T3 Code environment.
