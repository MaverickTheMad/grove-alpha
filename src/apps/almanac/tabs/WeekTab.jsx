import { useState, useMemo } from 'react'
import { useTimeline } from '../useTimeline'
import { useIsDesktop } from '../useViewport'
import EventRow from '../components/EventRow'
import Sheet from '../components/Sheet'
import AddEvent from '../components/AddEvent'
import WeekAgenda from '../components/WeekAgenda'
import WeekTimeGrid from '../components/WeekTimeGrid'
import Icon from '../../../components/Icon'
import {
  weekBounds, monthBounds, dateRange, todayStr, addDays,
  sortDayEvents, fmtDate, computeNudges,
} from '../constants'

export default function WeekTab() {
  const [adding, setAdding] = useState(false)
  const [selected, setSelected] = useState(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const isDesktop = useIsDesktop(720)

  // pure-string week math to avoid TZ drift
  const { start: weekStart, end: weekEnd } = useMemo(() => {
    const { start } = weekBounds()
    const wStart = addDays(start, weekOffset * 7)
    return { start: wStart, end: addDays(wStart, 6) }
  }, [weekOffset])

  // load enough range to cover the full week even when it spans a month boundary
  const { rangeStart, rangeEnd } = useMemo(() => {
    const a = monthBounds(weekStart)
    const b = monthBounds(weekEnd)
    return {
      rangeStart: a.start < b.start ? a.start : b.start,
      rangeEnd:   a.end   > b.end   ? a.end   : b.end,
    }
  }, [weekStart, weekEnd])
  const { rows, loading, error, reload } = useTimeline(rangeStart, rangeEnd)
  const today = todayStr()

  const byDay = useMemo(() => {
    const map = {}
    for (const r of rows) (map[r.event_date] ||= []).push(r)
    return map
  }, [rows])

  const weekDays = dateRange(weekStart, weekEnd)

  const nudges = useMemo(
    () => computeNudges(rows, { weekStart, weekEnd, today }),
    [rows, weekStart, weekEnd, today]
  )

  const highlights = useMemo(() => {
    const out = []
    const pred = rows.find((r) => r.kind === 'predicted_flow' && r.event_date >= today)
    if (pred) out.push({ icon: '🌒', text: `Period predicted around ${fmtDate(pred.event_date)}` })
    const meals = rows.filter((r) => r.kind === 'meal' && r.event_date >= weekStart && r.event_date <= weekEnd)
    if (meals.length) out.push({ icon: '🍽️', text: `${meals.length} meal${meals.length > 1 ? 's' : ''} planned this week` })
    return out
  }, [rows, today, weekStart, weekEnd])

  const weekLabel = weekOffset === 0 ? 'This week'
    : weekOffset === 1 ? 'Next week'
    : weekOffset === -1 ? 'Last week'
    : `${fmtDate(weekStart, { month: 'short', day: 'numeric' })} – ${fmtDate(weekEnd, { month: 'short', day: 'numeric' })}`

  return (
    <div className="tab-pad">
      <div className="tab-head">
        <div className="week-nav">
          <button className="icon-btn" onClick={() => setWeekOffset((n) => n - 1)} aria-label="Previous week">
            <Icon name="chevron-left" size={20} />
          </button>
          <div>
            <h2>{weekLabel}</h2>
            <div className="muted">{fmtDate(weekStart)} – {fmtDate(weekEnd)}</div>
          </div>
          <button className="icon-btn" onClick={() => setWeekOffset((n) => n + 1)} aria-label="Next week">
            <Icon name="chevron-right" size={20} />
          </button>
        </div>
        <div className="head-actions">
          {weekOffset !== 0 && (
            <button className="btn ghost sm" onClick={() => setWeekOffset(0)}>Today</button>
          )}
          <button className="btn primary sm" onClick={() => setAdding(true)}>
            <Icon name="log" size={16} /> Event
          </button>
        </div>
      </div>

      {nudges.length > 0 && (
        <div className="nudges">
          {nudges.map((n, i) => (
            <div key={i} className={`nudge ${n.severity}`}>
              <span className="nudge-icon">{n.icon}</span>
              <span className="nudge-text">{n.text}</span>
            </div>
          ))}
        </div>
      )}

      {error && <div className="error">Couldn’t load: {error}</div>}
      {loading && <div className="muted pad">Loading…</div>}

      {!loading && (
        isDesktop
          ? <WeekTimeGrid days={weekDays} byDay={byDay} today={today} onSelectDay={setSelected} />
          : <WeekAgenda days={weekDays} byDay={byDay} today={today} />
      )}

      {!loading && highlights.length > 0 && (
        <div className="highlights">
          <h3>Coming this month</h3>
          {highlights.map((h, i) => (
            <div key={i} className="highlight"><span>{h.icon}</span> {h.text}</div>
          ))}
        </div>
      )}

      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? fmtDate(selected, { weekday: 'long', month: 'long', day: 'numeric' }) : ''}
      >
        {selected && sortDayEvents(byDay[selected] || []).map((r, i) => (
          <EventRow key={`${r.source}-${r.ref_id}-${i}`} row={r} />
        ))}
      </Sheet>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add family event">
        <AddEvent defaultDate={today} onDone={() => { setAdding(false); reload() }} />
      </Sheet>
    </div>
  )
}
