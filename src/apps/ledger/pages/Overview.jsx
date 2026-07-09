import { useMemo } from 'react'
import { useRecords } from '../lib/useRecords'
import { usePeople } from '../lib/people'
import { fmt, daysUntil, ordinal } from '../lib/format'
import { getPayCycle, formatCycleLabel, resolvePersonAnchor, spendInCycleForPerson } from '../lib/payCycle'
import { useIsDesktop } from '../../../lib/viewport'

export default function Overview() {
  const isWide = useIsDesktop(1080)
  const { data: people } = usePeople()
  const { data: paychecks } = useRecords('paycheck')
  const { data: transactions } = useRecords('transaction', { orderBy: 'date', ascending: false })
  const { data: bills } = useRecords('bill', { filter: (b) => b.active !== false })
  const { data: goals } = useRecords('goal', { filter: (g) => !g.archived })

  const personCycles = useMemo(() => {
    return people.map((person) => {
      const anchorISO = resolvePersonAnchor(person, paychecks)
      const rawCycle = anchorISO ? getPayCycle(anchorISO) : null
      const cycle = rawCycle ? { ...rawCycle, label: formatCycleLabel(rawCycle) } : null

      // Income: paychecks tagged to this person
      const personPaychecks = paychecks.filter((p) => p.person_id === person.id)
      const income = personPaychecks.reduce((s, p) => {
        const perCycle =
          p.cadence === 'biweekly' ? Number(p.amount) :
          p.cadence === 'weekly' ? Number(p.amount) * 2 :
          p.cadence === 'semimonthly' ? Number(p.amount) * (14 / 15.2) :
          Number(p.amount) * (14 / 30.5)
        return s + perCycle
      }, 0)

      const spent = cycle
        ? spendInCycleForPerson(transactions, cycle.startISO, cycle.endISO, person.id)
        : 0

      return { person, cycle, income, spent, net: income - spent }
    })
  }, [people, paychecks, transactions])

  const upcoming = useMemo(() =>
    [...bills]
      .map((b) => ({ ...b, _days: daysUntil(b.due_day || 1) }))
      .sort((a, b) => a._days - b._days)
      .slice(0, 5),
    [bills]
  )

  const hasAnyData = transactions.length > 0 || bills.length > 0 || goals.length > 0

  if (!hasAnyData && people.length === 0) {
    return (
      <div className="ledger-page">
        <div className="page-header">
          <div><p className="eyebrow">Ledger</p><h1>Overview</h1></div>
        </div>
        <div className="card">
          <div className="empty">
            <div className="big">📊</div>
            <h3>Nothing logged yet</h3>
            <p>Add your first transaction and each person's cycle, bills, and goals fill in here.</p>
          </div>
        </div>
      </div>
    )
  }

  const personCards = (
    <div className="ov-person-col">
      {personCycles.map(({ person, cycle, income, spent, net }) => (
        <div key={person.id} className="card ov-person-card">
          <div className="ov-member-row">
            <span className="ov-avatar" style={{ background: person.color }}>{person.name[0]}</span>
            <div>
              <div className="ov-member-name">{person.name}</div>
              {cycle && <div className="ov-cycle-label">{cycle.label}</div>}
            </div>
          </div>

          <div className="ov-hero-net" style={{ color: net >= 0 ? 'var(--ok)' : 'var(--danger)' }}>
            {fmt(Math.abs(net), { showCents: false })}
          </div>
          <div className="ov-hero-label">Net {net < 0 ? '(over)' : ''}</div>

          <div className="ov-kpi-row">
            <div>
              <div className="ov-kpi-label">Income</div>
              <div className="ov-kpi-val">{fmt(income, { showCents: false })}</div>
            </div>
            <div>
              <div className="ov-kpi-label">Spent</div>
              <div className="ov-kpi-val">{fmt(spent, { showCents: false })}</div>
            </div>
          </div>

          {cycle
            ? <div className="ov-days-left">{cycle.daysLeft} day{cycle.daysLeft !== 1 ? 's' : ''} left in cycle</div>
            : <div className="ov-days-left">No pay cycle — add a paycheck in Settings</div>
          }
        </div>
      ))}
      {personCycles.length === 0 && (
        <div className="card">
          <div className="empty">
            <p>Members loading…</p>
          </div>
        </div>
      )}
    </div>
  )

  const billsAndGoals = (
    <div className="ov-right-col">
      <div className="card">
        <div className="card-head">
          <h3>Monthly bills</h3>
          <span className="eyebrow">Next 5</span>
        </div>
        {upcoming.length === 0 ? (
          <div className="empty"><p>No bills tracked yet — add recurring bills.</p></div>
        ) : (
          <table className="ledger">
            <tbody>
              {upcoming.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{b.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                      Due {ordinal(b.due_day || 1)}
                      {b.autopay && <span className="pill pill-auto" style={{ marginLeft: 8 }}>Autopay</span>}
                    </div>
                  </td>
                  <td className="num">{fmt(b.amount, { showCents: false })}</td>
                  <td style={{ width: 80, textAlign: 'right' }}>
                    <span className={b._days <= 3 ? 'pill pill-due' : 'pill'}>
                      {b._days === 0 ? 'Today' : `${b._days}d`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Goals</h3>
          <span className="eyebrow">{goals.length} active</span>
        </div>
        {goals.length === 0 ? (
          <div className="empty"><p>No active goals — add one to track savings targets.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {goals.slice(0, 5).map((g) => {
              const pct = g.target_amount
                ? Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100)
                : 0
              return (
                <div key={g.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                    <span style={{ fontWeight: 500 }}>{g.name}</span>
                    <span className="mono" style={{ color: 'var(--text-soft)', fontSize: 12 }}>
                      {fmt(g.current_amount, { showCents: false })} / {fmt(g.target_amount || 0, { showCents: false })}
                    </span>
                  </div>
                  <div className="progress">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: g.color || 'var(--app-accent)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="ledger-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Ledger</p>
          <h1>Overview</h1>
        </div>
      </div>

      {isWide ? (
        <div className="ov-two-col">
          {personCards}
          {billsAndGoals}
        </div>
      ) : (
        <>
          {personCards}
          {billsAndGoals}
        </>
      )}
    </div>
  )
}
