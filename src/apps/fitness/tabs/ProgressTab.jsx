import { useEffect, useMemo, useState } from 'react'
import * as store from '../lib/store.js'
import {
  CATEGORY_EMOJI, CATEGORY_LABEL, addDays, fmtRelative, isoToLocalDateStr,
  levelProgress, levelTitle, summarizeExercise, todayStr,
} from '../constants.js'
import { cmpText } from '../../../lib/sort.js'
import Sheet from '../../../components/Sheet'

export default function ProgressTab({ person, profile, onProfileChange }) {
  const [workouts, setWorkouts] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [pickEx, setPickEx] = useState('')
  const [metric, setMetric] = useState('topSet')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const load = async () => {
    const data = await store.listWorkouts(person, { limit: 80 })
    setWorkouts(data || [])
  }
  useEffect(() => { setWorkouts(null); load() }, [person])

  const weekCount = useMemo(() => {
    if (!workouts) return 0
    const cutoff = addDays(todayStr(), -6)
    return workouts.filter((w) => isoToLocalDateStr(w.performed_at) >= cutoff).length
  }, [workouts])

  // Exercise names that have reps data, sorted alphabetically
  const exNames = useMemo(() => {
    if (!workouts) return []
    const names = new Set()
    for (const w of workouts) {
      for (const e of w.workout_exercises || []) {
        if (e.mode === 'reps' && e.weight > 0 && e.reps > 0) names.add(e.name)
      }
    }
    return [...names].sort(cmpText)
  }, [workouts])

  const activeEx = pickEx && exNames.includes(pickEx) ? pickEx : exNames[0]

  // Per-session data for the selected exercise (last 12 sessions)
  const sessionData = useMemo(() => {
    if (!workouts || !activeEx) return []
    const ordered = [...workouts].sort((a, b) => new Date(a.performed_at) - new Date(b.performed_at))
    return ordered.flatMap(w => {
      const exes = (w.workout_exercises || []).filter(
        e => e.name === activeEx && e.mode === 'reps' && e.weight > 0 && e.reps > 0
      )
      if (!exes.length) return []
      const topSet = Math.max(...exes.map(e => e.weight))
      const volume = exes.reduce((s, e) => s + (e.sets || 1) * e.reps * e.weight, 0)
      const e1rm = Math.round(Math.max(...exes.map(e => e.weight * (1 + e.reps / 30))))
      return [{ date: isoToLocalDateStr(w.performed_at), topSet, volume, e1rm }]
    }).slice(-12)
  }, [workouts, activeEx])

  const prog = levelProgress(profile.xp)

  const performDelete = async () => {
    if (!deleteTarget) return
    await store.deleteWorkout(deleteTarget)
    setDeleteTarget(null)
    setOpenId(null)
    load()
  }

  if (workouts === null) {
    return <div className="empty"><div className="big">⏳</div><p>Loading progress…</p></div>
  }

  const METRICS = [
    { key: 'topSet', label: 'Top set' },
    { key: 'volume', label: 'Volume' },
    { key: 'e1rm', label: 'e1RM (est.)', estimate: true },
  ]

  return (
    <div className="tab-pad">
      <header className="f-page-header">
        <h1 className="f-title">Progress</h1>
      </header>
      {/* Level + streak card */}
      <div className="card stat-card">
        <div className="stat-row">
          <div>
            <div className="lvl-title">{levelTitle(profile.level)}</div>
            <div className="muted sm">Level {profile.level} · {profile.xp} XP total</div>
          </div>
          <div className="streak-pill big">🔥 {profile.current_streak}</div>
        </div>
        <div className="xp-bar"><div className="xp-fill" style={{ width: `${prog.pct}%` }} /></div>
        <div className="muted sm">{prog.toNext} XP to Level {prog.level + 1}</div>
      </div>

      {/* Quick stats */}
      <div className="stat-grid">
        <div className="card mini"><div className="mini-num">{weekCount}</div><div className="mini-lbl">this week</div></div>
        <div className="card mini"><div className="mini-num">{workouts.filter(w => w.category !== 'rest').length}</div><div className="mini-lbl">workouts logged</div></div>
        <div className="card mini"><div className="mini-num">{profile.longest_streak}</div><div className="mini-lbl">best streak</div></div>
      </div>

      {/* Progress bars */}
      {exNames.length > 0 && (
        <div className="card">
          <div className="card-head">
            <h3 className="section-h flush">Progress over time</h3>
            <select className="select" value={activeEx} onChange={(e) => setPickEx(e.target.value)}>
              {exNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="metric-row">
            {METRICS.map(m => (
              <button key={m.key} className={`chip ${metric === m.key ? 'on' : ''}`} onClick={() => setMetric(m.key)}>
                {m.label}
              </button>
            ))}
          </div>
          <BarChart data={sessionData} metric={metric} />
        </div>
      )}

      {/* History */}
      <h3 className="section-h">History</h3>
      {workouts.length === 0 && (
        <div className="empty"><div className="big">🌱</div><p>Nothing logged yet — your finished workouts will show up here.</p></div>
      )}
      <div className="hist-list">
        {workouts.map((w) => {
          const isRest = w.category === 'rest'
          const open = openId === w.id
          return (
            <div key={w.id} className="card hist">
              <button className="hist-row" onClick={() => setOpenId(open ? null : w.id)}>
                <span className="hist-emoji">{CATEGORY_EMOJI[w.category] || '🏋️'}</span>
                <span className="grow">
                  <span className="hist-title">{CATEGORY_LABEL[w.category] || w.category}</span>
                  <span className="sub">
                    {fmtRelative(isoToLocalDateStr(w.performed_at))}
                    {!isRest && w.duration_minutes ? ` · ${w.duration_minutes} min` : ''}
                    {!isRest ? ` · +${w.xp_awarded} XP` : ''}
                  </span>
                </span>
                {!isRest && <span className="caret">{open ? '▾' : '▸'}</span>}
              </button>
              {open && !isRest && (
                <div className="hist-detail">
                  {(w.workout_exercises || []).map((e) => (
                    <div key={e.id} className="hist-ex">
                      <span className="grow">{e.name}</span>
                      <span className="mono">{summarizeExercise(e)}</span>
                    </div>
                  ))}
                  <button className="btn ghost sm" onClick={() => setDeleteTarget(w.id)}>Delete workout</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Sheet
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete workout?"
        footer={
          <div className="row-btns">
            <button className="btn ghost" onClick={() => setDeleteTarget(null)}>Keep it</button>
            <button className="btn ghost danger" onClick={performDelete}>Delete workout</button>
          </div>
        }
      >
        <p className="muted">XP and tokens already earned are kept.</p>
      </Sheet>
    </div>
  )
}

const METRIC_UNIT = { topSet: 'lbs', volume: 'lbs·vol', e1rm: 'lbs' }

function BarChart({ data, metric }) {
  if (!data.length) {
    return <div className="empty"><div className="big">📊</div><p>Log more workouts to see your progress here.</p></div>
  }

  const W = 300, H = 120, padX = 10, padY = 14
  const isEst = metric === 'e1rm'
  const values = data.map(d => d[metric])
  const max = Math.max(...values, 1)
  const count = data.length
  const totalW = W - padX * 2
  const step = totalW / count
  const barW = Math.max(6, step - 4)

  return (
    <div className="bar-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="bar-chart" aria-hidden="true">
        {data.map((d, i) => {
          const x = padX + i * step + (step - barW) / 2
          const barH = Math.max(3, (H - padY * 2) * (d[metric] / max))
          const y = H - padY - barH
          return (
            <rect
              key={i}
              x={x.toFixed(1)} y={y.toFixed(1)}
              width={barW.toFixed(1)} height={barH.toFixed(1)}
              rx="2"
              className={isEst ? 'bar-est-fill' : 'bar-fill'}
            />
          )
        })}
      </svg>
      <div className="bar-meta">
        <span className="mono muted">{data[0]?.date?.slice(5)} – {data[data.length - 1]?.date?.slice(5)}</span>
        <span className={`mono bar-last${isEst ? ' bar-est-label' : ''}`}>
          {values[values.length - 1]} {METRIC_UNIT[metric]}{isEst ? ' est.' : ''}
        </span>
      </div>
    </div>
  )
}
