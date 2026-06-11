import { useMemo, useEffect, useState } from 'react'
import { kindMeta, sortDayEvents, parseLocalDate, fmtTime } from '../constants'

const GRID_START_HOUR = 6
const GRID_END_HOUR   = 22
const PX_PER_HOUR     = 48
const TOTAL_HOURS     = GRID_END_HOUR - GRID_START_HOUR
const GRID_HEIGHT_PX  = TOTAL_HOURS * PX_PER_HOUR
const HOURS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => GRID_START_HOUR + i)

function fmtHour(h) {
  const ap = h >= 12 ? 'PM' : 'AM'
  const hh = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hh} ${ap}`
}

function timedBlockGeometry(event) {
  if (!event.event_time) return null
  const start = new Date(event.event_time)
  const startMin = start.getHours() * 60 + start.getMinutes()
  const gridStartMin = GRID_START_HOUR * 60
  const gridEndMin   = GRID_END_HOUR * 60
  const endMin = startMin + 60   // assume 1 hour until end times are stored
  if (endMin <= gridStartMin || startMin >= gridEndMin) return null
  const top    = Math.max(0, (startMin - gridStartMin) / 60 * PX_PER_HOUR)
  const bottom = Math.min(GRID_HEIGHT_PX, (endMin - gridStartMin) / 60 * PX_PER_HOUR)
  return { top, height: Math.max(20, bottom - top) }
}

function nowOffsetPx() {
  const now = new Date()
  const mins = now.getHours() * 60 + now.getMinutes()
  const gridStart = GRID_START_HOUR * 60
  const gridEnd   = GRID_END_HOUR * 60
  if (mins < gridStart || mins > gridEnd) return null
  return (mins - gridStart) / 60 * PX_PER_HOUR
}

export default function WeekTimeGrid({ days, byDay, today, onSelectDay }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const { allDayByDay, timedByDay, allDayStripHeight } = useMemo(() => {
    const ad = {}, td = {}
    let max = 0
    for (const d of days) {
      const sorted = sortDayEvents(byDay[d] || [])
      ad[d] = sorted.filter((e) => !e.event_time)
      td[d] = sorted.filter((e) => e.event_time)
      if (ad[d].length > max) max = ad[d].length
    }
    const stripHeight = Math.min(Math.max(max, 1) * 26 + 8, 130)
    return { allDayByDay: ad, timedByDay: td, allDayStripHeight: stripHeight }
  }, [days, byDay])

  const nowPx = nowOffsetPx()
  const todayIdx = days.indexOf(today)

  return (
    <div className="tgrid">
      <div className="tgrid-head">
        <div className="tgrid-gutter" />
        {days.map((d) => {
          const isToday = d === today
          const dayOfWeek = parseLocalDate(d).toLocaleDateString('en-US', { weekday: 'short' })
          const dayNum = parseLocalDate(d).getDate()
          return (
            <button
              key={d}
              className={`tgrid-daylabel ${isToday ? 'is-today' : ''}`}
              onClick={() => onSelectDay?.(d)}
            >
              <span className="tgrid-dow">{dayOfWeek}</span>
              <span className="tgrid-daynum">{dayNum}</span>
            </button>
          )
        })}
      </div>

      <div className="tgrid-allday" style={{ height: allDayStripHeight }}>
        <div className="tgrid-gutter tgrid-allday-label">all day</div>
        {days.map((d) => (
          <div key={d} className={`tgrid-allday-col ${d === today ? 'is-today-col' : ''}`}>
            {(allDayByDay[d] || []).map((e, i) => {
              const m = kindMeta(e.kind)
              return (
                <div
                  key={`${e.source}-${e.ref_id}-${i}`}
                  className="tgrid-allday-chip"
                  style={{ '--dot': m.color }}
                  title={e.title}
                  onClick={() => onSelectDay?.(d)}
                >
                  <span className="tgrid-allday-mark">{m.icon}</span>
                  <span className="tgrid-allday-title">{e.title}</span>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="tgrid-body" style={{ height: GRID_HEIGHT_PX }}>
        <div className="tgrid-gutter tgrid-hours">
          {HOURS.slice(0, -1).map((h) => (
            <div key={h} className="tgrid-hour-row" style={{ height: PX_PER_HOUR }}>
              <span className="tgrid-hour-label">{fmtHour(h)}</span>
            </div>
          ))}
        </div>

        {days.map((d, dayIdx) => (
          <div key={d} className={`tgrid-col ${d === today ? 'is-today-col' : ''}`}>
            {HOURS.slice(0, -1).map((h) => (
              <div key={h} className="tgrid-hour-line" style={{ height: PX_PER_HOUR }} />
            ))}
            {(timedByDay[d] || []).map((e, i) => {
              const geo = timedBlockGeometry(e)
              if (!geo) return null
              const m = kindMeta(e.kind)
              return (
                <div
                  key={`${e.source}-${e.ref_id}-${i}`}
                  className="tgrid-event"
                  style={{ top: geo.top, height: geo.height, '--dot': m.color }}
                  title={`${e.title} · ${fmtTime(e.event_time)}`}
                  onClick={() => onSelectDay?.(d)}
                >
                  <span className="tgrid-event-mark">{m.icon}</span>
                  <span className="tgrid-event-body">
                    <span className="tgrid-event-title">{e.title}</span>
                    <span className="tgrid-event-time">{fmtTime(e.event_time)}</span>
                  </span>
                </div>
              )
            })}
            {dayIdx === todayIdx && nowPx != null && (
              <div className="tgrid-now" style={{ top: nowPx }}>
                <div className="tgrid-now-dot" />
                <div className="tgrid-now-line" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
