// Rules engine.
// A rule has: match_field (description|amount), match_type (contains|equals|starts|regex),
// match_value, category_id, account_id, priority.
// Lower priority = checked first. First match wins.
// Hits get tallied for diagnostic display.

/**
 * Test a single rule against a transaction.
 */
function ruleMatches(rule, tx) {
  if (!rule.active) return false
  const field = rule.match_field === 'amount'
    ? String(tx.amount ?? '')
    : String(tx.description ?? '').toUpperCase()
  const val = String(rule.match_value ?? '').toUpperCase()
  if (!val) return false

  switch (rule.match_type) {
    case 'equals':   return field === val
    case 'starts':   return field.startsWith(val)
    case 'contains': return field.includes(val)
    case 'regex':
      try { return new RegExp(rule.match_value, 'i').test(tx.description || '') }
      catch { return false }
    default: return false
  }
}

/**
 * Apply rules to a transaction list. Mutates a copy — original is untouched.
 * Returns: { transactions: [...{...tx, _ruleId, _categoryId, _accountId}], hits: {ruleId: count} }
 */
export function applyRules(transactions, rules) {
  const sorted = [...rules].filter(r => r.active).sort((a, b) => (a.priority || 999) - (b.priority || 999))
  const hits = {}
  const out = transactions.map(tx => {
    for (const rule of sorted) {
      if (ruleMatches(rule, tx)) {
        hits[rule.id] = (hits[rule.id] || 0) + 1
        return {
          ...tx,
          _ruleId: rule.id,
          _categoryId: rule.category_id || null,
          _accountId: rule.account_id || null
        }
      }
    }
    return { ...tx, _ruleId: null, _categoryId: null, _accountId: null }
  })
  return { transactions: out, hits }
}
