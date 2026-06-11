// Outline icons in the Grove house style: 1.75px stroke, round caps, currentColor.
const base = {
  fill: 'none', stroke: 'currentColor', strokeWidth: 1.75,
  strokeLinecap: 'round', strokeLinejoin: 'round',
}

export function IconBell({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </svg>
  )
}

export function IconPaw({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <ellipse cx="7"  cy="7"  rx="2"   ry="2.4" />
      <ellipse cx="12" cy="5"  rx="2"   ry="2.4" />
      <ellipse cx="17" cy="7"  rx="2"   ry="2.4" />
      <ellipse cx="4.2" cy="12" rx="1.8" ry="2.2" />
      <ellipse cx="19.8" cy="12" rx="1.8" ry="2.2" />
      <path d="M12 11c-3 0-5.5 2-6 4.5-.4 2 1 3.5 3 3.5 1.2 0 2-.7 3-.7s1.8.7 3 .7c2 0 3.4-1.5 3-3.5-.5-2.5-3-4.5-6-4.5z" />
    </svg>
  )
}

export function IconDoc({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="14 3 14 9 20 9" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </svg>
  )
}

export function IconPlus({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export function IconCheck({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function IconAlert({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="13" />
      <circle cx="12" cy="16.5" r=".6" fill="currentColor" />
    </svg>
  )
}

export function IconClock({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  )
}

export function IconSyringe({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <line x1="18" y1="2" x2="22" y2="6" />
      <line x1="17" y1="3" x2="13.5" y2="6.5" />
      <line x1="20" y1="7" x2="14" y2="13" />
      <path d="M14 13l-3 3 1.5 1.5L11 19l-4-4 1.5-1.5L10 15l3-3" />
      <line x1="7" y1="15" x2="3" y2="19" />
    </svg>
  )
}

export function IconPill({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <rect x="2" y="9" width="20" height="6" rx="3" transform="rotate(-30 12 12)" />
      <line x1="9" y1="7.5" x2="14.5" y2="16.5" />
    </svg>
  )
}

export function IconScale({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 9c1 1.2 4 1.2 6 0" />
      <line x1="12" y1="13" x2="12" y2="17" />
    </svg>
  )
}

export function IconStethoscope({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <path d="M6 3v6a4 4 0 0 0 8 0V3" />
      <path d="M10 13v3a4 4 0 0 0 8 0v-1" />
      <circle cx="18" cy="11" r="2" />
    </svg>
  )
}

export function IconCamera({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <path d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}

export function IconEdit({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

// The Pets app mark — a paw print, mirrors the dashboard tile / app icon.
// Honey at full strength when used as identity (header wordmark).
export function PawMark({ size = 26, color = 'var(--app-accent)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <g fill={color}>
        <ellipse cx="8.5"  cy="10" rx="2.4" ry="3.1" />
        <ellipse cx="13.4" cy="7"  rx="2.3" ry="2.9" />
        <ellipse cx="18.4" cy="10" rx="2.4" ry="3.1" />
        <ellipse cx="4.6"  cy="14.5" rx="1.9" ry="2.4" />
        <ellipse cx="22.4" cy="14.5" rx="1.9" ry="2.4" />
        <path d="M13.5 13.5
                 c -3.6 0 -6.8 2.2 -7.6 5.4
                 c -.7 2.5  .8 4.8  3.5 5.5
                 c 1.5  .4  2.8 -.6  4.1 -.6
                 c 1.3  0   2.6  1   4.1  .6
                 c 2.7 -.7  4.2 -3   3.5 -5.5
                 c -.8 -3.2 -4 -5.4 -7.6 -5.4 z" />
      </g>
    </svg>
  )
}
