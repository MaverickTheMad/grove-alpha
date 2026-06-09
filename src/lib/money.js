// ── Formatting helpers — ONE copy for the whole suite (§6) ──────────

export function fmtMoney(n, { sign = false } = {}) {
  const v = Number(n) || 0
  const s = v.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  return sign && v > 0 ? `+${s}` : s
}

export function fmtDate(dateStr, opts = { month: 'short', day: 'numeric' }) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', opts)
}

export function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// "3 days ago" / "today" style relative day label from a YYYY-MM-DD or ISO.
export function relDay(dateStr) {
  const d = dateStr.includes('T') ? dateStr.slice(0, 10) : dateStr
  const today = new Date()
  const ty = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const [ay, am, ad] = d.split('-').map(Number)
  const [by, bm, bd] = ty.split('-').map(Number)
  const diff = Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000)
  if (diff === 0) return 'today'
  if (diff === 1) return 'yesterday'
  if (diff < 0) return fmtDate(d)
  if (diff < 7) return `${diff} days ago`
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`
  return fmtDate(d)
}
