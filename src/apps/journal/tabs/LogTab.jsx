import { useEffect, useMemo, useState, useCallback } from 'react'
import * as data from '../../../lib/data'
import { todayStr, addDays, isoToLocalDateStr } from '../../../lib/time'
import { fmtDate, fmtTime } from '../../../lib/money'
import { useToast } from '../../../components/Toast'
import Sheet from '../../../components/Sheet'
import TimePicker from '../../../components/TimePicker'
import Icon from '../../../components/Icon'
import {
  SYMPTOMS, MOODS, EXERCISE_TYPES, FLOW_LEVELS, WATER_OPTIONS,
  FOOD_CATEGORIES, EVENT_TYPES,
} from '../constants'

const ALL_EVENT_TYPES = [
  EVENT_TYPES.symptom, EVENT_TYPES.food, EVENT_TYPES.mood,
  EVENT_TYPES.water, EVENT_TYPES.exercise,
]

const TYPE_META = {
  [EVENT_TYPES.symptom]: { color: 'var(--danger)', label: 'Symptom' },
  [EVENT_TYPES.food]: { color: 'var(--warn)', label: 'Food' },
  [EVENT_TYPES.mood]: { color: 'var(--secondary)', label: 'Mood' },
  [EVENT_TYPES.water]: { color: 'var(--info)', label: 'Water' },
  [EVENT_TYPES.exercise]: { color: 'var(--ok)', label: 'Exercise' },
}

export default function LogTab({ periodStarts, phaseFor }) {
  const [date, setDate] = useState(todayStr)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [panel, setPanel] = useState(null) // 'symptom' | 'food' | 'mood' | 'water' | 'exercise'
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await data.list({ app: 'journal', type: ALL_EVENT_TYPES, from: date, to: date })
      setEvents(rows.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1)))
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => { load() }, [load])

  const isToday = date === todayStr()
  const phase = phaseFor?.(date)

  const waterTotal = useMemo(
    () => events.filter((e) => e.type === EVENT_TYPES.water).reduce((s, e) => s + (e.data.amountOz || 0), 0),
    [events],
  )
  const exerciseTotal = useMemo(
    () => events.filter((e) => e.type === EVENT_TYPES.exercise).reduce((s, e) => s + (e.data.minutes || 0), 0),
    [events],
  )

  const del = async (ev) => {
    setEvents((cur) => cur.filter((x) => x.id !== ev.id))
    await data.remove(ev.id)
    toast.show('Deleted', {
      actionLabel: 'Undo',
      onAction: async () => { await data.restore(ev.id); load() },
    })
  }

  return (
    <main className="screen">
      {/* date nav */}
      <div className="spread" style={{ marginBottom: 'var(--sp-4)' }}>
        <button className="icon-btn" aria-label="Previous day" onClick={() => setDate((d) => addDays(d, -1))}>
          <Icon name="back" />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-lg)' }}>
            {isToday ? 'Today' : fmtDate(date, { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
          {phase && (
            <div className="sub" style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-soft)' }}>
              Day {phase.day} · {phase.phase}
            </div>
          )}
        </div>
        <button
          className="icon-btn"
          aria-label="Next day"
          disabled={isToday}
          style={{ opacity: isToday ? 0.3 : 1 }}
          onClick={() => !isToday && setDate((d) => addDays(d, 1))}
        >
          <Icon name="back" className="flip" />
        </button>
      </div>

      {/* flow */}
      <FlowSelector date={date} />

      {/* quick-add row (equal width §6) */}
      <div className="btn-row" style={{ margin: 'var(--sp-4) 0' }}>
        <button className="btn sm" onClick={() => setPanel('symptom')}>Symptom</button>
        <button className="btn sm" onClick={() => setPanel('food')}>Food</button>
        <button className="btn sm" onClick={() => setPanel('mood')}>Mood</button>
        <button className="btn sm" onClick={() => setPanel('water')}>Water</button>
        <button className="btn sm" onClick={() => setPanel('exercise')}>Move</button>
      </div>

      {/* day summary */}
      {(waterTotal > 0 || exerciseTotal > 0) && (
        <div className="card row" style={{ justifyContent: 'space-around', marginBottom: 'var(--sp-4)' }}>
          <Stat label="water" value={`${waterTotal} oz`} />
          <Stat label="movement" value={`${exerciseTotal} min`} />
        </div>
      )}

      {/* timeline */}
      {loading ? (
        <p className="sub" style={{ textAlign: 'center', color: 'var(--text-soft)' }}>Loading…</p>
      ) : events.length === 0 ? (
        <div className="empty">
          <span className="big">🌿</span>
          <p className="line">Nothing logged yet</p>
          <button className="btn primary" onClick={() => setPanel('symptom')}>Log your first symptom</button>
        </div>
      ) : (
        <div className="stack">
          {events.map((ev) => (
            <EventRow key={ev.id} ev={ev} onDelete={() => del(ev)} />
          ))}
        </div>
      )}

      <AddPanel kind={panel} date={date} onClose={() => setPanel(null)} onSaved={() => { setPanel(null); load() }} />
    </main>
  )
}

function Stat({ label, value }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="num" style={{ fontSize: 'var(--fs-xl)' }}>{value}</div>
      <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-soft)' }}>{label}</div>
    </div>
  )
}

function EventRow({ ev, onDelete }) {
  const meta = TYPE_META[ev.type] || {}
  return (
    <div className="event-row">
      <span className="event-dot" style={{ background: meta.color }} />
      <div className="grow">
        <div>{describe(ev)}</div>
        <div className="event-time">{fmtTime(ev.occurredAt)} · {meta.label}</div>
      </div>
      <button className="icon-btn" aria-label="Delete entry" onClick={onDelete}>
        <Icon name="trash" size={18} />
      </button>
    </div>
  )
}

function describe(ev) {
  const d = ev.data || {}
  switch (ev.type) {
    case EVENT_TYPES.symptom: return `${d.symptom}${d.severity ? ` · severity ${d.severity}` : ''}`
    case EVENT_TYPES.food: return `${d.item}${d.category ? ` (${d.category})` : ''}`
    case EVENT_TYPES.mood: return d.mood
    case EVENT_TYPES.water: return `${d.amountOz} oz water`
    case EVENT_TYPES.exercise: return `${d.exerciseType} · ${d.minutes} min`
    default: return ev.type
  }
}

/* ---- flow selector: writes/updates a cycle_day record for the date ---- */
function FlowSelector({ date }) {
  const [flow, setFlow] = useState('none')
  const [recordId, setRecordId] = useState(null)

  useEffect(() => {
    let alive = true
    data.list({ app: 'journal', type: EVENT_TYPES.cycleDay, from: date, to: date }).then((rows) => {
      if (!alive) return
      const row = rows[0]
      setRecordId(row?.id ?? null)
      setFlow(row?.data.flow ?? 'none')
    })
    return () => { alive = false }
  }, [date])

  const pick = async (level) => {
    setFlow(level)
    const occurredAt = new Date(`${date}T12:00:00`).toISOString()
    if (recordId) await data.update(recordId, { data: { date, flow: level } })
    else {
      const rec = await data.create({ app: 'journal', type: EVENT_TYPES.cycleDay, occurredAt, data: { date, flow: level } })
      setRecordId(rec.id)
    }
  }

  return (
    <div>
      <span className="field-label">Flow</span>
      <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
        {FLOW_LEVELS.map((lvl) => (
          <button key={lvl} className={`chip ${flow === lvl ? 'on' : ''}`} onClick={() => pick(lvl)}>{lvl}</button>
        ))}
      </div>
    </div>
  )
}

/* ---- add panels (multi-select; duplicate-safe basket §12) ---- */
function AddPanel({ kind, date, onClose, onSaved }) {
  const occurredDefault = () => {
    // default timestamp anchored to the selected day, noon if not today
    if (date === todayStr()) return new Date().toISOString()
    return new Date(`${date}T12:00:00`).toISOString()
  }
  const [occurredAt, setOccurredAt] = useState(occurredDefault)
  const [basket, setBasket] = useState([])
  const [severity, setSeverity] = useState(3)
  const [foodCat, setFoodCat] = useState(Object.keys(FOOD_CATEGORIES)[0])
  const [waterOz, setWaterOz] = useState(8)
  const [exType, setExType] = useState(EXERCISE_TYPES[0])
  const [minutes, setMinutes] = useState(30)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!kind) return
    setOccurredAt(occurredDefault())
    setBasket([]); setSeverity(3); setWaterOz(8); setMinutes(30)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, date])

  if (!kind) return null

  // existence check INSIDE the updater — duplicate-safe on fast taps (§12)
  const toggle = (x) => setBasket((prev) => (prev.includes(x) ? prev.filter((i) => i !== x) : [...prev, x]))

  const save = async () => {
    setSaving(true)
    try {
      if (kind === 'symptom') {
        for (const symptom of basket) {
          await data.create({ app: 'journal', type: EVENT_TYPES.symptom, occurredAt, data: { symptom, severity } })
        }
      } else if (kind === 'mood') {
        for (const mood of basket) {
          await data.create({ app: 'journal', type: EVENT_TYPES.mood, occurredAt, data: { mood } })
        }
      } else if (kind === 'food') {
        for (const item of basket) {
          await data.create({ app: 'journal', type: EVENT_TYPES.food, occurredAt, data: { category: foodCat, item } })
        }
      } else if (kind === 'water') {
        await data.create({ app: 'journal', type: EVENT_TYPES.water, occurredAt, data: { amountOz: waterOz } })
      } else if (kind === 'exercise') {
        await data.create({ app: 'journal', type: EVENT_TYPES.exercise, occurredAt, data: { exerciseType: exType, minutes } })
      }
      onSaved() // do NOT setSaving(false) before onSaved — avoids double-submit (§12)
    } catch (err) {
      setSaving(false)
      alert('Could not save: ' + err.message)
    }
  }

  const titles = { symptom: 'Log symptoms', food: 'Log food', mood: 'Log mood', water: 'Log water', exercise: 'Log movement' }
  const count = basket.length
  const saveLabel =
    kind === 'symptom' ? (count ? `Save ${count} symptom${count > 1 ? 's' : ''}` : 'Save')
      : kind === 'mood' ? (count ? `Save ${count} mood${count > 1 ? 's' : ''}` : 'Save')
        : kind === 'food' ? (count ? `Save ${count} item${count > 1 ? 's' : ''}` : 'Save')
          : kind === 'water' ? `Save ${waterOz} oz`
            : `Save ${minutes} min`

  const canSave = (['symptom', 'mood', 'food'].includes(kind) ? count > 0 : true) && !saving

  return (
    <Sheet
      open={!!kind}
      onClose={onClose}
      title={titles[kind]}
      footer={
        <>
          <button className="btn ghost grow" onClick={onClose}>Cancel</button>
          <button className="btn primary grow" disabled={!canSave} onClick={save}>{saveLabel}</button>
        </>
      }
    >
      {kind === 'symptom' && (
        <>
          <ChipGrid options={SYMPTOMS} selected={basket} onToggle={toggle} />
          <div>
            <span className="field-label">Severity · {severity}</span>
            <Stepper value={severity} min={1} max={5} onChange={setSeverity} />
          </div>
        </>
      )}

      {kind === 'mood' && <ChipGrid options={MOODS} selected={basket} onToggle={toggle} />}

      {kind === 'food' && (
        <>
          <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
            {Object.keys(FOOD_CATEGORIES).map((c) => (
              <button key={c} className={`chip ${foodCat === c ? 'on' : ''}`} onClick={() => setFoodCat(c)}>{c}</button>
            ))}
          </div>
          <ChipGrid options={FOOD_CATEGORIES[foodCat]} selected={basket} onToggle={toggle} />
          {count > 0 && <p className="sub">Basket: {basket.join(', ')}</p>}
        </>
      )}

      {kind === 'water' && (
        <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
          {WATER_OPTIONS.map((oz) => (
            <button key={oz} className={`chip ${waterOz === oz ? 'on' : ''}`} onClick={() => setWaterOz(oz)}>{oz} oz</button>
          ))}
        </div>
      )}

      {kind === 'exercise' && (
        <>
          <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
            {EXERCISE_TYPES.map((t) => (
              <button key={t} className={`chip ${exType === t ? 'on' : ''}`} onClick={() => setExType(t)}>{t}</button>
            ))}
          </div>
          <div>
            <span className="field-label">Minutes · {minutes}</span>
            <Stepper value={minutes} min={5} max={180} step={5} onChange={setMinutes} />
          </div>
        </>
      )}

      <div>
        <span className="field-label">When</span>
        <TimePicker value={occurredAt} onChange={setOccurredAt} />
      </div>
    </Sheet>
  )
}

function ChipGrid({ options, selected, onToggle }) {
  return (
    <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
      {options.map((o) => (
        <button key={o} className={`chip ${selected.includes(o) ? 'on' : ''}`} onClick={() => onToggle(o)}>{o}</button>
      ))}
    </div>
  )
}

function Stepper({ value, min = 0, max = 999, step = 1, onChange }) {
  return (
    <div className="stepper">
      <button onClick={() => onChange(Math.max(min, value - step))} aria-label="Decrease">−</button>
      <span className="val">{value}</span>
      <button onClick={() => onChange(Math.min(max, value + step))} aria-label="Increase">+</button>
    </div>
  )
}
