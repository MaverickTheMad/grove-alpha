import { useEffect, useMemo, useState } from 'react'
import * as store from '../lib/store.js'
import {
  CATEGORY_EMOJI, CATEGORY_LABEL, addDays, fmtRelative, isoToLocalDateStr,
  levelProgress, levelTitle, summarizeExercise, todayStr,
} from '../constants.js'

export default function ProgressTab({ person, profile, onProfileChange }) {
  const [workouts, setWorkouts] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [pickEx, setPickEx] = useState('')

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

  // Build weight-over-time series keyed by exercise name.
  const weightSeries = useMemo(() => {
    if (!workouts) return {}
    const map = {}
    const ordered = [...workouts].sort((a, b) => new Date(a.performed_at) - new Date(b.performed_at))
    for (const w of ordered) {
      for (const e of w.workout_exercises || []) {
        if (e.mode === 'reps' && e.weight != null && e.weight > 0) {
          ;(map[e.name] ||= []).push({ date: isoToLocalDateStr(w.performed_at), weight: Number(e.weight) })
        }
      }
    }
    return Object.fromEntries(Object.entries(map).filter(([, v]) => v.length >= 2))
  }, [workouts])

  const exNames = Object.keys(weightSeries)
  const activeEx = pickEx && weightSeries[pickEx] ? pickEx : exNames[0]

  const prog = levelProgress(profile.xp)

  const deleteWorkout = async (id) => {
    if (!confirm('Delete this workout? (XP and tokens already earned are kept.)')) return
    await store.deleteWorkout(id)
    load()
  }

  if (workouts === null) {
    return <div className="empty"><div className="big">⏳</div><p>Loading progress…</p></div>
  }

  return (
    <div className="tab-pad">
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

      {/* Weight over time */}
      {exNames.length > 0 && (
        <div className="card">
          <div className="card-head">
            <h3 className="section-h flush">Weight over time</h3>
            <select className="select" value={activeEx} onChange={(e) => setPickEx(e.target.value)}>
              {exNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <Sparkline data={weightSeries[activeEx]} />
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
                  <button className="btn ghost sm" onClick={() => deleteWorkout(w.id)}>Delete workout</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Sparkline({ data }) {
  const W = 300, H = 90, pad = 10
  const weights = data.map((d) => d.weight)
  const min = Math.min(...weights), max = Math.max(...weights)
  const span = max - min || 1
  const stepX = data.length > 1 ? (W - pad * 2) / (data.length - 1) : 0
  const pts = data.map((d, i) => {
    const x = pad + i * stepX
    const y = pad + (H - pad * 2) * (1 - (d.weight - min) / span)
    return [x, y]
  })
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
  const first = data[0].weight, last = data[data.length - 1].weight
  const delta = last - first
  return (
    <div className="spark-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="spark" preserveAspectRatio="none">
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="var(--accent)" />)}
      </svg>
      <div className="spark-meta">
        <span className="mono">{first} → {last} lbs</span>
        <span className={`delta ${delta >= 0 ? 'up' : 'down'}`}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} lbs</span>
      </div>
    </div>
  )
}
