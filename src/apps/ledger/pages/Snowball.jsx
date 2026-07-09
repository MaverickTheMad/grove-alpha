import { useState, useMemo } from 'react'
import { useRecords } from '../lib/useRecords'
import { fmt, monthShort } from '../lib/format'
import { projectSnowball } from '../lib/snowball'
import { useIsDesktop } from '../../../lib/viewport'

const blankDebt = (nextOrder) => ({
  name: '',
  starting_balance: 0,
  current_balance: 0,
  apr: 0,
  min_payment: 0,
  snowball_payment: 0,
  payoff_order: nextOrder,
  paid_off: false,
  _aprPercent: ''
})

export default function Snowball() {
  const { data: debts, insert, update, remove } = useRecords('debt', { orderBy: 'payoff_order' })
  const { data: accounts } = useRecords('account', { orderBy: 'name' })
  const [view, setView] = useState('summary')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const isDesktop = useIsDesktop(720)

  const activeDebts = useMemo(() => debts.filter(d => !d.paid_off), [debts])
  const projection = useMemo(() => projectSnowball(debts), [debts])

  const totals = useMemo(() => ({
    balance: activeDebts.reduce((s, d) => s + Number(d.current_balance), 0),
    monthly: activeDebts.reduce((s, d) => s + (Number(d.snowball_payment) || Number(d.min_payment) || 0), 0),
    monthsToFree: projection.months.length,
    payoffDate: projection.months[projection.months.length - 1]?.date
  }), [activeDebts, projection])

  const totalInterest = useMemo(() =>
    projection.months.reduce((s, m) => s + Object.values(m.debts).reduce((ss, d) => ss + d.interest, 0), 0),
    [projection]
  )

  const openNew = () => {
    const nextOrder = Math.max(0, ...debts.map(d => Number(d.payoff_order) || 0)) + 1
    setEditing(blankDebt(nextOrder)); setModalOpen(true)
  }
  const openEdit = (d) => { setEditing({ ...d, _aprPercent: (Number(d.apr) * 100).toFixed(2) }); setModalOpen(true) }

  const handleSave = async () => {
    const aprDecimal = (parseFloat(editing._aprPercent) || 0) / 100
    const snowballPayment = editing.snowball_payment !== '' && editing.snowball_payment != null
      ? Number(editing.snowball_payment) : Number(editing.min_payment) || 0
    const payoffOrder = editing.payoff_order !== '' && editing.payoff_order != null
      ? Number(editing.payoff_order) : 99
    const payload = {
      name: editing.name,
      starting_balance: Number(editing.starting_balance) || Number(editing.current_balance) || 0,
      current_balance: Number(editing.current_balance) || 0,
      apr: aprDecimal,
      min_payment: Number(editing.min_payment) || 0,
      snowball_payment: snowballPayment,
      payoff_order: payoffOrder,
      paid_off: !!editing.paid_off,
      account_id: editing.account_id || null
    }
    if (editing.id) await update(editing.id, payload)
    else await insert(payload)
    setModalOpen(false); setEditing(null)
  }

  const handleDelete = async () => {
    if (!editing?.id) return
    if (!confirm(`Delete "${editing.name}"? Payment history will be deleted too.`)) return
    await remove(editing.id)
    setModalOpen(false); setEditing(null)
  }

  const sortedDebts = useMemo(() =>
    [...debts].sort((a, b) => (Number(a.payoff_order) || 99) - (Number(b.payoff_order) || 99)),
    [debts]
  )

  return (
    <div className="ledger-page" style={{ paddingTop: 'var(--sp-5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-xl)', color: 'var(--text)', margin: 0, flex: 1 }}>Snowball</h2>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: 999, padding: 4 }}>
          {['summary', 'schedule'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--fs-sm)', background: view === v ? 'var(--bg-elevated)' : 'transparent', color: view === v ? 'var(--text)' : 'var(--text-soft)', fontWeight: view === v ? 600 : 400 }}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={openNew} style={{ background: 'var(--accent)', color: '#0B0F09', border: 'none', borderRadius: 12, padding: '10px 18px', fontFamily: 'inherit', fontWeight: 700, fontSize: 'var(--fs-sm)', cursor: 'pointer' }}>Add debt</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        {[{ label: 'Total balance', value: fmt(totals.balance, { showCents: false }), color: 'var(--text)' }, { label: 'Monthly payment', value: fmt(totals.monthly, { showCents: false }), color: 'var(--text)' }, { label: 'Total interest', value: fmt(totalInterest, { showCents: false }), color: 'var(--warn)' }, { label: 'Debt-free in', value: `${totals.monthsToFree} mo`, color: 'var(--app-accent)' }].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--bg-paper)', border: '1px solid var(--border)', borderRadius: 16, padding: '15px 17px' }}>
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-soft)', marginBottom: 6 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xl)', fontWeight: 500, color }}>{value}</div>
          </div>
        ))}
      </div>

      {view === 'summary' && (
        debts.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 24px', background: 'var(--bg-paper)', border: '1px solid var(--border)', borderRadius: 16 }}>
            <div style={{ width: 60, height: 60, borderRadius: 'var(--r-md)', background: 'color-mix(in srgb, var(--app-accent) 10%, var(--bg-elevated))', border: '1px solid color-mix(in srgb, var(--app-accent) 22%, var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 4v16M4 8l8-4 8 4" stroke="var(--app-accent)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-xl)', color: 'var(--text)', margin: '0 0 8px' }}>No debts yet</h3>
            <p style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-base)', lineHeight: 1.6, margin: '0 0 24px', maxWidth: '40ch' }}>Add your first debt to start the snowball — smallest balance first, payment cascades as each clears.</p>
            <button onClick={openNew} style={{ background: 'var(--accent)', color: '#0B0F09', border: 'none', borderRadius: 12, padding: '13px 22px', fontFamily: 'inherit', fontWeight: 600, fontSize: 'var(--fs-base)', cursor: 'pointer' }}>Add a debt</button>
          </div>
        ) : isDesktop ? (
          <div style={{ background: 'var(--bg-paper)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 120px 80px 120px 100px 60px', padding: '12px 18px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>
              <div>#</div><div>Debt</div><div style={{ textAlign: 'right' }}>Balance</div><div style={{ textAlign: 'right' }}>APR</div><div style={{ textAlign: 'right' }}>Payment</div><div>Status</div><div></div>
            </div>
            {sortedDebts.map(d => (
              <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 120px 80px 120px 100px 60px', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border)', opacity: d.paid_off ? 0.5 : 1 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', color: 'var(--text-soft)' }}>{d.payoff_order}</span>
                <span style={{ fontWeight: 500, fontSize: 'var(--fs-base)' }}>{d.name}</span>
                <span style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{fmt(d.current_balance, { showCents: false })}</span>
                <span style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', color: 'var(--text-soft)' }}>{(Number(d.apr) * 100).toFixed(2)}%</span>
                <span style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', color: 'var(--app-accent)' }}>{fmt(Number(d.snowball_payment) || Number(d.min_payment) || 0, { showCents: false })}</span>
                <span style={{ fontSize: 'var(--fs-xs)', color: d.paid_off ? 'var(--ok)' : 'var(--text-soft)' }}>{d.paid_off ? '✓ Paid off' : 'Active'}</span>
                <div style={{ textAlign: 'right' }}>
                  <button className="icon-btn" onClick={() => openEdit(d)}>&#9998;</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sortedDebts.map(d => (
              <div key={d.id} style={{ background: 'var(--bg-paper)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px', opacity: d.paid_off ? 0.55 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 'var(--fw-title)', fontSize: 'var(--fs-base)' }}>{d.name}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-soft)', marginTop: 2 }}>
                      {(Number(d.apr) * 100).toFixed(2)}% APR · min {fmt(Number(d.min_payment) || 0, { showCents: false })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-med)' }}>{fmt(d.current_balance, { showCents: false })}</div>
                    {d.paid_off
                      ? <span className="pill pill-paid" style={{ marginTop: 4 }}>Paid off</span>
                      : <span className="pill" style={{ marginTop: 4 }}>#{d.payoff_order}</span>}
                  </div>
                </div>
                <button className="icon-btn" style={{ marginTop: 8 }} onClick={() => openEdit(d)}>✎ Edit</button>
              </div>
            ))}
          </div>
        )
      )}

      {view === 'schedule' && (
        <>
          <div className="card" style={{ padding: 'var(--sp-3) var(--sp-4)', background: 'var(--bg-elevated)', borderColor: 'var(--border)', marginBottom: 'var(--sp-3)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <span style={{ fontSize: '1rem' }}>⚠</span>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-soft)' }}>
              <strong style={{ color: 'var(--text)' }}>Estimate.</strong> Projected payoff based on current balances and payments. Actual timing will vary.
            </span>
          </div>
          {activeDebts.length === 0 ? (
            <div className="card"><div className="empty"><h3>No active debts</h3><p>Add a debt to see the projected payoff schedule.</p></div></div>
          ) : isDesktop ? (
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="ledger" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th>Month</th>
                    {activeDebts.map(d => <th key={d.id} style={{ textAlign: 'right' }}>{d.name}</th>)}
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {projection.months.slice(0, 36).map((m, i) => (
                    <tr key={`${m.date.getTime()}-${i}`}>
                      <td className="mono" style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                        {monthShort(m.date.getMonth() + 1)} {String(m.date.getFullYear()).slice(2)}
                      </td>
                      {activeDebts.map(d => {
                        const row = m.debts[d.id]
                        if (!row) return <td key={d.id} className="num" style={{ color: 'var(--ink-faint)' }}>—</td>
                        return (
                          <td key={d.id} className="num" style={{ color: row.cleared ? 'var(--positive)' : 'inherit' }}>
                            {fmt(row.balance, { showCents: false })}
                            {row.cleared && row.balance === 0 && i < projection.months.length - 1 && row.payment > 0 && <div style={{ fontSize: 10, color: 'var(--positive)' }}>✓ cleared</div>}
                          </td>
                        )
                      })}
                      <td className="num" style={{ fontWeight: 500 }}>{fmt(m.totalBalance, { showCents: false })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {projection.months.length > 36 && (
                <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: 12, color: 'var(--ink-muted)' }}>
                  Showing first 36 months · payoff in month {projection.months.length}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              {projection.months.slice(0, 24).map((m, i) => (
                <div key={`${m.date.getTime()}-${i}`} className="card">
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', color: 'var(--text-soft)', marginBottom: 'var(--sp-2)' }}>
                    {monthShort(m.date.getMonth() + 1)} {m.date.getFullYear()}
                  </div>
                  {activeDebts.map(d => {
                    const row = m.debts[d.id]
                    if (!row) return null
                    return (
                      <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-sm)', padding: '2px 0' }}>
                        <span style={{ color: 'var(--text-soft)' }}>{d.name}</span>
                        <span className="mono" style={{ color: row.cleared ? 'var(--ok)' : 'inherit' }}>
                          {row.cleared ? '✓ cleared' : fmt(row.balance, { showCents: false })}
                        </span>
                      </div>
                    )
                  })}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'var(--fw-med)', marginTop: 'var(--sp-2)', paddingTop: 'var(--sp-2)', borderTop: '1px solid var(--border)' }}>
                    <span>Total</span>
                    <span className="mono">{fmt(m.totalBalance, { showCents: false })}</span>
                  </div>
                </div>
              ))}
              {projection.months.length > 24 && (
                <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-soft)', padding: 'var(--sp-3)' }}>
                  Showing first 24 months · payoff in month {projection.months.length}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {modalOpen && editing && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <h2>{editing.id ? 'Edit debt' : 'New debt'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="field">
                <label>Name</label>
                <input className="input" value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Capital One CC, Subaru Loan, etc." autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Current balance</label>
                  <input className="input mono" type="number" step="0.01" value={editing.current_balance ?? ''} onChange={(e) => setEditing({ ...editing, current_balance: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="field">
                  <label>APR (%)</label>
                  <input className="input mono" type="number" step="0.01" value={editing._aprPercent ?? ''} onChange={(e) => setEditing({ ...editing, _aprPercent: e.target.value })} placeholder="27.99" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Minimum payment</label>
                  <input className="input mono" type="number" step="0.01" value={editing.min_payment ?? ''} onChange={(e) => setEditing({ ...editing, min_payment: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="field">
                  <label>Snowball payment</label>
                  <input className="input mono" type="number" step="0.01" value={editing.snowball_payment ?? ''} onChange={(e) => setEditing({ ...editing, snowball_payment: parseFloat(e.target.value) || 0 })} placeholder="Defaults to min" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Payoff order</label>
                  <input className="input mono" type="number" min="1" value={editing.payoff_order ?? 1} onChange={(e) => setEditing({ ...editing, payoff_order: parseInt(e.target.value) || 1 })} />
                </div>
                <div className="field">
                  <label>Account</label>
                  <select className="select" value={editing.account_id || ''} onChange={(e) => setEditing({ ...editing, account_id: e.target.value || null })}>
                    <option value="">— None —</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <input type="checkbox" checked={editing.paid_off || false} onChange={(e) => setEditing({ ...editing, paid_off: e.target.checked })} />
                Mark as paid off
              </label>
            </div>
            <div className="modal-actions">
              {editing.id && <button className="btn btn-ghost" style={{ marginRight: 'auto', color: 'var(--negative)' }} onClick={handleDelete}>Delete</button>}
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn" onClick={handleSave} disabled={!editing.name?.trim()}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
