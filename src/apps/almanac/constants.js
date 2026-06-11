// =============================================================================
// constants.js — ALL taxonomy + pure helper functions (build spec §5)
// Tabs stay presentational; the gnarly math lives here and is unit-tested.
// =============================================================================

export const FAMILY_TZ = 'America/New_York'

// --- event kinds: label, color var, icon -----------------------------------
// Colors are routed through CSS vars so dark mode recolors automatically.
export const KINDS = {
  bill:   { label: 'Bill',     icon: '🧾', color: 'var(--kind-bill)' },
  payday: { label: 'Payday',   icon: '💵', color: 'var(--kind-payday)' },
  goal:   { label: 'Goal',     icon: '🎯', color: 'var(--kind-goal)' },
  flow:   { label: 'Period',   icon: '🌙', color: 'var(--kind-flow)' },
  predicted_flow: { label: 'Period (predicted)', icon: '🌒', color: 'var(--kind-flow)' },
  meal:   { label: 'Meal',     icon: '🍽️', color: 'var(--kind-meal)' },
  pet:    { label: 'Pet',      icon: '🐾', color: 'var(--kind-pet)' },
  gcal:   { label: 'Calendar', icon: '📅', color: 'var(--kind-gcal)' },
  family: { label: 'Family',   icon: '📌', color: 'var(--kind-family)' },
}

export const kindMeta = (kind) => KINDS[kind] || KINDS.family

// which source app a row links back to
export const SOURCE_LINKS = {
  bill:   'https://budget.reilly.live',
  payday: 'https://budget.reilly.live',
  goal:   'https://budget.reilly.live',
  flow:   'https://ren.reilly.live',
  predicted_flow: 'https://ren.reilly.live',
  meal:   'https://shopping.reilly.live',
  pet:    'https://pets.reilly.live',
}
export const sourceLink = (kind) => SOURCE_LINKS[kind] || null

// =============================================================================
// Time helpers — store UTC, bucket in LOCAL time (build spec §5)
// =============================================================================

// YYYY-MM-DD for "today" in local time
export function todayStr(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// UTC range covering a local calendar day; use in every date-range query.
export function localDayBounds(dateStr) {
  const start = new Date(`${dateStr}T00:00:00`)        // local midnight
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { startISO: start.toISOString(), endISO: end.toISOString() }
}

// UTC ISO timestamp -> local YYYY-MM-DD (for bucketing events by day)
export function isoToLocalDateStr(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return todayStr(d)
}

// parse a YYYY-MM-DD as a LOCAL date (avoids the UTC-shift gotcha of new Date(str))
export function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// add n days to a YYYY-MM-DD, return YYYY-MM-DD
export function addDays(dateStr, n) {
  const d = parseLocalDate(dateStr)
  d.setDate(d.getDate() + n)
  return todayStr(d)
}

// Sunday that starts the week containing dateStr, and the following Saturday
export function weekBounds(dateStr = todayStr()) {
  const d = parseLocalDate(dateStr)
  const dow = d.getDay()                // 0 = Sun
  const start = addDays(dateStr, -dow)
  const end = addDays(start, 6)
  return { start, end }
}

// first and last day of the month containing dateStr
export function monthBounds(dateStr = todayStr()) {
  const d = parseLocalDate(dateStr)
  const start = todayStr(new Date(d.getFullYear(), d.getMonth(), 1))
  const end = todayStr(new Date(d.getFullYear(), d.getMonth() + 1, 0))
  return { start, end }
}

// inclusive list of YYYY-MM-DD between two dates
export function dateRange(startStr, endStr) {
  const out = []
  let cur = startStr
  while (cur <= endStr) { out.push(cur); cur = addDays(cur, 1) }
  return out
}

// =============================================================================
// Formatting
// =============================================================================

export function fmtMoney(n) {
  if (n == null || isNaN(n)) return ''
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

export function fmtDate(dateStr, opts = { weekday: 'short', month: 'short', day: 'numeric' }) {
  return parseLocalDate(dateStr).toLocaleDateString('en-US', opts)
}

export function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function relativeDay(dateStr) {
  const t = todayStr()
  if (dateStr === t) return 'Today'
  if (dateStr === addDays(t, 1)) return 'Tomorrow'
  if (dateStr === addDays(t, -1)) return 'Yesterday'
  return fmtDate(dateStr)
}

// =============================================================================
// Period prediction — ported from Ren's Journal computeCyclePhase logic.
// avg of last 3 cycle lengths, 28-day fallback. Returns predicted START dates.
// =============================================================================

export function avgCycleLength(periodStarts) {
  const sorted = [...periodStarts].filter(Boolean).sort()
  if (sorted.length < 2) return 28
  const gaps = []
  for (let i = 1; i < sorted.length; i++) {
    const a = parseLocalDate(sorted[i - 1])
    const b = parseLocalDate(sorted[i])
    gaps.push(Math.round((b - a) / 86400000))
  }
  const last3 = gaps.slice(-3)
  const avg = last3.reduce((s, g) => s + g, 0) / last3.length
  return Math.round(avg) || 28
}

// predict the next `count` period start dates after the most recent logged start
export function predictNextPeriod(periodStarts, count = 2) {
  const sorted = [...periodStarts].filter(Boolean).sort()
  if (sorted.length === 0) return []
  const len = avgCycleLength(sorted)
  const last = sorted[sorted.length - 1]
  const out = []
  let next = addDays(last, len)
  for (let i = 0; i < count; i++) {
    out.push(next)
    next = addDays(next, len)
  }
  return out
}

// =============================================================================
// Meal-plan expansion — shopping app stores meal_plan as { "<dayOffset>": uuid }
// where offset is days from the START OF THE CURRENT WEEK (Sunday). Convert to
// dated rows. Done here (not in SQL) because "start of week" needs a ref date.
// =============================================================================

export function expandMealPlan(mealPlan, recipesById, weekStartStr = weekBounds().start) {
  if (!mealPlan) return []
  return Object.entries(mealPlan).map(([offset, recipeId]) => {
    const dateStr = addDays(weekStartStr, Number(offset))
    const recipe = recipesById?.[recipeId]
    return {
      source: 'meal',
      ref_id: recipeId,
      title: recipe?.name || 'Planned meal',
      event_date: dateStr,
      event_time: null,
      amount: null,
      kind: 'meal',
      meta: { servings: recipe?.servings },
    }
  })
}

// normalize any event row to the common shape (defensive)
export function normalizeRow(r) {
  return {
    source: r.source,
    ref_id: r.ref_id,
    title: r.title,
    event_date: r.event_date,
    event_time: r.event_time || null,
    amount: r.amount ?? null,
    kind: r.kind || 'family',
    meta: r.meta || {},
  }
}

// sort merged rows for a day: timed events by time, all-day first
export function sortDayEvents(rows) {
  return [...rows].sort((a, b) => {
    if (!a.event_time && b.event_time) return -1
    if (a.event_time && !b.event_time) return 1
    if (a.event_time && b.event_time) return a.event_time.localeCompare(b.event_time)
    return (a.title || '').localeCompare(b.title || '')
  })
}

// =============================================================================
// Nudges — heuristics that look at the merged timeline and surface useful
// "you probably want to think about this" lines on the Week tab.
// Each nudge is { icon, text, severity } where severity is 'info' | 'warn'.
// =============================================================================

export function computeNudges(rows, { weekStart, weekEnd, today = todayStr() }) {
  const out = []
  const inWeek = (r) => r.event_date >= weekStart && r.event_date <= weekEnd

  // 1. Meals planned this week but no recent shopping trip
  //    (we don't have a "trip" event yet — proxy: meals planned but no Family
  //    event with title containing "shop" or "trip" in the past 7 days)
  const mealsThisWeek = rows.filter((r) => r.kind === 'meal' && inWeek(r))
  const recentShopWindow = [addDays(today, -7), today]
  const shopRecently = rows.some((r) =>
    r.kind === 'family' &&
    /shop|trip|grocer/i.test(r.title || '') &&
    r.event_date >= recentShopWindow[0] && r.event_date <= recentShopWindow[1]
  )
  if (mealsThisWeek.length >= 2 && !shopRecently) {
    out.push({
      icon: '🛒',
      text: `${mealsThisWeek.length} meals planned this week — no shopping trip logged in the last 7 days`,
      severity: 'warn',
    })
  }

  // 2. A bill is due before the next payday lands
  const upcomingBills = rows
    .filter((r) => r.kind === 'bill' && r.event_date >= today && !r.meta?.paid && r.amount)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
  const upcomingPaydays = rows
    .filter((r) => r.kind === 'payday' && r.event_date >= today)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
  const nextPayday = upcomingPaydays[0]
  if (nextPayday) {
    const orphanBills = upcomingBills.filter((b) => b.event_date < nextPayday.event_date && !b.meta?.autopay)
    const total = orphanBills.reduce((s, b) => s + Number(b.amount || 0), 0)
    if (orphanBills.length >= 1 && total > 0) {
      out.push({
        icon: '⚠️',
        text: `${orphanBills.length} bill${orphanBills.length > 1 ? 's' : ''} (${fmtMoney(total)}) due before next paycheck on ${fmtDate(nextPayday.event_date)}`,
        severity: 'warn',
      })
    }
  }

  // 3. Predicted period within the next 7 days — gentle heads-up
  const upcomingPeriod = rows.find((r) => r.kind === 'predicted_flow' && r.event_date >= today && r.event_date <= addDays(today, 7))
  if (upcomingPeriod) {
    out.push({
      icon: '🌒',
      text: `Period predicted around ${fmtDate(upcomingPeriod.event_date)} (${dayDiff(upcomingPeriod.event_date, today)} days)`,
      severity: 'info',
    })
  }

  // 4. Quiet week — no planned meals AND no family events ahead
  const familyAhead = rows.some((r) =>
    (r.kind === 'family' || r.kind === 'gcal') && r.event_date >= today && r.event_date <= weekEnd
  )
  if (mealsThisWeek.length === 0 && !familyAhead) {
    out.push({
      icon: '🌾',
      text: 'No meals or events planned for the rest of the week',
      severity: 'info',
    })
  }

  return out
}

// helper: integer days from a -> b (b - a)
function dayDiff(a, b) {
  return Math.round((parseLocalDate(a) - parseLocalDate(b)) / 86400000)
}
