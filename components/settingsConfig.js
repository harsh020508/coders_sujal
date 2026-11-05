// LocalKaam — settings navigation registry
// Single source of truth for the sidebar, search and page headers.
export const SETTINGS_CATEGORIES = [
  {
    id: 'general',
    label: 'General',
    items: [
      {
        id: 'general',
        icon: 'sliders',
        label: 'General',
        description: 'Language, startup behaviour and everyday preferences.',
        keywords: 'language enter key startup default landing autosave save behaviour behavior'
      },
      {
        id: 'appearance',
        icon: 'color',
        label: 'Appearance',
        description: 'Theme, accent colour, type size and interface density.',
        keywords: 'dark light system theme accent color colour font size density compact comfortable contrast'
      },
      {
        id: 'notifications',
        icon: 'bell',
        label: 'Notifications',
        description: 'Choose which updates reach you, and where.',
        keywords: 'email push important booking promotions alerts digest sounds'
      }
    ]
  },
  {
    id: 'account',
    label: 'Account',
    items: [
      {
        id: 'profile',
        icon: 'user',
        label: 'Profile',
        description: 'Manage how you appear across LocalKaam.',
        keywords: 'avatar photo picture display name username email bio phone locality profile'
      },
      {
        id: 'reviews',
        icon: 'star',
        label: 'Reviews & Ratings',
        description: 'Customer feedback, ratings and your replies.',
        keywords: 'reviews ratings feedback stars respond customer replies'
      },
      {
        id: 'security-login',
        icon: 'shield',
        label: 'Security & Login',
        description: 'Password, active session and login protection.',
        keywords: 'password 2fa two factor authentication sessions login alerts timeout sign out devices'
      },
      {
        id: 'account',
        icon: 'account',
        label: 'Account',
        description: 'Plan details, data export and account controls.',
        keywords: 'plan export data reset role delete account sign out membership'
      },
      {
        id: 'privacy',
        icon: 'lock',
        label: 'Privacy',
        description: 'Decide what others can see and how your data is used.',
        keywords: 'visibility online status activity email personal data privacy permissions'
      }
    ]
  },
  {
    id: 'preferences',
    label: 'Preferences',
    items: [
      {
        id: 'personalization',
        icon: 'sparkles',
        label: 'Personalization',
        description: 'Shape the recommendations and offers you receive.',
        keywords: 'recommendations jobs services digest recently viewed interests offers'
      },
      {
        id: 'language',
        icon: 'globe',
        label: 'Language',
        description: 'Language availability and regional formatting.',
        keywords: 'english hindi marathi gujarati tamil telugu translation region date time'
      },
      {
        id: 'keyboard-shortcuts',
        icon: 'keyboard',
        label: 'Keyboard Shortcuts',
        description: 'Review and customise LocalKaam shortcuts.',
        keywords: 'shortcuts keys ctrl command hotkeys accessibility keyboard'
      }
    ]
  },
  {
    id: 'additional',
    label: 'Additional',
    items: [
      {
        id: 'help-support',
        icon: 'help',
        label: 'Help & Support',
        description: 'Answers, documentation and ways to reach the team.',
        keywords: 'faq contact support documentation report bug help centre center email'
      },
      {
        id: 'complaints',
        icon: 'alert',
        label: 'Complaints',
        description: 'View and file complaints about bookings.',
        keywords: 'complaints disputes issues report resolution status'
      },
      {
        id: 'about',
        icon: 'info',
        label: 'About',
        description: 'Version, credits and project information.',
        keywords: 'version credits license github team technology about build'
      }
    ]
  }
];

export const SETTINGS_SECTIONS = SETTINGS_CATEGORIES.reduce((all, category) => {
  return all.concat(category.items.map((item) => ({ ...item, category: category.label })));
}, []);

export function getSettingsSection(id) {
  return SETTINGS_SECTIONS.find((section) => section.id === id) || SETTINGS_SECTIONS[0];
}

export function searchSettings(query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return SETTINGS_SECTIONS;
  return SETTINGS_SECTIONS.filter((section) => {
    const haystack = `${section.label} ${section.description} ${section.keywords} ${section.category}`.toLowerCase();
    return haystack.includes(needle);
  });
}
