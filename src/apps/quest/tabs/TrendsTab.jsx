import { isoToLocalDateStr, todayStr, addDays, weekStart, prettyDate } from '../constants'

function BarRow({ label, value, max, sublabel }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="bar-row">
      <span className="bar-label">{label}</span>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="bar-val num">{value}</span>
    </div>
  )
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function TrendsTab({ ctx }) {
  const { completedQuests } = ctx
  const today = todayStr()
  const wk    = weekStart(today)

  // ── This week by day ───────────────────────────────────────────────────────
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(wk, i))
  const byDay = {}
  for (const q of completedQuests) {
    const d = isoToLocalDateStr(q.completed_at)
    byDay[d] = (byDay[d] || 0) + 1
  }
  const weekCounts = weekDays.map(d => ({ date: d, count: byDay[d] || 0 }))
  const maxWeekDay = Math.max(...weekCounts.map(d => d.count), 1)

  // ── Last 8 weeks ───────────────────────────────────────────────────────────
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = weekStart(addDays(wk, -7 * (7 - i)))
    return start
  })
  weeks.push(wk) // ensure current week is included
  const uniqueWeeks = [...new Set(weeks)].slice(-8)

  const byWeek = {}
  for (const q of completedQuests) {
    const d  = isoToLocalDateStr(q.completed_at)
    const ws = weekStart(d)
    byWeek[ws] = (byWeek[ws] || 0) + 1
  }
  const weekRows = uniqueWeeks.map(ws => ({ week: ws, count: byWeek[ws] || 0 }))
  const maxWeek = Math.max(...weekRows.map(r => r.count), 1)

  function weekLabel(ws) {
    if (ws === wk) return 'This week'
    if (ws === weekStart(addDays(wk, -7))) return 'Last week'
    return prettyDate(ws).replace(/\w+, /, '') // "Jun 2" style
  }

  // ── By category ───────────────────────────────────────────────────────────
  const byCat = {}
  for (const q of completedQuests) {
    const c = q.category || 'Uncategorized'
    byCat[c] = (byCat[c] || 0) + 1
  }
  const catRows = Object.entries(byCat).sort((a, b) => b[1] - a[1])
  const maxCat = Math.max(...catRows.map(r => r[1]), 1)

  const totalCompleted = completedQuests.length

  const thisWeekCount = weekCounts.reduce((s, d) => s + d.count, 0)

  return (
    <>
      <h1 className="q-title" style={{ marginBottom: 20 }}>Insight</h1>

      {totalCompleted === 0 ? (
        <div className="card">
          <p className="empty">No tasks completed yet.</p>
        </div>
      ) : (
        <>
          <div className="q-stat-card">
            <div className="q-stat-label">Tasks completed this week</div>
            <div className="q-stat-value">{thisWeekCount}</div>
          </div>

          <div className="card">
            <div className="card-title">This week <span className="card-title-meta">{thisWeekCount} tasks</span></div>
            {weekDays.map((d, i) => (
              <BarRow key={d} label={DAY_LABELS[i]} value={weekCounts[i].count} max={maxWeekDay} />
            ))}
          </div>

          <div className="card">
            <div className="card-title">Tasks by week</div>
            {weekRows.map(r => (
              <BarRow key={r.week} label={weekLabel(r.week)} value={r.count} max={maxWeek} />
            ))}
          </div>

          {catRows.length > 0 && (
            <div className="card">
              <div className="card-title">By category</div>
              {catRows.map(([cat, count]) => (
                <BarRow key={cat} label={cat} value={count} max={maxCat} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}
