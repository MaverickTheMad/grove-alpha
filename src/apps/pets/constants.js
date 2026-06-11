// ═══════════════════════════════════════════════════════════════════
//  constants.js — taxonomy + shared helpers for Grove · Pets
// ═══════════════════════════════════════════════════════════════════

export const SPECIES = [
  { value: 'dog', label: 'Dog', icon: '🐕' },
  { value: 'cat', label: 'Cat', icon: '🐈' },
  { value: 'other', label: 'Other', icon: '🐾' },
]

export const DOC_TYPES = [
  { value: 'receipt',  label: 'Receipt' },
  { value: 'invoice',  label: 'Invoice' },
  { value: 'lab',      label: 'Lab result' },
  { value: 'adoption', label: 'Adoption / records' },
  { value: 'insurance',label: 'Insurance' },
  { value: 'other',    label: 'Other' },
]

// Common vaccines for quick-add chips, by species.
export const COMMON_VACCINES = {
  dog: ['Rabies', 'DHPP', 'Bordetella', 'Leptospirosis', 'Canine Influenza', 'Lyme'],
  cat: ['Rabies', 'FVRCP', 'FeLV'],
  other: ['Rabies'],
}

// How many days ahead counts as "upcoming" in the Reminders tab.
export const UPCOMING_WINDOW_DAYS = 30

export const speciesMeta = (value) =>
  SPECIES.find((s) => s.value === value) || SPECIES[2]

// ─── local-time-safe date helpers ───────────────────────────────────

// Today as YYYY-MM-DD in local time.
export function todayStr() {
  const d = new Date()
  const off = d.getTimezoneOffset() * 60000
  return new Date(d - off).toISOString().slice(0, 10)
}

// Parse a YYYY-MM-DD string as a *local* date (avoids UTC drift).
export function parseLocalDate(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Whole days from today to a date string. Negative = overdue.
export function daysUntil(dateStr) {
  if (!dateStr) return null
  const target = parseLocalDate(dateStr)
  const now = parseLocalDate(todayStr())
  return Math.round((target - now) / 86400000)
}

// Human age from a birthday string, e.g. "3 yr 4 mo" or "7 mo".
export function ageFromBirthday(birthday) {
  if (!birthday) return null
  const b = parseLocalDate(birthday)
  const now = new Date()
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth())
  if (now.getDate() < b.getDate()) months -= 1
  if (months < 0) return 'not yet born'
  const yrs = Math.floor(months / 12)
  const mos = months % 12
  if (yrs === 0) return `${mos} mo`
  if (mos === 0) return `${yrs} yr`
  return `${yrs} yr ${mos} mo`
}

// Pretty-print a date string like "Mar 14, 2025".
export function fmtDate(dateStr) {
  const d = parseLocalDate(dateStr)
  if (!d) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Short relative phrase: "in 5 days", "today", "3 days ago".
export function relativeDays(dateStr) {
  const n = daysUntil(dateStr)
  if (n === null) return ''
  if (n === 0) return 'today'
  if (n === 1) return 'tomorrow'
  if (n === -1) return 'yesterday'
  if (n > 0) return `in ${n} days`
  return `${Math.abs(n)} days ago`
}

export function fmtMoney(n) {
  if (n == null || n === '') return ''
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
