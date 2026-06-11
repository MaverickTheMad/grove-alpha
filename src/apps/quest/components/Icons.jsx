// Outline icons in the Grove house style: 1.75px stroke, round caps, currentColor.
const base = {
  fill: 'none', stroke: 'currentColor', strokeWidth: 1.75,
  strokeLinecap: 'round', strokeLinejoin: 'round',
}

// ── Tab bar icons ──────────────────────────────────────────────────

// Chronicle = an open book (the day's log)
export function IconBook({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <path d="M12 5.5 C 10 4 7 3.5 3.5 3.5 V 18.5 C 7 18.5 10 19 12 20.5" />
      <path d="M12 5.5 C 14 4 17 3.5 20.5 3.5 V 18.5 C 17 18.5 14 19 12 20.5" />
      <line x1="12" y1="5.5" x2="12" y2="20.5" />
    </svg>
  )
}

// Hero = a shield (character sheet / achievements)
export function IconShield({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <path d="M12 21 C 12 21 19 17.5 19 11 V 5.5 L 12 3 L 5 5.5 V 11 C 5 17.5 12 21 12 21 Z" />
    </svg>
  )
}

// Annals = a scroll / map (trends over time)
export function IconScroll({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <path d="M5 5.5 a 2.5 2.5 0 0 1 2.5 -2.5 H 17 a 2.5 2.5 0 0 1 2.5 2.5 v 1 a 2.5 2.5 0 0 1 -2.5 2.5 H 16" />
      <path d="M5 5.5 v 13 a 2.5 2.5 0 0 0 2.5 2.5 H 17 a 2.5 2.5 0 0 1 -2.5 -2.5 V 8.5" />
      <line x1="9" y1="12" x2="14" y2="12" />
      <line x1="9" y1="15.5" x2="14" y2="15.5" />
    </svg>
  )
}

// ── Quick-add icons (used in sheet headers / accents, optional) ──

export function IconFlask({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <line x1="9" y1="3" x2="15" y2="3" />
      <line x1="10" y1="3" x2="10" y2="9.5" />
      <line x1="14" y1="3" x2="14" y2="9.5" />
      <path d="M 10 9.5 L 5.5 18 a 2.5 2.5 0 0 0 2.2 3.5 h 8.6 a 2.5 2.5 0 0 0 2.2 -3.5 L 14 9.5 Z" />
    </svg>
  )
}

export function IconMoon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      <path d="M20 14.5 A 8 8 0 1 1 9.5 4 a 6.5 6.5 0 0 0 10.5 10.5 Z" />
    </svg>
  )
}

// ── The Quest Log mark: an open tome with a feather quill ──
// Drawn in 28x28 so it matches the Grove leaf mark size; uses app accent (plum).
export function QuestLogMark({ size = 26, color = 'var(--app-accent)' }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 28 28"
      fill="none" stroke={color} strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* open tome: two pages meeting at the spine */}
      <path d="M14 7 C 12 5.5 9 5 5 5 V 21 C 9 21 12 21.5 14 23" />
      <path d="M14 7 C 16 5.5 19 5 23 5 V 21 C 19 21 16 21.5 14 23" />
      {/* spine */}
      <line x1="14" y1="7" x2="14" y2="23" />
      {/* a feather quill, drawn diagonally across the right page (secondary purple) */}
      <path d="M21.5 8.5 L 16.5 14.5" stroke="var(--secondary)" />
      <path d="M21.5 8.5 L 22.5 11.5 L 19.5 10.5 Z" stroke="var(--secondary)" fill="var(--secondary)" />
    </svg>
  )
}
