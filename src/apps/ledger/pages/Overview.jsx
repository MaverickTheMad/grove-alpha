import { useMemo } from 'react'
import { useRecords } from '../lib/useRecords'
import { fmt, ordinal, daysUntil } from '../lib/format'
import { getPayCycle, formatCycleLabel, toISODate } from '../lib/payCycle'

const ANCHOR_KEY = 'pay_cycle_anchor_paycheck'

export default function Overview() {
  const { data: bills } = useRecords('bill', { filter: (b) => b.active !== false })
  const { data: paychecks } = useRecords('paycheck')
  const { data: transactions } = useRecords('transaction', { orderBy: 'date', ascending: false })
  const { data: goals } = useRecords('goal', { filter: (g) => !g.archived })
  const { data: settings } = useRecords('app_setting')

  const anchorPaycheckId = useMemo(() => {
    const row = settings.find((s) => s.key === ANCHOR_KEY)
    const v = row?.value
    return typeof v === 'string' ? v : (v?.id ?? null)
  }, [settings])

  const anchorISO = useMemo(() => {
    if (anchorPaycheckId == null) return null
    const pc = paychecks.find((p) => p.id === anchorPaycheckId)
    return pc?.next_date || toISODate(new Date())
  }, [anchorPaycheckId, paychecks])

  const cycle = useMemo(() => anchorISO
    ? { ...getPayCycle(anchorISO), label: formatCycleLabel(getPayCycle(anchorISO)) }
    : null, [anchorISO])

  const totals = useMemo(() => {
    const monthlyIncome = paychecks.reduce((s, p) => {
      const m = p.cadence === 'biweekly' ? 26 / 12 : p.cadence === 'weekly' ? 52 / 12 : p.cadence === 'semimonthly' ? 2 : 1
      return s + Number(p.amount) * m
    }, 0)
    const cycleIncome = paychecks.reduce((s, p) => {
      const perCycle = p.cadence === 'biweekly' ? Number(p.amount)
        : p.cadence === 'weekly' ? Number(p.amount) * 2
        : p.cadence === 'semimonthly' ? Number(p.amount) * (14 / 15.2)
        : Number(p.amount) * (14 / 30.5)
      return s + perCycle
    }, 0)
    const monthlyBills = bills.reduce((s, b) => s + Number(b.amount), 0)
    const cycleTx = cycle ? transactions.filter((t) => t.date >= cycle.startISO && t.date < cycle.endISO) : []
    const spentThisCycle = cycleTx.filter((t) => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
    return { monthlyIncome, cycleIncome, monthlyBills, spentThisCycle, leftover: cycleIncome - (monthlyBills / 2) }
  }, [paychecks, bills, transactions, cycle])

  const upcoming = useMemo(() =>
    [...bills].map((b) => ({ ...b, _days: daysUntil(b.due_day || 1) })).sort((a, b) => a._days - b._days).slice(0, 5),
    [bills])

  return (
    <div className="ledger-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">{cycle ? cycle.label : 'Today'}</p>
          <h1>Where we stand</h1>
          {cycle && <p>{cycle.daysLeft} day{cycle.daysLeft !== 1 ? 's' : ''} left in this cycle</p>}
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card accent">
          <div className="stat-label">Cycle income</div>
          <div className="stat-value">{fmt(totals.cycleIncome, { showCents: false })}</div>
          <div className="stat-sub">{fmt(totals.monthlyIncome, { showCents: false })}/mo</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Bills (monthly)</div>
          <div className="stat-value">{fmt(totals.monthlyBills, { showCents: false })}</div>
          <div className="stat-sub">{bills.length} recurring</div>
        </div>
        <div className="stat-card warm">
          <div className="stat-label">Spent this cycle</div>
          <div className="stat-value">{fmt(totals.spentThisCycle, { showCents: false })}</div>
        </div>
        <div className="stat-card rose">
          <div className="stat-label">Left after bills</div>
          <div className="stat-value">{fmt(totals.leftover, { showCents: false })}</div>
          <div className="stat-sub">Per cycle estimate</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head"><h3>Upcoming bills</h3><span className="eyebrow">Next 5</span></div>
          {upcoming.length === 0 ? (
            <div className="empty"><p>No bills tracked yet.</p></div>
          ) : (
            <table className="ledger">
              <tbody>
                {upcoming.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{b.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                        Due {ordinal(b.due_day || 1)}
                        {b.autopay && <span className="pill pill-auto" style={{ marginLeft: 8 }}>Autopay</span>}
                      </div>
                    </td>
                    <td className="num">{fmt(b.amount, { showCents: false })}</td>
                    <td style={{ width: 80, textAlign: 'right' }}>
                      <span className={b._days <= 3 ? 'pill pill-due' : 'pill'}>{b._days === 0 ? 'Today' : `${b._days}d`}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-head"><h3>Goals</h3><span className="eyebrow">{goals.length} active</span></div>
          {goals.length === 0 ? (
            <div className="empty"><p>Create goals to start saving toward something.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {goals.slice(0, 5).map((g) => {
                const pct = g.target_amount ? Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100) : 0
                return (
                  <div key={g.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                      <span style={{ fontWeight: 500 }}>{g.name}</span>
                      <span className="mono" style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
                        {fmt(g.current_amount, { showCents: false })} / {fmt(g.target_amount || 0, { showCents: false })}
                      </span>
                    </div>
                    <div className="progress"><div className="progress-fill gold" style={{ width: `${pct}%` }} /></div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
