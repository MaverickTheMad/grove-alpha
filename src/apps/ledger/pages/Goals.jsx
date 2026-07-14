import { useState, useMemo } from 'react'
import { useRecords } from '../lib/useRecords'
import { fmt, todayISO } from '../lib/format'

function ProgressRing({ pct, color, size = 80 }) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const filled = (Math.min(100, pct) / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-sunken)" strokeWidth="9" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color || 'var(--app-accent)'} strokeWidth="9"
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 280ms ease' }}
      />
    </svg>
  )
}

function PaceEstimate({ monthsToGo }) {
  if (!monthsToGo || monthsToGo <= 0) return null
  return (
    <div className="goal-pace-estimate">
      <span className="goal-pace-label">~{monthsToGo} mo at current pace</span>
      <span className="goal-pace-note">Estimate</span>
    </div>
  )
}

export default function Goals() {
  const { data: goals, insert, update, remove } = useRecords('goal', { orderBy: 'sort_order', filter: (g) => !g.archived })
  const { data: contributions, insert: insertContribution, refetch: refetchContributions } = useRecords('goal_contribution', { orderBy: 'date', ascending: false })
  const { data: accounts } = useRecords('account', { orderBy: 'name' })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [contributeFor, setContributeFor] = useState(null)
  const [contributeAmount, setContributeAmount] = useState('')

  const totals = useMemo(() => ({
    saved: goals.reduce((s, g) => s + Number(g.current_amount || 0), 0),
    target: goals.reduce((s, g) => s + Number(g.target_amount || 0), 0),
    monthly: goals.reduce((s, g) => s + Number(g.monthly_contribution || 0), 0)
  }), [goals])

  const openNew = () => { setEditing({ name: '', target_amount: 0, current_amount: 0, monthly_contribution: 0, color: '#6F86C2' }); setModalOpen(true) }
  const openEdit = (g) => { setEditing({ ...g }); setModalOpen(true) }
  const handleSave = async () => {
    const payload = { name: editing.name, target_amount: editing.target_amount, current_amount: editing.current_amount, monthly_contribution: editing.monthly_contribution, target_date: editing.target_date, color: editing.color, account_id: editing.account_id || null }
    if (editing.id) await update(editing.id, payload)
    else await insert(payload)
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

  const PageHeader = ({ children }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-xl)', color: 'var(--text)', margin: 0 }}>Goals</h2>
      {children}
    </div>
  )

  const AddBtn = () => (
    <button onClick={openNew} style={{ background: 'var(--accent)', color: '#0B0F09', border: 'none', borderRadius: 12, padding: '10px 18px', fontFamily: 'inherit', fontWeight: 700, fontSize: 'var(--fs-sm)', cursor: 'pointer' }}>Add goal</button>
  )

  if (goals.length === 0) {
    return (
      <div className="ledger-page" style={{ paddingTop: 'var(--sp-5)' }}>
        <PageHeader><AddBtn /></PageHeader>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 24px', background: 'var(--bg-paper)', border: '1px solid var(--border)', borderRadius: 16 }}>
          <div style={{ width: 60, height: 60, borderRadius: 'var(--r-md)', background: 'color-mix(in srgb, var(--app-accent) 10%, var(--bg-elevated))', border: '1px solid color-mix(in srgb, var(--app-accent) 22%, var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="var(--app-accent)" strokeWidth="1.7"/><circle cx="12" cy="12" r="3.5" stroke="var(--app-accent)" strokeWidth="1.7"/></svg>
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-xl)', color: 'var(--text)', margin: '0 0 8px' }}>No goals yet</h3>
          <p style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-base)', lineHeight: 1.6, margin: '0 0 24px', maxWidth: '40ch' }}>Create a goal to start saving toward a target — house downpayment, vacation, emergency fund.</p>
          <AddBtn />
        </div>
        {modalOpen && editing && <GoalModal editing={editing} setEditing={setEditing} accounts={accounts} onSave={handleSave} onClose={() => { setModalOpen(false); setEditing(null) }} onDelete={null} />}
      </div>
    )
  }

  return (
    <div className="ledger-page" style={{ paddingTop: 'var(--sp-5)' }}>
      <PageHeader><AddBtn /></PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
        {[{ label: 'Total saved', value: totals.saved, color: 'var(--app-accent)' }, { label: 'Total target', value: totals.target, color: 'var(--text)' }, { label: 'Monthly contributions', value: totals.monthly, color: 'var(--text-soft)' }].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--bg-paper)', border: '1px solid var(--border)', borderRadius: 16, padding: '15px 17px' }}>
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-soft)', marginBottom: 6 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xl)', fontWeight: 500, color }}>{fmt(value, { showCents: false })}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {goals.map(g => {
          const pct = g.target_amount ? Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100) : 0
          const remaining = Number(g.target_amount || 0) - Number(g.current_amount || 0)
          const monthsToGo = g.monthly_contribution > 0 && remaining > 0 ? Math.ceil(remaining / Number(g.monthly_contribution)) : null
          const recentContribs = contributions.filter(c => c.goal_id === g.id).slice(0, 3)

          return (
            <div key={g.id} style={{ background: 'var(--bg-paper)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px', borderTop: `3px solid ${g.color || 'var(--app-accent)'}` }}>
              <div className="card-head">
                <h3>{g.name}</h3>
                <button className="icon-btn" aria-label="Edit goal" onClick={() => openEdit(g)}>✎</button>
              </div>

              <div className="goal-body">
                <ProgressRing pct={pct} color={g.color} size={84} />
                <div className="goal-numbers">
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-2xl)', fontWeight: 'var(--fw-title)' }}>
                    {fmt(g.current_amount, { showCents: false })}
                  </div>
                  <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-soft)' }}>
                    of {fmt(g.target_amount || 0, { showCents: false })} · {pct.toFixed(0)}% funded
                  </div>
                  {g.monthly_contribution > 0 && (
                    <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-soft)', marginTop: 2 }}>
                      {fmt(g.monthly_contribution, { showCents: false })}/mo
                    </div>
                  )}
                  <PaceEstimate monthsToGo={monthsToGo} />
                </div>
              </div>

              {recentContribs.length > 0 && (
                <div className="goal-log">
                  {recentContribs.map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-xs)', color: 'var(--text-soft)', padding: '3px 0' }}>
                      <span>{c.date}</span>
                      <span className="mono">+{fmt(c.amount, { showCents: false })}</span>
                    </div>
                  ))}
                </div>
              )}

              {contributeFor?.id === g.id ? (
                <div style={{ display: 'flex', gap: 6, marginTop: 'var(--sp-3)' }}>
                  <input className="input mono" type="number" placeholder="Amount" value={contributeAmount} onChange={(e) => setContributeAmount(e.target.value)} autoFocus />
                  <button className="btn btn-sm" onClick={addContribution}>Add</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setContributeFor(null); setContributeAmount('') }}>Cancel</button>
                </div>
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={() => setContributeFor(g)} style={{ width: '100%', marginTop: 'var(--sp-3)' }}>
                  + Contribute
                </button>
              )}
            </div>
          )
        })}
      </div>

      {modalOpen && editing && (
        <GoalModal
          editing={editing} setEditing={setEditing} accounts={accounts}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditing(null) }}
          onDelete={editing.id ? () => { if (confirm('Delete goal?')) { remove(editing.id); setModalOpen(false) } } : null}
        />
      )}
    </div>
  )
}

function GoalModal({ editing, setEditing, accounts, onSave, onClose, onDelete }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
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
            <input className="input" type="color" value={editing.color || '#6F86C2'} onChange={(e) => setEditing({ ...editing, color: e.target.value })} style={{ height: 38 }} />
          </div>
        </div>
        <div className="modal-actions">
          {onDelete && <button className="btn btn-ghost" style={{ marginRight: 'auto', color: 'var(--negative)' }} onClick={onDelete}>Delete</button>}
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={onSave}>Save</button>
        </div>
      </div>
    </div>
  )
}
