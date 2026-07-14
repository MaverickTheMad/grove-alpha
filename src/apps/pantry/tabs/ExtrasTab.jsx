import { useState } from 'react'
import { Button, Chip } from '../../../ds'
import Icon from '../../../components/Icon'
import { PageHeader, Checkbox } from '../ui'

function QtyStep({ value, onChange }) {
  const n = parseInt(value) || 1
  return (
    <span className="qstep">
      <button disabled={n <= 1} onClick={() => onChange(String(n - 1))}>−</button>
      <span className="v">{n}</span>
      <button disabled={n >= 99} onClick={() => onChange(String(n + 1))}>+</button>
    </span>
  )
}

function ExtraItem({ item, onToggle, onDelete, onUpdateQty }) {
  return (
    <div className={`item ${item.active ? 'on' : ''}`} style={{ gap: 'var(--sp-2)' }}>
      <button className="row grow" style={{ background: 'none', border: 'none', textAlign: 'left', gap: 'var(--sp-2)', minWidth: 0 }} onClick={() => onToggle(item)}>
        <Checkbox checked={item.active} />
        <span className="grow" style={{ color: item.active ? 'var(--text)' : 'var(--text-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
      </button>
      <QtyStep value={item.quantity || '1'} onChange={(v) => onUpdateQty(item, v)} />
      <button className="icon-btn" style={{ width: 32, height: 32 }} aria-label="Delete" onClick={() => onDelete(item.id)}><Icon name="trash" size={16} /></button>
    </div>
  )
}

export default function ExtrasTab({ extras, onToggle, onAdd, onDelete, onUpdateQty }) {
  const [input, setInput] = useState('')
  const [isStaple, setIsStaple] = useState(false)

  const add = () => { if (input.trim()) { onAdd(input, '1', isStaple); setInput('') } }
  const bySort = (a, b) => (a.active !== b.active ? (a.active ? -1 : 1) : a.name.localeCompare(b.name))
  const staples = extras.filter((e) => e.is_staple).sort(bySort)
  const oneTime = extras.filter((e) => !e.is_staple).sort(bySort)

  return (
    <main className="screen">
      <PageHeader title="Extras" />

      <div className="stack" style={{ gap: 'var(--sp-2)', marginBottom: 'var(--sp-5)' }}>
        <div className="row" style={{ gap: 'var(--sp-2)' }}>
          <input className="input grow" placeholder="add an item…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <Button onClick={add}><Icon name="log" size={16} /> Add</Button>
        </div>
        <div className="btn-row">
          <Chip active={!isStaple} onClick={() => setIsStaple(false)}>One-time</Chip>
          <Chip active={isStaple} onClick={() => setIsStaple(true)}>Running low</Chip>
        </div>
      </div>

      {extras.length === 0 ? (
        <p className="p-sub" style={{ textAlign: 'center', marginTop: 'var(--sp-6)' }}>Add an item when something's almost out, or a one-time item for this trip.</p>
      ) : (
        <>
          <div style={{ marginBottom: 'var(--sp-5)' }}>
            <div className="p-seclabel"><span>Running low</span>{staples.length > 0 && <span className="count">{staples.length}</span>}</div>
            {staples.length === 0
              ? <p className="p-sub" style={{ fontStyle: 'italic', marginTop: 4 }}>Nothing flagged as running low yet.</p>
              : <div className="stack" style={{ gap: 'var(--sp-2)', marginTop: 'var(--sp-2)' }}>{staples.map((it) => <ExtraItem key={it.id} item={it} onToggle={onToggle} onDelete={onDelete} onUpdateQty={onUpdateQty} />)}</div>}
          </div>

          <div>
            <div className="p-seclabel" style={{ marginBottom: 8 }}>
              <span>One-time</span>
              {oneTime.length > 0 && <span className="count">{oneTime.length}</span>}
              <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 'var(--fw-reg)', textTransform: 'none', letterSpacing: 0, color: 'var(--text-soft)' }}>Clears after this trip</span>
            </div>
            {oneTime.length === 0
              ? <p className="p-sub" style={{ fontStyle: 'italic' }}>No one-time extras yet.</p>
              : <div className="stack" style={{ gap: 'var(--sp-2)' }}>{oneTime.map((it) => <ExtraItem key={it.id} item={it} onToggle={onToggle} onDelete={onDelete} onUpdateQty={onUpdateQty} />)}</div>}
          </div>
        </>
      )}
    </main>
  )
}
