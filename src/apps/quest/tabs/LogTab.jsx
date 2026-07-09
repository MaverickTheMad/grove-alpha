import { isoToLocalDateStr, todayStr, addDays, prettyDate } from '../constants'

function groupByDate(quests) {
  // quests are already sorted newest-first by completed_at
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

export default function LogTab({ ctx }) {
  const { completedQuests } = ctx
  const groups = groupByDate(completedQuests)

  return (
    <>
      <div className="chronicle-intro">
        Every quest you complete gets written into the chronicle.
      </div>

      {groups.length === 0 ? (
        <div className="card">
          <p className="empty">No completed quests yet. Head to Hero and start your first.</p>
        </div>
      ) : (
        groups.map((group, gi) => (
          <section key={group.date} className="chronicle-section">
            <div className="chronicle-date">{formatDateLabel(group.date)}</div>
            <div className="card chronicle-card">
              {group.items.map((q, i) => (
                <div key={q.id} className={`chronicle-item${i < group.items.length - 1 ? '' : ' chronicle-item--last'}`}>
                  <div className="chronicle-item-body">
                    <span className="chronicle-item-title">{q.title}</span>
                    {q.category && <span className="chronicle-item-cat">{q.category}</span>}
                  </div>
                  <span className="chronicle-item-xp num">+{q.xp_reward ?? 10}</span>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </>
  )
}
