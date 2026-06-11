import { useState, useEffect, useCallback, useMemo } from 'react'
import * as store from '../lib/store.js'
import { PHASES, FLOW_LEVELS, computeCyclePhase, todayLocalISO, formatDateLong, localDayBounds, isoToLocalDateStr } from '../constants.js'

// ============================================================
// CYCLE RING
// ============================================================

export default function CalendarTab({ periodStarts, onPeriodStartsChange, refreshKey }) {
  const [cycleOffset, setCycleOffset] = useState(0)
  const [days, setDays]               = useState({})
  const [symptomCounts, setSymptomCounts] = useState({})
  const [selected, setSelected]       = useState(null)
  const [loading, setLoading]         = useState(true)

  const cycle = useMemo(() => deriveCycle(periodStarts, cycleOffset), [periodStarts, cycleOffset])

  const load = useCallback(async () => {
    if (!cycle) { setLoading(false); return }
    setLoading(true)
    const firstStr = cycle.startISO
    const lastStr  = cycle.endISO
    // Span the cycle range in UTC bounds that cover all local-time days within it
    const { startISO: rangeStart } = localDayBounds(firstStr)
    const { endISO:   rangeEnd   } = localDayBounds(lastStr)

    const [allDays, dSym] = await Promise.all([
      store.listCycleDays(),
      store.listEventsInRange('symptom_event', rangeStart, rangeEnd),
    ])

    const byDate = {}
    for (const ds of Object.keys(allDays)) {
      if (ds >= firstStr && ds <= lastStr) byDate[ds] = allDays[ds]
    }
    setDays(byDate)

    const sCounts = {}
    for (const ev of dSym) {
      const d = isoToLocalDateStr(ev.occurred_at)
      sCounts[d] = (sCounts[d] || 0) + 1
    }
    setSymptomCounts(sCounts)
    setLoading(false)
  }, [cycle])

  useEffect(() => { load() }, [load, refreshKey])

  if (!cycle) {
    return (
      <div className="card">
        <div className="empty">
          Add at least one period start date to see your cycle wheel.
        </div>
      </div>
    )
  }

  return (
    <div className="calendar-tab stack">
      <div className="card">
        <div className="cycle-nav">
          <button className="btn ghost btn sm" onClick={() => setCycleOffset(o => o - 1)} aria-label="Previous cycle">‹</button>
          <div className="cycle-nav-center">
            <h3 className="card-title cycle-title">
              {cycleOffset === 0 ? 'This cycle' : cycleOffset === -1 ? 'Last cycle' : `${Math.abs(cycleOffset)} cycles ago`}
            </h3>
            <div className="cycle-range">
              {fmtShort(cycle.start)} – {fmtShort(cycle.end)} · {cycle.length} days
              {cycle.estimated && <span className="muted"> (est.)</span>}
            </div>
          </div>
          <button
            className="btn ghost btn sm"
            onClick={() => setCycleOffset(o => o + 1)}
            disabled={cycleOffset >= 0}
            aria-label="Next cycle"
          >›</button>
        </div>

        {loading ? (
          <div className="empty">Loading…</div>
        ) : (
          <CycleRing
            cycle={cycle}
            periodStarts={periodStarts}
            days={days}
            symptomCounts={symptomCounts}
            selected={selected}
            onSelect={setSelected}
          />
        )}

        <CycleLegend />
      </div>

      {selected && (
        <SelectedDayCard
          date={selected}
          periodStarts={periodStarts}
          onClose={() => setSelected(null)}
          onPeriodStartsChange={() => { onPeriodStartsChange(); load() }}
        />
      )}

      <PeriodHistoryCard periodStarts={periodStarts} onChange={() => { onPeriodStartsChange(); load() }} />

      <style>{`
        .cycle-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .cycle-nav-center { text-align: center; flex: 1; }
        .cycle-title { font-size: 22px; }
        .cycle-range {
          margin-top: 3px;
          font-size: 12px;
          color: var(--text-soft);
          letter-spacing: 0.03em;
        }
      `}</style>
    </div>
  )
}

// ============================================================
// CYCLE RING (SVG)
// ============================================================
// Layout (radii, inside → out):
//   center text (Day N, date, phase)
//   wedge inner edge       R_INNER  (95)
//   wedge outer edge       R_OUTER  (145)
//   gap                    (label band)
//   phase label baseline   R_PHASE_LABEL (165)
//   phase arc band         R_PHASE_ARC (175–183)
// ============================================================
function CycleRing({ cycle, periodStarts, days, symptomCounts, selected, onSelect }) {
  const SIZE = 380
  const CX = SIZE / 2
  const CY = SIZE / 2
  const R_INNER = 95
  const R_OUTER = 145
  const R_FLOW_BAND = 147       // thin flow indicator just outside wedges
  const R_FLOW_BAND_OUT = 151
  const R_PHASE_LABEL = 162     // phase name baseline (outside ring)
  const R_LABEL_PATH = 159      // radius of the hidden arcs that text follows
  const R_PHASE_ARC = 173       // phase color band
  const R_PHASE_ARC_OUT = 181
  const R_TODAY_RING = 100      // inner accent ring for "today"
  const R_DAY_NUM = 120         // day number inside each wedge
  const R_SYMPTOM_DOT = 105
  const R_STAR = 138

  const today = todayLocalISO()
  const N = cycle.length

  const phaseSpans = [
    { key: 'menstrual',  startDay: 1,  endDay: Math.min(5, N) },
    { key: 'follicular', startDay: 6,  endDay: Math.min(13, N) },
    { key: 'ovulation',  startDay: 14, endDay: Math.min(16, N) },
    { key: 'luteal',     startDay: 17, endDay: N },
  ].filter(p => p.startDay <= N && p.endDay >= p.startDay)

  const wedgeAngle = 360 / N
  const startAngleDeg = -90 // 12 o'clock

  const wedges = []
  for (let day = 1; day <= N; day++) {
    const a0 = startAngleDeg + (day - 1) * wedgeAngle
    const a1 = startAngleDeg + day * wedgeAngle
    const dateStr = addDaysISO(cycle.startISO, day - 1)
    const isToday = dateStr === today
    const isFuture = dateStr > today
    const dayData = days[dateStr]
    const phase = phaseForDay(day, phaseSpans)

    wedges.push({
      day, a0, a1, dateStr, isToday, isFuture, dayData,
      phase,
      sCount: symptomCounts[dateStr] || 0,
      isPeriodStart: periodStarts.includes(dateStr),
      isSelected: selected === dateStr,
    })
  }

  const handleSelect = (dateStr) => {
    onSelect(selected === dateStr ? null : dateStr)
  }

  const todayWedge = wedges.find(w => w.isToday)
  const selectedWedge = wedges.find(w => w.dateStr === selected)
  const centerWedge = selectedWedge || todayWedge

  return (
    <div className="ring-wrap">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="cycle-ring" role="img" aria-label="Cycle wheel">
        {/* Faint background ring under wedges */}
        <circle cx={CX} cy={CY} r={(R_OUTER + R_INNER) / 2} fill="none" stroke="var(--border)" strokeWidth={R_OUTER - R_INNER} />

        {/* Day wedges */}
        {wedges.map(w => (
          <path
            key={`w-${w.day}`}
            d={arcBand(CX, CY, R_INNER, R_OUTER, w.a0, w.a1)}
            fill={wedgeFill(w)}
            stroke="var(--wedge-divider)"
            strokeWidth={0.8}
            style={{ cursor: 'pointer' }}
            onClick={() => handleSelect(w.dateStr)}
          />
        ))}

        {/* Today highlight: a thin accent ring band just inside wedges */}
        {todayWedge && (
          <path
            d={arcBand(CX, CY, R_TODAY_RING - 3, R_TODAY_RING, todayWedge.a0, todayWedge.a1)}
            fill="var(--app-accent)"
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Selected highlight: thicker ring on inside edge */}
        {selectedWedge && selectedWedge.dateStr !== today && (
          <path
            d={arcBand(CX, CY, R_TODAY_RING - 3, R_TODAY_RING, selectedWedge.a0, selectedWedge.a1)}
            fill="var(--text)"
            opacity={0.7}
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Day numbers inside every wedge */}
        {wedges.map(w => {
          const mid = (w.a0 + w.a1) / 2
          const { x, y } = polar(CX, CY, R_DAY_NUM, mid)
          return (
            <text
              key={`d-${w.day}`}
              x={x} y={y + 3}
              textAnchor="middle"
              fontSize={N <= 30 ? '10' : '9'}
              fill={w.isFuture ? 'var(--text-soft)' : w.isToday || w.isSelected ? 'var(--text)' : 'var(--text-soft)'}
              fontWeight={w.isToday || w.isSelected ? '700' : '500'}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {w.day}
            </text>
          )
        })}

        {/* Flow band on outer edge of wedge */}
        {wedges.map(w => {
          if (!w.dayData?.flow || w.dayData.flow === 'none') return null
          return (
            <path
              key={`f-${w.day}`}
              d={arcBand(CX, CY, R_FLOW_BAND, R_FLOW_BAND_OUT, w.a0, w.a1)}
              fill={flowColor(w.dayData.flow)}
              style={{ pointerEvents: 'none' }}
            />
          )
        })}

        {/* Symptom dot inside wedge */}
        {wedges.map(w => {
          if (w.sCount === 0 || w.isFuture) return null
          const mid = (w.a0 + w.a1) / 2
          const { x, y } = polar(CX, CY, R_SYMPTOM_DOT, mid)
          return <circle key={`s-${w.day}`} cx={x} cy={y} r={2.2} fill="var(--app-accent)" style={{ pointerEvents: 'none' }} />
        })}

        {/* Period start star */}
        {wedges.map(w => {
          if (!w.isPeriodStart) return null
          const mid = (w.a0 + w.a1) / 2
          const { x, y } = polar(CX, CY, R_STAR, mid)
          return (
            <text
              key={`star-${w.day}`}
              x={x} y={y + 3}
              textAnchor="middle"
              fontSize="10"
              fill="var(--app-accent)"
              fontWeight="700"
              style={{ pointerEvents: 'none' }}
            >★</text>
          )
        })}

        {/* Phase arcs — OUTSIDE the wedges */}
        {phaseSpans.map(span => {
          const a0 = startAngleDeg + (span.startDay - 1) * wedgeAngle
          const a1 = startAngleDeg + span.endDay * wedgeAngle
          return (
            <path
              key={`pa-${span.key}`}
              d={arcBand(CX, CY, R_PHASE_ARC, R_PHASE_ARC_OUT, a0, a1)}
              fill={phaseVarColor(span.key)}
              opacity={0.9}
              style={{ pointerEvents: 'none' }}
            />
          )
        })}

        {/* Hidden arcs for phase labels to follow */}
        <defs>
          {phaseSpans.map(span => {
            const a0 = startAngleDeg + (span.startDay - 1) * wedgeAngle
            const a1 = startAngleDeg + span.endDay * wedgeAngle
            const midAngle = (a0 + a1) / 2
            const aMod = ((midAngle % 360) + 360) % 360
            // Bottom half of ring (between 0° and 180° in standard SVG, where +y is down):
            // We want text on these phases to flow counterclockwise so it reads right-side up.
            const onBottom = aMod > 0 && aMod < 180
            const pathR = R_LABEL_PATH
            // Inset arc endpoints slightly so the text doesn't kiss the phase boundary
            const pad = Math.min(wedgeAngle * 0.4, 4) // up to 4° padding on each end
            const arcStart = a0 + pad
            const arcEnd = a1 - pad
            const startA = onBottom ? arcEnd : arcStart
            const endA = onBottom ? arcStart : arcEnd
            const sweep = onBottom ? 0 : 1
            const p1 = polar(CX, CY, pathR, startA)
            const p2 = polar(CX, CY, pathR, endA)
            const large = Math.abs(endA - startA) > 180 ? 1 : 0
            return (
              <path
                key={`arc-${span.key}`}
                id={`phase-arc-${span.key}`}
                d={`M ${p1.x} ${p1.y} A ${pathR} ${pathR} 0 ${large} ${sweep} ${p2.x} ${p2.y}`}
                fill="none"
              />
            )
          })}
        </defs>

        {/* Phase labels — curved along the arcs */}
        {phaseSpans.map(span => {
          if (span.endDay - span.startDay < 1) return null
          const phaseLen = span.endDay - span.startDay + 1
          // For short phases (like 3-day ovulation), use a shorter label
          let label = PHASES[span.key].label.toUpperCase()
          if (phaseLen <= 3 && label.length > 5) label = label.slice(0, 5)
          return (
            <text
              key={`pl-${span.key}`}
              fontSize="9.5"
              fill={phaseVarColor(span.key)}
              fontWeight="700"
              letterSpacing="0.12em"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              <textPath
                href={`#phase-arc-${span.key}`}
                startOffset="50%"
                textAnchor="middle"
              >
                {label}
              </textPath>
            </text>
          )
        })}

        {/* Center: Day number + date + phase */}
        <g style={{ pointerEvents: 'none' }}>
          {centerWedge ? (
            <>
              <text x={CX} y={CY - 4} textAnchor="middle" fontFamily="Fraunces" fontSize="44" fill="var(--text)">
                {centerWedge.day}
              </text>
              <text x={CX} y={CY + 18} textAnchor="middle" fontSize="11" fill="var(--text-soft)" letterSpacing="0.05em">
                {centerWedge.isToday ? 'TODAY · ' : ''}{fmtShort(new Date(centerWedge.dateStr + 'T00:00:00'))}
              </text>
              <text x={CX} y={CY + 34} textAnchor="middle" fontSize="10" fill={centerWedge.phase ? phaseVarColor(centerWedge.phase) : 'var(--text-soft)'} letterSpacing="0.1em" fontWeight="600">
                {centerWedge.phase ? PHASES[centerWedge.phase].label.toUpperCase() : ''}
              </text>
            </>
          ) : (
            <text x={CX} y={CY + 4} textAnchor="middle" fontFamily="Fraunces" fontSize="20" fill="var(--text-soft)">
              Day —
            </text>
          )}
        </g>
      </svg>

      <style>{`
        .ring-wrap {
          display: grid;
          place-items: center;
          padding: 8px 0 4px;
        }
        .cycle-ring {
          width: 100%;
          max-width: 380px;
          height: auto;
          display: block;
        }
        .cycle-ring path { transition: opacity 0.15s; }
        .cycle-ring path:active { opacity: 0.75; }
      `}</style>
    </div>
  )
}

// ============================================================
// LEGEND
// ============================================================
function CycleLegend() {
  return (
    <div className="cycle-legend">
      <div className="legend-row">
        <span className="legend-cap">Phases</span>
        {Object.entries(PHASES).map(([k, p]) => (
          <span key={k} className="legend-item">
            <span className="legend-swatch" style={{ background: `var(--phase-${k})` }} />
            {p.label}
          </span>
        ))}
      </div>
      <div className="legend-row">
        <span className="legend-cap">Flow</span>
        {FLOW_LEVELS.filter(f => f.value !== 'none').map(f => (
          <span key={f.value} className="legend-item">
            <span className="legend-bar" style={{ background: f.color }} />
            {f.label}
          </span>
        ))}
      </div>
      <div className="legend-row">
        <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--app-accent)' }} /> Symptom logged</span>
        <span className="legend-item"><span style={{ color: 'var(--app-accent)', fontWeight: 700 }}>★</span> Period start</span>
      </div>

      <style>{`
        .cycle-legend {
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .legend-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          font-size: 12px;
          color: var(--text-soft);
        }
        .legend-cap {
          font-size: 10px;
          color: var(--text-soft);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          font-weight: 600;
          min-width: 50px;
        }
        .legend-item { display: inline-flex; align-items: center; gap: 5px; }
        .legend-swatch {
          width: 10px; height: 10px;
          border-radius: 3px;
        }
        .legend-bar {
          width: 12px; height: 4px;
          border-radius: 999px;
        }
        .legend-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
        }
      `}</style>
    </div>
  )
}

// ============================================================
// SELECTED DAY CARD
// ============================================================
function SelectedDayCard({ date, periodStarts, onClose, onPeriodStartsChange }) {
  const [day, setDay] = useState(null)
  const [events, setEvents] = useState({ symptoms: [], foods: [], moods: [], waters: [], exercises: [] })
  const isPeriodStart = periodStarts.includes(date)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { startISO: start, endISO: end } = localDayBounds(date)
      const [d, s, f, m, w, e] = await Promise.all([
        store.getCycleDay(date),
        store.listEventsForDay('symptom_event', date),
        store.listEventsForDay('food_event', date),
        store.listEventsForDay('mood_event', date),
        store.listEventsForDay('water_event', date),
        store.listEventsForDay('exercise_event', date),
      ])
      if (cancelled) return
      setDay(d.recordId ? d : null)
      setEvents({ symptoms: s, foods: f, moods: m, waters: w, exercises: e })
    })()
    return () => { cancelled = true }
  }, [date])

  const togglePeriodStart = async () => {
    if (isPeriodStart) {
      if (!confirm('Remove this as a period start date?')) return
      await store.removePeriodStart(date)
    } else {
      await store.addPeriodStart(date)
    }
    onPeriodStartsChange()
  }

  const phase = day?.cycle_phase || computeCyclePhase(date, periodStarts)
  const totalSym = events.symptoms.length
  const totalFood = events.foods.length

  return (
    <div className="card fade-in">
      <div className="row-between">
        <div>
          <h3 className="card-title section-h" style={{ fontSize: 20 }}>{formatDateLong(date)}</h3>
          {phase && (
            <span className="phase-pill-sm" style={{ background: `var(--phase-${phase})` }}>
              {PHASES[phase].label}
            </span>
          )}
        </div>
        <button className="btn ghost btn sm" onClick={onClose}>✕</button>
      </div>

      <div className="day-detail-stats">
        <div className="dd-stat">
          <div className="dd-stat-value">{totalSym}</div>
          <div className="dd-stat-label">Symptoms</div>
        </div>
        <div className="dd-stat">
          <div className="dd-stat-value">{totalFood}</div>
          <div className="dd-stat-label">Foods</div>
        </div>
        <div className="dd-stat">
          <div className="dd-stat-value">{day?.flow ? FLOW_LEVELS.find(f => f.value === day.flow)?.label : '—'}</div>
          <div className="dd-stat-label">Flow</div>
        </div>
      </div>

      {day?.notes && (
        <>
          <label className="field-label" style={{ marginTop: 14 }}>Notes</label>
          <p style={{ margin: 0, color: 'var(--text-soft)', fontStyle: 'italic' }}>{day.notes}</p>
        </>
      )}

      <button
        className="btn block"
        style={{ marginTop: 14 }}
        onClick={togglePeriodStart}
      >
        {isPeriodStart ? '★ Unmark as period start' : '☆ Mark as period start'}
      </button>

      <p className="muted" style={{ fontSize: 12, marginTop: 10, textAlign: 'center' }}>
        Tip: to log or edit details for this day, switch to the Log tab and pick this date.
      </p>

      <style>{`
        .phase-pill-sm {
          display: inline-block;
          padding: 2px 8px;
          border-radius: var(--r-full);
          font-size: 10px;
          color: white;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-top: 4px;
        }
        .day-detail-stats {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          margin-top: 14px;
        }
        .dd-stat {
          padding: 12px 6px;
          background: var(--bg-sunken);
          border-radius: var(--r-sm);
          text-align: center;
        }
        .dd-stat-value {
          font-family: var(--font-display);
          font-size: 22px;
          color: var(--text);
        }
        .dd-stat-label {
          font-size: 10px;
          color: var(--text-soft);
          margin-top: 2px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  )
}

// ============================================================
// PERIOD HISTORY
// ============================================================
function PeriodHistoryCard({ periodStarts, onChange }) {
  const [open, setOpen] = useState(false)
  const [newDate, setNewDate] = useState('')

  const add = async () => {
    if (!newDate) return
    await store.addPeriodStart(newDate)
    setNewDate('')
    onChange()
  }

  const remove = async (d) => {
    if (!confirm(`Remove ${d}?`)) return
    await store.removePeriodStart(d)
    onChange()
  }

  const sorted = [...periodStarts].sort().reverse()

  return (
    <div className="card">
      <button className="row-between" style={{ width: '100%' }} onClick={() => setOpen(o => !o)}>
        <div>
          <div className="card-title section-h" style={{ fontSize: 16 }}>Period history</div>
          <div className="card-sub" style={{ marginTop: 2 }}>
            {sorted.length} recorded
          </div>
        </div>
        <span style={{ color: 'var(--text-soft)' }}>{open ? '⌃' : '⌄'}</span>
      </button>
      {open && (
        <div style={{ marginTop: 14 }}>
          <div className="row" style={{ gap: 8 }}>
            <input
              type="date"
              className="input"
              value={newDate}
              max={todayLocalISO()}
              onChange={e => setNewDate(e.target.value)}
            />
            <button className="btn primary btn sm" onClick={add} disabled={!newDate}>Add</button>
          </div>
          <div style={{ marginTop: 14 }}>
            {sorted.length === 0 ? (
              <div className="empty">None yet.</div>
            ) : (
              sorted.map(d => (
                <div key={d} className="event-item">
                  <span className="event-time" style={{ minWidth: 'auto' }}>★</span>
                  <div className="event-body">
                    <div className="event-label">{formatDateLong(d)}</div>
                  </div>
                  <button className="event-delete" onClick={() => remove(d)}>×</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// CYCLE DERIVATION
// ============================================================
function deriveCycle(periodStarts, offset) {
  if (!periodStarts || periodStarts.length === 0) return null
  const sorted = [...periodStarts].sort()
  const today = todayLocalISO()

  let estLength = 28
  if (sorted.length >= 2) {
    const gaps = []
    for (let i = 1; i < sorted.length; i++) {
      const a = new Date(sorted[i - 1] + 'T00:00:00')
      const b = new Date(sorted[i] + 'T00:00:00')
      gaps.push(Math.round((b - a) / 86400_000))
    }
    const recent = gaps.slice(-3)
    estLength = Math.round(recent.reduce((s, g) => s + g, 0) / recent.length)
    if (estLength < 21 || estLength > 40) estLength = 28
  }

  let currentIdx = -1
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] <= today) currentIdx = i
    else break
  }
  if (currentIdx < 0) return null

  const targetIdx = currentIdx + offset
  if (targetIdx < 0 || targetIdx >= sorted.length) return null

  const startISO = sorted[targetIdx]
  let endISO, length, estimated = false
  if (sorted[targetIdx + 1]) {
    endISO = addDaysISO(sorted[targetIdx + 1], -1)
    length = daysBetween(startISO, endISO) + 1
  } else {
    length = estLength
    endISO = addDaysISO(startISO, length - 1)
    estimated = true
  }

  return {
    start: new Date(startISO + 'T00:00:00'),
    end: new Date(endISO + 'T00:00:00'),
    startISO, endISO, length, estimated,
  }
}

// ============================================================
// HELPERS
// ============================================================
function polar(cx, cy, r, angleDeg) {
  const a = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

function arcBand(cx, cy, rInner, rOuter, a0, a1) {
  const p1 = polar(cx, cy, rOuter, a0)
  const p2 = polar(cx, cy, rOuter, a1)
  const p3 = polar(cx, cy, rInner, a1)
  const p4 = polar(cx, cy, rInner, a0)
  const large = a1 - a0 > 180 ? 1 : 0
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ')
}

function wedgeFill(w) {
  if (w.isFuture) return 'var(--wedge-future)'
  if (w.dayData?.flow && w.dayData.flow !== 'none') return 'var(--wedge-period)'
  if (!w.phase) return 'var(--bg-paper)'
  const map = {
    menstrual:  'var(--wedge-menstrual)',
    follicular: 'var(--wedge-follicular)',
    ovulation:  'var(--wedge-ovulation)',
    luteal:     'var(--wedge-luteal)',
  }
  return map[w.phase] || 'var(--bg-paper)'
}

function flowColor(flow) {
  const map = {
    spotting: 'var(--flow-spotting)',
    light:    'var(--flow-light)',
    medium:   'var(--flow-medium)',
    heavy:    'var(--flow-heavy)',
  }
  return map[flow] || 'transparent'
}

function phaseForDay(day, phaseSpans) {
  for (const span of phaseSpans) {
    if (day >= span.startDay && day <= span.endDay) return span.key
  }
  return null
}

function toISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDaysISO(iso, days) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return toISO(d)
}

function daysBetween(a, b) {
  return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400_000)
}

function fmtShort(d) {
  if (typeof d === 'string') d = new Date(d + 'T00:00:00')
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// Maps phase keys to CSS vars (which adapt to dark mode). We keep PHASES[key].label
// from constants.js for the human-readable name, but reroute the color so it shifts
// with the theme. The legend and other UI bits also fall back to PHASES[key].color
// directly — those are still consistent because the legend swatches sit on
// the card surface where the lighter hex literals look fine in both modes.
function phaseVarColor(key) {
  return `var(--phase-${key})`
}
