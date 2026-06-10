// Pay cycle math. A pay cycle is a 14-day window anchored to a known date
// (typically a person's primary paycheck date).
//
// Each person has their own cycle (anchored to their own paycheck), so cycle
// math is always relative to a specific anchor date — no global "current cycle".

const MS_PER_DAY = 24 * 60 * 60 * 1000
const CYCLE_DAYS = 14

/**
 * Parse a YYYY-MM-DD string into a Date at midnight LOCAL time.
 */
export function parseISODate(iso) {
  if (!iso) return new Date()
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function daysBetween(a, b) {
  const a0 = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const b0 = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((b0 - a0) / MS_PER_DAY)
}

/**
 * Given an anchor date and a reference date, return the pay-cycle window
 * containing the reference date.
 * @returns {{ start, end, startISO, endISO, daysIn, daysLeft, index }}
 */
export function getPayCycle(anchorISO, ref = new Date(), offset = 0) {
  if (!anchorISO) return null
  const anchor = parseISODate(anchorISO)
  const days = daysBetween(anchor, ref)
  const baseIndex = Math.floor(days / CYCLE_DAYS)
  const index = baseIndex + offset
  const start = new Date(anchor.getTime() + index * CYCLE_DAYS * MS_PER_DAY)
  const end = new Date(start.getTime() + CYCLE_DAYS * MS_PER_DAY)
  const todayDays = daysBetween(start, ref)
  return {
    start, end,
    startISO: toISODate(start),
    endISO: toISODate(end),
    daysIn: Math.max(0, Math.min(CYCLE_DAYS, todayDays + 1)),
    daysLeft: Math.max(0, CYCLE_DAYS - todayDays - 1),
    index
  }
}

export function formatCycleLabel(cycle) {
  if (!cycle) return '—'
  const lastDay = new Date(cycle.end.getTime() - MS_PER_DAY)
  const sameYearAsToday =
    cycle.start.getFullYear() === new Date().getFullYear() &&
    lastDay.getFullYear() === new Date().getFullYear()
  const startStr = cycle.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const endStr = lastDay.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
    year: sameYearAsToday ? undefined : 'numeric'
  })
  return `${startStr} – ${endStr}`
}

/**
 * Resolve a person's pay-cycle anchor by looking up their primary paycheck.
 * Falls back to any paycheck owned by that person if no primary is set.
 * Returns the anchor ISO date string, or null if none can be determined.
 */
export function resolvePersonAnchor(person, paychecks) {
  if (!person) return null
  // Primary paycheck first
  if (person.primary_paycheck_id) {
    const p = paychecks.find(p => p.id === person.primary_paycheck_id)
    if (p?.next_date) return p.next_date
  }
  // Otherwise fall back to the first paycheck for this person
  const ownedPaycheck = paychecks.find(p => p.person_id === person.id && p.next_date)
  return ownedPaycheck?.next_date || null
}

/**
 * For a given list of transactions and a cycle window, compute the spend
 * attributable to a person — counting their tagged transactions fully and
 * shared transactions (person_id = null) at 50%.
 *
 * @param {Array}  txns         list of transactions with {date, amount, person_id, category_id}
 * @param {string} startISO     cycle start inclusive
 * @param {string} endISO       cycle end exclusive
 * @param {string} personId     the person whose cycle this is
 * @param {string} categoryId   optional filter to a single category
 * @returns {number} absolute amount spent (positive number)
 */
export function spendInCycleForPerson(txns, startISO, endISO, personId, categoryId = null) {
  let total = 0
  for (const t of txns) {
    if (t.date < startISO || t.date >= endISO) continue
    if (Number(t.amount) >= 0) continue
    if (categoryId && t.category_id !== categoryId) continue
    const absAmt = Math.abs(Number(t.amount))
    if (t.person_id === personId) {
      total += absAmt
    } else if (t.person_id == null) {
      total += absAmt * 0.5
    }
    // person-tagged for someone else: skip
  }
  return total
}
