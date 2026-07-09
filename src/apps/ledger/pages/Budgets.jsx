import { useState, useMemo } from 'react'
import { useRecords } from '../lib/useRecords'
import { usePeople } from '../lib/people'
import { fmt } from '../lib/format'
import { getPayCycle, formatCycleLabel, toISODate, resolvePersonAnchor } from '../lib/payCycle'
import { useIsDesktop } from '../../../lib/viewport'

export default function Budgets() {
  const [personView, setPersonView] = useState('both')
  const [manageOpen, setManageOpen] = useState(false)
  const isDesktop = useIsDesktop(1080)

  const { data: people } = usePeople()
  const { data: paychecks } = useRecords('paycheck')
  const { data: categories, update: updateCategory } = useRecords('category', { orderBy: 'sort_order', filter: (c) => !c.archived })
  const { data: budgets, insert: insertBudget, update: updateBudget } = useRecords('monthly_budget', { filter: (b) => b.period_type === 'cycle' })
  const { data: transactions } = useRecords('transaction')

  const tracked = useMemo(() => categories.filter((c) => c.tracked_in_budget), [categories])

  const personData = useMemo(() => {
    return people.map((person) => {
      const anchorISO = resolvePersonAnchor(person, paychecks)
      const rawCycle = anchorISO ? getPayCycle(anchorISO) : null
      const cycle = rawCycle ? { ...rawCycle, label: formatCycleLabel(rawCycle) } : null
      const rows = tracked.map((c) => {
        const budgetRow = budgets.find((b) => b.category_id === c.id && b.period_start === cycle?.startISO && b.person_id === person.id)
        const budgetAmt = Number(budgetRow?.amount || 0)
        const spent = cycle
          ? transactions.filter((t) => t.category_id === c.id && Number(t.amount) < 0 && t.date >= cycle.startISO && t.date < cycle.endISO && (t.person_id === person.id || t.person_id == null)).reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
          : 0
        const pct = budgetAmt > 0 ? Math.min(100, (spent / budgetAmt) * 100) : (spent > 0 ? 100 : 0)
        const over = budgetAmt > 0 && spent > budgetAmt
        return { ...c, budgetRow, budgetAmt, spent, pct, over, remaining: budgetAmt - spent }
      })
      const totals = { budget: rows.reduce((s, r) => s + r.budgetAmt, 0), spent: rows.reduce((s, r) => s + r.spent, 0) }
      return { person, cycle, rows, totals }
    })
  }, [people, paychecks, tracked, budgets, transactions])

  const setBudget = async (personId, categoryId, amount, existingId, cycleStartISO) => {
    if (!cycleStartISO) return
    if (existingId) await updateBudget(existingId, { amount })
    else await insertBudget({ category_id: categoryId, person_id: personId, period_start: cycleStartISO, period_type: 'cycle', amount })
  }

  const toggleTracked = async (categoryId, newValue) => { await updateCategory(categoryId, { tracked_in_budget: newValue }) }

  if (people.length === 0) {
    return (
      <div className="ledger-page" style={{ paddingTop: 'var(--sp-4)' }}>
        <p style={{ color: 'var(--text-soft)' }}>Loading members…</p>
      </div>
    )
  }

  const viewPeople = personView === 'both' ? personData : personData.filter(pd => pd.person.id === personView)
  const showBoth = personView === 'both' && isDesktop
  const anyCycle = personData[0]?.cycle

  const emptyState = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ width: 60, height: 60, borderRadius: 'var(--r-md)', background: 'color-mix(in srgb, var(--app-accent) 10%, var(--bg-elevated))', border: '1px solid color-mix(in srgb, var(--app-accent) 22%, var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7L12 2Z" stroke="var(--app-accent)" strokeWidth="1.7" strokeLinejoin="round"/></svg>
      </div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-xl)', color: 'var(--text)', margin: '0 0 8px' }}>No budget categories</h3>
      <p style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-base)', lineHeight: 1.6, margin: '0 0 24px', maxWidth: '36ch' }}>Click <strong>Manage categories</strong> to select categories to track per pay cycle.</p>
      <button onClick={() => setManageOpen(true)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 12, padding: '9px 18px', color: 'var(--app-accent)', fontFamily: 'inherit', fontSize: 'var(--fs-sm)', cursor: 'pointer' }}>Manage categories</button>
    </div>
  )

  return (
    <div className="ledger-page" style={{ paddingTop: isDesktop ? 'var(--sp-5)' : undefined }}>
      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Person pill tabs */}
        <div style={{ display: 'flex', background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: 12, padding: 3, gap: 2 }}>
          {people.map(p => (
            <button key={p.id} onClick={() => setPersonView(p.id)} style={{ padding: '7px 16px', borderRadius: 9, fontSize: 'var(--fs-sm)', border: 'none', cursor: 'pointer', background: personView === p.id ? 'var(--bg-elevated)' : 'transparent', color: personView === p.id ? 'var(--text)' : 'var(--text-soft)', fontWeight: personView === p.id ? 600 : 400, fontFamily: 'inherit' }}>
              {p.name}
            </button>
          ))}
          <button onClick={() => setPersonView('both')} style={{ padding: '7px 16px', borderRadius: 9, fontSize: 'var(--fs-sm)', border: 'none', cursor: 'pointer', background: personView === 'both' ? 'var(--bg-elevated)' : 'transparent', color: personView === 'both' ? 'var(--text)' : 'var(--text-soft)', fontWeight: personView === 'both' ? 600 : 400, fontFamily: 'inherit' }}>
            Both
          </button>
        </div>
        {anyCycle && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-soft)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px' }}>
            {anyCycle.label}
          </span>
        )}
        <span style={{ flex: 1 }} />
        <button onClick={() => setManageOpen(true)} style={{ background: 'var(--accent)', color: '#0B0F09', border: 'none', borderRadius: 12, padding: '10px 18px', fontFamily: 'inherit', fontWeight: 700, fontSize: 'var(--fs-sm)', cursor: 'pointer' }}>
          Add category budget
        </button>
      </div>

      {tracked.length === 0 ? emptyState : (
        <>
          <div className={showBoth ? undefined : undefined} style={{ display: showBoth ? 'grid' : 'flex', gridTemplateColumns: showBoth ? '1fr 1fr' : undefined, flexDirection: 'column', gap: 20 }}>
            {viewPeople.map(({ person, cycle, rows, totals }) => (
              <div key={person.id} style={{ background: 'var(--bg-paper)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px' }}>
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: person.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0B0F09', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0 }}>{person.name[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-base)' }}>{person.name}</div>
                    {cycle
                      ? <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-soft)' }}>{cycle.label} · {cycle.daysLeft}d left</div>
                      : <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-soft)' }}>No pay cycle</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xl)', fontWeight: 500, color: 'var(--app-accent)' }}>{fmt(totals.spent, { showCents: false })}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-soft)' }}>of {fmt(totals.budget, { showCents: false })}</div>
                  </div>
                </div>

                {!cycle && <p style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-sm)', textAlign: 'center', padding: '12px 0' }}>Set a pay cycle to see budgets.</p>}

                {cycle && rows.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {rows.map((r) => (
                      <div key={r.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ width: 9, height: 9, borderRadius: 2, background: r.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 500 }}>{r.name}</span>
                            {r.over && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--danger)' }}>⚠</span>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-soft)' }}>{fmt(r.spent, { showCents: false })} of</span>
                            <input
                              className="input mono"
                              type="number" step="any"
                              style={{ width: 80, padding: '4px 8px', fontSize: 'var(--fs-xs)', textAlign: 'right' }}
                              value={r.budgetAmt || ''}
                              placeholder="0"
                              onChange={(e) => setBudget(person.id, r.id, parseFloat(e.target.value) || 0, r.budgetRow?.id, cycle.startISO)}
                            />
                          </div>
                        </div>
                        <div style={{ height: 8, background: 'var(--bg-sunken)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${r.pct}%`, background: r.over ? 'var(--danger)' : r.color, borderRadius: 999 }} />
                        </div>
                        {r.over && <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3 }}>Over by {fmt(r.spent - r.budgetAmt, { showCents: false })}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button onClick={() => setManageOpen(true)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 12, padding: '9px 18px', color: 'var(--app-accent)', fontFamily: 'inherit', fontSize: 'var(--fs-sm)', cursor: 'pointer', display: 'inline-block' }}>Manage categories</button>
          </div>
        </>
      )}

      {manageOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setManageOpen(false)}>
          <div className="modal">
            <h2>Budget categories</h2>
            <p style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-sm)', marginBottom: '1rem' }}>Select categories to track per pay cycle.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '50vh', overflowY: 'auto' }}>
              {categories.map((c) => (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, cursor: 'pointer', background: c.tracked_in_budget ? 'color-mix(in srgb, var(--app-accent) 10%, transparent)' : 'transparent', minHeight: 44 }}>
                  <input type="checkbox" checked={!!c.tracked_in_budget} onChange={(e) => toggleTracked(c.id, e.target.checked)} />
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 500, flex: 1, fontSize: 'var(--fs-sm)' }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>{c.kind}</span>
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
