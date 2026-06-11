// Statement-import commit + undo on grove.records. Keeps the bulk insert out
// of the page and avoids N hook-refetches. A committed batch is a
// `statement_import` record; its transactions carry import_batch_id = batch.id,
// so undo finds and removes them, then marks the batch discarded.

import * as db from '../../../lib/data'
import { APP, TYPES } from '../constants'

export async function commitImport({ filename, accountId, parsed, pdfText }) {
  const importRows = parsed.filter((p) => p._import)
  const dates = parsed.map((p) => p._date).sort()
  const now = new Date().toISOString()

  const batch = await db.create({
    app: APP, type: TYPES.statementImport,
    occurredAt: dates[0] ? `${dates[0]}T12:00:00Z` : undefined,
    data: {
      filename, account_id: accountId,
      period_start: dates[0], period_end: dates[dates.length - 1],
      status: 'committed', raw_text: (pdfText || '').slice(0, 50000),
      parsed_count: parsed.length, committed_count: importRows.length, created_at: now,
    },
  })

  await Promise.all(importRows.map((p) => db.create({
    app: APP, type: TYPES.transaction, occurredAt: `${p._date}T12:00:00Z`,
    data: {
      date: p._date, amount: p._amount, description: p._description, raw_description: p.description,
      category_id: p._category || null, account_id: p._account || null, person_id: p._person || null,
      notes: p._notes || null, source: 'import', import_batch_id: batch.id,
    },
  })))

  return { id: batch.id, count: importRows.length, total: parsed.length }
}

export async function undoImport(batchId) {
  const txns = await db.list({ app: APP, type: TYPES.transaction })
  await Promise.all(txns.filter((r) => r.data.import_batch_id === batchId).map((r) => db.remove(r.id)))
  try {
    const b = await db.get(batchId)
    if (b) await db.update(batchId, { data: { ...b.data, status: 'discarded' } })
  } catch { /* batch already gone */ }
}
