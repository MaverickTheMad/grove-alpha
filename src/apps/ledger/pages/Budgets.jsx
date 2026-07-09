import { useState, useMemo } from 'react'
import { useRecords } from '../lib/useRecords'
import { usePeople } from '../lib/people'
import { fmt } from '../lib/format'
import { getPayCycle, formatCycleLabel, toISODate, resolvePersonAnchor } from '../lib/payCycle'
import { useIsDesktop } from '../../../lib/viewport'

export default function Budgets() {
  const [personView, setPersonView] = useState('both') // person.id | 'both'
  const [manageOpen, setManageOpen] = useState(false)
  const isDesktop = useIsDesktop(1080)

  const { data: people } = usePeople()
  const { data: paychecks } = useRecords('paycheck')
  const { data: categories, update: updateCategory } = useRecords('category', {
    orderBy: 'sort_order', filter: (c) => !c.archived,
  })
  const { data: budgets, insert: insertBudget, update: updateBudget } = useRecords('monthly_budget', {
    filter: (b) => b.period_type === 'cycle',
  })
  const { data: transactions } = useRecords('transaction')

  const tracked = useMemo(() => categories.filter((c) => c.tracked_in_budget), [categories])

  const personData = useMemo(() => {
    return people.map((person) => {
      const anchorISO = resolvePersonAnchor(person, paychecks)
      const rawCycle = anchorISO ? getPayCycle(anchorISO) : null
      const cycle = rawCycle ? { ...rawCycle, label: formatCycleLabel(rawCycle) } : null

      const rows = tracked.map((c) => {
        const budgetRow = budgets.find(
          (b) => b.category_id === c.id && b.period_start === cycle?.startISO && b.person_id === person.id
        )
        const budgetAmt = Number(budgetRow?.amount || 0)
        const spent = cycle
          ? transactions
              .filter((t) => t.category_id === c.id && Number(t.amount) < 0 && t.date >= cycle.startISO && t.date < cycle.endISO && (t.person_id === person.id || t.person_id == null))
              .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
          : 0
        const pct = budgetAmt > 0 ? Math.min(100, (spent / budgetAmt) * 100) : (spent > 0 ? 100 : 0)
        const over = budgetAmt > 0 && spent > budgetAmt
        return { ...c, budgetRow, budgetAmt, spent, pct, over, remaining: budgetAmt - spent }
      })

      const totals = {
        budget: rows.reduce((s, r) => s + r.budgetAmt, 0),
        spent: rows.reduce((s, r) => s + r.spent, 0),
      }

      return { person, cycle, rows, totals }
    })
  }, [people, paychecks, tracked, budgets, transactions])

  const setBudget = async (personId, categoryId, amount, existingId, cycleStartISO) => {
    if (!cycleStartISO) return
    if (existingId) await updateBudget(existingId, { amount })
    else await insertBudget({ category_id: categoryId, person_id: personId, period_start: cycleStartISO, period_type: 'cycle', amount })
  }

  const toggleTracked = async (categoryId, newValue) => {
    await updateCategory(categoryId, { tracked_in_budget: newValue })
  }

  if (people.length === 0) {
    return (
      <div className="ledger-page">
        <div className="page-header"><div><p className="eyebrow">Pay cycle</p><h1>Budgets</h1></div></div>
        <div className="card"><div className="empty"><p>Loading members…</p></div></div>
      </div>
    )
  }

  const viewPeople = personView === 'both' ? personData : personData.filter(pd => pd.person.id === personView)
  const showBoth = personView === 'both' && isDesktop

  return (
    <div className="ledger-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Pay cycle</p>
          <h1>Budgets</h1>
          {personData[0]?.cycle && <p>{personData[0].cycle.label}</p>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
          <div className="seg">
            {people.map(p => (
              <button
                key={p.id}
                className={'seg-btn' + (personView === p.id ? ' active' : '')}
                onClick={() => setPersonView(p.id)}
              >
                <span className="dot" style={{ background: p.color, width: 8, height: 8 }}></span>
                {p.name}
              </button>
            ))}
            <button className={'seg-btn' + (personView === 'both' ? ' active' : '')} onClick={() => setPersonView('both')}>Both</button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setManageOpen(true)}>Manage</button>
        </div>
      </div>

      {tracked.length === 0 ? (
        <div className="card">
          <div className="empty">
            <h3>No categories tracked</h3>
            <p>Click <strong>Manage</strong> to pick categories to track on this page.</p>
          </div>
        </div>
      ) : (
        <div className={showBoth ? 'grid-2' : undefined}>
          {viewPeople.map(({ person, cycle, rows, totals }) => (
            <div key={person.id}>
              <div className="card" style={{ marginBottom: 'var(--sp-3)', borderTop: `3px solid ${person.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
                  <span className="bud-avatar" style={{ background: person.color }}>{person.name[0]}</span>
                  <div>
                    <div style={{ fontWeight: 'var(--fw-title)', fontSize: 'var(--fs-base)' }}>{person.name}</div>
                    {cycle
                      ? <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-soft)' }}>{cycle.label} · {cycle.daysLeft}d left</div>
                      : <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-soft)' }}>No pay cycle — add paycheck in Settings</div>}
                  </div>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div className="mono" style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-med)' }}>{fmt(totals.spent, { showCents: false })}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-soft)' }}>of {fmt(totals.budget, { showCents: false })}</div>
                  </div>
                </div>

                {!cycle && (
                  <div className="empty" style={{ padding: 'var(--sp-4) 0' }}>
                    <p>Set a pay cycle to see budgets.</p>
                  </div>
                )}

                {cycle && rows.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                    {rows.map((r) => (
                      <div key={r.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="dot" style={{ background: r.color }}></span>
                            <span style={{ fontWeight: 500 }}>{r.name}</span>
                            {r.over && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--danger)' }}>⚠ over</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="mono" style={{ fontSize: 13, color: 'var(--ink-muted)' }}>{fmt(r.spent, { showCents: false })} of</span>
                            <input
                              className="input mono"
                              type="number"
                              step="any"
                              style={{ width: 90, padding: '0.3rem 0.5rem', fontSize: 13, textAlign: 'right' }}
                              value={r.budgetAmt || ''}
                              placeholder="0"
                              onChange={(e) => setBudget(person.id, r.id, parseFloat(e.target.value) || 0, r.budgetRow?.id, cycle.startISO)}
                            />
                          </div>
                        </div>
                        <div className="progress">
                          <div
                            className={'progress-fill' + (r.over ? ' over' : '')}
                            style={{ width: `${r.pct}%`, background: r.over ? 'var(--danger)' : r.color }}
                          />
                        </div>
                        {r.over && (
                          <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>
                            Over by {fmt(r.spent - r.budgetAmt, { showCents: false })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {manageOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setManageOpen(false)}>
          <div className="modal">
            <h2>Manage budget categories</h2>
            <p style={{ color: 'var(--ink-muted)', fontSize: 13, marginBottom: '1rem' }}>
              Select the categories to track on this page.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '50vh', overflowY: 'auto' }}>
              {categories.map((c) => (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: c.tracked_in_budget ? 'var(--accent-soft)' : 'transparent', minHeight: 44 }}>
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
