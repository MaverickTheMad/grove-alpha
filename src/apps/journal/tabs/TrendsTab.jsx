import { useEffect, useMemo, useState } from 'react'
import * as data from '../../../lib/data'
import { todayStr, addDays, daysBetween } from '../../../lib/time'
import { fmtDate } from '../../../lib/money'
import { EVENT_TYPES, avgCycleLength, nextPeriodEstimate } from '../constants'
import Icon from '../../../components/Icon'

const WINDOWS = [
  { id: 14, label: '14d' },
  { id: 30, label: '30d' },
  { id: 90, label: '90d' },
  { id: 0, label: 'All' },
]

export default function TrendsTab({ periodStarts }) {
  const [win, setWin] = useState(30)
  const [symptoms, setSymptoms] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const from = win === 0 ? '2000-01-01' : addDays(todayStr(), -win)
    data.list({ app: 'journal', type: EVENT_TYPES.symptom, from, to: todayStr() })
      .then(setSymptoms)
      .finally(() => setLoading(false))
  }, [win])

  const freq = useMemo(() => {
    const counts = {}
    const sevSum = {}
    for (const e of symptoms) {
      const s = e.data.symptom
      counts[s] = (counts[s] || 0) + 1
      sevSum[s] = (sevSum[s] || 0) + (e.data.severity || 0)
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, avgSev: (sevSum[name] / count).toFixed(1) }))
      .sort((a, b) => b.count - a.count)
  }, [symptoms])

  const maxCount = freq[0]?.count || 1
  const len = avgCycleLength(periodStarts)
  const lastStart = [...periodStarts].sort().pop()
  const daysSince = lastStart ? daysBetween(lastStart, todayStr()) : null
  const nextEst = nextPeriodEstimate(periodStarts)

  return (
    <main className="screen">
      <div className="page-head">
        <h1>Trends</h1>
        <p className="sub">Patterns over time</p>
      </div>

      <div className="row" style={{ gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
        {WINDOWS.map((w) => (
          <button key={w.id} className={`chip ${win === w.id ? 'on' : ''}`} onClick={() => setWin(w.id)}>{w.label}</button>
        ))}
      </div>

      <div className="card row" style={{ justifyContent: 'space-around', marginBottom: 'var(--sp-4)' }}>
        <Stat label="avg cycle" value={`${len}d`} />
        <Stat label="days since" value={daysSince ?? '—'} />
        <Stat label="next est." value={nextEst ? fmtDate(nextEst) : '—'} />
      </div>

      <div className="card">
        <div className="title" style={{ marginBottom: 'var(--sp-3)' }}>Symptom frequency</div>
        {loading ? (
          <p className="sub">Loading…</p>
        ) : freq.length === 0 ? (
          <p className="sub">No symptoms logged in this window.</p>
        ) : (
          freq.map((f) => (
            <div className="bar-row" key={f.name}>
              <span className="bar-label">{f.name}</span>
              <span className="bar-track"><span className="bar-fill" style={{ width: `${(f.count / maxCount) * 100}%` }} /></span>
              <span className="bar-count">{f.count}</span>
            </div>
          ))
        )}
        {freq.length > 0 && <p className="sub" style={{ marginTop: 'var(--sp-2)' }}>Bars show count; avg severity available per symptom.</p>}
      </div>

      <div className="scaffold-note" style={{ marginTop: 'var(--sp-4)' }}>
        <Icon name="info" size={16} /> Food→flare <strong>lift</strong> and symptoms-by-phase port from the
        real <code>TrendsTab</code> logic (§13 #5). Bars are correct for these discrete buckets (UI-POLISH §7).
      </div>
    </main>
  )
}

function Stat({ label, value }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="num" style={{ fontSize: 'var(--fs-lg)' }}>{value}</div>
      <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-soft)' }}>{label}</div>
    </div>
  )
}
