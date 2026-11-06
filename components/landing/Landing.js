// components/landing/Landing.js — landing ONLY assembly (brief order).
import { announcementBarHTML } from './AnnouncementBar.js';
import { navHTML, drawerHTML, shortcutsModalHTML } from './Navbar.js';
import { heroHTML } from './Hero.js';
import { servicesHTML, whyHTML } from './Showcase.js';
import { essentialHTML, statsHTML, discoveryHTML, testimonialsHTML } from './Proof.js';
import { howHTML, faqHTML, finalCTAHTML, footerHTML } from './Convert.js';

export function landingHTML({ theme, t, CATEGORIES, esc }) {
  return `
  <a class="lk-skip" href="#services">Skip to content</a>
  ${announcementBarHTML()}
  ${drawerHTML()}
  ${navHTML(theme)}
  <main id="lk-main">
    ${heroHTML()}
    ${servicesHTML(esc)}
    ${whyHTML()}
    ${essentialHTML()}
    ${statsHTML()}
    ${discoveryHTML()}
    ${testimonialsHTML()}
    ${howHTML()}
    ${faqHTML()}
    ${finalCTAHTML()}
  </main>
  ${footerHTML()}
  ${shortcutsModalHTML()}`;
}
