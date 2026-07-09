import { useState, useMemo } from 'react'
import { useRecords } from '../lib/useRecords'
import { applyRules } from '../lib/rulesEngine'

export default function Rules() {
  const { data: rules, insert, update, remove } = useRecords('rule', { orderBy: 'priority' })
  const { data: categories } = useRecords('category', { orderBy: 'name' })
  const { data: accounts } = useRecords('account', { orderBy: 'name' })
  const { data: transactions } = useRecords('transaction', { orderBy: 'date', ascending: false })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [testInput, setTestInput] = useState('')

  const blankRule = () => ({
    name: '',
    match_field: 'description',
    match_type: 'contains',
    match_value: '',
    category_id: '',
    account_id: '',
    priority: rules.length ? Math.max(...rules.map(r => r.priority || 0)) + 10 : 100,
    active: true
  })

  const openNew = () => { setEditing(blankRule()); setModalOpen(true) }
  const openEdit = (r) => { setEditing({ ...r }); setModalOpen(true) }

  const handleSave = async () => {
    const payload = {
      name: editing.name || editing.match_value,
      match_field: editing.match_field,
      match_type: editing.match_type,
      match_value: editing.match_value,
      category_id: editing.category_id || null,
      account_id: editing.account_id || null,
      priority: Number(editing.priority) || 100,
      active: !!editing.active
    }
    if (editing.id) await update(editing.id, payload)
    else await insert(payload)
    setModalOpen(false); setEditing(null)
  }

  const preview = useMemo(() => {
    if (!editing || !editing.match_value || !transactions.length) return []
    const { transactions: result } = applyRules(transactions.slice(0, 200), [{
      id: '__preview', active: true, priority: 0,
      match_field: editing.match_field, match_type: editing.match_type, match_value: editing.match_value
    }])
    return result.filter(t => t._ruleId === '__preview').slice(0, 8)
  }, [editing, transactions])

  const testResult = useMemo(() => {
    if (!testInput.trim() || rules.length === 0) return null
    const { transactions: result } = applyRules([{ description: testInput, amount: 0 }], rules)
    const matched = result[0]
    if (!matched._ruleId) return { matched: false }
    const rule = rules.find(r => r.id === matched._ruleId)
    const cat = categories.find(c => c.id === matched._categoryId)
    return { matched: true, rule, cat }
  }, [testInput, rules, categories])

  return (
    <div className="ledger-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Categorization</p>
          <h1>Rules</h1>
          <p>When importing, these rules auto-assign categories to transactions.</p>
        </div>
        <button className="btn" onClick={openNew}>Add a rule</button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem' }}>Test a description</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: '0.75rem' }}>
          Paste a transaction description to see which rule would catch it.
        </p>
        <input
          className="input"
          placeholder="WEGMANS #1234, AMAZON.COM, etc."
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
        />
        {testResult && (
          <div style={{ marginTop: '0.6rem', fontSize: 14 }}>
            {testResult.matched ? (
              <span>
                Matches <strong>{testResult.rule.name || testResult.rule.match_value}</strong>
                {testResult.cat && <> → <span className="dot" style={{ background: testResult.cat.color, marginRight: 4 }}></span>{testResult.cat.name}</>}
              </span>
            ) : (
              <span style={{ color: 'var(--ink-muted)' }}>No rule matches.</span>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {rules.length === 0 ? (
          <div className="empty">
            <h3>No rules yet</h3>
            <p style={{ marginBottom: '0.75rem' }}>
              Rules auto-assign categories when you import a statement.
              Example: description contains <strong>WEGMANS</strong> → Groceries.
            </p>
            <button className="btn" onClick={openNew}>Add a rule</button>
          </div>
        ) : (
          <table className="ledger">
            <thead>
              <tr>
                <th style={{ width: 60 }}>Prio</th>
                <th>Match</th>
                <th>Category</th>
                <th>Account</th>
                <th style={{ textAlign: 'right' }}>Hits</th>
                <th>Active</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {rules.map(r => {
                const cat = categories.find(c => c.id === r.category_id)
                const acct = accounts.find(a => a.id === r.account_id)
                return (
                  <tr key={r.id} style={{ opacity: r.active ? 1 : 0.5 }}>
                    <td className="mono">{r.priority}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.name || r.match_value}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                        {r.match_field} {r.match_type} <span className="mono">"{r.match_value}"</span>
                      </div>
                    </td>
                    <td>
                      {cat ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                          <span className="dot" style={{ background: cat.color }}></span>{cat.name}
                        </span>
                      ) : <span style={{ color: 'var(--ink-faint)' }}>—</span>}
                    </td>
                    <td style={{ fontSize: 13 }}>{acct?.name || <span style={{ color: 'var(--ink-faint)' }}>any</span>}</td>
                    <td className="num">{r.hits || 0}</td>
                    <td>
                      <input type="checkbox" checked={r.active} onChange={() => update(r.id, { active: !r.active })} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="icon-btn" onClick={() => openEdit(r)}>✎</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && editing && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <h2>{editing.id ? 'Edit rule' : 'New rule'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div className="field">
                <label>Name (optional)</label>
                <input className="input" value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Groceries — Wegmans" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>If</label>
                  <select className="select" value={editing.match_field} onChange={(e) => setEditing({ ...editing, match_field: e.target.value })}>
                    <option value="description">Description</option>
                    <option value="amount">Amount</option>
                  </select>
                </div>
                <div className="field">
                  <label>Operator</label>
                  <select className="select" value={editing.match_type} onChange={(e) => setEditing({ ...editing, match_type: e.target.value })}>
                    <option value="contains">contains</option>
                    <option value="starts">starts with</option>
                    <option value="equals">equals</option>
                    <option value="regex">matches regex</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Value</label>
                <input className="input mono" value={editing.match_value || ''} onChange={(e) => setEditing({ ...editing, match_value: e.target.value })} placeholder="WEGMANS" autoFocus />
              </div>

              <div className="field">
                <label>→ Set category to</label>
                <select className="select" value={editing.category_id || ''} onChange={(e) => setEditing({ ...editing, category_id: e.target.value })}>
                  <option value="">— Pick category —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Account (optional)</label>
                  <select className="select" value={editing.account_id || ''} onChange={(e) => setEditing({ ...editing, account_id: e.target.value })}>
                    <option value="">— Any —</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Priority</label>
                  <input className="input mono" type="number" value={editing.priority || 100} onChange={(e) => setEditing({ ...editing, priority: parseInt(e.target.value) || 100 })} />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                Active
              </label>

              {preview.length > 0 && (
                <div style={{ background: 'var(--paper-warm)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: 12 }}>
                  <strong style={{ display: 'block', marginBottom: 4 }}>Would have matched {preview.length} existing:</strong>
                  {preview.map((p, i) => (
                    <div key={i} style={{ color: 'var(--ink-muted)', padding: '2px 0' }}>· {p.description}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-actions">
              {editing.id && (
                <button className="btn btn-ghost" style={{ marginRight: 'auto', color: 'var(--negative)' }} onClick={() => { if (confirm('Delete rule?')) { remove(editing.id); setModalOpen(false) } }}>Delete</button>
              )}
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn" onClick={handleSave} disabled={!editing.match_value?.trim() || !editing.category_id}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
