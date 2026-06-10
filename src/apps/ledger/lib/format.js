// Currency, dates, and small utility helpers used app-wide.

export const fmt = (n, opts = {}) => {
  const { showCents = true, signed = false } = opts
  const num = Number(n) || 0
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0
  }).format(Math.abs(num))
  if (signed) return num < 0 ? `-${formatted}` : `+${formatted}`
  return num < 0 ? `(${formatted})` : formatted
}

export const fmtCompact = (n) => {
  const num = Number(n) || 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(num)
}

export const fmtPercent = (n, decimals = 1) =>
  `${(Number(n) * 100).toFixed(decimals)}%`

export const monthName = (m) =>
  ['January','February','March','April','May','June','July','August','September','October','November','December'][m - 1]

export const monthShort = (m) =>
  ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1]

export const todayISO = () => new Date().toISOString().slice(0, 10)

export const currentMonth = () => {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export const daysUntil = (day) => {
  const today = new Date()
  const target = new Date(today.getFullYear(), today.getMonth(), day)
  if (target < today) target.setMonth(target.getMonth() + 1)
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24))
}
