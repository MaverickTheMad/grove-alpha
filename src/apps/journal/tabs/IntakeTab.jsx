import { useState, useEffect, useCallback } from 'react'
import * as store from '../lib/store.js'

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
import TimePicker from '../components/TimePicker.jsx'

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

  return (
    <div className="intake-tab stack">

      {/* CYCLE SUMMARY HEADER — mini wheel + countdown + date nav */}
      <CycleSummaryHeader
        date={date}
        setDate={setDate}
        periodStarts={periodStarts}
        activePhase={activePhase}
        dayOverride={day?.cycle_phase_override}
      />

      {loading ? (
        <div className="empty">Loading…</div>
      ) : (
        <>
          {/* FLOW */}
          <FlowCard day={day} updateDay={updateDay} />

          {/* QUICK ADD ROW */}
          <div className="quick-add-row">
            <QuickAddBtn label="Symptom"  onClick={() => setAdding(adding === 'symptom'  ? null : 'symptom')}  active={adding === 'symptom'} />
            <QuickAddBtn label="Food"     onClick={() => setAdding(adding === 'food'     ? null : 'food')}     active={adding === 'food'} />
            <QuickAddBtn label="Mood"     onClick={() => setAdding(adding === 'mood'     ? null : 'mood')}     active={adding === 'mood'} />
            <QuickAddBtn label="Water"    onClick={() => setAdding(adding === 'water'    ? null : 'water')}    active={adding === 'water'} />
            <QuickAddBtn label="Exercise" onClick={() => setAdding(adding === 'exercise' ? null : 'exercise')} active={adding === 'exercise'} />
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

      <style>{`
        .date-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
        }
        .date-nav-center { text-align: center; flex: 1; }
        .date-input {
          font-family: var(--font-display);
          font-size: 16px;
          background: transparent;
          border: none;
          color: var(--text-soft);
          text-align: center;
          width: 100%;
          padding: 2px;
        }
        .date-input::-webkit-calendar-picker-indicator { opacity: 0.4; }
        .quick-add-row {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 6px;
        }
        .quick-add-btn {
          padding: 14px 4px;
          border-radius: var(--r-md);
          background: var(--bg-paper);
          border: 1px solid var(--border);
          color: var(--text-soft);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          transition: all 0.15s;
          box-shadow: 0 1px 3px rgba(0,0,0,.15);
        }
        .quick-add-btn:active { transform: scale(0.97); }
        .quick-add-btn-active {
          background: var(--app-accent);
          color: white;
          border-color: var(--app-accent);
        }
      `}</style>
    </div>
  )
}

function QuickAddBtn({ label, onClick, active }) {
  return (
    <button className={`quick-add-btn ${active ? 'quick-add-btn-active' : ''}`} onClick={onClick}>
      {active ? '✕' : '+'} {label}
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
    <div className="cycle-summary-header card">
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
        <button className="btn ghost btn sm" onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous day">‹</button>
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
        <button
          className="btn ghost btn sm"
          onClick={() => { const n = shiftDate(date, 1); if (n <= today) setDate(n) }}
          disabled={date >= today}
          aria-label="Next day"
        >›</button>
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
    </div>
  )
}
function FlowCard({ day, updateDay }) {
  const current = day?.flow || 'none'
  return (
    <div className="card">
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
            <span className="flow-dot" style={{ background: f.color }} />
            {f.label}
          </button>
        ))}
      </div>
      <style>{`
        .flow-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: var(--r-full);
          background: var(--bg-sunken);
          color: var(--text-soft);
          font-size: 14px;
          border: 1px solid transparent;
          font-weight: 500;
        }
        .flow-on {
          background: var(--app-weak);
          color: var(--app-accent);
          border-color: color-mix(in srgb, var(--app-accent) 60%, transparent);
        }
        .flow-dot {
          width: 12px; height: 12px;
          border-radius: 50%;
          border: 1px solid rgba(0,0,0,0.05);
        }
      `}</style>
    </div>
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
    <div className="card add-panel rise">
      <div className="card-head">
        <h3 className="card-title section-h">Log symptoms</h3>
        {selected.length > 0 && (
          <span className="selected-count">{selected.length} selected</span>
        )}
      </div>

      <label className="field-label">What <span className="muted" style={{ textTransform: 'none', fontWeight: 400 }}>(tap all that apply)</span></label>
      <div className="chip-row">
        {SYMPTOMS.map(s => (
          <button key={s} className={`chip ${selected.includes(s) ? 'on' : ''}`} onClick={() => toggle(s)}>
            {s}
          </button>
        ))}
      </div>

      <label className="field-label" style={{ marginTop: 16 }}>Severity (1–5) <span className="required">*</span></label>
      <SeverityPicker value={severity} onChange={setSeverity} />

      <label className="field-label" style={{ marginTop: 16 }}>When</label>
      <TimePicker value={time} onChange={setTime} />

      <label className="field-label" style={{ marginTop: 16 }}>Notes (optional)</label>
      <textarea className="textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. came on suddenly, dull ache…" />

      <div className="row" style={{ marginTop: 16, gap: 8 }}>
        <button className="btn ghost btn sm" onClick={onDone}>Cancel</button>
        <button className="btn primary btn block" onClick={save} disabled={selected.length === 0 || saving}>
          {saving ? 'Saving…' : selected.length > 1 ? `Save ${selected.length} symptoms` : 'Save symptom'}
        </button>
      </div>

      <style>{`
        .required { color: var(--app-accent); }
        .selected-count {
          font-size: 12px;
          font-weight: 600;
          color: var(--app-accent);
          background: var(--app-weak);
          padding: 3px 10px;
          border-radius: var(--r-full);
        }
      `}</style>
    </div>
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
    <div className="card add-panel rise">
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
        {FOOD_CATEGORIES.map(c => {
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
        <button className="btn ghost btn sm" onClick={onDone}>Cancel</button>
        <button className="btn primary btn block" onClick={save} disabled={basket.length === 0 || saving}>
          {saving ? 'Saving…' : basket.length > 1 ? `Save ${basket.length} foods` : 'Save food'}
        </button>
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
    </div>
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
    <div className="card add-panel rise">
      <div className="card-head">
        <h3 className="card-title section-h">Log mood</h3>
        {selected.length > 0 && (
          <span className="selected-count">{selected.length} selected</span>
        )}
      </div>
      <label className="field-label">How are you feeling? <span className="muted" style={{ textTransform: 'none', fontWeight: 400 }}>(tap all that apply)</span></label>
      <div className="chip-row">
        {MOODS.map(m => (
          <button key={m} className={`chip ${selected.includes(m) ? 'on' : ''}`} onClick={() => toggle(m)}>
            {m}
          </button>
        ))}
      </div>
      <label className="field-label" style={{ marginTop: 16 }}>When</label>
      <TimePicker value={time} onChange={setTime} />
      <label className="field-label" style={{ marginTop: 16 }}>Notes (optional)</label>
      <textarea className="textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      <div className="row" style={{ marginTop: 16, gap: 8 }}>
        <button className="btn ghost btn sm" onClick={onDone}>Cancel</button>
        <button className="btn primary btn block" onClick={save} disabled={selected.length === 0 || saving}>
          {saving ? 'Saving…' : selected.length > 1 ? `Save ${selected.length} moods` : 'Save mood'}
        </button>
      </div>
    </div>
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
    <div className="card add-panel rise">
      <div className="card-head"><h3 className="card-title section-h">Log water</h3></div>
      <label className="field-label">Amount (oz)</label>
      <div className="chip-row">
        {[4, 8, 12, 16, 20, 32].map(n => (
          <button key={n} className={`chip ${amount === n ? 'on' : ''}`} onClick={() => setAmount(n)}>
            {n} oz
          </button>
        ))}
      </div>
      <label className="field-label" style={{ marginTop: 16 }}>When</label>
      <TimePicker value={time} onChange={setTime} />
      <div className="row" style={{ marginTop: 16, gap: 8 }}>
        <button className="btn ghost btn sm" onClick={onDone}>Cancel</button>
        <button className="btn primary btn block" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : `Save ${amount} oz`}
        </button>
      </div>
    </div>
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
    <div className="card add-panel rise">
      <div className="card-head"><h3 className="card-title section-h">Log exercise</h3></div>
      <label className="field-label">Type</label>
      <div className="chip-row">
        {EXERCISE_TYPES.map(t => (
          <button key={t} className={`chip ${type === t ? 'on' : ''}`} onClick={() => setType(t)}>
            {t}
          </button>
        ))}
      </div>
      <label className="field-label" style={{ marginTop: 16 }}>Duration (min)</label>
      <div className="chip-row">
        {[10, 20, 30, 45, 60, 90].map(d => (
          <button key={d} className={`chip ${duration === d ? 'on' : ''}`} onClick={() => setDuration(d)}>
            {d} min
          </button>
        ))}
      </div>
      <label className="field-label" style={{ marginTop: 16 }}>When</label>
      <TimePicker value={time} onChange={setTime} />
      <label className="field-label" style={{ marginTop: 16 }}>Notes (optional)</label>
      <textarea className="textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      <div className="row" style={{ marginTop: 16, gap: 8 }}>
        <button className="btn ghost btn sm" onClick={onDone}>Cancel</button>
        <button className="btn primary btn block" onClick={save} disabled={!type || saving}>
          {saving ? 'Saving…' : 'Save exercise'}
        </button>
      </div>
    </div>
  )
}

// ============ TIMELINE ============
function Timeline({ symptoms, foods, moods, waters, exercises, workouts = [], onReload }) {
  const [editing, setEditing] = useState(null) // { kind, id }

  const events = [
    ...symptoms.map(e => ({ ...e, kind: 'symptom' })),
    ...foods.map(e => ({ ...e, kind: 'food' })),
    ...moods.map(e => ({ ...e, kind: 'mood' })),
    ...waters.map(e => ({ ...e, kind: 'water' })),
    ...exercises.map(e => ({ ...e, kind: 'exercise' })),
    ...workouts.map(e => ({ ...e, kind: 'workout' })),
  ].sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at))

  const deleteEvent = async (kind, id) => {
    await store.deleteEvent(id)
    onReload()
  }

  const isEditing = (kind, id) => editing?.kind === kind && editing?.id === id

  if (events.length === 0) {
    return (
      <div className="card">
        <div className="empty">Nothing logged yet today.</div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title section-h">Today's log</h3>
        <span className="card-sub">{events.length} entries</span>
      </div>
      <div>
        {events.map(ev => (
          <div key={ev.kind + ev.id}>
            <div className="event-item">
              <span className="event-time">{formatTimeLocal(ev.occurred_at)}</span>
              <div className="event-body">
                <EventBody ev={ev} />
              </div>
              <div className="event-actions">
                {ev.kind === 'workout' ? (
                  <span className="event-src" title="Logged in the Fitness app">Reps</span>
                ) : (
                  <>
                    <button
                      className="event-edit"
                      onClick={() => setEditing(isEditing(ev.kind, ev.id) ? null : { kind: ev.kind, id: ev.id })}
                      aria-label="Edit"
                    >✎</button>
                    <button
                      className="event-delete"
                      onClick={() => deleteEvent(ev.kind, ev.id)}
                      aria-label="Delete"
                    >×</button>
                  </>
                )}
              </div>
            </div>
            {isEditing(ev.kind, ev.id) && ev.kind !== 'workout' && (
              <EditEvent
                ev={ev}
                onDone={() => { setEditing(null); onReload() }}
                onCancel={() => setEditing(null)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function EventBody({ ev }) {
  if (ev.kind === 'symptom') {
    return (
      <>
        <div className="event-label">
          <span className="event-tag tag-symptom">Symptom</span>
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
          <span className="event-tag tag-food">Food</span>
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
          <span className="event-tag tag-mood">Mood</span>
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
          <span className="event-tag tag-water">Water</span>
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
          <span className="event-tag tag-exercise">Exercise</span>
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
          <span className="event-tag tag-workout">Workout</span>
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
    margin-right: 8px;
    vertical-align: 2px;
  }
  .tag-symptom  { background: #f4dcd3; color: #8e3d31; }
  .tag-food     { background: #ede4d0; color: #806527; }
  .tag-mood     { background: #e4dae6; color: #6b4a55; }
  .tag-water    { background: #d9e6ee; color: #3d5e72; }
  .tag-exercise { background: #dfe5d6; color: #4f6238; }
  .tag-workout  { background: #d3e3d6; color: #3c6047; }
  .event-src {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-soft, #6b5d48);
    padding: 2px 7px;
    border: 1px solid var(--border, #d8cdb4);
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
        <button className="btn ghost btn sm" onClick={onCancel}>Cancel</button>
      </div>

      {ev.kind === 'symptom' && (
        <>
          <label className="field-label">Symptom</label>
          <div className="chip-row" style={{ marginBottom: 12 }}>
            {SYMPTOMS.map(s => (
              <button key={s} className={`chip chip-sm ${symptom === s ? 'on' : ''}`} onClick={() => setSymptom(s)}>{s}</button>
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
            {FOOD_CATEGORIES.map(c => (
              <button key={c.name} className={`chip chip-sm ${category === c.name ? 'on' : ''}`} onClick={() => { setCategory(c.name); setItem(null) }}>{c.name}</button>
            ))}
          </div>
          {catItems.length > 0 && (
            <>
              <label className="field-label">Item</label>
              <div className="chip-row" style={{ marginBottom: 12 }}>
                {catItems.map(i => (
                  <button key={i} className={`chip chip-sm ${item === i ? 'on' : ''}`} onClick={() => setItem(i)}>{i}</button>
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
            {MOODS.map(m => (
              <button key={m} className={`chip chip-sm ${mood === m ? 'on' : ''}`} onClick={() => setMood(m)}>{m}</button>
            ))}
          </div>
        </>
      )}

      {ev.kind === 'water' && (
        <>
          <label className="field-label">Amount (oz)</label>
          <div className="chip-row" style={{ marginBottom: 12 }}>
            {[4, 8, 12, 16, 20, 32].map(n => (
              <button key={n} className={`chip chip-sm ${amount === n ? 'on' : ''}`} onClick={() => setAmount(n)}>{n} oz</button>
            ))}
          </div>
        </>
      )}

      {ev.kind === 'exercise' && (
        <>
          <label className="field-label">Type</label>
          <div className="chip-row" style={{ marginBottom: 12 }}>
            {EXERCISE_TYPES.map(t => (
              <button key={t} className={`chip chip-sm ${exerciseType === t ? 'on' : ''}`} onClick={() => setExerciseType(t)}>{t}</button>
            ))}
          </div>
          <label className="field-label">Duration (min)</label>
          <div className="chip-row" style={{ marginBottom: 12 }}>
            {[10, 20, 30, 45, 60, 90].map(d => (
              <button key={d} className={`chip chip-sm ${duration === d ? 'on' : ''}`} onClick={() => setDuration(d)}>{d} min</button>
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

      <button
        className="btn btn amber-btn btn block"
        style={{ marginTop: 14 }}
        onClick={save}
        disabled={saving}
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>

      <style>{`
        .edit-panel {
          margin: 0 0 4px;
          padding: 14px 16px 16px;
          background: color-mix(in srgb, var(--warn) 14%, var(--bg-paper));
          border: 1.5px solid color-mix(in srgb, var(--warn) 55%, transparent);
          border-radius: var(--r-sm);
        }
        .edit-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .edit-panel-title {
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--warn);
        }
      `}</style>
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
    <div className="card">
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
          <input
            type="number"
            step="0.5"
            min="0"
            max="14"
            placeholder="—"
            className="stat-input"
            value={day?.sleep_hours ?? ''}
            onChange={e => updateDay({ sleep_hours: e.target.value === '' ? null : Number(e.target.value) })}
          />
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

      <style>{`
        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }
        .summary-stat {
          padding: 14px 10px;
          background: var(--bg-sunken);
          border-radius: var(--r-sm);
          text-align: center;
        }
        .stat-value {
          font-family: var(--font-display);
          font-size: 26px;
          color: var(--text);
          line-height: 1;
        }
        .stat-unit {
          font-size: 14px;
          color: var(--text-soft);
          margin-left: 3px;
        }
        .stat-input {
          font-family: var(--font-display);
          font-size: 22px;
          color: var(--text);
          background: transparent;
          border: none;
          width: 100%;
          text-align: center;
          padding: 2px 0;
        }
        .stat-input:focus { outline: none; }
        .stat-label {
          font-size: 11px;
          color: var(--text-soft);
          margin-top: 4px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  )
}

// ============ PHASE OVERRIDE ============
function PhaseOverride({ day, updateDay, computedPhase }) {
  const [open, setOpen] = useState(false)
  const phases = Object.keys(PHASES)

  return (
    <div className="card">
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
              <button
                key={p}
                className={`chip ${day?.cycle_phase === p && day?.cycle_phase_override ? 'on' : ''}`}
                onClick={() => updateDay({ cycle_phase: p, cycle_phase_override: true })}
              >
                {PHASES[p].label}
              </button>
            ))}
          </div>
          {day?.cycle_phase_override && (
            <button
              className="btn ghost btn sm"
              style={{ marginTop: 12 }}
              onClick={() => updateDay({ cycle_phase: computedPhase, cycle_phase_override: false })}
            >
              Reset to auto
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// Helper: keep date stable, only change time part
function adjustToDate(iso, dateStr) {
  const t = new Date(iso)
  const target = new Date(dateStr + 'T00:00:00')
  target.setHours(t.getHours(), t.getMinutes(), t.getSeconds(), 0)
  return target.toISOString()
}
