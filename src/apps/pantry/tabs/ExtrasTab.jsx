import { useState } from 'react'
import Icon from '../../../components/Icon'
import { SectionHeader, SectionLabel, Checkbox } from '../ui'

function ExtraItem({ item, onToggle, onDelete, onUpdateQty }) {
  return (
    <div className={`item ${item.active ? 'on' : ''}`} style={{ gap: 'var(--sp-2)' }}>
      <button className="row grow" style={{ background: 'none', border: 'none', textAlign: 'left', gap: 'var(--sp-2)', minWidth: 0 }} onClick={() => onToggle(item)}>
        <Checkbox checked={item.active} />
        <span className="grow" style={{ color: item.active ? 'var(--text)' : 'var(--text-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
      </button>
      <input className="input" style={{ width: 64, padding: '6px 8px', fontSize: 12 }} placeholder="qty" value={item.quantity || ''} onChange={(e) => onUpdateQty(item, e.target.value)} />
      <button className="icon-btn" style={{ width: 32, height: 32 }} aria-label="Delete" onClick={() => onDelete(item.id)}><Icon name="trash" size={16} /></button>
    </div>
  )
}

export default function ExtrasTab({ extras, onToggle, onAdd, onDelete, onUpdateQty }) {
  const [input, setInput] = useState('')
  const [inputQty, setInputQty] = useState('')
  const [isStaple, setIsStaple] = useState(false)

  const add = () => { if (input.trim()) { onAdd(input, inputQty, isStaple); setInput(''); setInputQty('') } }
  const bySort = (a, b) => (a.active !== b.active ? (a.active ? -1 : 1) : a.name.localeCompare(b.name))
  const staples = extras.filter((e) => e.is_staple).sort(bySort)
  const oneTime = extras.filter((e) => !e.is_staple).sort(bySort)

  return (
    <main className="screen">
      <SectionHeader eyebrow="step three" title="Extras & staples" subtitle="Running-low items always appear on your list. One-time extras are for this trip only." />

      <div className="stack" style={{ gap: 'var(--sp-2)', marginBottom: 'var(--sp-5)' }}>
        <div className="row" style={{ gap: 'var(--sp-2)' }}>
          <input className="input" style={{ width: 72 }} placeholder="qty" value={inputQty} onChange={(e) => setInputQty(e.target.value)} />
          <input className="input grow" placeholder="add an item…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button className="btn" onClick={add}><Icon name="log" size={16} /> Add</button>
        </div>
        <div className="btn-row">
          <button className={`chip ${!isStaple ? 'on' : ''}`} onClick={() => setIsStaple(false)}>One-time extra</button>
          <button className={`chip ${isStaple ? 'on' : ''}`} style={isStaple ? { color: 'var(--danger)', borderColor: 'var(--danger)', background: 'color-mix(in srgb,var(--danger) 14%,var(--bg-paper))' } : {}} onClick={() => setIsStaple(true)}>🔴 Running low</button>
        </div>
      </div>

      <div style={{ marginBottom: 'var(--sp-5)' }}>
        <SectionLabel name="Running Low" count={`${staples.filter((e) => e.active).length} / ${staples.length}`} />
        <p className="p-sub" style={{ marginBottom: 'var(--sp-3)' }}>These always appear on your shopping list until you remove them.</p>
        {staples.length === 0 ? <p className="p-sub" style={{ fontStyle: 'italic' }}>Nothing flagged as running low yet.</p>
          : <div className="grid2">{staples.map((it) => <ExtraItem key={it.id} item={it} onToggle={onToggle} onDelete={onDelete} onUpdateQty={onUpdateQty} />)}</div>}
      </div>

      <div>
        <SectionLabel name="One-Time Extras" count={`${oneTime.filter((e) => e.active).length} / ${oneTime.length}`} />
        <p className="p-sub" style={{ marginBottom: 'var(--sp-3)' }}>Tap to add to this trip's list.</p>
        {oneTime.length === 0 ? <p className="p-sub" style={{ fontStyle: 'italic' }}>No extras added yet.</p>
          : <div className="grid2">{oneTime.map((it) => <ExtraItem key={it.id} item={it} onToggle={onToggle} onDelete={onDelete} onUpdateQty={onUpdateQty} />)}</div>}
      </div>
    </main>
  )
}
