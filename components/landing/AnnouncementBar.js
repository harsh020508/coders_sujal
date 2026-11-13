// components/landing/AnnouncementBar.js
export function announcementBarHTML() {
  return `
  <div class="announce" id="announce-bar" role="region" aria-label="Announcement">
    <span class="announce-badge">Live now</span>
    <p>Negotiate directly with your pro — agree the price before anyone arrives. <a href="#how-it-works">See how it works →</a></p>
    <button type="button" id="announce-close" aria-label="Dismiss announcement"><i data-lucide="x" class="lucide-xs"></i></button>
  </div>`;
}
