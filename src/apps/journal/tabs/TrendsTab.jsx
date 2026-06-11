import { useState, useEffect } from 'react'
import * as store from '../lib/store.js'
import { FOOD_CATEGORIES, SYMPTOMS, PHASES, isoToLocalDateStr } from '../constants.js'

const WINDOWS = [
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 9999, label: 'All time' },
]

export default function TrendsTab({ periodStarts, refreshKey }) {
  const [windowDays, setWindowDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ symptoms: [], foods: [], days: [] })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const since = new Date(Date.now() - windowDays * 86400_000).toISOString()
      const sinceDay = since.slice(0, 10)
      const FUTURE = '2999-12-31T23:59:59Z'
      const [s, f, allDays] = await Promise.all([
        store.listEventsInRange('symptom_event', since, FUTURE),
        store.listEventsInRange('food_event', since, FUTURE),
        store.listCycleDays(),
      ])
      if (cancelled) return
      setData({
        symptoms: s,
        foods: f,
        days: Object.values(allDays).filter(x => x.date >= sinceDay),
      })
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [windowDays, refreshKey])

  return (
    <div className="trends-tab stack">
      <div className="window-picker">
        {WINDOWS.map(w => (
          <button
            key={w.value}
            className={`chip chip-sm ${windowDays === w.value ? 'on' : ''}`}
            onClick={() => setWindowDays(w.value)}
          >
            {w.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty">Crunching numbers…</div>
      ) : (
        <>
          <CycleStats periodStarts={periodStarts} />
          <SymptomFrequency symptoms={data.symptoms} />
          <FoodFlareCorrelations foods={data.foods} symptoms={data.symptoms} />
          <PhaseBreakdown symptoms={data.symptoms} days={data.days} periodStarts={periodStarts} />
        </>
      )}

      <style>{`
        .window-picker {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 4px;
        }
      `}</style>
    </div>
  )
}

// ====== CYCLE STATS ======
function CycleStats({ periodStarts }) {
  const sorted = [...periodStarts].sort()
  let avgLength = null
  let lastStart = null
  let daysSince = null
  let nextEstimate = null

  if (sorted.length >= 2) {
    const gaps = []
    for (let i = 1; i < sorted.length; i++) {
      const a = new Date(sorted[i - 1] + 'T00:00:00')
      const b = new Date(sorted[i] + 'T00:00:00')
      gaps.push(Math.round((b - a) / 86400_000))
    }
    const recent = gaps.slice(-6)
    avgLength = Math.round(recent.reduce((s, g) => s + g, 0) / recent.length)
  }
  if (sorted.length >= 1) {
    lastStart = sorted[sorted.length - 1]
    const now = new Date()
    const ls = new Date(lastStart + 'T00:00:00')
    daysSince = Math.floor((now - ls) / 86400_000)
    if (avgLength) {
      const next = new Date(ls)
      next.setDate(next.getDate() + avgLength)
      nextEstimate = next.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title section-h">Cycle</h3>
      </div>
      <div className="cycle-stats">
        <div className="cycle-stat">
          <div className="cycle-stat-value">{avgLength ?? '—'}</div>
          <div className="cycle-stat-label">Avg cycle length</div>
        </div>
        <div className="cycle-stat">
          <div className="cycle-stat-value">{daysSince ?? '—'}</div>
          <div className="cycle-stat-label">Days since start</div>
        </div>
        <div className="cycle-stat">
          <div className="cycle-stat-value cycle-stat-text">{nextEstimate ?? '—'}</div>
          <div className="cycle-stat-label">Next (estimate)</div>
        </div>
      </div>
      <style>{`
        .cycle-stats {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }
        .cycle-stat {
          padding: 14px 8px;
          background: var(--bg-sunken);
          border-radius: var(--r-sm);
          text-align: center;
        }
        .cycle-stat-value {
          font-family: var(--font-display);
          font-size: 28px;
          color: var(--app-accent);
          line-height: 1;
        }
        .cycle-stat-text { font-size: 16px; }
        .cycle-stat-label {
          font-size: 11px;
          color: var(--text-soft);
          margin-top: 6px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  )
}

// ====== SYMPTOM FREQUENCY ======
function SymptomFrequency({ symptoms }) {
  const counts = {}
  const totals = {}
  for (const ev of symptoms) {
    counts[ev.symptom] = (counts[ev.symptom] || 0) + 1
    totals[ev.symptom] = (totals[ev.symptom] || 0) + (ev.severity || 0)
  }
  const rows = Object.entries(counts)
    .map(([name, count]) => ({ name, count, avgSev: totals[name] / count }))
    .sort((a, b) => b.count - a.count)

  const max = rows[0]?.count || 1

  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title section-h">Most common symptoms</h3>
      </div>
      {rows.length === 0 ? (
        <div className="empty">No symptoms logged in this window.</div>
      ) : (
        <div className="bar-list">
          {rows.slice(0, 12).map(r => (
            <div key={r.name} className="bar-row">
              <div className="bar-label">{r.name}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
              <div className="bar-value">
                {r.count}
                <span className="bar-sev"> · avg {r.avgSev.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`
        .bar-list { display: flex; flex-direction: column; gap: 10px; }
        .bar-row {
          display: grid;
          grid-template-columns: 110px 1fr 80px;
          gap: 10px;
          align-items: center;
        }
        .bar-label {
          font-size: 14px;
          color: var(--text);
        }
        .bar-track {
          height: 8px;
          background: var(--bg-sunken);
          border-radius: var(--r-full);
          overflow: hidden;
        }
        .bar-fill {
          height: 100%;
          background: linear-gradient(90deg, color-mix(in srgb, var(--app-accent) 60%, transparent), var(--app-accent));
          border-radius: var(--r-full);
        }
        .bar-value {
          font-size: 13px;
          color: var(--text-soft);
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .bar-sev {
          color: var(--text-soft);
          font-size: 11px;
        }
      `}</style>
    </div>
  )
}

// ====== FOOD-FLARE CORRELATIONS ======
// For each (food category, symptom) pair, count how often the symptom occurred
// within 0–24h AFTER eating that food. Then compare to baseline rate.
function FoodFlareCorrelations({ foods, symptoms }) {
  const [windowHours, setWindowHours] = useState(24)

  // Group symptoms by occurrence
  const symptomTimes = {} // symptom -> [timestamps]
  for (const ev of symptoms) {
    if (!symptomTimes[ev.symptom]) symptomTimes[ev.symptom] = []
    symptomTimes[ev.symptom].push(new Date(ev.occurred_at).getTime())
  }

  // For each food category, find correlated symptoms
  const rows = []
  const foodsByCat = {}
  for (const ev of foods) {
    if (!foodsByCat[ev.category]) foodsByCat[ev.category] = []
    foodsByCat[ev.category].push(new Date(ev.occurred_at).getTime())
  }

  const totalSymptoms = symptoms.length
  // Need a sense of total observation time, in hours
  // Use the time span of the dataset
  const allEvents = [...foods, ...symptoms].map(e => new Date(e.occurred_at).getTime())
  if (allEvents.length === 0) {
    return (
      <div className="card">
        <div className="card-head">
          <h3 className="card-title section-h">Food → flare-up patterns</h3>
        </div>
        <div className="empty">Need more data — log some food and symptoms to see patterns.</div>
      </div>
    )
  }
  const span = Math.max(...allEvents) - Math.min(...allEvents)
  const spanHours = Math.max(span / 3_600_000, 1)
  const windowMs = windowHours * 3_600_000

  for (const [category, times] of Object.entries(foodsByCat)) {
    for (const [symptom, sTimes] of Object.entries(symptomTimes)) {
      let hits = 0
      for (const ft of times) {
        const matched = sTimes.some(st => st >= ft && st <= ft + windowMs)
        if (matched) hits++
      }
      if (hits < 2) continue // require at least 2 to be meaningful
      const rate = hits / times.length // % of times this food preceded the symptom
      // Baseline: chance the symptom occurs in any random N-hour window
      const baseline = Math.min((sTimes.length * windowHours) / spanHours, 1)
      const lift = baseline > 0 ? rate / baseline : 0
      rows.push({
        category, symptom, hits, eaten: times.length, rate, baseline, lift,
      })
    }
  }

  rows.sort((a, b) => b.lift - a.lift)

  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title section-h">Food → flare-up patterns</h3>
        <span className="card-sub">within {windowHours}h</span>
      </div>

      <div className="chip-row" style={{ marginBottom: 12 }}>
        {[6, 12, 24, 48].map(h => (
          <button
            key={h}
            className={`chip chip-sm ${windowHours === h ? 'on' : ''}`}
            onClick={() => setWindowHours(h)}
          >
            {h}h
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="empty">No clear patterns yet. Keep logging.</div>
      ) : (
        <div className="corr-list">
          {rows.slice(0, 10).map((r, i) => (
            <div key={i} className="corr-row">
              <div className="corr-main">
                <div className="corr-pair">
                  <span className="corr-food">{r.category}</span>
                  <span className="corr-arrow">→</span>
                  <span className="corr-symptom">{r.symptom}</span>
                </div>
                <div className="corr-meta">
                  {r.hits} of {r.eaten} times · {Math.round(r.rate * 100)}% · {r.lift.toFixed(1)}× baseline
                </div>
              </div>
              <div className={`lift-badge lift-${liftLevel(r.lift)}`}>
                {liftLabel(r.lift)}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="corr-footnote">
        Lift compares how often this symptom follows the food vs. how often it occurs in general.
        Higher = more likely connected. Patterns need more data to be reliable.
      </p>

      <style>{`
        .corr-list { display: flex; flex-direction: column; gap: 10px; }
        .corr-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid var(--border);
        }
        .corr-row:last-child { border-bottom: none; }
        .corr-main { flex: 1; min-width: 0; }
        .corr-pair {
          font-size: 15px;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .corr-food { color: var(--text); font-weight: 500; }
        .corr-arrow { color: var(--text-soft); }
        .corr-symptom { color: var(--app-accent); font-weight: 500; }
        .corr-meta {
          font-size: 12px;
          color: var(--text-soft);
          margin-top: 3px;
        }
        .lift-badge {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 4px 9px;
          border-radius: var(--r-full);
          white-space: nowrap;
        }
        .lift-low    { background: var(--bg-sunken); color: var(--text-soft); }
        .lift-mild   { background: #ede4d0; color: #806527; }
        .lift-strong { background: #f4dcd3; color: #8e3d31; }
        .corr-footnote {
          margin: 14px 0 0;
          font-size: 12px;
          color: var(--text-soft);
          font-style: italic;
          line-height: 1.5;
        }
      `}</style>
    </div>
  )
}

function liftLevel(lift) {
  if (lift >= 2.0) return 'strong'
  if (lift >= 1.3) return 'mild'
  return 'low'
}
function liftLabel(lift) {
  if (lift >= 2.0) return 'Strong'
  if (lift >= 1.3) return 'Possible'
  return 'Weak'
}

// ====== PHASE BREAKDOWN ======
function PhaseBreakdown({ symptoms, periodStarts }) {
  // Count symptoms per phase based on the cycle_days table OR fallback to computing phase from occurred_at
  const phaseCounts = { menstrual: 0, follicular: 0, ovulation: 0, luteal: 0 }
  for (const ev of symptoms) {
    const dateStr = isoToLocalDateStr(ev.occurred_at)
    const phase = computePhaseForDate(dateStr, periodStarts)
    if (phase) phaseCounts[phase]++
  }
  const total = Object.values(phaseCounts).reduce((s, n) => s + n, 0)
  if (total === 0) {
    return (
      <div className="card">
        <div className="card-head">
          <h3 className="card-title section-h">Symptoms by phase</h3>
        </div>
        <div className="empty">No phase data yet.</div>
      </div>
    )
  }
  return (
    <div className="card">
      <div className="card-head">
        <h3 className="card-title section-h">Symptoms by phase</h3>
      </div>
      <div className="phase-bars">
        {Object.entries(phaseCounts).map(([phase, count]) => (
          <div key={phase} className="phase-row">
            <span className="phase-name">{PHASES[phase].label}</span>
            <div className="phase-track">
              <div
                className="phase-fill"
                style={{
                  width: `${(count / total) * 100}%`,
                  background: PHASES[phase].color,
                }}
              />
            </div>
            <span className="phase-count">{count}</span>
          </div>
        ))}
      </div>
      <style>{`
        .phase-bars { display: flex; flex-direction: column; gap: 10px; }
        .phase-row {
          display: grid;
          grid-template-columns: 90px 1fr 36px;
          gap: 10px;
          align-items: center;
        }
        .phase-name {
          font-size: 13px;
          color: var(--text-soft);
        }
        .phase-track {
          height: 10px;
          background: var(--bg-sunken);
          border-radius: var(--r-full);
          overflow: hidden;
        }
        .phase-fill {
          height: 100%;
          border-radius: var(--r-full);
        }
        .phase-count {
          font-size: 13px;
          color: var(--text-soft);
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
      `}</style>
    </div>
  )
}

// Lightweight phase computation (avoid importing from constants to keep this file self-contained)
function computePhaseForDate(dateStr, periodStarts) {
  if (!periodStarts || periodStarts.length === 0) return null
  const date = new Date(dateStr + 'T00:00:00')
  const sorted = [...periodStarts].sort()
  let lastStart = null
  for (const s of sorted) {
    const sd = new Date(s + 'T00:00:00')
    if (sd <= date) lastStart = sd
    else break
  }
  if (!lastStart) return null
  const dayOfCycle = Math.floor((date - lastStart) / 86400_000) + 1
  let cycleLength = 28
  if (sorted.length >= 2) {
    const gaps = []
    for (let i = 1; i < sorted.length; i++) {
      const a = new Date(sorted[i - 1] + 'T00:00:00')
      const b = new Date(sorted[i] + 'T00:00:00')
      gaps.push(Math.round((b - a) / 86400_000))
    }
    const recent = gaps.slice(-3)
    cycleLength = Math.round(recent.reduce((s, g) => s + g, 0) / recent.length)
    if (cycleLength < 21 || cycleLength > 40) cycleLength = 28
  }
  if (dayOfCycle > cycleLength + 5) return null
  if (dayOfCycle <= 5) return 'menstrual'
  if (dayOfCycle <= 13) return 'follicular'
  if (dayOfCycle <= 16) return 'ovulation'
  return 'luteal'
}
