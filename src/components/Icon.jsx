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
  overview: 'M4 5h16v14H4zM12 5v14M4 12h16',
  bills: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  budgets: 'M12 3v18M5 8h14M5 16h14',
  goals: 'M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0M12 12m-8 0a8 8 0 1 0 16 0 8 8 0 1 0-16 0',
  workout: 'M5 8v8M8 6v12M16 6v12M19 8v8M8 12h8',
  quest: 'M5 21V4M5 4h11l-2 4 2 4H5',
  upcoming: 'M5 5h14v15H5zM5 9h14M9 3v4M15 3v4M9 14l2 2 4-4',
  // navigation
  'chevron-left': 'M15 5l-7 7 7 7',
  'chevron-right': 'M9 5l7 7-7 7',
  check: 'M5 13l4 4L19 7',
  // content / domain
  camera: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
  paw: 'M11 12c0 2.2-1.8 4-4 4S3 14.2 3 12s1.8-4 4-4 4 1.8 4 4zM21 12c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4 4 1.8 4 4zM5 20c0-2.2 1.8-4 4-4h6c2.2 0 4 1.8 4 4',
  syringe: 'm18 2 4 4M7 11 2 6M14 4l6 6-9 9-6-1-1-6L14 4zM5 19l-3 3',
  pill: 'M10.5 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5M8 12h8M8 16h3M15.5 21.5l3-3M15.5 18.5l3 3',
  stethoscope: 'M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3M8 15v1a6 6 0 0 0 6 6h0a6 6 0 0 0 6-6v-4',
  scale: 'M12 3v18M3 9h18M5 15h14M9 3h6',
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
  // Sliders, not a cog: the dense multi-tooth gear read far heavier and larger
  // than every other tab glyph (it filled the whole 24-box). This sits in the
  // same optical box and weight as the rest of the nav set.
  settings: 'M4 8h9M17 8h3M4 16h3M11 16h9M14 5v6M8 13v6',
}

// Optical size correction. A few glyphs draw notably smaller/larger than the
// rest at the same 24-box, which made nav rows look uneven app-to-app (utensils
// and the dumbbell read small; the cart read wide). Scale them about the centre
// so every icon lands in the same optical box. 1.0 = untouched.
const OPTICAL = {
  meals: 1.06,
  recipes: 1.08,
  workout: 1.08,
  cart: 0.93,
}

export default function Icon({ name, size = 22, className, filled = false }) {
  const d = PATHS[name] || PATHS.info
  const k = OPTICAL[name] || 1
  const path = <path d={d} />
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
      {k === 1 ? path : (
        <g transform={`translate(12 12) scale(${k}) translate(-12 -12)`}>{path}</g>
      )}
    </svg>
  )
}
