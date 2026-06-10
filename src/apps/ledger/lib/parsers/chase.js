// Chase statement parser — checking + credit card.
//
// Chase statements lay each transaction out as:
//     MM/DD  DESCRIPTION  AMOUNT  BALANCE
// with the AMOUNT and BALANCE right-aligned in their own columns.
// pdf.js text extraction by Y-coordinate produces lines like:
//     "03/30 Wealthfront EDI Pymnts ... Web ID: 4271967207 -1,000.00 1,327.56"
// where the last two tokens are AMOUNT and BALANCE.
//
// Continuation lines (the rest of a long description) have no leading date
// and zero or one trailing numbers — we skip those.
//
// Returns: [{date, description, amount, rawLine}] — amount sign preserved from source.

const MONTH_NAMES = ['january','february','march','april','may','june','july','august','september','october','november','december']

/**
 * Detect the statement's calendar year from the page header.
 * Chase prints "March 26, 2026 through April 24, 2026" — easy.
 * For year-boundary statements (Dec → Jan), we capture the *start* year and
 * fix per-transaction below if a MM/DD looks like it's from the prior year.
 */
function detectStatementPeriod(text) {
  // Try "Month D, YYYY through Month D, YYYY"
  const fullMatch = text.match(/(\w+)\s+\d{1,2},\s+(\d{4})\s+through\s+(\w+)\s+\d{1,2},\s+(\d{4})/i)
  if (fullMatch) {
    const startMonth = MONTH_NAMES.indexOf(fullMatch[1].toLowerCase()) + 1
    const startYear  = parseInt(fullMatch[2])
    const endMonth   = MONTH_NAMES.indexOf(fullMatch[3].toLowerCase()) + 1
    const endYear    = parseInt(fullMatch[4])
    return { startMonth, startYear, endMonth, endYear }
  }
  // Fallback: single date
  const yearMatch = text.match(/\b(20\d{2})\b/)
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear()
  return { startMonth: 1, startYear: year, endMonth: 12, endYear: year }
}

/**
 * Pick the correct year for a MM/DD transaction date given the statement period.
 * For most statements both years are the same. For year-boundary statements
 * (Dec → Jan), txns in months >= startMonth belong to startYear; <= endMonth to endYear.
 */
function resolveYear(month, period) {
  if (period.startYear === period.endYear) return period.startYear
  // Crosses year boundary
  if (month >= period.startMonth) return period.startYear
  return period.endYear
}

/**
 * Parse a money string. Sign preserved from source.
 *   "1,234.56"   → 1234.56
 *   "-1,000.00"  → -1000
 *   "$1,234.56"  → 1234.56
 */
function parseMoney(str) {
  if (!str) return null
  const clean = String(str).replace(/[\s$,]/g, '')
  const isNeg = clean.startsWith('-') || clean.endsWith('-') || (clean.startsWith('(') && clean.endsWith(')'))
  const numStr = clean.replace(/[-()]/g, '')
  const n = parseFloat(numStr)
  if (isNaN(n)) return null
  return isNeg ? -n : n
}

// Matches a decimal number with optional sign and commas: 1,234.56 / -1,000.00 / 12.50
const NUMBER_RE = /-?[\d,]+\.\d{2}/g

/**
 * Try to parse a single line as a transaction.
 * Returns {date, description, amount, balance} or null.
 *
 * Required shape: a MM/DD date followed by a description and two trailing
 * decimal numbers (AMOUNT and BALANCE). We tolerate PDF artifacts at the
 * start of the line (page numbers, structure markers like *start* / *end*)
 * by scanning for the FIRST MM/DD that's followed by enough content.
 */
function parseLine(line, period) {
  // Chase PDFs render negative amounts with a SPACE between the minus sign and
  // the number (e.g. "- 68.95" instead of "-68.95"). Re-attach so NUMBER_RE
  // picks up the sign correctly. Only do this when the dash is preceded by
  // whitespace (or is at the start) — never alter dashes inside descriptions.
  const normalized = line.replace(/(^|\s)-\s+(\d)/g, '$1-$2')
  const collapsed = normalized.replace(/\s+/g, ' ').trim()
  if (collapsed.length < 10) return null

  // Try two variants: as-is, and with the very first character stripped (handles
  // glued-on page-number artifacts like "404/24 ..." where Chase prepends "4"
  // directly before "04/24" with no separator).
  for (const candidate of [collapsed, collapsed.slice(1)]) {
    const result = tryParseLine(candidate, period, line)
    if (result) return result
  }
  return null
}

function tryParseLine(collapsed, period, originalLine) {
  // Find every MM/DD candidate and pick the first one that yields a valid parse.
  // We tolerate PDF artifacts (page numbers, structure markers) before the date.
  // The date must either be at the start, or be preceded by a non-digit/slash.
  const dateRe = /(?:^|[^\d/])((\d{1,2})\/(\d{1,2}))\b/g
  let m
  while ((m = dateRe.exec(collapsed)) !== null) {
    const dateStr = m[1]
    const month = parseInt(m[2])
    const day = parseInt(m[3])
    if (month < 1 || month > 12 || day < 1 || day > 31) continue

    const dateStart = m.index + (m[0].length - dateStr.length)
    const fromDate = collapsed.slice(dateStart).trim()

    const numbers = fromDate.match(NUMBER_RE) || []
    if (numbers.length < 2) continue

    const amountStr = numbers[numbers.length - 2]
    const balanceStr = numbers[numbers.length - 1]
    const amount = parseMoney(amountStr)
    const balance = parseMoney(balanceStr)
    if (amount === null || balance === null) continue
    if (Math.abs(amount) > 9999999) continue

    const lastBalanceIdx = fromDate.lastIndexOf(balanceStr)
    if (lastBalanceIdx < 0) continue
    const lastAmountIdx = fromDate.lastIndexOf(amountStr, lastBalanceIdx - 1)
    if (lastAmountIdx < 0) continue

    let description = fromDate.slice(dateStr.length, lastAmountIdx).trim()
    description = description.replace(/\s{2,}/g, ' ')
    if (!description || description.length < 2) continue

    if (/^(beginning|ending|opening|closing)\s+balance/i.test(description)) continue

    const year = resolveYear(month, period)
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    return { date, description, amount, balance, rawLine: originalLine }
  }

  return null
}

/**
 * Main Chase parser.
 * Walks lines, picks out transaction lines, ignores continuations.
 * Stops at section headers for other accounts (e.g. CHASE SAVINGS) — those
 * are a separate account and should be imported as their own statement.
 */
export function parseChase(text) {
  const period = detectStatementPeriod(text)
  const lines = text.split('\n')
  const transactions = []

  // We stop parsing when we hit a section break to a different account.
  // CHASE TOTAL CHECKING is what we care about; CHASE SAVINGS starts a new section.
  // Tracking which account section we're in lets the user be explicit later.
  let inOtherAccount = false

  for (const line of lines) {
    // Detect "CHASE SAVINGS" or other non-checking account section starts
    if (/^\s*CHASE\s+SAVINGS\b/i.test(line) || /^\s*SAVINGS\s+SUMMARY\b/i.test(line)) {
      inOtherAccount = true
      continue
    }
    if (/^\s*CHASE\s+TOTAL\s+CHECKING\b/i.test(line) || /^\s*CHECKING\s+SUMMARY\b/i.test(line)) {
      inOtherAccount = false
      continue
    }
    if (inOtherAccount) continue

    const tx = parseLine(line, period)
    if (!tx) continue
    transactions.push(tx)
  }

  // De-dupe within the parse — Chase repeats nothing legitimate, so duplicate
  // (date|amount|balance|description) is a parser artifact. Including the running
  // balance is crucial because two same-day same-amount transactions are real
  // (e.g. two Real-Time Payment credits of $100 on the same day) but will have
  // different running balances.
  const seen = new Set()
  return transactions.filter(tx => {
    const k = `${tx.date}|${tx.amount}|${tx.balance}|${tx.description}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/**
 * Sniff if text looks like a Chase statement.
 */
export function isChase(text) {
  const head = text.slice(0, 4000).toLowerCase()
  return head.includes('chase') || head.includes('jpmorgan') || head.includes('jpmc')
}
