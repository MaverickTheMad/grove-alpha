import { useState, useEffect, useCallback } from 'react'
import * as store from '../lib/store'
import {
  DEFAULT_HABITS, MOODS, todayStr, addDays, isoToLocalDateStr, localDayBounds,
} from '../constants'

const WINDOWS = [7, 30, 90]

export default function TrendsTab({ ctx }) {
  const { completions } = ctx
  const [win, setWin] = useState(30)
  const [moodCounts, setMoodCounts] = useState({})
  const [exerciseMin, setExerciseMin] = useState(0)
  const [avgSleep, setAvgSleep] = useState(null)
  const [avgWater, setAvgWater] = useState(null)

  const today = todayStr()
  const start = addDays(today, -(win - 1))

  // habit completion rates over the window
  const habitRates = {}
  for (const h of DEFAULT_HABITS) {
    let n = 0
    for (let i = 0; i < win; i++) {
      const d = addDays(start, i)
      if ((completions[d] || []).includes(h.id)) n++
    }
    habitRates[h.id] = { count: n, pct: n / win }
  }

  const loadEvents = useCallback(async () => {
    const { startISO } = localDayBounds(start)
    const { endISO } = localDayBounds(today)

    const [mood, ex, sleep, water] = await Promise.all([
      store.listEventsInRange('mood_event', startISO, endISO),
      store.listEventsInRange('exercise_event', startISO, endISO),
      store.listEventsInRange('sleep_event', startISO, endISO),
      store.listEventsInRange('water_event', startISO, endISO),
    ])

    const mc = {}
    for (const r of mood) mc[r.mood] = (mc[r.mood] || 0) + 1
    setMoodCounts(mc)

    setExerciseMin((ex).reduce((s, r) => s + (r.duration_minutes || 0), 0))

    const sl = sleep
    setAvgSleep(sl.length ? (sl.reduce((s, r) => s + (r.hours || 0), 0) / sl.length).toFixed(1) : null)

    // average water per day that had any logged
    const byDay = {}
    for (const r of water) {
      const d = isoToLocalDateStr(r.occurred_at)
      byDay[d] = (byDay[d] || 0) + (r.amount_oz || 0)
    }
    const days = Object.values(byDay)
    setAvgWater(days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null)
  }, [start, today])

  useEffect(() => { loadEvents() }, [loadEvents])

  const topMoods = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])
  const maxMood = topMoods.length ? topMoods[0][1] : 1

  return (
    <>
      <div className="card">
        <div className="card-title">Span of Days</div>
        <div className="pill-wrap">
          {WINDOWS.map(w => (
            <button key={w} className={'pill' + (win === w ? ' sel' : '')} onClick={() => setWin(w)}>{w} days</button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">The Reckoning</div>
        <div className="stat-grid">
          <div className="stat"><div className="v num">{avgSleep ?? '—'}{avgSleep ? 'h' : ''}</div><div className="k">Mean Rest</div></div>
          <div className="stat"><div className="v num">{avgWater ?? '—'}{avgWater ? '' : ''}</div><div className="k">Mean Draught</div></div>
          <div className="stat"><div className="v num">{exerciseMin}</div><div className="k">Trial Minutes</div></div>
        </div>
      </div>

      {/* Habit consistency */}
      <div className="card">
        <div className="card-title">Devotion to the Quests</div>
        {DEFAULT_HABITS.map(h => {
          const r = habitRates[h.id]
          return (
            <div className="bar-row" key={h.id}>
              <span className="bar-label">{h.icon} {h.label}</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${r.pct * 100}%` }} /></div>
              <span className="bar-val num">{Math.round(r.pct * 100)}%</span>
            </div>
          )
        })}
      </div>

      {/* Mood breakdown */}
      <div className="card">
        <div className="card-title">States of Spirit</div>
        {topMoods.length === 0 ? (
          <div className="empty">No spirits recorded in this span</div>
        ) : (
          topMoods.map(([mood, count]) => (
            <div className="bar-row" key={mood}>
              <span className="bar-label">{mood}</span>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${(count / maxMood) * 100}%`, background: 'var(--violet)' }} /></div>
              <span className="bar-val num">{count}</span>
            </div>
          ))
        )}
      </div>
    </>
  )
}
