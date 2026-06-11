import { useState, useMemo } from 'react'
import { useTimeline } from '../useTimeline'
import EventRow from '../components/EventRow'
import { todayStr, addDays, dateRange, relativeDay, sortDayEvents } from '../constants'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'payday', label: 'Paydays' },
  { id: 'flow', label: 'Period' },
  { id: 'meal', label: 'Meals' },
  { id: 'pet', label: 'Pets' },
  { id: 'gcal', label: 'Calendar' },
  { id: 'family', label: 'Family' },
]

export default function UpcomingTab() {
  const [filter, setFilter] = useState('all')
  const today = todayStr()
  const end = addDays(today, 60)
  const { rows, loading, error } = useTimeline(today, end)

  const matchesFilter = (r) => {
    if (filter === 'all') return true
    if (filter === 'flow') return r.kind === 'flow' || r.kind === 'predicted_flow'
    return r.kind === filter
  }

  const byDay = useMemo(() => {
    const map = {}
    for (const r of rows.filter(matchesFilter)) (map[r.event_date] ||= []).push(r)
    return map
  }, [rows, filter])

  const days = dateRange(today, end).filter((d) => (byDay[d] || []).length)

  return (
    <div className="tab-pad">
      <div className="tab-head"><h2>Upcoming</h2></div>

      <div className="chip-row">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={`chip ${filter === f.id ? 'on' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <div className="error">Couldn’t load: {error}</div>}
      {loading && <div className="muted pad">Loading…</div>}

      {!loading && days.length === 0 && (
        <div className="empty">
          <div className="big">🌾</div>
          <p>Nothing on the horizon.</p>
        </div>
      )}

      {days.map((d) => (
        <section key={d} style={{ marginTop: 'var(--sp-4)' }}>
          <div style={{
            font: 'var(--fw-title) var(--fs-sm)/1.2 var(--font-body)',
            color: 'var(--text-soft)',
            textTransform: 'uppercase',
            letterSpacing: '.06em',
            marginBottom: 'var(--sp-2)',
          }}>
            {relativeDay(d)}
          </div>
          {sortDayEvents(byDay[d]).map((r, i) => (
            <EventRow key={`${r.source}-${r.ref_id}-${i}`} row={r} />
          ))}
        </section>
      ))}
    </div>
  )
}
