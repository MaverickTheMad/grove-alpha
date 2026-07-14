import { useState, useEffect, useCallback } from 'react'
import * as store from '../lib/store.js'
import { useToast } from '../../../components/Toast'

// This journal belongs to Ren; her workouts in the Fitness app log under 'ren'.
const FITNESS_PERSON = 'ren'
// Mirror of the Fitness app's workout categories (kept local — separate repo).
const FITNESS_CATEGORY_LABEL = {
  general: 'General', cardio: 'Cardio', pilates_yoga: 'Pilates / Yoga',
  legs: 'Legs', arms: 'Arms', core: 'Chest / Abs / Back', rest: 'Rest / Walk',
}
import {
  FOOD_CATEGORIES, SYMPTOMS, MOODS, EXERCISE_TYPES, FLOW_LEVELS,
  PHASES, computeCyclePhase, todayLocalISO, formatTimeLocal, formatDateLong,
  localDayBounds, MEAL_PICKER, categorizeIngredient,
} from '../constants.js'
import TimePicker from '../../../components/TimePicker'
import { cmpText, sortByName } from '../../../lib/sort.js'
import { Button, Card, Chip } from '../../../ds'

export default function IntakeTab({ periodStarts, onChange, refreshKey }) {
  const [date, setDate] = useState(todayLocalISO())
  const [day, setDay] = useState(null)            // cycle_days row
  const [symptoms, setSymptoms] = useState([])
  const [foods, setFoods]       = useState([])
  const [moods, setMoods]       = useState([])
  const [waters, setWaters]     = useState([])
  const [exercises, setExercises] = useState([])
  const [workouts, setWorkouts]   = useState([])   // read-only, from the Fitness app
  const [loading, setLoading]   = useState(true)

  // Active "add" panel: null | 'symptom' | 'food' | 'mood' | 'water' | 'exercise'
  const [adding, setAdding] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { startISO: start, endISO: end } = localDayBounds(date)

    const [d, s, f, m, w, e, fw] = await Promise.all([
      store.getCycleDay(date),
      store.listEventsForDay('symptom_event', date),
      store.listEventsForDay('food_event', date),
      store.listEventsForDay('mood_event', date),
      store.listEventsForDay('water_event', date),
      store.listEventsForDay('exercise_event', date),
      store.listWorkoutsForDay(date),
    ])

    setDay(d.recordId ? d : null)
    setSymptoms(s)
    setFoods(f)
    setMoods(m)
    setWaters(w)
    setExercises(e)
    setWorkouts(fw.map(x => ({ ...x, occurred_at: x.occurred_at || x.performed_at })))
    setLoading(false)
  }, [date])

  useEffect(() => { load() }, [load, refreshKey])

  // ---- Day-level updates (flow, sleep, notes) ----
  const updateDay = async (patch) => {
    const computedPhase = computeCyclePhase(date, periodStarts)
    const base = {
      date,
      cycle_phase: day?.cycle_phase_override ? day.cycle_phase : computedPhase,
      cycle_phase_override: day?.cycle_phase_override || false,
      ...day,
      ...patch,
      updated_at: new Date().toISOString(),
    }
    delete base.created_at
    delete base.recordId
    await store.saveCycleDay(date, base)
    const fresh = await store.getCycleDay(date)
    setDay(fresh)
    onChange?.()
  }

  const totalWater = waters.reduce((s, w) => s + (w.amount_oz || 0), 0)
  const totalExercise =
    exercises.reduce((s, ex) => s + (ex.duration_minutes || 0), 0) +
    workouts.reduce((s, w) => s + (w.duration_minutes || 0), 0)

  const computedPhase = computeCyclePhase(date, periodStarts)
  const activePhase = day?.cycle_phase || computedPhase

  const today = todayLocalISO()
  const viewCycleDay = (() => {
    const sorted = [...periodStarts].sort()
    if (sorted.length === 0) return null
    const dateObj = new Date(date + 'T00:00:00')
    let lastStart = null
    for (const s of sorted) {
      if (new Date(s + 'T00:00:00') <= dateObj) lastStart = s
      else break
    }
    if (!lastStart) return null
    return Math.floor((dateObj - new Date(lastStart + 'T00:00:00')) / 86400_000) + 1
  })()
  const shortDate = new Date(date + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })
  const dateLabel = date === today ? `Today, ${shortDate}` : shortDate

  return (
    <div className="intake-tab stack">

      {/* DATE NAV */}
      <div className="j-date-bar">
        <div className="j-date-nav">
          <button className="j-date-btn" onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous day">‹</button>
          <div className="j-date-center">
            <div className="j-date-label">{dateLabel}</div>
            {viewCycleDay != null && activePhase && (
              <div className="j-cycle-label">Day {viewCycleDay} · {PHASES[activePhase]?.label ?? activePhase}</div>
            )}
          </div>
          <button className="j-date-btn" onClick={() => { const n = shiftDate(date, 1); if (n <= today) setDate(n) }}
            disabled={date >= today} aria-label="Next day">›</button>
        </div>
      </div>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : (
        <>
          {/* FLOW */}
          <div className="j-flow-section">
            <div className="j-flow-label">Flow</div>
            <div className="j-flow-chips">
              {FLOW_LEVELS.map(f => (
                <button key={f.value}
                  className={`j-flow-chip ${(day?.flow || 'none') === f.value ? 'on' : ''}`}
                  onClick={() => updateDay({ flow: f.value })}
                >{f.label}</button>
              ))}
            </div>
          </div>

          {/* QUICK ADD ROW */}
          <div className="j-qa-row">
            <QuickAddTile kind="symptom"  label="Symptom"  onClick={() => setAdding(adding === 'symptom'  ? null : 'symptom')}  active={adding === 'symptom'} />
            <QuickAddTile kind="food"     label="Food"     onClick={() => setAdding(adding === 'food'     ? null : 'food')}     active={adding === 'food'} />
            <QuickAddTile kind="mood"     label="Mood"     onClick={() => setAdding(adding === 'mood'     ? null : 'mood')}     active={adding === 'mood'} />
            <QuickAddTile kind="water"    label="Water"    onClick={() => setAdding(adding === 'water'    ? null : 'water')}    active={adding === 'water'} />
            <QuickAddTile kind="exercise" label="Exercise" onClick={() => setAdding(adding === 'exercise' ? null : 'exercise')} active={adding === 'exercise'} />
          </div>

          {/* ADD PANELS */}
          {adding === 'symptom'  && <AddSymptom  date={date} onDone={() => { setAdding(null); load(); onChange?.() }} />}
          {adding === 'food'     && <AddFood     date={date} onDone={() => { setAdding(null); load(); onChange?.() }} />}
          {adding === 'mood'     && <AddMood     date={date} onDone={() => { setAdding(null); load(); onChange?.() }} />}
          {adding === 'water'    && <AddWater    date={date} onDone={() => { setAdding(null); load(); onChange?.() }} />}
          {adding === 'exercise' && <AddExercise date={date} onDone={() => { setAdding(null); load(); onChange?.() }} />}

          {/* At ≥1080px this becomes a 2-col grid: timeline left, summary right */}
          <div className="log-body">
            {/* TIMELINE */}
            <Timeline
              symptoms={symptoms}
              foods={foods}
              moods={moods}
              waters={waters}
              exercises={exercises}
              workouts={workouts}
              onReload={() => { load(); onChange?.() }}
            />

            {/* DAY SUMMARY + PHASE OVERRIDE — right column on desktop */}
            <div className="log-aside">
              {/* DAY SUMMARY: SLEEP + NOTES */}
              <DaySummary day={day} updateDay={updateDay} totalWater={totalWater} totalExercise={totalExercise} />

              {/* PHASE OVERRIDE */}
              <PhaseOverride day={day} updateDay={updateDay} computedPhase={computedPhase} />
            </div>
          </div>
        </>
      )}

    </div>
  )
}

function QuickAddTile({ kind, label, onClick, active }) {
  const icons = {
    symptom:  <div style={{ width:20, height:20, borderRadius:'50%', background:'var(--j-c-symptom)', display:'flex', alignItems:'center', justifyContent:'center' }}><div style={{ width:2, height:8, background:'var(--bg)', borderRadius:1 }} /></div>,
    food:     <div style={{ width:20, height:20, borderRadius:6, background:'var(--j-c-food)' }} />,
    mood:     <div style={{ width:16, height:16, background:'var(--j-c-mood)', transform:'rotate(45deg)', borderRadius:3 }} />,
    water:    <div style={{ width:14, height:14, background:'var(--ok)', borderRadius:'50% 50% 50% 0', transform:'rotate(45deg)' }} />,
    exercise: <div style={{ width:0, height:0, borderLeft:'7px solid transparent', borderRight:'7px solid transparent', borderBottom:'12px solid var(--ok)' }} />,
  }
  return (
    <button className={`j-qa-tile ${active ? 'on' : ''}`} onClick={onClick}>
      {active
        ? <div style={{ color:'var(--app-accent)', fontSize:14, fontWeight:600 }}>✕</div>
        : icons[kind]}
      <span className="j-qa-label">{label}</span>
    </button>
  )
}

function shiftDate(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ============ CYCLE SUMMARY HEADER ============
// Mini wheel left, countdowns right, date nav below — shown at top of Log tab
function CycleSummaryHeader({ date, setDate, periodStarts, activePhase, dayOverride }) {
  const today = todayLocalISO()
  const isToday = date === today

  // Derive cycle info from period starts
  const sorted = [...periodStarts].sort()
  let cycleDay = null, cycleLen = 28, lastStart = null

  if (sorted.length > 0) {
    const dateObj = new Date(today + 'T00:00:00')
    for (const s of sorted) {
      const sd = new Date(s + 'T00:00:00')
      if (sd <= dateObj) lastStart = s
      else break
    }
    if (lastStart) {
      cycleDay = Math.floor((dateObj - new Date(lastStart + 'T00:00:00')) / 86400_000) + 1
    }
    if (sorted.length >= 2) {
      const gaps = []
      for (let i = 1; i < sorted.length; i++) {
        gaps.push(Math.round((new Date(sorted[i] + 'T00:00:00') - new Date(sorted[i-1] + 'T00:00:00')) / 86400_000))
      }
      const recent = gaps.slice(-3)
      const avg = Math.round(recent.reduce((s, g) => s + g, 0) / recent.length)
      if (avg >= 21 && avg <= 40) cycleLen = avg
    }
  }

  const ovDay = 14
  const daysToOv    = cycleDay != null && cycleDay < ovDay  ? ovDay - cycleDay : null
  const daysSinceOv = cycleDay != null && cycleDay >= ovDay ? cycleDay - ovDay : null
  const daysToPeriod = cycleDay != null ? Math.max(0, cycleLen - cycleDay + 1) : null
  const progress = cycleDay != null ? Math.min((cycleDay - 1) / cycleLen, 1) : 0

  // Mini wheel geometry
  const SZ = 100, C = 50, RO = 46, RI = 30
  const phaseSpans = [
    { key: 'menstrual',  s: 1,  e: Math.min(5, cycleLen) },
    { key: 'follicular', s: 6,  e: Math.min(13, cycleLen) },
    { key: 'ovulation',  s: 14, e: Math.min(16, cycleLen) },
    { key: 'luteal',     s: 17, e: cycleLen },
  ].filter(p => p.s <= cycleLen && p.e >= p.s)

  const wAngle = 360 / cycleLen
  const startA = -90

  function miniPolar(r, deg) {
    const a = deg * Math.PI / 180
    return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) }
  }
  function miniArc(r1, r2, a0, a1) {
    const p1 = miniPolar(r2, a0), p2 = miniPolar(r2, a1)
    const p3 = miniPolar(r1, a1), p4 = miniPolar(r1, a0)
    const lg = a1 - a0 > 180 ? 1 : 0
    return `M${p1.x} ${p1.y} A${r2} ${r2} 0 ${lg} 1 ${p2.x} ${p2.y} L${p3.x} ${p3.y} A${r1} ${r1} 0 ${lg} 0 ${p4.x} ${p4.y}Z`
  }

  // Today dot position
  const todayAngle = cycleDay != null ? startA + (cycleDay - 0.5) * wAngle : null
  const todayDot = todayAngle != null ? miniPolar((RO + RI) / 2, todayAngle) : null

  // Progress arc (inside the ring)
  const RP = RI - 5
  const progEnd = startA + progress * 360
  function progressArcPath() {
    if (progress <= 0) return null
    if (progress >= 1) return null // full circle handled separately
    const p1 = miniPolar(RP, startA)
    const p2 = miniPolar(RP, progEnd)
    const lg = progress > 0.5 ? 1 : 0
    return `M${p1.x} ${p1.y} A${RP} ${RP} 0 ${lg} 1 ${p2.x} ${p2.y}`
  }

  return (
    <Card className="cycle-summary-header">
      {/* TOP ROW: mini wheel + countdowns */}
      <div className="csh-top">
        {/* Mini wheel */}
        <svg width={SZ} height={SZ} viewBox={`0 0 ${SZ} ${SZ}`} className="csh-wheel" aria-hidden="true">
          {/* Background ring */}
          <circle cx={C} cy={C} r={(RO+RI)/2} fill="none" stroke="var(--border)" strokeWidth={RO-RI} />
          {/* Phase arcs */}
          {phaseSpans.map(p => (
            <path key={p.key} d={miniArc(RI, RO, startA + (p.s-1)*wAngle, startA + p.e*wAngle)}
              fill={`var(--phase-${p.key})`} opacity="0.75" />
          ))}
          {/* Progress track */}
          <circle cx={C} cy={C} r={RP} fill="none" stroke="var(--border)" strokeWidth="3" />
          {/* Progress fill */}
          {progress > 0 && progress < 1 && (
            <path d={progressArcPath()} fill="none" stroke="var(--app-accent)" strokeWidth="3" strokeLinecap="round" />
          )}
          {progress >= 1 && (
            <circle cx={C} cy={C} r={RP} fill="none" stroke="var(--app-accent)" strokeWidth="3" />
          )}
          {/* Today dot */}
          {todayDot && (
            <circle cx={todayDot.x} cy={todayDot.y} r="5" fill="var(--app-accent)" stroke="var(--bg-paper)" strokeWidth="1.5" />
          )}
          {/* Center: day of cycle */}
          {cycleDay != null && (
            <text x={C} y={C+5} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--text)" fontFamily="var(--font-body)">
              {cycleDay}
            </text>
          )}
        </svg>

        {/* Countdowns */}
        <div className="csh-counts">
          {daysToPeriod != null ? (
            <>
              <div className="csh-count-row">
                <div className="csh-count-num" style={{ color: 'var(--app-accent)' }}>
                  {daysToPeriod}
                </div>
                <div className="csh-count-label">days to period</div>
              </div>
              <div className="csh-divider" />
              <div className="csh-count-row">
                <div className="csh-count-num" style={{ color: 'var(--ok)' }}>
                  {daysToOv != null ? daysToOv : '—'}
                </div>
                <div className="csh-count-label">
                  {daysToOv != null
                    ? 'days to ovulation'
                    : daysSinceOv === 0
                      ? 'ovulation today'
                      : `${daysSinceOv}d past ovulation`}
                </div>
              </div>
              {activePhase && (
                <span className="csh-phase-pill" style={{ background: `var(--phase-${activePhase})` }}>
                  {PHASES[activePhase].label}
                  {dayOverride && <span style={{ opacity: 0.7 }}> · edited</span>}
                </span>
              )}
            </>
          ) : (
            <p className="csh-no-data">Add a period start date in Calendar to see your countdown.</p>
          )}
        </div>
      </div>

      {/* DATE NAV row */}
      <div className="csh-date-nav">
        <Button variant="ghost" size="sm" onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous day">‹</Button>
        <div className="csh-date-center">
          <input
            type="date"
            className="date-input"
            value={date}
            max={today}
            onChange={e => setDate(e.target.value)}
          />
          <div className="csh-date-label">{formatDateLong(date)}</div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { const n = shiftDate(date, 1); if (n <= today) setDate(n) }}
          disabled={date >= today}
          aria-label="Next day"
        >›</Button>
      </div>

      <style>{`
        .cycle-summary-header { padding: 16px 16px 12px; }
        .csh-top { display: flex; align-items: center; gap: 16px; margin-bottom: 14px; }
        .csh-wheel { flex-shrink: 0; }
        .csh-counts { flex: 1; min-width: 0; }
        .csh-count-row { display: flex; align-items: baseline; gap: 8px; }
        .csh-count-num {
          font-family: var(--font-display);
          font-size: 32px;
          font-weight: 400;
          line-height: 1;
        }
        .csh-count-label {
          font-size: 12px;
          color: var(--text-soft);
          letter-spacing: 0.02em;
        }
        .csh-divider { height: 1px; background: var(--border); margin: 8px 0; }
        .csh-phase-pill {
          display: inline-block;
          margin-top: 8px;
          padding: 3px 10px;
          border-radius: var(--r-full);
          font-size: 10px;
          color: white;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .csh-no-data {
          font-size: 12px;
          color: var(--text-soft);
          font-style: italic;
          margin: 0;
          line-height: 1.5;
        }
        .csh-date-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 12px;
          border-top: 1px solid var(--border);
          gap: 8px;
        }
        .csh-date-center { text-align: center; flex: 1; }
        .date-input {
          font-family: var(--font-display);
          font-size: 15px;
          background: transparent;
          border: none;
          color: var(--text-soft);
          text-align: center;
          width: 100%;
          padding: 2px;
        }
        .date-input::-webkit-calendar-picker-indicator { opacity: 0.4; }
        .csh-date-label {
          font-family: var(--font-display);
          font-size: 19px;
          color: var(--text);
          margin-top: 2px;
        }
      `}</style>
    </Card>
  )
}
// Size + fill cue per flow level (not color alone).
const FLOW_DOT = {
  none:     { size: 7,  filled: false },
  spotting: { size: 8,  filled: false },
  light:    { size: 10, filled: true  },
  medium:   { size: 13, filled: true  },
  heavy:    { size: 16, filled: true  },
}
function flowDotStyle(f) {
  const { size, filled } = FLOW_DOT[f.value] ?? { size: 10, filled: true }
  return {
    width: `${size}px`, height: `${size}px`,
    background: filled ? f.color : 'transparent',
    borderColor: f.value === 'none' ? 'var(--border)' : f.color,
  }
}

function FlowCard({ day, updateDay }) {
  const current = day?.flow || 'none'
  return (
    <Card>
      <div className="card-head">
        <h3 className="card-title section-h">Flow</h3>
      </div>
      <div className="chip-row">
        {FLOW_LEVELS.map(f => (
          <button
            key={f.value}
            className={`flow-chip ${current === f.value ? 'flow-on' : ''}`}
            onClick={() => updateDay({ flow: f.value })}
          >
            <span className="flow-dot" style={flowDotStyle(f)} />
            {f.label}
          </button>
        ))}
      </div>
    </Card>
  )
}

// ============ ADD SYMPTOM ============
function AddSymptom({ date, onDone }) {
  const [selected, setSelected] = useState([])  // array of symptom strings
  const [severity, setSeverity] = useState(3)
  const [time, setTime] = useState(new Date().toISOString())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const toggle = (s) => setSelected(prev =>
    prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
  )

  const save = async () => {
    if (selected.length === 0) return
    setSaving(true)
    const occurred_at = adjustToDate(time, date)
    await Promise.all(selected.map(symptom =>
      store.addEvent('symptom_event', occurred_at, { symptom, severity, notes: notes || null })))
    onDone()
  }

  return (
    <Card className="add-panel rise">
      <div className="card-head">
        <h3 className="card-title section-h">Log symptoms</h3>
        {selected.length > 0 && (
          <span className="selected-count">{selected.length} selected</span>
        )}
      </div>

      <label className="field-label">What <span className="muted" style={{ textTransform: 'none', fontWeight: 400 }}>(tap all that apply)</span></label>
      <div className="chip-row">
        {[...SYMPTOMS].sort(cmpText).map(s => (
          <Chip key={s} active={selected.includes(s)} onClick={() => toggle(s)}>
            {s}
          </Chip>
        ))}
      </div>

      <label className="field-label" style={{ marginTop: 16 }}>Severity (1–5) <span className="required">*</span></label>
      <SeverityPicker value={severity} onChange={setSeverity} />

      <label className="field-label" style={{ marginTop: 16 }}>When</label>
      <TimePicker value={time} onChange={setTime} />

      <label className="field-label" style={{ marginTop: 16 }}>Notes (optional)</label>
      <textarea className="textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. came on suddenly, dull ache…" />

      <div className="row" style={{ marginTop: 16, gap: 8 }}>
        <Button variant="ghost" size="sm" onClick={onDone}>Cancel</Button>
        <Button variant="primary" block onClick={save} disabled={selected.length === 0 || saving}>
          {saving ? 'Saving…' : selected.length > 1 ? `Save ${selected.length} symptoms` : 'Save symptom'}
        </Button>
      </div>

      <style>{`.required { color: var(--app-accent); }`}</style>
    </Card>
  )
}

function SeverityPicker({ value, onChange }) {
  return (
    <div className="severity-picker">
      {[1,2,3,4,5].map(n => (
        <button
          key={n}
          className={`sev-btn ${value === n ? 'sev-btn-active' : ''}`}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
      <span className="sev-label">
        {['Barely', 'Mild', 'Moderate', 'Strong', 'Severe'][value - 1]}
      </span>
      <style>{`
        .severity-picker {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .sev-btn {
          width: 42px; height: 42px;
          border-radius: 50%;
          background: var(--bg-sunken);
          color: var(--text-soft);
          font-size: 16px;
          font-weight: 500;
          border: 1px solid transparent;
        }
        .sev-btn-active {
          background: var(--app-accent);
          color: white;
          border-color: var(--app-accent);
        }
        .sev-label {
          margin-left: 6px;
          font-size: 14px;
          color: var(--text-soft);
          font-style: italic;
        }
      `}</style>
    </div>
  )
}

// ============ ADD FOOD ============
function AddFood({ date, onDone }) {
  const [category, setCategory] = useState(null)
  // basket: array of { category, item, fromMeal? }
  const [basket, setBasket] = useState([])
  const [time, setTime] = useState(new Date().toISOString())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const toggleItem = (cat, item) => {
    setBasket(prev => {
      const exists = prev.find(b => b.category === cat && b.item === item)
      if (exists) return prev.filter(b => !(b.category === cat && b.item === item))
      return [...prev, { category: cat, item }]
    })
  }

  const isSelected = (cat, item) => basket.some(b => b.category === cat && b.item === item)

  // Add every ingredient of a meal to the basket (categorized, with provenance).
  const addMeal = (meal) => {
    const ings = Array.isArray(meal.ingredients) ? meal.ingredients : []
    setBasket(prev => {
      const next = [...prev]
      for (const ing of ings) {
        const item = (ing?.name || '').trim()
        if (!item) continue
        const cat = categorizeIngredient(item)
        // skip exact dupes already in the basket (same category + item)
        if (next.some(b => b.category === cat && b.item === item)) continue
        next.push({ category: cat, item, fromMeal: meal.name })
      }
      return next
    })
  }

  const removeMeal = (mealName) =>
    setBasket(prev => prev.filter(b => b.fromMeal !== mealName))

  const save = async () => {
    if (basket.length === 0) return
    setSaving(true)
    const occurred_at = adjustToDate(time, date)
    await Promise.all(basket.map(({ category, item, fromMeal }) => {
      const parts = []
      if (notes) parts.push(notes)
      if (fromMeal) parts.push(`from ${fromMeal}`)
      return store.addEvent('food_event', occurred_at, { category, item, notes: parts.join(' · ') || null })
    }))
    onDone()
  }

  const cat = FOOD_CATEGORIES.find(c => c.name === category)
  const showMeals = category === MEAL_PICKER

  // Group basket: meal-sourced items grouped under their meal, loose items flat.
  const looseItems = basket.filter(b => !b.fromMeal)
  const mealNames = [...new Set(basket.filter(b => b.fromMeal).map(b => b.fromMeal))]

  return (
    <Card className="add-panel rise">
      <div className="card-head">
        <h3 className="card-title section-h">Log food</h3>
        {basket.length > 0 && (
          <span className="selected-count">{basket.length} item{basket.length > 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Basket summary */}
      {basket.length > 0 && (
        <div className="basket">
          {mealNames.map(name => (
            <div key={name} className="basket-meal">
              <div className="basket-meal-head">
                <span className="basket-meal-name">🍲 {name}</span>
                <button className="basket-remove" onClick={() => removeMeal(name)}>remove ×</button>
              </div>
              <div className="basket-meal-items">
                {basket.filter(b => b.fromMeal === name).map(b => (
                  <span key={b.category + b.item} className="basket-chip">
                    {b.item}
                    <button className="basket-remove" onClick={() => toggleItem(b.category, b.item)}>×</button>
                  </span>
                ))}
              </div>
            </div>
          ))}
          {looseItems.map(b => (
            <span key={b.category + b.item} className="basket-chip">
              {b.item}
              <button className="basket-remove" onClick={() => toggleItem(b.category, b.item)}>×</button>
            </span>
          ))}
        </div>
      )}

      <label className="field-label" style={{ marginTop: basket.length > 0 ? 12 : 0 }}>Category</label>
      <div className="chip-row">
        <button
          className={`chip ${showMeals ? 'on' : ''}`}
          onClick={() => setCategory(showMeals ? null : MEAL_PICKER)}
          style={mealNames.length && !showMeals ? { borderColor: 'color-mix(in srgb, var(--app-accent) 60%, transparent)', color: 'var(--app-accent)' } : {}}
        >
          🍲 {MEAL_PICKER}{mealNames.length ? ` ·${mealNames.length}` : ''}
        </button>
        {sortByName([...FOOD_CATEGORIES]).map(c => {
          const hasSelected = basket.some(b => b.category === c.name)
          return (
            <button
              key={c.name}
              className={`chip ${category === c.name ? 'on' : ''}`}
              onClick={() => setCategory(category === c.name ? null : c.name)}
              style={hasSelected && category !== c.name ? { borderColor: 'color-mix(in srgb, var(--app-accent) 60%, transparent)', color: 'var(--app-accent)' } : {}}
            >
              {c.name}{hasSelected ? ` ·${basket.filter(b => b.category === c.name).length}` : ''}
            </button>
          )
        })}
      </div>

      {showMeals && <MealPicker addedMeals={mealNames} onPick={addMeal} onRemove={removeMeal} />}

      {cat && (
        <>
          <label className="field-label" style={{ marginTop: 16 }}>
            {cat.name} <span className="muted" style={{ textTransform: 'none', fontWeight: 400 }}>(tap all that apply)</span>
          </label>
          <div className="chip-row">
            {cat.items.map(i => (
              <button
                key={i}
                className={`chip ${isSelected(cat.name, i) ? 'on' : ''}`}
                onClick={() => toggleItem(cat.name, i)}
              >
                {i}
              </button>
            ))}
          </div>
        </>
      )}

      <label className="field-label" style={{ marginTop: 16 }}>When</label>
      <TimePicker value={time} onChange={setTime} />

      <label className="field-label" style={{ marginTop: 16 }}>Notes (optional)</label>
      <textarea className="textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. big portion, post-workout…" />

      <div className="row" style={{ marginTop: 16, gap: 8 }}>
        <Button variant="ghost" size="sm" onClick={onDone}>Cancel</Button>
        <Button variant="primary" block onClick={save} disabled={basket.length === 0 || saving}>
          {saving ? 'Saving…' : basket.length > 1 ? `Save ${basket.length} foods` : 'Save food'}
        </Button>
      </div>

      <style>{`
        .basket {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 10px 12px;
          background: var(--app-weak);
          border-radius: var(--r-sm);
          margin-bottom: 4px;
        }
        .basket-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          background: var(--bg-paper);
          border: 1px solid color-mix(in srgb, var(--app-accent) 60%, transparent);
          border-radius: var(--r-full);
          font-size: 13px;
          color: var(--app-accent);
          font-weight: 500;
        }
        .basket-remove {
          font-size: 14px;
          color: color-mix(in srgb, var(--app-accent) 60%, transparent);
          line-height: 1;
        }
        .basket-remove:hover { color: var(--app-accent); }
        .basket-meal {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 8px 10px;
          background: var(--bg-paper);
          border: 1px solid color-mix(in srgb, var(--app-accent) 35%, transparent);
          border-radius: var(--r-sm);
        }
        .basket-meal-head { display: flex; align-items: center; justify-content: space-between; }
        .basket-meal-name { font-size: 13px; font-weight: 600; color: var(--app-accent); }
        .basket-meal-items { display: flex; flex-wrap: wrap; gap: 6px; }
        .meal-picker { margin-top: 14px; }
        .meal-search {
          width: 100%; padding: 9px 12px; border-radius: var(--r-sm);
          border: 1px solid var(--border); background: var(--bg-sunken);
          color: var(--text); font-size: 14px; margin-bottom: 10px;
        }
        .meal-list { display: flex; flex-direction: column; gap: 6px; max-height: 280px; overflow-y: auto; }
        .meal-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; padding: 10px 12px; border-radius: var(--r-sm);
          border: 1px solid var(--border); background: var(--bg-paper);
          text-align: left; width: 100%;
        }
        .meal-row.added { border-color: color-mix(in srgb, var(--app-accent) 60%, transparent); }
        .meal-row-name { font-weight: 500; color: var(--text); font-size: 14px; }
        .meal-row-sub { font-size: 12px; color: var(--text-soft); }
        .meal-row-action { font-size: 13px; font-weight: 600; color: var(--app-accent); white-space: nowrap; }
        .meal-empty { padding: 14px; text-align: center; color: var(--text-soft); font-size: 13px; }
      `}</style>
    </Card>
  )
}

// Lists recipes from the Pantry app; tapping one adds all its ingredients to the
// food basket. Recipes are fetched once (read-only) the first time this shows.
function MealPicker({ addedMeals, onPick, onRemove }) {
  const [recipes, setRecipes] = useState(null)   // null = loading
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    let alive = true
    store.listRecipes()
      .then((data) => { if (alive) setRecipes(data || []) })
      .catch((e) => { if (alive) { setError(e.message); setRecipes([]) } })
    return () => { alive = false }
  }, [])

  const filtered = (recipes || []).filter(r =>
    r.name?.toLowerCase().includes(q.toLowerCase().trim())
  )

  return (
    <div className="meal-picker">
      <input
        className="meal-search"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search meals…"
      />
      {recipes === null && <div className="meal-empty">Loading meals…</div>}
      {error && <div className="meal-empty">Couldn’t load meals — {error}</div>}
      {recipes !== null && !error && filtered.length === 0 && (
        <div className="meal-empty">{q ? 'No meals match.' : 'No recipes found in the Pantry app yet.'}</div>
      )}
      <div className="meal-list">
        {filtered.map(r => {
          const count = Array.isArray(r.ingredients) ? r.ingredients.filter(i => i?.name).length : 0
          const added = addedMeals.includes(r.name)
          return (
            <button
              key={r.id}
              className={`meal-row ${added ? 'added' : ''}`}
              onClick={() => added ? onRemove(r.name) : onPick(r)}
              disabled={!added && count === 0}
            >
              <span>
                <span className="meal-row-name">{r.name}</span>
                <span className="meal-row-sub"> · {count} ingredient{count === 1 ? '' : 's'}{count === 0 ? ' (none listed)' : ''}</span>
              </span>
              <span className="meal-row-action">{added ? 'Added ✓' : '+ Add'}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
function AddMood({ date, onDone }) {
  const [selected, setSelected] = useState([])
  const [time, setTime] = useState(new Date().toISOString())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const toggle = (m) => setSelected(prev =>
    prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
  )

  const save = async () => {
    if (selected.length === 0) return
    setSaving(true)
    const occurred_at = adjustToDate(time, date)
    await Promise.all(selected.map(mood =>
      store.addEvent('mood_event', occurred_at, { mood, notes: notes || null })))
    onDone()
  }

  return (
    <Card className="add-panel rise">
      <div className="card-head">
        <h3 className="card-title section-h">Log mood</h3>
        {selected.length > 0 && (
          <span className="selected-count">{selected.length} selected</span>
        )}
      </div>
      <label className="field-label">How are you feeling? <span className="muted" style={{ textTransform: 'none', fontWeight: 400 }}>(tap all that apply)</span></label>
      <div className="chip-row">
        {[...MOODS].sort(cmpText).map(m => (
          <Chip key={m} active={selected.includes(m)} onClick={() => toggle(m)}>
            {m}
          </Chip>
        ))}
      </div>
      <label className="field-label" style={{ marginTop: 16 }}>When</label>
      <TimePicker value={time} onChange={setTime} />
      <label className="field-label" style={{ marginTop: 16 }}>Notes (optional)</label>
      <textarea className="textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      <div className="row" style={{ marginTop: 16, gap: 8 }}>
        <Button variant="ghost" size="sm" onClick={onDone}>Cancel</Button>
        <Button variant="primary" block onClick={save} disabled={selected.length === 0 || saving}>
          {saving ? 'Saving…' : selected.length > 1 ? `Save ${selected.length} moods` : 'Save mood'}
        </Button>
      </div>
    </Card>
  )
}

// ============ ADD WATER ============
function AddWater({ date, onDone }) {
  const [amount, setAmount] = useState(8)
  const [time, setTime] = useState(new Date().toISOString())
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const occurred_at = adjustToDate(time, date)
    await store.addEvent('water_event', occurred_at, { amount_oz: amount })
    onDone()
  }

  return (
    <Card className="add-panel rise">
      <div className="card-head"><h3 className="card-title section-h">Log water</h3></div>
      <label className="field-label">Amount (oz)</label>
      <div className="chip-row">
        {[4, 8, 12, 16, 20, 32].map(n => (
          <Chip key={n} active={amount === n} onClick={() => setAmount(n)}>
            {n} oz
          </Chip>
        ))}
      </div>
      <label className="field-label" style={{ marginTop: 16 }}>When</label>
      <TimePicker value={time} onChange={setTime} />
      <div className="row" style={{ marginTop: 16, gap: 8 }}>
        <Button variant="ghost" size="sm" onClick={onDone}>Cancel</Button>
        <Button variant="primary" block onClick={save} disabled={saving}>
          {saving ? 'Saving…' : `Save ${amount} oz`}
        </Button>
      </div>
    </Card>
  )
}

// ============ ADD EXERCISE ============
function AddExercise({ date, onDone }) {
  const [type, setType] = useState(null)
  const [duration, setDuration] = useState(30)
  const [time, setTime] = useState(new Date().toISOString())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!type) return
    setSaving(true)
    const occurred_at = adjustToDate(time, date)
    await store.addEvent('exercise_event', occurred_at, { exercise_type: type, duration_minutes: duration, notes: notes || null })
    onDone()
  }

  return (
    <Card className="add-panel rise">
      <div className="card-head"><h3 className="card-title section-h">Log exercise</h3></div>
      <label className="field-label">Type</label>
      <div className="chip-row">
        {[...EXERCISE_TYPES].sort(cmpText).map(t => (
          <Chip key={t} active={type === t} onClick={() => setType(t)}>
            {t}
          </Chip>
        ))}
      </div>
      <label className="field-label" style={{ marginTop: 16 }}>Duration (min)</label>
      <div className="chip-row">
        {[10, 20, 30, 45, 60, 90].map(d => (
          <Chip key={d} active={duration === d} onClick={() => setDuration(d)}>
            {d} min
          </Chip>
        ))}
      </div>
      <label className="field-label" style={{ marginTop: 16 }}>When</label>
      <TimePicker value={time} onChange={setTime} />
      <label className="field-label" style={{ marginTop: 16 }}>Notes (optional)</label>
      <textarea className="textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      <div className="row" style={{ marginTop: 16, gap: 8 }}>
        <Button variant="ghost" size="sm" onClick={onDone}>Cancel</Button>
        <Button variant="primary" block onClick={save} disabled={!type || saving}>
          {saving ? 'Saving…' : 'Save exercise'}
        </Button>
      </div>
    </Card>
  )
}

// ============ TIMELINE ============
function Timeline({ symptoms, foods, moods, waters, exercises, workouts = [], onReload }) {
  const [editing, setEditing] = useState(null) // { kind, id }
  const [pending, setPending] = useState({})   // "kind-id" → timer handle
  const toast = useToast()

  const nonFood = [
    ...symptoms.map(e => ({ ...e, kind: 'symptom' })),
    ...moods.map(e => ({ ...e, kind: 'mood' })),
    ...waters.map(e => ({ ...e, kind: 'water' })),
    ...exercises.map(e => ({ ...e, kind: 'exercise' })),
    ...workouts.map(e => ({ ...e, kind: 'workout' })),
  ]

  // Foods logged together share one exact occurred_at — collapse them into a
  // single block so the whole set can be retimed (e.g. AM → PM) or removed in
  // one edit, instead of fixing each item separately.
  const groupsByTime = {}
  for (const f of foods) {
    const key = f.occurred_at
    if (!groupsByTime[key]) groupsByTime[key] = { kind: 'food-group', id: `fg-${key}`, occurred_at: key, items: [] }
    groupsByTime[key].items.push(f)
  }
  const foodGroups = Object.values(groupsByTime)

  const allItems = [...nonFood, ...foodGroups]
    .sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at))

  // pending key: food-group → its id; everything else → "kind-id"
  const pendKey = (it) => (it.kind === 'food-group' ? it.id : `${it.kind}-${it.id}`)
  const items = allItems.filter(it => !pending[pendKey(it)])
  const entryCount = items.reduce((n, it) => n + (it.kind === 'food-group' ? it.items.length : 1), 0)

  // Optimistically hide, then delete after 5s (undo cancels). Works for a single
  // event id or a whole food block (array of ids).
  const scheduleDelete = (key, ids, label) => {
    const timer = setTimeout(async () => {
      setPending(p => { const n = { ...p }; delete n[key]; return n })
      await Promise.all(ids.map(id => store.deleteEvent(id)))
      onReload()
    }, 5000)
    setPending(p => ({ ...p, [key]: timer }))
    toast.show(label, {
      actionLabel: 'Undo',
      onAction: () => {
        clearTimeout(timer)
        setPending(p => { const n = { ...p }; delete n[key]; return n })
      },
    })
  }

  const deleteEvent = (kind, id) => scheduleDelete(`${kind}-${id}`, [id], 'Entry deleted.')
  const deleteGroup = (g) => scheduleDelete(g.id, g.items.map(i => i.id),
    g.items.length > 1 ? `${g.items.length} foods deleted.` : 'Entry deleted.')

  const isEditing = (kind, id) => editing?.kind === kind && editing?.id === id

  if (items.length === 0) {
    return (
      <div className="empty" style={{ border: '1px dashed var(--border)', borderRadius: 'var(--r-lg)', padding: '40px 24px', marginTop: 8 }}>
        Nothing logged yet — tap to add your first entry.
      </div>
    )
  }

  return (
    <Card>
      <div className="card-head">
        <h3 className="card-title section-h">Today's timeline</h3>
        <span className="card-sub">{entryCount} {entryCount === 1 ? 'entry' : 'entries'}</span>
      </div>
      <div>
        {items.map(it => it.kind === 'food-group' ? (
          <div key={it.id}>
            <div className="j-ev-row">
              <div className="j-ev-circle j-ev-c-food" />
              <div className="j-ev-body">
                <div className="j-ev-name"><FoodGroupBody group={it} /></div>
                <div className="j-ev-time">{formatTimeLocal(it.occurred_at)}</div>
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                <button className="event-edit"
                  onClick={() => setEditing(isEditing('food-group', it.id) ? null : { kind: 'food-group', id: it.id })}
                  aria-label="Edit food block">✎</button>
                <button className="j-ev-del" onClick={() => deleteGroup(it)}
                  aria-label={it.items.length > 1 ? 'Delete all foods at this time' : 'Delete'}>✕</button>
              </div>
            </div>
            {isEditing('food-group', it.id) && (
              <EditFoodGroup
                group={it}
                onDone={() => { setEditing(null); onReload() }}
                onCancel={() => setEditing(null)}
              />
            )}
          </div>
        ) : (
          <div key={it.kind + it.id}>
            <div className="j-ev-row">
              <div className={`j-ev-circle j-ev-c-${it.kind}`} />
              <div className="j-ev-body">
                <div className="j-ev-name"><EventBody ev={it} /></div>
                <div className="j-ev-time">{formatTimeLocal(it.occurred_at)}</div>
              </div>
              {it.kind === 'workout' ? (
                <span className="event-src" title="Logged in the Fitness app">Reps</span>
              ) : (
                <div style={{ display: 'flex', gap: 2 }}>
                  <button className="event-edit"
                    onClick={() => setEditing(isEditing(it.kind, it.id) ? null : { kind: it.kind, id: it.id })}
                    aria-label="Edit">✎</button>
                  <button className="j-ev-del" onClick={() => deleteEvent(it.kind, it.id)} aria-label="Delete">✕</button>
                </div>
              )}
            </div>
            {isEditing(it.kind, it.id) && it.kind !== 'workout' && (
              <EditEvent
                ev={it}
                onDone={() => { setEditing(null); onReload() }}
                onCancel={() => setEditing(null)}
              />
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

// One timeline block for foods logged at the same time. A lone item reads like
// any other entry; 2+ items stack as chips under a single time/edit/delete.
function FoodGroupBody({ group }) {
  if (group.items.length === 1) {
    const ev = group.items[0]
    return (
      <>
        <div className="event-label">
          <span className="event-tag tag-food">◆ Food</span>
          {ev.item} <span className="muted">· {ev.category}</span>
        </div>
        {ev.notes && <div className="event-meta">{ev.notes}</div>}
        <style>{eventTagStyle}</style>
      </>
    )
  }
  const sharedNote = group.items.find(i => i.notes)?.notes
  return (
    <>
      <div className="event-label">
        <span className="event-tag tag-food">Food</span>
        {group.items.length} items
      </div>
      <div className="fg-items">
        {group.items.map(ev => (
          <span key={ev.id} className="fg-chip">{ev.item}<span className="muted"> · {ev.category}</span></span>
        ))}
      </div>
      {sharedNote && <div className="event-meta">{sharedNote}</div>}
      <style>{eventTagStyle}{fgStyle}</style>
    </>
  )
}

// Edit a whole food block at once: remove items, and set one time for all of
// them. Removing every item then saving deletes the block.
function EditFoodGroup({ group, onDone, onCancel }) {
  const [time, setTime] = useState(group.occurred_at)
  const [items, setItems] = useState(group.items)
  const [saving, setSaving] = useState(false)

  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id))

  const save = async () => {
    setSaving(true)
    const removed = group.items.filter(g => !items.some(i => i.id === g.id))
    await Promise.all(removed.map(r => store.deleteEvent(r.id)))
    // retime every remaining item to the shared time, preserving its payload
    await Promise.all(items.map(it => store.updateEvent(it.id, time, {
      category: it.category, item: it.item, notes: it.notes ?? null,
    })))
    onDone()
  }

  return (
    <div className="edit-panel rise">
      <div className="edit-panel-header">
        <span className="edit-panel-title">Edit food block</span>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>

      <label className="field-label">
        Items <span className="muted" style={{ textTransform: 'none', fontWeight: 400 }}>(tap × to remove; re-add from the Food panel)</span>
      </label>
      <div className="fg-edit-items">
        {items.map(it => (
          <span key={it.id} className="fg-edit-chip">
            {it.item} <span className="muted">· {it.category}</span>
            <button className="fg-edit-remove" onClick={() => removeItem(it.id)} aria-label={`Remove ${it.item}`}>×</button>
          </span>
        ))}
        {items.length === 0 && <span className="muted" style={{ fontSize: 13 }}>All items removed — saving will delete this block.</span>}
      </div>

      <label className="field-label" style={{ marginTop: 14 }}>
        Time <span className="muted" style={{ textTransform: 'none', fontWeight: 400 }}>(applies to the whole block)</span>
      </label>
      <TimePicker value={time} onChange={setTime} />

      <Button
        className="amber-btn"
        block
        style={{ marginTop: 14 }}
        onClick={save}
        disabled={saving}
      >
        {saving ? 'Saving…' : items.length === 0 ? 'Delete block' : `Save ${items.length} item${items.length > 1 ? 's' : ''}`}
      </Button>

      <style>{fgStyle}</style>
    </div>
  )
}

const fgStyle = `
  .fg-items { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; }
  .fg-chip {
    font-size: var(--fs-xs);
    background: var(--bg-sunken);
    color: var(--text);
    padding: 3px 9px;
    border-radius: var(--r-full);
  }
  .fg-edit-items { display: flex; flex-wrap: wrap; gap: 6px; }
  .fg-edit-chip {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 13px; color: var(--text);
    background: var(--bg-paper);
    border: 1px solid var(--border);
    padding: 4px 6px 4px 10px;
    border-radius: var(--r-full);
  }
  .fg-edit-remove {
    color: var(--text-soft); font-size: 15px; line-height: 1;
    width: 22px; height: 22px; border-radius: var(--r-full);
  }
  .fg-edit-remove:active { background: var(--app-weak); color: var(--app-accent); }
`

function EventBody({ ev }) {
  if (ev.kind === 'symptom') {
    return (
      <>
        <div className="event-label">
          <span className="event-tag tag-symptom">● Symptom</span>
          {ev.symptom}
        </div>
        <div className="event-meta">
          <SeverityDots n={ev.severity} />
          {ev.notes && <span style={{ marginLeft: 8 }}>· {ev.notes}</span>}
        </div>
        <style>{eventTagStyle}</style>
      </>
    )
  }
  if (ev.kind === 'food') {
    return (
      <>
        <div className="event-label">
          <span className="event-tag tag-food">◆ Food</span>
          {ev.item} <span className="muted">· {ev.category}</span>
        </div>
        {ev.notes && <div className="event-meta">{ev.notes}</div>}
        <style>{eventTagStyle}</style>
      </>
    )
  }
  if (ev.kind === 'mood') {
    return (
      <>
        <div className="event-label">
          <span className="event-tag tag-mood">◯ Mood</span>
          {ev.mood}
        </div>
        {ev.notes && <div className="event-meta">{ev.notes}</div>}
        <style>{eventTagStyle}</style>
      </>
    )
  }
  if (ev.kind === 'water') {
    return (
      <>
        <div className="event-label">
          <span className="event-tag tag-water">▽ Water</span>
          {ev.amount_oz} oz
        </div>
        <style>{eventTagStyle}</style>
      </>
    )
  }
  if (ev.kind === 'exercise') {
    return (
      <>
        <div className="event-label">
          <span className="event-tag tag-exercise">△ Exercise</span>
          {ev.exercise_type} · {ev.duration_minutes} min
        </div>
        {ev.notes && <div className="event-meta">{ev.notes}</div>}
        <style>{eventTagStyle}</style>
      </>
    )
  }
  if (ev.kind === 'workout') {
    const label = FITNESS_CATEGORY_LABEL[ev.category] || ev.category
    return (
      <>
        <div className="event-label">
          <span className="event-tag tag-workout">▲ Workout</span>
          {label}{ev.duration_minutes ? ` · ${ev.duration_minutes} min` : ''}
        </div>
        {ev.notes && <div className="event-meta">{ev.notes}</div>}
        <style>{eventTagStyle}</style>
      </>
    )
  }
  return null
}

const eventTagStyle = `
  .event-tag {
    display: inline-block;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 2px 7px;
    border-radius: var(--r-full);
    margin-right: 6px;
    vertical-align: 2px;
  }
  .tag-symptom  { background: color-mix(in srgb, var(--phase-menstrual) 20%, var(--bg-paper)); color: var(--phase-menstrual); }
  .tag-food     { background: color-mix(in srgb, var(--phase-follicular) 18%, var(--bg-paper)); color: var(--phase-follicular); }
  .tag-mood     { background: color-mix(in srgb, var(--phase-luteal) 18%, var(--bg-paper)); color: var(--phase-luteal); }
  .tag-water    { background: color-mix(in srgb, var(--tag-water) 18%, var(--bg-paper)); color: var(--tag-water); }
  .tag-exercise { background: color-mix(in srgb, var(--phase-ovulation) 18%, var(--bg-paper)); color: var(--phase-ovulation); }
  .tag-workout  { background: color-mix(in srgb, var(--phase-ovulation) 12%, var(--bg-paper)); color: var(--phase-ovulation); }
  .event-src {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-soft);
    padding: 2px 7px;
    border: 1px solid var(--border);
    border-radius: var(--r-full);
    white-space: nowrap;
  }
`

// ============ EDIT EVENT ============
function EditEvent({ ev, onDone, onCancel }) {
  const table = {
    symptom: 'symptom_events', food: 'food_events', mood: 'mood_events',
    water: 'water_events', exercise: 'exercise_events',
  }[ev.kind]

  const [time, setTime] = useState(ev.occurred_at)
  const [notes, setNotes] = useState(ev.notes || '')
  const [saving, setSaving] = useState(false)

  // Kind-specific fields
  const [symptom, setSymptom] = useState(ev.symptom || null)
  const [severity, setSeverity] = useState(ev.severity || 3)
  const [category, setCategory] = useState(ev.category || null)
  const [item, setItem] = useState(ev.item || null)
  const [mood, setMood] = useState(ev.mood || null)
  const [amount, setAmount] = useState(ev.amount_oz || 8)
  const [exerciseType, setExerciseType] = useState(ev.exercise_type || null)
  const [duration, setDuration] = useState(ev.duration_minutes || 30)

  const save = async () => {
    setSaving(true)
    let payload = { notes: notes || null }
    if (ev.kind === 'symptom') payload = { ...payload, symptom, severity }
    if (ev.kind === 'food')    payload = { ...payload, category, item }
    if (ev.kind === 'mood')    payload = { ...payload, mood }
    if (ev.kind === 'water')   payload = { amount_oz: amount }
    if (ev.kind === 'exercise') payload = { ...payload, exercise_type: exerciseType, duration_minutes: duration }
    await store.updateEvent(ev.id, time, payload)
    onDone()
  }

  const catItems = FOOD_CATEGORIES.find(c => c.name === category)?.items || []

  return (
    <div className="edit-panel rise">
      <div className="edit-panel-header">
        <span className="edit-panel-title">Edit {ev.kind}</span>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>

      {ev.kind === 'symptom' && (
        <>
          <label className="field-label">Symptom</label>
          <div className="chip-row" style={{ marginBottom: 12 }}>
            {[...SYMPTOMS].sort(cmpText).map(s => (
              <Chip key={s} className="chip-sm" active={symptom === s} onClick={() => setSymptom(s)}>{s}</Chip>
            ))}
          </div>
          <label className="field-label">Severity</label>
          <SeverityPicker value={severity} onChange={setSeverity} />
        </>
      )}

      {ev.kind === 'food' && (
        <>
          <label className="field-label">Category</label>
          <div className="chip-row" style={{ marginBottom: 12 }}>
            {sortByName([...FOOD_CATEGORIES]).map(c => (
              <Chip key={c.name} className="chip-sm" active={category === c.name} onClick={() => { setCategory(c.name); setItem(null) }}>{c.name}</Chip>
            ))}
          </div>
          {catItems.length > 0 && (
            <>
              <label className="field-label">Item</label>
              <div className="chip-row" style={{ marginBottom: 12 }}>
                {catItems.map(i => (
                  <Chip key={i} className="chip-sm" active={item === i} onClick={() => setItem(i)}>{i}</Chip>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {ev.kind === 'mood' && (
        <>
          <label className="field-label">Mood</label>
          <div className="chip-row" style={{ marginBottom: 12 }}>
            {[...MOODS].sort(cmpText).map(m => (
              <Chip key={m} className="chip-sm" active={mood === m} onClick={() => setMood(m)}>{m}</Chip>
            ))}
          </div>
        </>
      )}

      {ev.kind === 'water' && (
        <>
          <label className="field-label">Amount (oz)</label>
          <div className="chip-row" style={{ marginBottom: 12 }}>
            {[4, 8, 12, 16, 20, 32].map(n => (
              <Chip key={n} className="chip-sm" active={amount === n} onClick={() => setAmount(n)}>{n} oz</Chip>
            ))}
          </div>
        </>
      )}

      {ev.kind === 'exercise' && (
        <>
          <label className="field-label">Type</label>
          <div className="chip-row" style={{ marginBottom: 12 }}>
            {[...EXERCISE_TYPES].sort(cmpText).map(t => (
              <Chip key={t} className="chip-sm" active={exerciseType === t} onClick={() => setExerciseType(t)}>{t}</Chip>
            ))}
          </div>
          <label className="field-label">Duration (min)</label>
          <div className="chip-row" style={{ marginBottom: 12 }}>
            {[10, 20, 30, 45, 60, 90].map(d => (
              <Chip key={d} className="chip-sm" active={duration === d} onClick={() => setDuration(d)}>{d} min</Chip>
            ))}
          </div>
        </>
      )}

      {ev.kind !== 'water' && (
        <>
          <label className="field-label" style={{ marginTop: 4 }}>Notes</label>
          <textarea className="textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} style={{ marginBottom: 12 }} />
        </>
      )}

      <label className="field-label">Time</label>
      <TimePicker value={time} onChange={setTime} />

      <Button
        className="amber-btn"
        block
        style={{ marginTop: 14 }}
        onClick={save}
        disabled={saving}
      >
        {saving ? 'Saving…' : 'Save changes'}
      </Button>

    </div>
  )
}

function SeverityDots({ n }) {
  return (
    <span className="severity-dots">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`severity-dot ${i <= n ? 'severity-dot-on' : ''}`} />
      ))}
    </span>
  )
}

// ============ DAY SUMMARY ============
function DaySummary({ day, updateDay, totalWater, totalExercise }) {
  const [notes, setNotes] = useState(day?.notes || '')
  useEffect(() => { setNotes(day?.notes || '') }, [day?.notes])

  const saveNotes = () => {
    if (notes !== (day?.notes || '')) {
      updateDay({ notes: notes || null })
    }
  }

  return (
    <Card>
      <div className="card-head">
        <h3 className="card-title section-h">Day summary</h3>
      </div>

      <div className="summary-grid">
        <div className="summary-stat">
          <div className="stat-value">{totalWater}<span className="stat-unit">oz</span></div>
          <div className="stat-label">Water</div>
        </div>
        <div className="summary-stat">
          <div className="stat-value">{totalExercise}<span className="stat-unit">min</span></div>
          <div className="stat-label">Exercise</div>
        </div>
        <div className="summary-stat">
          <div className="sleep-stepper">
            <button
              className="sleep-step"
              onClick={() => updateDay({ sleep_hours: Math.max(0, (day?.sleep_hours ?? 7.5) - 0.5) })}
              aria-label="Decrease sleep"
            >−</button>
            <span className="stat-value">
              {day?.sleep_hours != null
                ? day.sleep_hours
                : <span className="sleep-ph">7.5</span>}
            </span>
            <button
              className="sleep-step"
              onClick={() => updateDay({ sleep_hours: Math.min(14, (day?.sleep_hours ?? 7.5) + 0.5) })}
              aria-label="Increase sleep"
            >+</button>
          </div>
          <div className="stat-label">Sleep (hrs)</div>
        </div>
      </div>

      <label className="field-label" style={{ marginTop: 16 }}>Notes for the day</label>
      <textarea
        className="textarea"
        rows={3}
        placeholder="Anything else worth remembering…"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        onBlur={saveNotes}
      />
    </Card>
  )
}

// ============ PHASE OVERRIDE ============
function PhaseOverride({ day, updateDay, computedPhase }) {
  const [open, setOpen] = useState(false)
  const phases = Object.keys(PHASES)

  return (
    <Card>
      <button className="row-between" style={{ width: '100%' }} onClick={() => setOpen(o => !o)}>
        <div>
          <div className="card-title section-h" style={{ fontSize: 16 }}>Cycle phase</div>
          <div className="card-sub" style={{ marginTop: 2 }}>
            {day?.cycle_phase_override
              ? `Set to ${PHASES[day.cycle_phase]?.label} (edited)`
              : computedPhase
                ? `Auto: ${PHASES[computedPhase].label}`
                : 'Unknown'}
          </div>
        </div>
        <span style={{ color: 'var(--text-soft)' }}>{open ? '⌃' : '⌄'}</span>
      </button>
      {open && (
        <div style={{ marginTop: 14 }}>
          <label className="field-label">Override phase for this day</label>
          <div className="chip-row">
            {phases.map(p => (
              <Chip
                key={p}
                active={day?.cycle_phase === p && day?.cycle_phase_override}
                onClick={() => updateDay({ cycle_phase: p, cycle_phase_override: true })}
              >
                {PHASES[p].label}
              </Chip>
            ))}
          </div>
          {day?.cycle_phase_override && (
            <Button
              variant="ghost"
              size="sm"
              style={{ marginTop: 12 }}
              onClick={() => updateDay({ cycle_phase: computedPhase, cycle_phase_override: false })}
            >
              Reset to auto
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}

// Helper: keep date stable, only change time part
function adjustToDate(iso, dateStr) {
  const t = new Date(iso)
  const target = new Date(dateStr + 'T00:00:00')
  target.setHours(t.getHours(), t.getMinutes(), t.getSeconds(), 0)
  return target.toISOString()
}
