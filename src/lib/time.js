// ── Time helpers — ONE copy for the whole suite (§6, §12) ───────────
// THE TIMEZONE BUG (already hit, do not repeat): never range-query with a
// bare "YYYY-MM-DDT00:00:00" string — Postgres reads it as UTC and late-evening
// local entries land on the wrong day. Convert a local day to a UTC range first.

// Local calendar day -> { startISO, endISO } as UTC timestamps.
export function localDayBounds(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const start = new Date(y, m - 1, d, 0, 0, 0, 0)        // local midnight
  const end = new Date(y, m - 1, d, 23, 59, 59, 999)     // local end of day
  return { startISO: start.toISOString(), endISO: end.toISOString() }
}

// UTC ISO timestamp -> local YYYY-MM-DD, for bucketing events by day.
export function isoToLocalDateStr(iso) {
  const dt = new Date(iso)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Today as a local YYYY-MM-DD.
export function todayStr() {
  return isoToLocalDateStr(new Date().toISOString())
}

// Add/subtract days from a YYYY-MM-DD, returning YYYY-MM-DD (local-safe).
export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return isoToLocalDateStr(dt.toISOString())
}

// Whole days between two YYYY-MM-DD strings (b - a).
export function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  const da = Date.UTC(ay, am - 1, ad)
  const db = Date.UTC(by, bm - 1, bd)
  return Math.round((db - da) / 86400000)
}
