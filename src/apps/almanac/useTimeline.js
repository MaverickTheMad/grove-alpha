import { useState, useEffect, useCallback } from 'react'
import { loadTimeline } from './lib/timeline'

// Thin hook over the cross-app aggregator. Same shape the tabs already expect.
export function useTimeline(rangeStart, rangeEnd) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try { setRows(await loadTimeline(rangeStart, rangeEnd)) }
    catch (e) { setError(e.message || String(e)); setRows([]) }
    finally { setLoading(false) }
  }, [rangeStart, rangeEnd])

  useEffect(() => { load() }, [load])
  return { rows, loading, error, reload: load }
}
