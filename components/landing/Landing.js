// components/landing/Landing.js — landing page assembly (v4).
// Kept contracts: all section ids, announcement ids, drawer, shortcuts modal.
import { announcementBarHTML } from './AnnouncementBar.js';
import { navHTML, drawerHTML, shortcutsModalHTML } from './Navbar.js';
import { heroHTML, trustStripHTML } from './Hero.js';
import { servicesHTML, whyHTML } from './Showcase.js';
import { essentialHTML, discoveryHTML, testimonialsHTML } from './Proof.js';
import { howHTML, faqHTML, finalCTAHTML, footerHTML } from './Convert.js';

export function landingHTML({ theme }) {
  return `
  <a class="lk-skip-link" href="#services">Skip to content</a>
  ${announcementBarHTML()}
  ${drawerHTML()}
  ${navHTML(theme)}
  <main id="lk-main">
    ${heroHTML()}
    ${trustStripHTML()}
    ${servicesHTML()}
    ${howHTML()}
    ${whyHTML()}
    ${essentialHTML()}
    ${discoveryHTML()}
    ${testimonialsHTML()}
    ${faqHTML()}
    ${finalCTAHTML()}
  </main>
  ${footerHTML()}
  ${shortcutsModalHTML()}`;
}
