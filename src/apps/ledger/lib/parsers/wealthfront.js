// Wealthfront Cash Account ("Bill Pay Acct") statement parser.
//
// WHY THIS PARSER IS DIFFERENT FROM CHASE
// ---------------------------------------
// Chase prints one running ledger, so reconstructing rows by Y-position gives
// clean "MM/DD DESCRIPTION AMOUNT BALANCE" lines. Wealthfront does NOT. Its
// activity tables are laid out *transposed*: each field (Date, Method, Status,
// Initiator, Amount) is a horizontal band at a fixed Y, and every individual
// transaction is a *column* at a fixed X. Sorting text by Y therefore collapses
// each field into a single run ("$600.00$1,176.03$1,000.00...", all the dates
// glued together, all the payees glued together with no delimiter), which is
// impossible to split reliably from text alone.
//
// So this parser works off the raw positioned items (ctx.pageItems) and rebuilds
// transactions by their X column: a transaction is any X column that has a date
// in the Date band and an amount in the Amount/Value band. Other fields at the
// same X (payee, method, status, type, interest period) describe it.
//
// SECTIONS
//   Deposits/Credits to Wealthfront Brokerage   -> income  (amount printed +)
//   Withdrawals/Debits from Wealthfront Brokerage-> expense (amount printed -)
//   Transfers (brokerage-to-brokerage)           -> kept    (Value band, "Transfer out")
//   Interest                                      -> income  (+)
//   Transfer between Wealthfront and Program Banks -> EXCLUDED (internal cash
//       sweeps that mirror every real txn; including them double-counts). These
//       columns are identified by a "Transfer ... Program Banks" method/label.
//   Holdings / Balance & Interest Rate Details / Misc Credits / Disclosures
//       -> EXCLUDED (not transactions; the rate table also has dates+amounts so
//          it is skipped explicitly by its APR/APY bands).
//
// Wealthfront dates already carry the year (M/D/YYYY), so no period inference is
// needed (unlike Chase's MM/DD).
//
// Returns: [{date, description, amount, balance, rawLine}] — amount sign as printed.

const MONEY_RE = /^-?\$?[\d,]+\.\d{2}$/
const DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/

// Words that are statuses, not payees.
const STATUS_WORDS = new Set(['disbursed', 'received', 'pending', 'failed', 'returned'])

// Column/section header labels — never a transaction description.
const LABELS = new Set([
  'date', 'amount', 'value', 'initiator', 'method', 'status', 'type',
  'interest period', 'security', 'symbol/cusip', 'shares', 'share price',
  'description', 'total', 'bank name', 'apr', 'apy',
  'opening balance', 'ending balance'
])

// X tolerance for joining a field/amount to a date column. Wealthfront columns
// are ~25pt apart and field values sit at (nearly) the same X as their date, so
// ~13 (half the column pitch) joins reliably without grabbing a neighbor.
const X_TOL = 13

function parseMoney(str) {
  if (!str) return null
  const clean = String(str).replace(/[\s$,]/g, '')
  const isNeg = clean.startsWith('-') || clean.endsWith('-') || (clean.startsWith('(') && clean.endsWith(')'))
  const n = parseFloat(clean.replace(/[-()]/g, ''))
  if (isNaN(n)) return null
  return isNeg ? -n : n
}

// Method-like values (used to demote them below payee names, and to format
// brokerage transfers).
function isMethod(s) {
  const t = s.toLowerCase()
  return t === 'ach' || /^ach\b/.test(t) || t.includes('rtp/fednow') ||
         t.includes('transfer out') || t.includes('transfer from') || t.includes('transfer to')
}

function nearestByX(items, x) {
  let best = null, bestD = Infinity
  for (const it of items) {
    const d = Math.abs(it.x - x)
    if (d < bestD) { bestD = d; best = it }
  }
  return bestD <= X_TOL ? best : null
}

/**
 * Main Wealthfront parser.
 * @param {string} _text   reconstructed text (unused; kept for parser-contract symmetry)
 * @param {{pageItems?: Array<Array<{x,y,str,width}>>}} ctx
 */
export function parseWealthfront(_text, ctx) {
  const pageItems = ctx && ctx.pageItems
  if (!pageItems || !pageItems.length) return []

  const txns = []

  for (const items of pageItems) {
    if (!items || !items.length) continue
    const pageText = items.map(it => it.str).join(' ').toLowerCase()

    // Skip non-transaction pages.
    const hasRateTable =
      items.some(it => /^apr$/i.test(it.str.trim())) &&
      items.some(it => /^apy$/i.test(it.str.trim()))
    if (hasRateTable) continue
    if (pageText.includes('holdings as of') || pageText.includes('bank sweep program')) continue

    // A transaction is a date column. Year is in the date string.
    const dateCols = items
      .map(it => {
        const m = it.str.trim().match(DATE_RE)
        return m ? { x: it.x, month: +m[1], day: +m[2], year: +m[3] } : null
      })
      .filter(Boolean)
    if (dateCols.length === 0) continue

    const moneyItems = items.filter(it => MONEY_RE.test(it.str.trim()))

    // Descriptive items: not a date, money, label, '--', or a lone footnote
    // superscript (1-2 digit markers like "3", "4" that Wealthfront sprinkles in).
    const descItems = items.filter(it => {
      const s = it.str.trim()
      if (!s || s === '--') return false
      if (DATE_RE.test(s) || MONEY_RE.test(s)) return false
      if (LABELS.has(s.toLowerCase())) return false
      if (/^\d{1,2}$/.test(s)) return false
      return true
    })

    const pageMentionsInterest = pageText.includes('interest')

    for (const col of dateCols) {
      const amtItem = nearestByX(moneyItems, col.x)
      if (!amtItem) continue                    // no amount at this column (e.g. a "Total" col)
      const amount = parseMoney(amtItem.str)
      if (amount === null) continue

      // All descriptive fields sharing this column, top-to-bottom.
      const descs = descItems
        .filter(it => Math.abs(it.x - col.x) <= X_TOL)
        .sort((a, b) => b.y - a.y)
        .map(it => it.str.trim())

      // Internal program-bank cash sweep -> not a real transaction.
      if (descs.some(d => /program banks/i.test(d))) continue

      // Prefer a payee (not a status, not a method); fall back to method/type.
      const payee = descs.find(d => !STATUS_WORDS.has(d.toLowerCase()) && !isMethod(d))
      let description
      if (payee) {
        if (/^[A-Z][a-z]+ \d{4}$/.test(payee) && pageMentionsInterest) {
          description = `Interest — ${payee}`   // e.g. "Interest — December 2025"
        } else {
          description = payee                   // e.g. "NEW YORK STATE", "GEICO"
        }
      } else {
        const method = descs.find(d => isMethod(d))
        if (method && /transfer out/i.test(method)) description = 'Brokerage transfer out'
        else if (method) description = method    // generic ACH / RTP/FedNow deposit or withdrawal
        else description = pageMentionsInterest ? 'Interest' : 'Wealthfront transaction'
      }

      const date = `${col.year}-${String(col.month).padStart(2, '0')}-${String(col.day).padStart(2, '0')}`
      txns.push({
        date,
        description,
        amount,
        balance: null,                           // Wealthfront has no per-line running balance
        rawLine: `${date} ${description} ${amtItem.str}`
      })
    }
  }

  // De-dupe exact column repeats (parser safety only). Two genuine same
  // date+amount+description entries sit in different X columns and are parsed
  // once each, so this never drops a legitimate repeat within a statement.
  const seen = new Set()
  const out = txns.filter(tx => {
    const k = `${tx.date}|${tx.amount}|${tx.description}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  return out
}

/**
 * Sniff if text looks like a Wealthfront statement.
 *
 * NOTE: A Chase statement can mention "Wealthfront Brokerage LLC" inside its
 * transaction descriptions (RTP credits, EDI payments), so we scope detection
 * to the header region and require markers a Chase body never carries
 * (JTWROS / Bill Pay Acct / Cash Account). The parser registry also tries Chase
 * first, so a Chase PDF is claimed there before this ever runs.
 */
export function isWealthfront(text) {
  const head = (text || '').slice(0, 2500).toLowerCase()
  if (!head.includes('wealthfront')) return false
  const hasBrokerage = head.includes('wealthfront brokerage') || head.includes('wealthfront:')
  const hasCashAcct = /jtwros|bill pay acct|cash account/.test(head)
  return hasBrokerage && hasCashAcct
}
