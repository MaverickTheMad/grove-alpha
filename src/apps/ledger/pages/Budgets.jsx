import { useState, useMemo } from 'react'
import { useRecords } from '../lib/useRecords'
import { fmt } from '../lib/format'
import { getPayCycle, formatCycleLabel, toISODate } from '../lib/payCycle'

// Single household budget, per 14-day pay cycle.
// monthly_budgets rows: period_type='cycle', person_id=null, period_start=<cycle start>.

const ANCHOR_KEY = 'pay_cycle_anchor_paycheck'

export default function Budgets() {
  const [offset, setOffset] = useState(0)
  const [manageOpen, setManageOpen] = useState(false)

  const { data: paychecks } = useRecords('paycheck')
  const { data: settings } = useRecords('app_setting')
  const { data: categories, update: updateCategory } = useRecords('category', {
    orderBy: 'sort_order', filter: (c) => !c.archived,
  })
  const { data: budgets, insert: insertBudget, update: updateBudget } = useRecords('monthly_budget', {
    filter: (b) => b.period_type === 'cycle',
  })
  const { data: transactions } = useRecords('transaction')

  const anchorISO = useMemo(() => {
    const row = settings.find((s) => s.key === ANCHOR_KEY)
    const v = row?.value
    const id = typeof v === 'string' ? v : (v?.id ?? null)
    if (id == null) return null
    const pc = paychecks.find((p) => p.id === id)
    return pc?.next_date || toISODate(new Date())
  }, [settings, paychecks])

  const cycle = useMemo(() => {
    if (!anchorISO) return null
    const c = getPayCycle(anchorISO, new Date(), offset)
    return { ...c, label: formatCycleLabel(c) }
  }, [anchorISO, offset])

  const tracked = useMemo(() => categories.filter((c) => c.tracked_in_budget), [categories])

  const rows = useMemo(() => {
    if (!cycle) return []
    return tracked.map((c) => {
      const budgetRow = budgets.find((b) => b.category_id === c.id && b.period_start === cycle.startISO && b.person_id == null)
      const budgetAmt = Number(budgetRow?.amount || 0)
      const spent = transactions
        .filter((t) => t.category_id === c.id && Number(t.amount) < 0 && t.date >= cycle.startISO && t.date < cycle.endISO)
        .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
      const pct = budgetAmt > 0 ? Math.min(100, (spent / budgetAmt) * 100) : (spent > 0 ? 100 : 0)
      const over = budgetAmt > 0 && spent > budgetAmt
      return { ...c, budgetRow, budgetAmt, spent, pct, over, remaining: budgetAmt - spent }
    })
  }, [tracked, budgets, transactions, cycle])

  const totals = useMemo(() => ({
    budget: rows.reduce((s, r) => s + r.budgetAmt, 0),
    spent: rows.reduce((s, r) => s + r.spent, 0),
  }), [rows])

  const setBudget = async (categoryId, amount, existingId) => {
    if (!cycle) return
    if (existingId) await updateBudget(existingId, { amount })
    else await insertBudget({ category_id: categoryId, person_id: null, period_start: cycle.startISO, period_type: 'cycle', amount })
  }
  const toggleTracked = async (categoryId, newValue) => {
    await updateCategory(categoryId, { tracked_in_budget: newValue })
  }

  if (!cycle) return <div className="ledger-page"><div className="empty"><p>Loading…</p></div></div>

  return (
    <div className="ledger-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Pay cycle</p>
          <h1>Budgets</h1>
          <p>{cycle.label} · {cycle.daysLeft} day{cycle.daysLeft !== 1 ? 's' : ''} left</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setOffset(offset - 1)}>← Prev</button>
          {offset !== 0 && <button className="btn btn-ghost btn-sm" onClick={() => setOffset(0)}>Today</button>}
          <button className="btn btn-ghost btn-sm" onClick={() => setOffset(offset + 1)}>Next →</button>
          <button className="btn btn-sm" onClick={() => setManageOpen(true)}>Manage</button>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total budgeted</div>
          <div className="stat-value">{fmt(totals.budget, { showCents: false })}</div>
          <div className="stat-sub">For this cycle</div>
        </div>
        <div className="stat-card warm">
          <div className="stat-label">Spent</div>
          <div className="stat-value">{fmt(totals.spent, { showCents: false })}</div>
          <div className="stat-sub">{totals.budget > 0 ? `${Math.round((totals.spent / totals.budget) * 100)}% of plan` : ''}</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-label">Remaining</div>
          <div className="stat-value">{fmt(totals.budget - totals.spent, { showCents: false })}</div>
          <div className="stat-sub">{cycle.daysLeft > 0 ? `${fmt((totals.budget - totals.spent) / Math.max(1, cycle.daysLeft), { showCents: false })} / day` : 'Cycle ended'}</div>
        </div>
      </div>

      <div className="card">
        {rows.length === 0 ? (
          <div className="empty">
            <h3>No categories tracked</h3>
            <p>Click <strong>Manage</strong> above to pick categories to track on this page.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {rows.map((r) => (
              <div key={r.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="dot" style={{ background: r.color }}></span>
                    <span style={{ fontWeight: 500 }}>{r.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="mono" style={{ fontSize: 13, color: 'var(--ink-muted)' }}>{fmt(r.spent, { showCents: false })} of</span>
                    <input className="input mono" type="number" step="any"
                      style={{ width: 100, padding: '0.3rem 0.5rem', fontSize: 13, textAlign: 'right' }}
                      value={r.budgetAmt || ''} placeholder="0"
                      onChange={(e) => setBudget(r.id, parseFloat(e.target.value) || 0, r.budgetRow?.id)} />
                  </div>
                </div>
                <div className="progress">
                  <div className={'progress-fill' + (r.over ? ' over' : '')} style={{ width: `${r.pct}%`, background: r.over ? 'var(--negative)' : r.color }} />
                </div>
                {r.over && <div style={{ fontSize: 11, color: 'var(--negative)', marginTop: 4 }}>Over by {fmt(r.spent - r.budgetAmt, { showCents: false })}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {manageOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setManageOpen(false)}>
          <div className="modal">
            <h2>Manage budget categories</h2>
            <p style={{ color: 'var(--ink-muted)', fontSize: 13, marginBottom: '1rem' }}>
              Tick the categories you want to track on this page. Untick the ones you don't.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '50vh', overflowY: 'auto' }}>
              {categories.map((c) => (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: c.tracked_in_budget ? 'var(--accent-soft)' : 'transparent' }}>
                  <input type="checkbox" checked={!!c.tracked_in_budget} onChange={(e) => toggleTracked(c.id, e.target.checked)} />
                  <span className="dot" style={{ background: c.color }}></span>
                  <span style={{ fontWeight: 500, flex: 1 }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{c.kind}</span>
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setManageOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
