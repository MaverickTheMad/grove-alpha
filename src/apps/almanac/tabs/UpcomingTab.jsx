import { useState, useMemo } from 'react'
import { useTimeline } from '../useTimeline'
import EventRow from '../components/EventRow'
import { todayStr, addDays, dateRange, parseLocalDate, sortDayEvents } from '../constants'
import { Chip } from '../../../ds'

function upcomingDayLabel(dateStr, today) {
  const d = parseLocalDate(dateStr)
  const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
  if (dateStr === today) return `TODAY · ${dateLabel}`
  if (dateStr === addDays(today, 1)) return `TOMORROW · ${dateLabel}`
  const dow = d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()
  return `${dow} · ${dateLabel}`
}

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
          <Chip
            key={f.id}
            active={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </Chip>
        ))}
      </div>

      {error && <div className="error">Couldn’t load: {error}</div>}
      {loading && <div className="muted pad">Loading…</div>}

      {!loading && days.length === 0 && (
        <div className="empty">
          <div className="big">🌾</div>
          <p>Events you add to Week or Month will show here as they approach.</p>
        </div>
      )}

      {days.map((d) => (
        <section key={d} style={{ marginTop: 'var(--sp-4)' }}>
          <div className="al-day-label">
            {upcomingDayLabel(d, today)}
          </div>
          {sortDayEvents(byDay[d]).map((r, i) => (
            <EventRow key={`${r.source}-${r.ref_id}-${i}`} row={r} />
          ))}
        </section>
      ))}
    </div>
  )
}
