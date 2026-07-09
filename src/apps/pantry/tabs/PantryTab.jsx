import { useState } from 'react'
import Sheet from '../../../components/Sheet'
import { subtractQuantity } from '../lib/shopping'
import { SectionHeader, Empty, Checkbox } from '../ui'

export default function PantryTab({ ingredients, agg, pantryMap, onToggle, skipCount }) {
  const [qtyPopup, setQtyPopup] = useState(null) // { name, needed }
  const [qtyInput, setQtyInput] = useState('')

  if (ingredients.length === 0) {
    return (
      <main className="screen">
        <SectionHeader eyebrow="step two" title="Check your pantry" subtitle="Select meals first and ingredients appear here." />
        <Empty icon="pantry" message="No ingredients yet — pick some meals first." />
      </main>
    )
  }

  const tap = (name, needed) => {
    if (name in pantryMap) { onToggle(name); return }
    setQtyPopup({ name, needed }); setQtyInput('')
  }

  return (
    <main className="screen">
      <SectionHeader eyebrow="step two" title="Check your pantry" subtitle={`Tap items you already have. ${skipCount} of ${ingredients.length} marked.`} />
      <div className="stack" style={{ gap: 'var(--sp-2)' }}>
        {ingredients.map((name) => {
          const have = name in pantryMap
          const haveQty = pantryMap[name]
          const info = agg[name]
          const neededQty = info?.quantities?.[0] || ''
          const isPartial = have && haveQty
          return (
            <button key={name} className={`item ${isPartial ? 'partial' : have ? 'have' : ''}`} onClick={() => tap(name, neededQty)}>
              <Checkbox checked={have} variant={isPartial ? 'warn' : 'ok'} />
              <span className="grow" style={{ minWidth: 0 }}>
                <span className={have ? 'strike' : ''} style={{ color: have ? 'var(--text-soft)' : 'var(--text)' }}>{name}</span>
                {have && haveQty ? <span style={{ display: 'block', fontSize: 11, color: 'var(--app-accent)' }}>have {haveQty} · need {subtractQuantity(neededQty, haveQty) || 'none'}</span>
                  : neededQty && !have ? <span style={{ display: 'block', fontSize: 11, color: 'var(--text-soft)' }}>{neededQty}</span> : null}
              </span>
              {info?.count > 1 && <span className="tag" style={{ background: 'var(--app-soft)', color: 'var(--app-accent)' }}>×{info.count}</span>}
            </button>
          )
        })}
      </div>

      <Sheet
        open={!!qtyPopup}
        onClose={() => setQtyPopup(null)}
        title={qtyPopup?.name}
        footer={
          <>
            <button className="btn grow" style={{ background: 'var(--ok)', borderColor: 'var(--ok)', color: '#0B0F09' }} onClick={() => { onToggle(qtyPopup.name, ''); setQtyPopup(null) }}>✓ I have all of it</button>
            <button className="btn ghost" onClick={() => setQtyPopup(null)}>Cancel</button>
          </>
        }
      >
        {qtyPopup?.needed && <p className="p-sub">Needed: <strong style={{ color: 'var(--text)' }}>{qtyPopup.needed}</strong></p>}
        <label className="field-label">How much do you have?</label>
        <div className="row" style={{ gap: 'var(--sp-2)' }}>
          <input className="input grow" autoFocus placeholder={`e.g. ${qtyPopup?.needed ? 'half of ' + qtyPopup.needed : '1 cup'}`} value={qtyInput}
            onChange={(e) => setQtyInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && qtyInput.trim() && (onToggle(qtyPopup.name, qtyInput.trim()), setQtyPopup(null))} />
          <button className="btn primary" disabled={!qtyInput.trim()} onClick={() => { onToggle(qtyPopup.name, qtyInput.trim()); setQtyPopup(null) }}>Partial</button>
        </div>
      </Sheet>
    </main>
  )
}
