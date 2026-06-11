import { useState, useEffect } from 'react'
import { useRecords } from '../lib/useRecords'
import { usePeople } from '../lib/people'
import { fmt } from '../lib/format'
import { toISODate, getPayCycle, formatCycleLabel } from '../lib/payCycle'

const ANCHOR_KEY = 'pay_cycle_anchor_paycheck'

// Pay-cycle anchor — the household 14-day cycle is driven by a chosen paycheck.
function PayCycleAnchorCard() {
  const { data: paychecks } = useRecords('paycheck', { orderBy: 'label' })
  const { data: settings, insert, update } = useRecords('app_setting')
  const [paycheckId, setPaycheckId] = useState('')
  const [saving, setSaving] = useState(false)

  const existing = settings.find((s) => s.key === ANCHOR_KEY)
  useEffect(() => {
    const v = existing?.value
    setPaycheckId(typeof v === 'string' ? v : (v?.id || ''))
  }, [existing])

  const save = async () => {
    setSaving(true)
    if (existing) await update(existing.id, { key: ANCHOR_KEY, value: paycheckId })
    else await insert({ key: ANCHOR_KEY, value: paycheckId })
    setSaving(false)
  }

  const anchor = paychecks.find((p) => p.id === paycheckId)
  const preview = anchor?.next_date ? formatCycleLabel(getPayCycle(anchor.next_date)) : '—'

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="card-head"><h3>Pay cycle anchor</h3></div>
      <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: '0.75rem' }}>
        Budgets and Overview run on a single 14-day pay cycle. Pick the paycheck that drives it — the cycle anchors to that paycheck's pay date and repeats every 14 days.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'end' }}>
        <div className="field" style={{ flex: 1 }}>
          <label>Anchor paycheck</label>
          <select className="select" value={paycheckId} onChange={(e) => setPaycheckId(e.target.value)}>
            <option value="">— Pick paycheck —</option>
            {paychecks.map((p) => (
              <option key={p.id} value={p.id}>{p.label}{p.next_date ? ` (${p.next_date})` : ''}</option>
            ))}
          </select>
        </div>
        <button className="btn" onClick={save} disabled={!paycheckId || saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: '0.5rem' }}>
        {anchor && !anchor.next_date
          ? <span style={{ color: 'var(--negative)' }}>This paycheck has no pay date set — edit it below so the cycle can anchor.</span>
          : <>Current cycle: <strong>{preview}</strong></>}
      </p>
    </div>
  )
}

// People — the two household members are fixed (from identity). You can set each
// one's primary paycheck (anchors their per-person cycle in the data model).
function PeopleCard() {
  const { data: people, refetch, setPrimaryPaycheck } = usePeople()
  const { data: paychecks } = useRecords('paycheck', { orderBy: 'label' })

  const onSet = async (personId, paycheckId) => {
    await setPrimaryPaycheck(personId, paycheckId || null)
    refetch()
  }

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="card-head"><h3>People</h3><span className="eyebrow">Household members</span></div>
      <table className="ledger">
        <thead>
          <tr><th>Name</th><th>Primary paycheck <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>(anchors their cycle)</span></th></tr>
        </thead>
        <tbody>
          {people.map((p) => (
            <tr key={p.id}>
              <td><span className="dot" style={{ background: p.color, marginRight: 6 }}></span><span style={{ fontWeight: 500 }}>{p.name}</span></td>
              <td>
                <select className="select" value={p.primary_paycheck_id || ''} onChange={(e) => onSet(p.id, e.target.value)} style={{ maxWidth: 280 }}>
                  <option value="">— None —</option>
                  {paychecks.map((pc) => <option key={pc.id} value={pc.id}>{pc.label}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Custom Paychecks card — FK to people (member id), date, cadence.
function PaychecksCard() {
  const { data: paychecks, insert, update, remove } = useRecords('paycheck', { orderBy: 'label' })
  const { data: people } = usePeople()
  const { data: accounts } = useRecords('account')
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)

  const blank = () => ({ label: '', amount: 0, cadence: 'biweekly', person_id: '', account_id: '', next_date: toISODate(new Date()) })

  const handleSave = async () => {
    const payload = {
      label: editing.label, amount: Number(editing.amount) || 0, cadence: editing.cadence,
      person_id: editing.person_id || null, account_id: editing.account_id || null, next_date: editing.next_date || null,
    }
    if (editing.id) await update(editing.id, payload)
    else await insert(payload)
    setOpen(false); setEditing(null)
  }

  const monthly = paychecks.reduce((s, p) => {
    const mult = p.cadence === 'biweekly' ? 26 / 12 : p.cadence === 'weekly' ? 52 / 12 : p.cadence === 'semimonthly' ? 2 : 1
    return s + Number(p.amount) * mult
  }, 0)

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="card-head">
        <h3>Paychecks</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>{fmt(monthly, { showCents: false })}/mo</span>
          <button className="btn btn-sm" onClick={() => { setEditing(blank()); setOpen(true) }}>+ Add</button>
        </div>
      </div>
      {paychecks.length === 0 ? (
        <div className="empty"><p>No paychecks yet. Add one to set a pay-cycle anchor.</p></div>
      ) : (
        <table className="ledger">
          <thead>
            <tr><th>Label</th><th>Who</th><th style={{ textAlign: 'right' }}>Amount</th><th>Cadence</th><th>Next date</th><th style={{ width: 60 }}></th></tr>
          </thead>
          <tbody>
            {paychecks.map((p) => {
              const person = people.find((pp) => pp.id === p.person_id)
              return (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.label}</td>
                  <td>{person ? <span className="pill" style={{ background: (person.color || '#999') + '22', color: person.color, borderColor: 'transparent' }}>{person.name}</span> : <span style={{ color: 'var(--ink-faint)' }}>—</span>}</td>
                  <td className="num">{fmt(p.amount, { showCents: false })}</td>
                  <td>{p.cadence}</td>
                  <td className="mono" style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{p.next_date || '—'}</td>
                  <td style={{ textAlign: 'right' }}><button className="icon-btn" onClick={() => { setEditing({ ...p }); setOpen(true) }}>✎</button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {open && editing && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal">
            <h2>{editing.id ? 'Edit paycheck' : 'New paycheck'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="field"><label>Label</label><input className="input" value={editing.label || ''} onChange={(e) => setEditing({ ...editing, label: e.target.value })} placeholder="Mav Paycheck (Chase)" autoFocus /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field"><label>Amount</label><input className="input mono" type="number" step="0.01" value={editing.amount ?? ''} onChange={(e) => setEditing({ ...editing, amount: parseFloat(e.target.value) || 0 })} /></div>
                <div className="field"><label>Cadence</label>
                  <select className="select" value={editing.cadence} onChange={(e) => setEditing({ ...editing, cadence: e.target.value })}>
                    <option value="weekly">Weekly</option><option value="biweekly">Biweekly</option><option value="semimonthly">Semi-monthly</option><option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field"><label>Who</label>
                  <select className="select" value={editing.person_id || ''} onChange={(e) => setEditing({ ...editing, person_id: e.target.value || null })}>
                    <option value="">— Pick person —</option>
                    {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="field"><label>Account</label>
                  <select className="select" value={editing.account_id || ''} onChange={(e) => setEditing({ ...editing, account_id: e.target.value || null })}>
                    <option value="">— None —</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="field"><label>Next pay date</label><input className="input" type="date" value={editing.next_date || ''} onChange={(e) => setEditing({ ...editing, next_date: e.target.value || null })} /></div>
            </div>
            <div className="modal-actions">
              {editing.id && <button className="btn btn-ghost" style={{ marginRight: 'auto', color: 'var(--negative)' }} onClick={() => { if (confirm('Delete paycheck?')) { remove(editing.id); setOpen(false) } }}>Delete</button>}
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn" onClick={handleSave} disabled={!editing.label?.trim()}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Generic CRUD list for simple record types.
function CrudList({ type, title, fields, defaults, orderBy }) {
  const { data, insert, update, remove } = useRecords(type, { orderBy })
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)

  const handleSave = async () => {
    const payload = {}
    fields.forEach((f) => { payload[f.key] = editing[f.key] })
    if (editing.id) await update(editing.id, payload)
    else await insert(payload)
    setOpen(false); setEditing(null)
  }

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="card-head">
        <h3>{title}</h3>
        <button className="btn btn-sm" onClick={() => { setEditing({ ...defaults }); setOpen(true) }}>+ Add</button>
      </div>
      <table className="ledger">
        <tbody>
          {data.map((row) => (
            <tr key={row.id}>
              {fields.slice(0, 3).map((f) => (
                <td key={f.key}>
                  {f.type === 'color' ? <span className="dot" style={{ background: row[f.key], marginRight: 6 }}></span> : null}
                  {row[f.key]?.toString()}
                </td>
              ))}
              <td style={{ width: 80, textAlign: 'right' }}>
                <button className="icon-btn" onClick={() => { setEditing({ ...row }); setOpen(true) }}>✎</button>
                <button className="icon-btn" onClick={() => { if (confirm('Delete?')) remove(row.id) }}>×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && <div className="empty"><p>None yet.</p></div>}

      {open && editing && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal">
            <h2>{editing.id ? `Edit ${title.toLowerCase().replace(/s$/, '')}` : `New ${title.toLowerCase().replace(/s$/, '')}`}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {fields.map((f) => (
                <div key={f.key} className="field">
                  <label>{f.label}</label>
                  {f.type === 'select' ? (
                    <select className="select" value={editing[f.key] || ''} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}>
                      {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : f.type === 'color' ? (
                    <input className="input" type="color" value={editing[f.key] || '#888888'} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })} style={{ height: 38 }} />
                  ) : (
                    <input className="input" type={f.type || 'text'} value={editing[f.key] || ''} onChange={(e) => setEditing({ ...editing, [f.key]: f.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })} />
                  )}
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Settings() {
  return (
    <div className="ledger-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Setup</p>
          <h1>Settings</h1>
          <p>Accounts, paychecks, people, categories.</p>
        </div>
      </div>

      <PayCycleAnchorCard />
      <PaychecksCard />
      <PeopleCard />

      <CrudList type="account" title="Accounts" orderBy="name"
        defaults={{ name: '', kind: 'checking', owner: 'shared' }}
        fields={[
          { key: 'name', label: 'Name' },
          { key: 'kind', label: 'Kind', type: 'select', options: ['checking', 'savings', 'cash', 'credit', 'loan'] },
          { key: 'owner', label: 'Owner', type: 'select', options: ['shared', 'mav', 'ren'] },
        ]} />

      <CrudList type="category" title="Categories" orderBy="sort_order"
        defaults={{ name: '', kind: 'expense', color: '#c08478', sort_order: 50 }}
        fields={[
          { key: 'name', label: 'Name' },
          { key: 'color', label: 'Color', type: 'color' },
          { key: 'kind', label: 'Kind', type: 'select', options: ['expense', 'income', 'savings', 'debt'] },
          { key: 'sort_order', label: 'Sort order', type: 'number' },
        ]} />

      <div style={{ marginTop: '2rem', padding: '1rem', textAlign: 'center', color: 'var(--ink-muted)', fontSize: 13 }}>
        <p>Categorization rules now live under <strong>Money → Rules</strong>.</p>
      </div>
    </div>
  )
}
