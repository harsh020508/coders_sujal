// components/landing/AnnouncementBar.js — editorial ticker with direct negotiation preview.
// Preserved contracts: #announce-bar, #announce-close, .announce-badge.

export function announcementBarHTML() {
  return `
  <div class="announce" id="announce-bar" role="region" aria-label="Announcement">
    <span class="announce-badge">Live</span>
    <p>Negotiate directly with verified Mumbai pros — agree on a price and arrival slot upfront. <a href="#how-it-works">See how it works</a></p>
    <button type="button" id="announce-close" aria-label="Dismiss announcement"><i data-lucide="x" class="lucide-xs" aria-hidden="true"></i></button>
  </div>`;
}
