// Outline icons in the Grove house style: 1.75px stroke, round caps, currentColor.
const base = {
  fill: 'none', stroke: 'currentColor', strokeWidth: 1.75,
  strokeLinecap: 'round', strokeLinejoin: 'round',
}

export function IconDumbbell({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <line x1="7" y1="12" x2="17" y2="12" />
      <rect x="2.5" y="8.5" width="3" height="7" rx="1" />
      <rect x="18.5" y="8.5" width="3" height="7" rx="1" />
      <line x1="1" y1="10" x2="1" y2="14" />
      <line x1="23" y1="10" x2="23" y2="14" />
    </svg>
  )
}

export function IconTrend({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <polyline points="3 16 9 10 13 14 21 6" />
      <polyline points="15 6 21 6 21 12" />
    </svg>
  )
}

export function IconGift({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <rect x="3" y="9" width="18" height="12" rx="1.5" />
      <line x1="3" y1="13" x2="21" y2="13" />
      <line x1="12" y1="9" x2="12" y2="21" />
      <path d="M12 9C12 9 11 4 8 4a2.2 2.2 0 0 0 0 5z" />
      <path d="M12 9C12 9 13 4 16 4a2.2 2.2 0 0 1 0 5z" />
    </svg>
  )
}

// The Reps app mark — a barbell, distinct from the shared Grove leaf.
// Grove outline style (house green), echoing the Workout tile on the dashboard.
export function RepsMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none"
      stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="6" y1="14" x2="22" y2="14" />
      <rect x="6" y="8.5" width="2.6" height="11" rx="1.1" />
      <rect x="19.4" y="8.5" width="2.6" height="11" rx="1.1" />
      <rect x="3.2" y="10.5" width="2.2" height="7" rx="1" />
      <rect x="22.6" y="10.5" width="2.2" height="7" rx="1" />
      <line x1="1.6" y1="11.5" x2="1.6" y2="16.5" />
      <line x1="26.4" y1="11.5" x2="26.4" y2="16.5" />
    </svg>
  )
}
