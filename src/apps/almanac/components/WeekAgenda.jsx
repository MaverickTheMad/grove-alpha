import EventRow from './EventRow'
import { relativeDay, sortDayEvents, parseLocalDate, fmtDate } from '../constants'

// Mobile agenda: one section per day, events as comfortable rows.
// Empty days collapse to a thin "—" so they're acknowledged but not noisy.
export default function WeekAgenda({ days, byDay, today }) {
  return (
    <div className="agenda">
      {days.map((d) => {
        const events = sortDayEvents(byDay[d] || [])
        const isToday = d === today
        const isPast = d < today
        const dayOfWeek = parseLocalDate(d).toLocaleDateString('en-US', { weekday: 'short' })
        const monthDay = fmtDate(d, { month: 'short', day: 'numeric' })
        return (
          <section key={d} className={`agenda-day ${isToday ? 'is-today' : ''} ${isPast ? 'is-past' : ''}`}>
            <header className="agenda-day-head">
              <div className="agenda-day-label">
                <span className="agenda-dow">{dayOfWeek}</span>
                <span className="agenda-mday">{monthDay}</span>
              </div>
              <div className="agenda-rel">{relativeDay(d)}</div>
            </header>
            {events.length === 0 ? (
              <div className="agenda-empty">—</div>
            ) : (
              <div className="agenda-events">
                {events.map((r, i) => (
                  <EventRow key={`${r.source}-${r.ref_id}-${i}`} row={r} />
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
