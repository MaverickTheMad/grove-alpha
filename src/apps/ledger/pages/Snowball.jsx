import { useState, useMemo } from 'react'
import { useRecords } from '../lib/useRecords'
import { fmt, monthShort } from '../lib/format'
import { projectSnowball } from '../lib/snowball'

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
  const { data: accounts } = useRecords('account')
  const [view, setView] = useState('summary')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  // Memoize activeDebts so the schedule's column list has a stable reference
  // and useMemo deps don't churn every render.
  const activeDebts = useMemo(() => debts.filter(d => !d.paid_off), [debts])
  const projection = useMemo(() => projectSnowball(debts), [debts])

  const totals = useMemo(() => ({
    balance: activeDebts.reduce((s, d) => s + Number(d.current_balance), 0),
    monthly: activeDebts.reduce((s, d) =>
      s + (Number(d.snowball_payment) || Number(d.min_payment) || 0), 0),
    monthsToFree: projection.months.length,
    payoffDate: projection.months[projection.months.length - 1]?.date
  }), [activeDebts, projection])

  const totalInterest = useMemo(() =>
    projection.months.reduce((s, m) =>
      s + Object.values(m.debts).reduce((ss, d) => ss + d.interest, 0), 0
    ),
    [projection]
  )

  const openNew = () => {
    const nextOrder = Math.max(0, ...debts.map(d => Number(d.payoff_order) || 0)) + 1
    setEditing(blankDebt(nextOrder))
    setModalOpen(true)
  }
  const openEdit = (d) => {
    setEditing({ ...d, _aprPercent: (Number(d.apr) * 100).toFixed(2) })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const aprDecimal = (parseFloat(editing._aprPercent) || 0) / 100
    const snowballPayment = editing.snowball_payment !== '' && editing.snowball_payment != null
      ? Number(editing.snowball_payment)
      : Number(editing.min_payment) || 0
    const payoffOrder = editing.payoff_order !== '' && editing.payoff_order != null
      ? Number(editing.payoff_order)
      : 99
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
    setModalOpen(false)
    setEditing(null)
  }

  const handleDelete = async () => {
    if (!editing?.id) return
    if (!confirm(`Delete "${editing.name}"? Payment history will be deleted too.`)) return
    await remove(editing.id)
    setModalOpen(false)
    setEditing(null)
  }

  return (
    <div className="ledger-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Debt payoff</p>
          <h1>Snowball</h1>
          <p>Smallest balance first. As each clears, its payment cascades to the next.</p>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className={'btn btn-sm ' + (view === 'summary' ? '' : 'btn-ghost')} onClick={() => setView('summary')}>Summary</button>
          <button className={'btn btn-sm ' + (view === 'schedule' ? '' : 'btn-ghost')} onClick={() => setView('schedule')}>Schedule</button>
          <button className="btn" onClick={openNew} style={{ marginLeft: 8 }}>+ Add debt</button>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total balance</div>
          <div className="stat-value">{fmt(totals.balance, { showCents: false })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Monthly payment</div>
          <div className="stat-value">{fmt(totals.monthly, { showCents: false })}</div>
        </div>
        <div className="stat-card warm">
          <div className="stat-label">Total interest</div>
          <div className="stat-value">{fmt(totalInterest, { showCents: false })}</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-label">Debt-free in</div>
          <div className="stat-value">{totals.monthsToFree} mo</div>
          <div className="stat-sub">{totals.payoffDate?.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
        </div>
      </div>

      {view === 'summary' && (
        <div className="card" style={{ padding: 0 }}>
          {debts.length === 0 ? (
            <div className="empty">
              <h3>No debts yet</h3>
              <p>Add your first debt to start tracking the snowball.</p>
            </div>
          ) : (
            <table className="ledger">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>#</th>
                  <th>Debt</th>
                  <th style={{ textAlign: 'right' }}>Balance</th>
                  <th style={{ textAlign: 'right' }}>APR</th>
                  <th style={{ textAlign: 'right' }}>Payment</th>
                  <th>Status</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {[...debts].sort((a, b) => (Number(a.payoff_order) || 99) - (Number(b.payoff_order) || 99)).map(d => (
                  <tr key={d.id} style={{ opacity: d.paid_off ? 0.5 : 1 }}>
                    <td className="mono">{d.payoff_order}</td>
                    <td style={{ fontWeight: 500 }}>{d.name}</td>
                    <td className="num">{fmt(d.current_balance, { showCents: false })}</td>
                    <td className="num">{(Number(d.apr) * 100).toFixed(2)}%</td>
                    <td className="num">{fmt(Number(d.snowball_payment) || Number(d.min_payment) || 0, { showCents: false })}</td>
                    <td>
                      {d.paid_off ? <span className="pill pill-paid">Paid off</span> : <span className="pill">Active</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="icon-btn" onClick={() => openEdit(d)} title="Edit">✎</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {view === 'schedule' && (
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          {activeDebts.length === 0 ? (
            <div className="empty">
              <h3>No active debts</h3>
              <p>Add a debt to see the projected payoff schedule.</p>
            </div>
          ) : (
            <>
              <table className="ledger" style={{ minWidth: 700 }}>
                <thead>
                  <tr>
                    <th>Month</th>
                    {activeDebts.map(d => <th key={d.id} style={{ textAlign: 'right' }}>{d.name}</th>)}
                    <th style={{ textAlign: 'right' }}>Total Bal.</th>
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
            </>
          )}
        </div>
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

              <div style={{ fontSize: 12, color: 'var(--ink-muted)', background: 'var(--paper-warm)', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius-sm)', lineHeight: 1.5 }}>
                <strong>Tip:</strong> Snowball payment can be higher than the minimum — the extra goes to principal. When a debt clears, its full snowball payment cascades to the next debt in the payoff order.
              </div>
            </div>
            <div className="modal-actions">
              {editing.id && (
                <button className="btn btn-ghost" style={{ marginRight: 'auto', color: 'var(--negative)' }} onClick={handleDelete}>
                  Delete
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn" onClick={handleSave} disabled={!editing.name?.trim()}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
