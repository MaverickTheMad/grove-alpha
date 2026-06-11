// One outline icon set for the whole suite (BRAND-GUIDE §6): ~1.75px stroke,
// rounded caps, currentColor. Icons always pair with a label (§8).
const PATHS = {
  // apps
  journal: 'M12 3a4 4 0 0 0-4 4c0 4 4 7 4 14 0-7 4-10 4-14a4 4 0 0 0-4-4Z',
  pantry: 'M4 8h16M6 8v11a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8M9 5h6l1 3H8l1-3Z',
  ledger: 'M5 4h14v16H5zM9 8h6M9 12h6M9 16h3',
  pets: 'M7 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM12 20c4 0 6-2 6-4s-2-3-6-3-6 1-6 3 2 4 6 4Z',
  media: 'M4 5h16v12H4zM10 8.5l5 2.5-5 2.5z M8 21h8',
  // tabs / actions
  log: 'M12 5v14M5 12h14',
  trends: 'M4 19V5M4 19h16M8 15l3-4 3 2 4-6',
  calendar: 'M5 5h14v15H5zM5 9h14M9 3v4M15 3v4',
  meals: 'M5 4v16M9 4v6a2 2 0 0 1-4 0M16 4c-2 0-3 3-3 6h3v10',
  recipes: 'M6 4h9a3 3 0 0 1 3 3v13H6zM6 16h12',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  extras: 'M12 5v14M5 12h14',
  overview: 'M4 13h6V4H4zM14 20h6v-9h-6zM14 8h6V4h-6zM4 20h6v-3H4z',
  bills: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  budgets: 'M12 3v18M5 8h14M5 16h14',
  goals: 'M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0M12 12m-8 0a8 8 0 1 0 16 0 8 8 0 1 0-16 0',
  workout: 'M5 8v8M8 6v12M16 6v12M19 8v8M8 12h8',
  quest: 'M5 21V4M5 4h11l-2 4 2 4H5',
  upcoming: 'M5 5h14v15H5zM5 9h14M9 3v4M15 3v4M9 14l2 2 4-4',
  // ui
  close: 'M6 6l12 12M18 6 6 18',
  back: 'M15 5l-7 7 7 7',
  trash: 'M5 7h14M9 7V5h6v2M7 7l1 13h8l1-13',
  sun: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  moon: 'M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z',
  info: 'M12 8h.01M11 12h1v4h1M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
  search: 'M11 11m-7 0a7 7 0 1 0 14 0 7 7 0 1 0-14 0M21 21l-4.3-4.3',
  edit: 'M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3M13.5 6.5l3 3',
  heart: 'M12 20s-7-4.5-9.5-9A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 9.5 5c-2.5 4.5-9.5 9-9.5 9Z',
  print: 'M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v7H6z',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  clock: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',
  users: 'M16 19v-2a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v2M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 19v-2a3 3 0 0 0-2.2-2.9M16 4.1a3 3 0 0 1 0 5.8',
  cart: 'M3 4h2l2.4 12h10l2-8H6M9 20a1 1 0 1 0 0 .01M17 20a1 1 0 1 0 0 .01',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z',
}

export default function Icon({ name, size = 22, className, filled = false }) {
  const d = PATHS[name] || PATHS.info
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}
