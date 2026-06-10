// Month + period helpers for the per-month transaction filter, the
// month-to-month comparison view, and the Insights quarterly breakdowns.
//
// A "month key" is a YYYY-MM string — stable, sortable, and timezone-safe
// since transaction dates are stored as plain YYYY-MM-DD.

import { monthShort, monthName } from './format'

// YYYY-MM for a transaction date string (already local YYYY-MM-DD).
export const monthKeyOf = (dateStr) => (dateStr || '').slice(0, 7)

// Current month as YYYY-MM.
export const currentMonthKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Human label for a YYYY-MM key, e.g. "Mar 2025" (or "March 2025" if long).
export const monthKeyLabel = (key, { long = false } = {}) => {
  if (!key) return '—'
  const [y, m] = key.split('-').map(Number)
  const name = long ? monthName(m) : monthShort(m)
  return `${name} ${y}`
}

// Distinct month keys present in a set of transactions, newest first.
export const monthKeysFrom = (transactions) => {
  const set = new Set(transactions.map(t => monthKeyOf(t.date)).filter(Boolean))
  return [...set].sort((a, b) => (a < b ? 1 : -1))
}

// First/last day (inclusive start, exclusive end) of a YYYY-MM month.
export const monthBounds = (key) => {
  const [y, m] = key.split('-').map(Number)
  const startISO = `${y}-${String(m).padStart(2, '0')}-01`
  const nextM = m === 12 ? 1 : m + 1
  const nextY = m === 12 ? y + 1 : y
  const endISO = `${nextY}-${String(nextM).padStart(2, '0')}-01`
  return { startISO, endISO }
}

// Step a YYYY-MM key by N months (negative = backward).
export const stepMonthKey = (key, delta) => {
  const [y, m] = key.split('-').map(Number)
  const total = y * 12 + (m - 1) + delta
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return `${ny}-${String(nm).padStart(2, '0')}`
}

// The four quarter buckets for a year. Returns [{ id, label, months:[1..3] }].
export const QUARTERS = [
  { id: 'Q1', label: 'Q1 · Jan–Mar', months: [1, 2, 3] },
  { id: 'Q2', label: 'Q2 · Apr–Jun', months: [4, 5, 6] },
  { id: 'Q3', label: 'Q3 · Jul–Sep', months: [7, 8, 9] },
  { id: 'Q4', label: 'Q4 · Oct–Dec', months: [10, 11, 12] },
]

export const quarterOf = (month) => Math.floor((month - 1) / 3) + 1
