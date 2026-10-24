// Plugin identifiers, task syntax, palettes and default settings.
const SIDE = 'persian-reminder-sidebar', DASH = 'persian-reminder-dashboard';
const TASK = /^(\s*(?:[-*+]|\d+[.)])\s+\[)([ xX])(\]\s*)(.*)$/;
const STAMP = /\(@(j:)?([0-9۰-۹٠-٩]{4})-([0-9۰-۹٠-٩]{2})-([0-9۰-۹٠-٩]{2})\s+([0-9۰-۹٠-٩]{2}):([0-9۰-۹٠-٩]{2})\)/g;
const OLD = /<!--\s*pr:([^|>]+)\|(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})\|([^>]*?)\s*-->/;
const PLACE = /📍\[([^\]\r\n]*)\]/g;
const TAG = /(?:^|\s)#([\p{L}\p{N}_-]+)/gu;

// 12 curated palettes (Tailwind-inspired). primary = clock/accent, secondary = date pill/background.
const PALETTES = {
  lavender: { primary: '#a78bfa', secondary: '#c4b5fd', name: 'یاسی' },
  sky:      { primary: '#60a5fa', secondary: '#93c5fd', name: 'آبی آسمانی' },
  pink:     { primary: '#f472b6', secondary: '#f9a8d4', name: 'صورتی' },
  mint:     { primary: '#34d399', secondary: '#6ee7b7', name: 'نعنایی' },
  peach:    { primary: '#fb923c', secondary: '#fdba74', name: 'هلویی' },
  slate:    { primary: '#94a3b8', secondary: '#cbd5e1', name: 'خاکستری آبی' },
  purple:   { primary: '#c084fc', secondary: '#e9d5ff', name: 'ارغوانی' },
  teal:     { primary: '#2dd4bf', secondary: '#99f6e4', name: 'فیروزه‌ای' },
  rose:     { primary: '#fb7185', secondary: '#fecdd3', name: 'گلبهی' },
  amber:    { primary: '#f59e0b', secondary: '#fcd34d', name: 'کهربایی' },
  indigo:   { primary: '#818cf8', secondary: '#a5b4fc', name: 'نیلی' },
  forest:   { primary: '#4ade80', secondary: '#86efac', name: 'سبز جنگلی' },
};

const DEFAULTS = {
  clickMode: 'double',
  dateFormat: 'jalali',
  palette: 'lavender',
  taskStyle: 'soft',
  stampStyle: 'soft',
  inlineTextColor: '#182e3a',
  badgeColors: { inline: {a:'#67D5ED',b:'#A5B4FC',border:'#478EBB'}, date:{a:'#93C5FD',b:'#BAE6FD',border:'#548BCB'}, remaining:{a:'#6EE7B7',b:'#A7F3D0',border:'#39A781'} },
  gradientAngle: 120,
  cardTint: 10,
  remainingRulesEnabled: true,
  remainingColors: {
    today: { a: '#FCD34D', b: '#FDE68A', border: '#D5A42B' },
    overdue: { a: '#FDA4AF', b: '#FECDD3', border: '#D37888' },
    done: { a: '#CBD5E1', b: '#E2E8F0', border: '#94A3B8' }
  },
  remainingRules: [
    { id: 'one-day', days: 1, enabled: true, a: '#FDBA74', b: '#FED7AA', border: '#D99550' },
    { id: 'one-week', days: 7, enabled: true, a: '#93C5FD', b: '#BAE6FD', border: '#548BCB' }
  ],
  dailyUseTemplater: false,
  dailyTemplatePath: '',
  soonHours: 24,
  notificationMode: 'modal',
  snoozeMinutes: 10,
  defaultNote: 'یادآوری‌ها.md',
  dailyFolder: '',        // '' = root; otherwise e.g. 'Daily'
  dailyHeading: '## یادآوری‌ها',
  dailyCalendar: 'gregorian',
  dailyFormat: 'YYYY-MM-DD',
  dailyUseCore: false,
  tagColors: {},
  pinned: [],
  notified: {},
};

module.exports = { SIDE, DASH, TASK, STAMP, OLD, PLACE, TAG, PALETTES, DEFAULTS };
