# FRONTEND PLAYBOOK: audit + UI/UX upgrade plan

> **Audience:** Antigravity / Gemini / any coding agent. Read this ENTIRE file before touching code.
> **Repo:** https://github.com/harsh020508/coders_sujal (Sumit's frontend work, commit author `singhsumit21`)
> **Baseline commit:** `a4e2a9f`, "feat(ui): complete frontend redesign with Lucide icons, responsive SaaS layout, and live verification"
> **Goal:** Win the hackathon. The demo must look trustworthy and polished, must never break on stage, and must take the least possible code to get there.
> **How to start:** Do Phase 0 (Section 9), then STOP and report. Do not do all phases in one go.

---

## 0. Rules of engagement (non-negotiable)

1. **Do not touch logic.** Leave Supabase calls, auth flow, data fetching, event handlers, element `id`s, `data-*` attributes and any class name that JavaScript selects on exactly as they are. Restyle by *adding* classes.
2. **Additive first.** Create a new `ui.css` (loaded AFTER `styles.css`) and a new `ui.js` (helpers). Move screens onto the new classes one at a time. Delete dead CSS only at the very end, and only if you are sure.
3. **One phase at a time.** After each phase: run the app, confirm the browser console has zero errors, check 390px and 1280px widths, then `git commit -m "ui: phase N - <what>"`.
4. **Read before editing.** View a file fully before changing it. Before renaming or removing anything, `grep` for every usage.
5. **No new frameworks or build tools.** The stack is plain HTML + ES modules + CSS + CDN scripts. No React, Tailwind, npm, bundlers, animation libraries.
6. **Out of scope:** dark mode, i18n framework, new pages that don't exist, new backend features.
7. **No emoji in the UI.** Use Lucide icons only. (Emoji may stay in `data.js` as unused legacy fields.)
8. **Never invent data or claims.** If a field doesn't exist (price, ETA, experience), hide that element. Do not write trust claims the app doesn't actually perform (for example "Police verified"). If verification is simulated, label it honestly. Judges notice fake-looking claims.
9. **Smallest change that works.** When unsure, do less.
10. **Always report back:** list files changed, what to click to test it, and anything you skipped and why.

---

## 1. Project snapshot

### Confirmed from commit `a4e2a9f`
- 7 files changed: `app.js`, `authModal.js`, `customer.js`, `data.js`, `index.html`, `styles.css`, `worker.js` (+1,468 / -742).
- Plain ES modules, no build step. `index.html` imports `AuthService` from `./authService.js` and `Toast` from `./toast.js`, then calls `App.init()`.
- CDN scripts: Lucide (`lucide@latest`) and Supabase JS (`@supabase/supabase-js@2`).
- Fonts: Bricolage Grotesque (display), Inter (body), JetBrains Mono.
- `data.js` has 10 `CATEGORIES`: `electrician, plumber, carpenter, painter, ac_repair, appliance_repair, cleaning, shifting, pest_control, other`. Each has `id, name, icon (emoji), lucideIcon, image (Unsplash URL), description, subcategories[]`.
- `data.js` has `INITIAL_WORKERS`, each with `verificationStatus, ratingAverage, ratingCount, avatar, specialities: { <categoryId>: { tasks: [...] } }`.
- Two roles exist: customer (`customer.js`) and worker (`worker.js`), with a shared `authModal.js`.

---

## 2. Audit findings confirmed from the diff

Severity: **P0** = can break or embarrass the demo, **P1** = visible quality gap, **P2** = polish.

| ID | Sev | Finding | Fix |
|----|-----|---------|-----|
| F1 | P0 | **Icon refresh is fragile.** `window.refreshIcons()` is called once, right after `App.init()`. Lucide only converts `<i data-lucide>` tags present at that moment. Every later render (modal open, tab switch, filter, toast, async Supabase result) creates new `<i>` tags that stay **blank** unless that exact code path calls `refreshIcons()`. | Section 5.3: a MutationObserver that refreshes icons automatically. |
| F2 | P0 | **Unpinned CDNs.** `lucide@latest` and `supabase-js@2` can change under you on demo day. | Pin exact versions and add `defer` (Section 5.4). Optionally vendor the files locally. |
| F3 | P0 | **Hotlinked Unsplash images with no fallback** (10 category images and several avatars). Bad venue Wi-Fi gives broken-image icons in front of judges. | Download to `/assets/img/` as WebP, add `onerror` fallbacks, set `width`/`height` and `loading="lazy"` (Sections 5.2, 8). |
| F4 | P1 | **Thin seed data.** The diff shows only about 4 seeded workers (plumber, electrician, carpenter, cleaning specialities visible) for 10 categories. Painter, AC, pest control and shifting likely show an empty list. | Seed at least 2 workers per category (Section 8.3), or the empty state must look intentional (Section 6.8). |
| F5 | P1 | **Icon semantics weak / one name suspicious.** `tool` is a legacy Feather name and may not resolve in current Lucide. `cpu` for appliances, `fan` for AC, `shield-alert` for pest control read oddly. | Use the icon table in Section 5.5 and run the console check there. |
| F6 | P1 | **Two icon systems.** Every category carries both an emoji `icon` and a `lucideIcon`. If any template still prints `cat.icon`, the UI mixes emoji and line icons. | `grep` for `.icon` usage (Section 3) and switch all of it to `lucideIcon`. |
| F7 | P1 | **Font payload.** 11 font weights across 3 families (Bricolage 600/700/800, Inter 300-700, JetBrains Mono 400/500/600). | Use variable-axis URLs and drop mono unless it's used (Section 5.4). |
| F8 | P1 | **Render-blocking scripts** in `<head>` without `defer`. | Add `defer` (Section 5.4). |
| F9 | P1 | **Category names changed** (`'AC repair and servicing'` became `'AC repair & servicing'`, `'Other services'` became `'Handyman & custom tasks'`). IDs were kept, which is good. If any filter or stored record matches on `name` instead of `id`, it silently breaks. | `grep` for `.name ===` / `category ===` and make sure matching is by `id`. |
| F10 | P2 | `'Handyman & custom tasks'` is too long for a tile label. | Show a short label ("Handyman") on the tile and keep the long text as the description. |
| F11 | P2 | One avatar was swapped to fix a gender/name mismatch, so more may exist. | Check every worker's photo against their name (Section 8.3), or use initials avatars. |
| F12 | P2 | Git hygiene: a 1.4k-line commit and an open PR. Further large edits risk merge pain and losing a working demo. | `git tag demo-safe-a4e2a9f` now; branch per phase; small commits. |

---

## 3. Agent self-audit protocol (do this BEFORE changing any code)
...
