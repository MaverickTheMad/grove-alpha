// Drop-in replacement for the budget app's hooks/useTable.js, backed by
// grove.records via lib/data.js. Pages that did useTable('transactions', …)
// become useRecords('transaction', …) and otherwise behave the same:
// rows are { id, ...payload }, with insert/update/remove/refetch.
//
// Because payloads are jsonb, ordering/filtering is done client-side (the data
// volumes here are small — a household's transactions). The record id IS the
// row id, so foreign keys between types keep resolving.

import { useEffect, useState, useCallback, useRef } from 'react'
import * as db from '../../../lib/data'
import { APP } from '../constants'

const toRow = (rec) => ({ id: rec.id, ...rec.data })
const occurredFor = (row) => (row && row.date ? new Date(`${row.date}T12:00:00Z`).toISOString() : undefined)

export function useRecords(type, options = {}) {
  const { orderBy, ascending = true, filter = null, deps = [] } = options
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const rowsRef = useRef([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const recs = await db.list({ app: APP, type })
      let out = recs.map(toRow)
      if (filter) out = out.filter(filter)
      if (orderBy) {
        out = out.slice().sort((a, b) => {
          const av = a[orderBy], bv = b[orderBy]
          if (av == null && bv == null) return 0
          if (av == null) return ascending ? 1 : -1
          if (bv == null) return ascending ? -1 : 1
          if (av < bv) return ascending ? -1 : 1
          if (av > bv) return ascending ? 1 : -1
          return 0
        })
      }
      rowsRef.current = out
      setRows(out)
      setError(null)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, orderBy, ascending])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData() }, [fetchData, ...deps])

  const insert = async (row) => {
    try {
      const rec = await db.create({ app: APP, type, occurredAt: occurredFor(row), data: row })
      await fetchData()
      return { data: toRow(rec), error: null }
    } catch (e) { return { data: null, error: e } }
  }

  // Partial patch like the old hook: merge into the current local payload,
  // since data.update replaces the whole payload.
  const update = async (id, patch) => {
    try {
      const current = rowsRef.current.find((r) => r.id === id) || {}
      const { id: _id, ...curData } = current
      const merged = { ...curData, ...patch }
      const rec = await db.update(id, { data: merged, occurredAt: occurredFor(merged) })
      await fetchData()
      return { data: toRow(rec), error: null }
    } catch (e) { return { data: null, error: e } }
  }

  const remove = async (id) => {
    try { await db.remove(id); await fetchData(); return { error: null } }
    catch (e) { return { error: e } }
  }

  return { data: rows, loading, error, refetch: fetchData, insert, update, remove }
}
