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
}

export default function Icon({ name, size = 22, className }) {
  const d = PATHS[name] || PATHS.info
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
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
