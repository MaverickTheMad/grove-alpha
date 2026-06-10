// Duplicate detector.
// Strict mode: a parsed transaction is a duplicate if there's already a row in the ledger
// with the same date AND the same amount (to the cent).
//
// This catches the most common case where the same transaction was added manually
// before the import, even if the descriptions don't match exactly.

/**
 * @param {Array} parsedTxns   transactions about to be imported (with .date, .amount)
 * @param {Array} existingTxns existing ledger rows (with .date, .amount)
 * @returns {Array} parsedTxns annotated with _duplicate: bool, _duplicateOfId: id|null
 */
export function flagDuplicates(parsedTxns, existingTxns) {
  // Index existing by date|amount for O(1) lookup
  const index = new Map()
  for (const ex of existingTxns) {
    const amt = Math.round(Number(ex.amount) * 100) / 100
    const key = `${ex.date}|${amt}`
    if (!index.has(key)) index.set(key, [])
    index.get(key).push(ex)
  }
  return parsedTxns.map(tx => {
    const amt = Math.round(Number(tx.amount) * 100) / 100
    const key = `${tx.date}|${amt}`
    const matches = index.get(key) || []
    return {
      ...tx,
      _duplicate: matches.length > 0,
      _duplicateOfId: matches[0]?.id || null,
      _duplicateOfDescription: matches[0]?.description || null
    }
  })
}
