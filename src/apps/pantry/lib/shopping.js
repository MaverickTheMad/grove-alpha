// Pantry pure logic — ported VERBATIM from family-shopping-app/src/App.jsx
// (the gnarly math the build guide says must be ported from source, not
// reconstructed: §13 #5). Behavior is byte-for-byte the original; only the
// taxonomy was lifted into constants.js and these were turned into exports.

import { SECTION_ORDER, DETECT_RULES, UNIT_ALIASES } from '../constants'

export function detectSection(name) {
  const lower = (name || "").toLowerCase()
  for (const rule of DETECT_RULES) {
    for (const kw of rule.k) {
      if (lower.includes(kw)) return rule.s
    }
  }
  return "Other"
}

export function getSection(name, sections) {
  return sections[name] || detectSection(name)
}

export function sectionOrder(s) {
  const i = SECTION_ORDER.indexOf(s)
  return i === -1 ? 999 : i
}

export function normIng(i) {
  if (typeof i === "string") return { name: i, quantity: "" }
  return { name: i.name || "", quantity: i.quantity || "" }
}

// ─── Quantity math ──────────────────────────────────────────────────────────

export function parseQtyNum(str) {
  if (!str) return null
  const UNICODE_FRACS = { "\u00bc":"1/4","\u00bd":"1/2","\u00be":"3/4","\u2153":"1/3","\u2154":"2/3","\u215b":"1/8","\u215c":"3/8","\u215d":"5/8","\u215e":"7/8" }
  let s = str.trim()
  for (const [uc, rep] of Object.entries(UNICODE_FRACS)) s = s.split(uc).join(" " + rep)
  s = s.replace(/\s+/g, " ").trim()
  const m = s.match(/^(\d+(?:\s+\d+\/\d+|\.\d+|\/\d+)?)\s*(.*)/)
  if (!m) return null
  let num = 0
  const parts = m[1].trim().split(/\s+/)
  for (const p of parts) {
    if (p.includes("/")) { const [n, d] = p.split("/"); num += parseInt(n) / parseInt(d) }
    else num += parseFloat(p) || 0
  }
  const rawUnit = m[2].trim().toLowerCase().replace(/\.$/, "")
  const unit = UNIT_ALIASES[rawUnit] || rawUnit
  return { num, unit }
}

// Sum an array of quantity strings — adds same-unit quantities, joins different units.
export function sumQuantities(qtys) {
  if (!qtys || qtys.length === 0) return ""
  if (qtys.length === 1) return qtys[0]

  const byUnit = {}
  const unparsed = []
  for (const q of qtys) {
    const parsed = parseQtyNum(q)
    if (!parsed) { unparsed.push(q); continue }
    const key = parsed.unit
    if (!byUnit[key]) byUnit[key] = 0
    byUnit[key] += parsed.num
  }

  const parts = Object.entries(byUnit).map(([unit, total]) => {
    const n = formatNumber(total)
    return unit ? `${n} ${unit}` : n
  })

  return [...parts, ...unparsed].join(" + ")
}

// Normalize ingredient name for matching — lowercase, strip common adjectives.
export function normalizeIngName(name) {
  return (name || "")
    .toLowerCase()
    .replace(/\b(fresh|dried|ground|whole|unsalted|salted|boneless|skinless|large|medium|small|organic|low.sodium|low.fat|heavy|light|extra|fine|coarse|cracked|minced|crushed|chopped|sliced|diced|shredded|grated|packed|heaping|about|approximately)\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

// Are two ingredient names similar enough to merge?
// "Black pepper" vs "Cracked black pepper" → true; "Chicken broth" vs "Chicken
// stock" → false (different ingredients, intentionally NOT merged).
export function ingredientsSimilar(a, b) {
  const na = normalizeIngName(a)
  const nb = normalizeIngName(b)
  if (na === nb) return true
  if (na.includes(nb) || nb.includes(na)) return true
  return false
}

export function scaleQuantity(qty, mult) {
  if (!qty || mult === 1) return qty
  const match = qty.match(/^(\d+(?:\.\d+)?(?:\/\d+)?(?:\s+\d+\/\d+)?)\s*(.*)/)
  if (!match) return qty
  const numStr = match[1].trim()
  const unit = match[2].trim()

  let num = 0
  const parts = numStr.split(/\s+/)
  for (const part of parts) {
    if (part.includes("/")) {
      const [n, d] = part.split("/")
      num += parseInt(n) / parseInt(d)
    } else {
      num += parseFloat(part) || 0
    }
  }
  const scaled = num * mult

  const formatted = formatNumber(scaled)
  return unit ? `${formatted} ${unit}` : formatted
}

export function formatNumber(n) {
  if (Number.isInteger(n)) return String(n)
  const fracs = [[1/4,"1/4"],[1/3,"1/3"],[1/2,"1/2"],[2/3,"2/3"],[3/4,"3/4"]]
  const whole = Math.floor(n)
  const frac = n - whole
  for (const [val, str] of fracs) {
    if (Math.abs(frac - val) < 0.05) {
      return whole > 0 ? `${whole} ${str}` : str
    }
  }
  return parseFloat(n.toFixed(1)).toString()
}

// Subtract haveQty from neededQty — returns remainder or null if fully covered.
// e.g. subtractQuantity("4 cups", "2 cups") => "2 cups"
export function subtractQuantity(needed, have) {
  if (!needed || !have) return needed

  function parseQty(str) {
    if (!str) return null
    const fracs = { "1/4": 0.25, "1/3": 0.333, "1/2": 0.5, "2/3": 0.667, "3/4": 0.75 }
    str = str.trim()
    const unicodeFracs = { "\u00bc": "1/4", "\u00bd": "1/2", "\u00be": "3/4", "\u2153": "1/3", "\u2154": "2/3" }
    for (const [uc, rep] of Object.entries(unicodeFracs)) str = str.split(uc).join(rep)
    const m = str.match(/^(\d+(?:\.\d+)?(?:\/\d+)?(?:\s+\d+\/\d+)?)\s*(.*)/)
    if (!m) return null
    let num = 0
    const parts = m[1].trim().split(/\s+/)
    for (const part of parts) {
      if (part.includes("/")) { const [n, d] = part.split("/"); num += parseInt(n) / parseInt(d) }
      else if (fracs[part]) num += fracs[part]
      else num += parseFloat(part) || 0
    }
    return { num, unit: m[2].trim().toLowerCase() }
  }

  const n = parseQty(needed)
  const h = parseQty(have)
  if (!n || !h) return needed
  if (n.unit !== h.unit) return needed
  const remainder = n.num - h.num
  if (remainder <= 0) return null
  return formatNumber(remainder) + (n.unit ? " " + n.unit : "")
}

export function timeAgo(isoString) {
  if (!isoString) return null
  const diff = Date.now() - new Date(isoString).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return "made today"
  if (days === 1) return "made yesterday"
  if (days < 7) return `made ${days} days ago`
  const weeks = Math.floor(days / 7)
  if (weeks === 1) return "made 1 week ago"
  if (weeks < 5) return `made ${weeks} weeks ago`
  const months = Math.floor(days / 30)
  if (months === 1) return "made 1 month ago"
  return `made ${months} months ago`
}
