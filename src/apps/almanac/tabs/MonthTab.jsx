import { useState, useMemo } from 'react'
import { useTimeline } from '../useTimeline'
import { useIsDesktop } from '../../../lib/viewport'
import EventRow from '../components/EventRow'
import Sheet from '../../../components/Sheet'
import Icon from '../../../components/Icon'
import {
  monthBounds, dateRange, parseLocalDate, todayStr, addDays,
  kindMeta, sortDayEvents, fmtDate,
} from '../constants'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function MonthTab() {
  const [anchor, setAnchor] = useState(todayStr())
  const [selected, setSelected] = useState(null)
  const isDesktop = useIsDesktop(720)
  const { start, end } = monthBounds(anchor)
  const { rows, loading, error } = useTimeline(start, end)
  const today = todayStr()

  const byDay = useMemo(() => {
    const map = {}
    for (const r of rows) (map[r.event_date] ||= []).push(r)
    return map
  }, [rows])

  const cells = useMemo(() => {
    const firstDow = parseLocalDate(start).getDay()
    const leading = Array.from({ length: firstDow }, (_, i) => addDays(start, i - firstDow))
    const days = dateRange(start, end)
    const all = [...leading, ...days]
    while (all.length % 7 !== 0) all.push(addDays(all[all.length - 1], 1))
    return all
  }, [start, end])

  const monthLabel = parseLocalDate(anchor).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const shiftMonth = (n) => {
    const d = parseLocalDate(anchor)
    setAnchor(todayStr(new Date(d.getFullYear(), d.getMonth() + n, 1)))
  }

  return (
    <div className="tab-pad">
      <div className="tab-head">
        <div className="week-nav">
          <button className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <Icon name="chevron-left" size={20} />
          </button>
          <h2>{monthLabel}</h2>
          <button className="icon-btn" onClick={() => shiftMonth(1)} aria-label="Next month">
            <Icon name="chevron-right" size={20} />
          </button>
        </div>
        {anchor.slice(0, 7) !== today.slice(0, 7) && (
          <button className="btn ghost sm" onClick={() => setAnchor(today)}>Today</button>
        )}
      </div>

      {error && <div className="error">Couldn’t load: {error}</div>}

      <div className="dow-row">
        {DOW.map((d) => <div key={d} className="dow">{d}</div>)}
      </div>

      <div className="month-grid">
        {cells.map((d) => {
          const inMonth = d >= start && d <= end
          const events = byDay[d] || []
          const kinds = [...new Set(events.map((e) => e.kind))].slice(0, 4)
          return (
            <button
              key={d}
              className={`mcell ${inMonth ? '' : 'out'} ${d === today ? 'is-today' : ''}`}
              onClick={() => events.length && setSelected(d)}
              disabled={events.length === 0}
            >
              <span className="mnum">{parseLocalDate(d).getDate()}</span>
              {isDesktop ? (
                <span className="mchips">
                  {sortDayEvents(events).slice(0, 3).map((ev, i) => {
                    const meta = kindMeta(ev.kind)
                    return (
                      <span key={i} className="mchip" style={{ '--dot': meta.color }}>
                        <span className="mchip-label">{ev.title || meta.label}</span>
                      </span>
                    )
                  })}
                  {events.length > 3 && (
                    <span className="mmore">+{events.length - 3} more</span>
                  )}
                </span>
              ) : (
                <span className="mdots">
                  {kinds.map((k) => (
                    <span key={k} className="mdot" style={{ background: kindMeta(k).color }} />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {loading && <div className="muted pad">Loading…</div>}

      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? fmtDate(selected, { weekday: 'long', month: 'long', day: 'numeric' }) : ''}
      >
        {selected && sortDayEvents(byDay[selected] || []).map((r, i) => (
          <EventRow key={`${r.source}-${r.ref_id}-${i}`} row={r} />
        ))}
      </Sheet>
    </div>
  )
}
