// components/landing/AnnouncementBar.js
export function announcementBarHTML() {
  return `
  <div class="announce" id="announce-bar" role="region" aria-label="Announcement">
    <p><strong>New</strong> Counter-offers are live in every trade — agree the price before anyone shows up. <a href="#how-it-works">See how it works →</a></p>
    <button type="button" id="announce-close" aria-label="Dismiss announcement">✕</button>
  </div>`;
}
