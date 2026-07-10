import { isoToLocalDateStr, todayStr, addDays, prettyDate } from '../constants'

function groupByDate(quests) {
  const groups = []
  const seen = {}
  for (const q of quests) {
    const day = isoToLocalDateStr(q.completed_at)
    if (!seen[day]) {
      seen[day] = { date: day, items: [] }
      groups.push(seen[day])
    }
    seen[day].items.push(q)
  }
  return groups
}

function formatDateLabel(dateStr) {
  const today = todayStr()
  const yesterday = addDays(today, -1)
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  return prettyDate(dateStr)
}

function formatTime(isoStr) {
  if (!isoStr) return ''
  return new Date(isoStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function LogTab({ ctx }) {
  const { completedQuests } = ctx
  const groups = groupByDate(completedQuests)

  return (
    <>
      <h1 className="q-title" style={{ marginBottom: 20 }}>Completed</h1>

      {groups.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: 16, textAlign: 'center', padding: '0 32px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--text-soft)' }}>✓</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--text)' }}>No history yet</div>
          <div style={{ color: 'var(--text-soft)', fontSize: 14 }}>Tasks you complete will appear here.</div>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.date} className="chronicle-section">
            <div className="chronicle-date">{formatDateLabel(group.date)}</div>
            {group.items.map((q) => (
              <div key={q.id} className="chronicle-item">
                <span className="chronicle-item-check">✓</span>
                <span className="chronicle-item-title">{q.title}</span>
                <span className="chronicle-item-time">{formatTime(q.completed_at)}</span>
              </div>
            ))}
          </section>
        ))
      )}
    </>
  )
}
