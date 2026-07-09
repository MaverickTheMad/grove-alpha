import { useState, useMemo } from 'react'
import { useRecords } from '../lib/useRecords'
import { useIsDesktop } from '../../../lib/viewport'
import { applyRules } from '../lib/rulesEngine'

const ToggleSwitch = ({ checked, onChange }) => (
  <button
    role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
    style={{ width: 36, height: 20, borderRadius: 10, background: checked ? 'var(--app-accent)' : 'var(--border)', border: 'none', cursor: 'pointer', padding: 0, position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
  >
    <span style={{ display: 'block', width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: checked ? 19 : 3, transition: 'left 0.2s' }} />
  </button>
)

export default function Rules() {
  const { data: rules, insert, update, remove } = useRecords('rule', { orderBy: 'priority' })
  const { data: categories } = useRecords('category', { orderBy: 'name' })
  const { data: accounts } = useRecords('account', { orderBy: 'name' })
  const { data: transactions } = useRecords('transaction', { orderBy: 'date', ascending: false })
  const isDesktop = useIsDesktop(1080)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [testInput, setTestInput] = useState('')

  const blankRule = () => ({
    name: '', match_field: 'description', match_type: 'contains', match_value: '',
    category_id: '', account_id: '',
    priority: rules.length ? Math.max(...rules.map(r => r.priority || 0)) + 10 : 100,
    active: true
  })

  const openNew = () => { setEditing(blankRule()); setModalOpen(true) }
  const openEdit = (r) => { setEditing({ ...r }); setModalOpen(true) }

  const handleSave = async () => {
    const payload = {
      name: editing.name || editing.match_value, match_field: editing.match_field,
      match_type: editing.match_type, match_value: editing.match_value,
      category_id: editing.category_id || null, account_id: editing.account_id || null,
      priority: Number(editing.priority) || 100, active: !!editing.active
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

  const emptyState = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ width: 60, height: 60, borderRadius: 'var(--r-md)', background: 'color-mix(in srgb, var(--app-accent) 10%, var(--bg-elevated))', border: '1px solid color-mix(in srgb, var(--app-accent) 22%, var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M12 3L4 9v12h16V9L12 3Z" stroke="var(--app-accent)" strokeWidth="1.7" strokeLinejoin="round"/>
          <path d="M9 21v-7h6v7" stroke="var(--app-accent)" strokeWidth="1.7" strokeLinejoin="round"/>
        </svg>
      </div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-xl)', color: 'var(--text)', margin: '0 0 8px' }}>No rules yet</h3>
      <p style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-base)', lineHeight: 1.6, margin: '0 0 12px', maxWidth: '36ch' }}>
        Rules auto-assign categories when you import a statement.
      </p>
      <p style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-sm)', lineHeight: 1.6, margin: '0 0 24px', maxWidth: '38ch' }}>
        Example: <span style={{ fontFamily: 'var(--font-mono)', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4 }}>description contains WEGMANS</span> → Groceries
      </p>
      <button style={{ background: 'var(--accent)', color: '#0B0F09', border: 'none', borderRadius: 12, padding: '13px 22px', fontFamily: 'inherit', fontWeight: 600, fontSize: 'var(--fs-base)', cursor: 'pointer' }} onClick={openNew}>
        Add a rule
      </button>
    </div>
  )

  const rulesList = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rules.map(r => {
        const cat = categories.find(c => c.id === r.category_id)
        const acct = accounts.find(a => a.id === r.account_id)
        return (
          <div key={r.id} style={{ background: 'var(--bg-paper)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, opacity: r.active ? 1 : 0.55 }}>
            <ToggleSwitch checked={r.active} onChange={(v) => update(r.id, { active: v })} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 500 }}>{r.match_field} {r.match_type}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 6 }}>{r.match_value}</span>
                <span style={{ color: 'var(--app-accent)', fontWeight: 600 }}>→</span>
                {cat ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 'var(--fs-sm)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: cat.color, flexShrink: 0 }} />
                    {cat.name}
                  </span>
                ) : <span style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-sm)' }}>no category</span>}
                {acct && <span style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-xs)' }}>· {acct.name}</span>}
              </div>
              {r.name && r.name !== r.match_value && (
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-soft)', marginTop: 4 }}>{r.name}</div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {r.hits > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-soft)' }}>{r.hits} hits</span>}
              <button className="icon-btn" onClick={() => openEdit(r)} title="Edit">&#9998;</button>
            </div>
          </div>
        )
      })}
    </div>
  )

  const testPanel = (
    <div style={{ background: 'var(--bg-paper)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 20px' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.1rem', color: 'var(--text)', margin: '0 0 8px' }}>Test a description</h3>
      <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-soft)', margin: '0 0 14px', lineHeight: 1.5 }}>Paste a transaction description to see which rule would match.</p>
      <input
        className="input"
        placeholder="WEGMANS #1234"
        value={testInput}
        onChange={(e) => setTestInput(e.target.value)}
        style={{ ['--input-focus-border']: 'var(--app-accent)' }}
      />
      {testResult && (
        <div style={{ marginTop: 12, fontSize: 'var(--fs-sm)', padding: '10px 12px', borderRadius: 10, background: testResult.matched ? 'color-mix(in srgb, var(--ok) 10%, transparent)' : 'var(--bg-elevated)', border: `1px solid ${testResult.matched ? 'color-mix(in srgb, var(--ok) 25%, transparent)' : 'var(--border)'}` }}>
          {testResult.matched ? (
            <span>
              Matches <strong>{testResult.rule.name || testResult.rule.match_value}</strong>
              {testResult.cat && <> <span style={{ color: 'var(--app-accent)' }}>→</span> <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: testResult.cat.color }} />{testResult.cat.name}</span></>}
            </span>
          ) : (
            <span style={{ color: 'var(--text-soft)' }}>No rule matches.</span>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="ledger-page" style={{ paddingTop: 'var(--sp-5)' }}>
      {isDesktop ? (
        /* Desktop: two-panel layout */
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button style={{ background: 'var(--accent)', color: '#0B0F09', border: 'none', borderRadius: 12, padding: '11px 18px', fontFamily: 'inherit', fontWeight: 600, fontSize: 'var(--fs-sm)', cursor: 'pointer' }} onClick={openNew}>Add a rule</button>
            </div>
            {rules.length === 0 ? emptyState : rulesList}
          </div>
          <div style={{ position: 'sticky', top: 80 }}>
            {testPanel}
          </div>
        </div>
      ) : (
        /* Mobile: stack */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {testPanel}
          {rules.length === 0 ? emptyState : rulesList}
          <button style={{ background: 'var(--accent)', color: '#0B0F09', border: 'none', borderRadius: 12, padding: '13px', fontFamily: 'inherit', fontWeight: 600, fontSize: 'var(--fs-base)', cursor: 'pointer', width: '100%' }} onClick={openNew}>Add a rule</button>
        </div>
      )}

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
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--fs-sm)' }}>
                <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                Active
              </label>
              {preview.length > 0 && (
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', padding: '10px 12px', borderRadius: 10, fontSize: 'var(--fs-xs)' }}>
                  <strong style={{ display: 'block', marginBottom: 6, color: 'var(--text-soft)' }}>Would match {preview.length} existing transactions:</strong>
                  {preview.map((p, i) => (
                    <div key={i} style={{ color: 'var(--text-soft)', padding: '2px 0' }}>· {p.description}</div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-actions">
              {editing.id && (
                <button className="btn btn-ghost" style={{ marginRight: 'auto', color: 'var(--danger)' }} onClick={() => { if (confirm('Delete rule?')) { remove(editing.id); setModalOpen(false) } }}>Delete</button>
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
