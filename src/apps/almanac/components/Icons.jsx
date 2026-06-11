// Outline icons in the Grove house style: 1.75px stroke, round caps, currentColor.
// Same constants and shapes as Reps so the suite reads as one set.
const base = {
  fill: 'none', stroke: 'currentColor', strokeWidth: 1.75,
  strokeLinecap: 'round', strokeLinejoin: 'round',
}

// — Nav tab icons —

export function IconWeek({ size = 24 }) {
  // open book / agenda spread
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <path d="M3 5.5C3 4.7 3.7 4 4.5 4h6.5v15H4.5C3.7 19 3 18.3 3 17.5z" />
      <path d="M21 5.5C21 4.7 20.3 4 19.5 4H13v15h6.5c.8 0 1.5-.7 1.5-1.5z" />
      <line x1="12" y1="4" x2="12" y2="19" />
      <line x1="6" y1="8" x2="9" y2="8" />
      <line x1="6" y1="11" x2="9" y2="11" />
      <line x1="15" y1="8" x2="18" y2="8" />
      <line x1="15" y1="11" x2="18" y2="11" />
    </svg>
  )
}

export function IconMonth({ size = 24 }) {
  // calendar grid
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" />
      <line x1="8" y1="3" x2="8" y2="6.5" />
      <line x1="16" y1="3" x2="16" y2="6.5" />
      <circle cx="8" cy="13.5" r=".7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="13.5" r=".7" fill="currentColor" stroke="none" />
      <circle cx="16" cy="13.5" r=".7" fill="currentColor" stroke="none" />
      <circle cx="8" cy="17" r=".7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17" r=".7" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconUpcoming({ size = 24 }) {
  // checklist / clipboard
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <rect x="5" y="4.5" width="14" height="16" rx="2" />
      <path d="M9 4.5h6v2.5H9z" />
      <polyline points="8.5 11.5 9.8 12.8 12.2 10.4" />
      <line x1="13.5" y1="11.7" x2="16.5" y2="11.7" />
      <polyline points="8.5 16 9.8 17.3 12.2 14.9" />
      <line x1="13.5" y1="16.2" x2="16.5" y2="16.2" />
    </svg>
  )
}

// — Header utility icons —

export function IconPlus({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export function IconChevronLeft({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <polyline points="14 6 8 12 14 18" />
    </svg>
  )
}

export function IconChevronRight({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <polyline points="10 6 16 12 10 18" />
    </svg>
  )
}

export function IconExternal({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <polyline points="9 5 19 5 19 15" />
      <line x1="19" y1="5" x2="10" y2="14" />
      <path d="M14 12v6.5A1.5 1.5 0 0 1 12.5 20H6.5A1.5 1.5 0 0 1 5 18.5v-6A1.5 1.5 0 0 1 6.5 11H13" />
    </svg>
  )
}

// — The Almanac mark —
// A leaf cradling a date-tick — calendar meaning grown from the Grove leaf system.
// Drawn in house green (var(--accent)) per the Reps precedent; the Fern app-accent
// shows up elsewhere (today's ring, our-app events, identity tints).
export function AlmanacMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none"
      stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      {/* leaf silhouette: drop / almond shape, stem at top */}
      <path d="M14 3.5C8 6 4.5 10.5 4.5 16c0 4.5 3.8 8.5 9.5 8.5s9.5-4 9.5-8.5C23.5 10.5 20 6 14 3.5z" />
      {/* central stem / midrib doubles as the calendar "binding" */}
      <line x1="14" y1="6" x2="14" y2="22" />
      {/* a pair of "date ticks" on either side of the rib — the calendar cue */}
      <line x1="9" y1="13" x2="11.5" y2="13" />
      <line x1="9" y1="17" x2="11.5" y2="17" />
      <line x1="16.5" y1="13" x2="19" y2="13" />
      <line x1="16.5" y1="17" x2="19" y2="17" />
      {/* the Fern accent dot — today's marker, the one place the app color appears in the mark */}
      <circle cx="14" cy="11" r="1.3" fill="var(--app-accent)" stroke="none" />
    </svg>
  )
}
