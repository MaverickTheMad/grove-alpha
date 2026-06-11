import { useState, useMemo } from 'react'
import { useRecords } from '../lib/useRecords'
import { fmt, todayISO } from '../lib/format'

export default function Goals() {
  const { data: goals, insert, update, remove } = useRecords('goal', { orderBy: 'sort_order', filter: (g) => !g.archived })
  const { data: contributions, insert: insertContribution, refetch: refetchContributions } = useRecords('goal_contribution', { orderBy: 'date', ascending: false })
  const { data: accounts } = useRecords('account')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [contributeFor, setContributeFor] = useState(null)
  const [contributeAmount, setContributeAmount] = useState('')

  const totals = useMemo(() => ({
    saved: goals.reduce((s, g) => s + Number(g.current_amount || 0), 0),
    target: goals.reduce((s, g) => s + Number(g.target_amount || 0), 0),
    monthly: goals.reduce((s, g) => s + Number(g.monthly_contribution || 0), 0)
  }), [goals])

  const openNew = () => { setEditing({ name: '', target_amount: 0, current_amount: 0, monthly_contribution: 0, color: '#b8945a' }); setModalOpen(true) }
  const openEdit = (g) => { setEditing({ ...g }); setModalOpen(true) }
  const handleSave = async () => {
    if (editing.id) await update(editing.id, { name: editing.name, target_amount: editing.target_amount, current_amount: editing.current_amount, monthly_contribution: editing.monthly_contribution, target_date: editing.target_date, color: editing.color, account_id: editing.account_id || null })
    else await insert({ name: editing.name, target_amount: editing.target_amount, current_amount: editing.current_amount, monthly_contribution: editing.monthly_contribution, target_date: editing.target_date, color: editing.color, account_id: editing.account_id || null })
    setModalOpen(false); setEditing(null)
  }

  const addContribution = async () => {
    const amt = parseFloat(contributeAmount) || 0
    if (!amt || !contributeFor) return
    await insertContribution({ goal_id: contributeFor.id, date: todayISO(), amount: amt })
    await update(contributeFor.id, { current_amount: Number(contributeFor.current_amount || 0) + amt })
    refetchContributions()
    setContributeFor(null)
    setContributeAmount('')
  }

  return (
    <div className="ledger-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Sinking funds</p>
          <h1>Goals</h1>
          <p>Envelopes for the things you're saving toward.</p>
        </div>
        <button className="btn" onClick={openNew}>+ Add goal</button>
      </div>

      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card accent">
          <div className="stat-label">Total saved</div>
          <div className="stat-value">{fmt(totals.saved, { showCents: false })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total target</div>
          <div className="stat-value">{fmt(totals.target, { showCents: false })}</div>
        </div>
        <div className="stat-card warm">
          <div className="stat-label">Monthly contributions</div>
          <div className="stat-value">{fmt(totals.monthly, { showCents: false })}</div>
        </div>
      </div>

      <div className="grid-2">
        {goals.map(g => {
          const pct = g.target_amount ? Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100) : 0
          const remaining = Number(g.target_amount || 0) - Number(g.current_amount || 0)
          const monthsToGo = g.monthly_contribution > 0 ? Math.ceil(remaining / Number(g.monthly_contribution)) : null
          return (
            <div key={g.id} className="card" style={{ borderTopWidth: 3, borderTopColor: g.color }}>
              <div className="card-head">
                <h3>{g.name}</h3>
                <div>
                  <button className="icon-btn" onClick={() => openEdit(g)}>✎</button>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--serif)', fontSize: '1.6rem' }}>{fmt(g.current_amount, { showCents: false })}</span>
                <span className="mono" style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
                  of {fmt(g.target_amount || 0, { showCents: false })}
                </span>
              </div>
              <div className="progress" style={{ marginBottom: 12 }}>
                <div className="progress-fill" style={{ width: `${pct}%`, background: g.color }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-muted)', marginBottom: 12 }}>
                <span>{pct.toFixed(0)}% funded</span>
                {monthsToGo !== null && monthsToGo > 0 && <span>~{monthsToGo} mo at current pace</span>}
              </div>
              {contributeFor?.id === g.id ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input className="input mono" type="number" placeholder="Amount" value={contributeAmount} onChange={(e) => setContributeAmount(e.target.value)} autoFocus />
                  <button className="btn btn-sm" onClick={addContribution}>Add</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setContributeFor(null); setContributeAmount('') }}>Cancel</button>
                </div>
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={() => setContributeFor(g)} style={{ width: '100%' }}>+ Contribute</button>
              )}
            </div>
          )
        })}
      </div>

      {modalOpen && editing && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <h2>{editing.id ? 'Edit goal' : 'New goal'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="field">
                <label>Name</label>
                <input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="House Downpayment, Vacation..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Target</label>
                  <input className="input mono" type="number" step="0.01" value={editing.target_amount || ''} onChange={(e) => setEditing({ ...editing, target_amount: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="field">
                  <label>Current</label>
                  <input className="input mono" type="number" step="0.01" value={editing.current_amount || ''} onChange={(e) => setEditing({ ...editing, current_amount: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Monthly contribution</label>
                  <input className="input mono" type="number" step="0.01" value={editing.monthly_contribution || ''} onChange={(e) => setEditing({ ...editing, monthly_contribution: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="field">
                  <label>Target date</label>
                  <input className="input" type="date" value={editing.target_date || ''} onChange={(e) => setEditing({ ...editing, target_date: e.target.value || null })} />
                </div>
              </div>
              <div className="field">
                <label>Account</label>
                <select className="select" value={editing.account_id || ''} onChange={(e) => setEditing({ ...editing, account_id: e.target.value || null })}>
                  <option value="">— None —</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Color</label>
                <input className="input" type="color" value={editing.color || '#b8945a'} onChange={(e) => setEditing({ ...editing, color: e.target.value })} style={{ height: 38 }} />
              </div>
            </div>
            <div className="modal-actions">
              {editing.id && <button className="btn btn-ghost" style={{ marginRight: 'auto', color: 'var(--negative)' }} onClick={() => { if (confirm('Delete goal?')) { remove(editing.id); setModalOpen(false) } }}>Delete</button>}
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
