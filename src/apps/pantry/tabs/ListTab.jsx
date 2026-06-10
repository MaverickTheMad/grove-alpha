import { useState } from 'react'
import Icon from '../../../components/Icon'
import Sheet from '../../../components/Sheet'
import { getSection, sumQuantities } from '../lib/shopping'
import { SECTION_ORDER } from '../constants'
import { SectionHeader, SectionLabel, Empty, Checkbox } from '../ui'

export default function ListTab({ groups, checked, onToggle, total, sections, onSetSection, onNewTrip }) {
  const [reassigning, setReassigning] = useState(null)

  function handlePrint() {
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const sectionsHtml = groups.map((g) => {
      const items = g.items.map((item) => {
        const qty = sumQuantities(item.quantities)
        return `<div class="item"><span class="item-name"><span class="checkbox"></span>${item.name}</span>${qty ? `<span class="item-qty">${qty}</span>` : ''}</div>`
      }).join('')
      return `<div class="section"><div class="section-title">${g.section}</div>${items}</div>`
    }).join('')
    const html = `<!DOCTYPE html><html><head><title>Shopping List — ${today}</title><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#1c1917;background:#fff;padding:40px;max-width:600px;margin:0 auto}
      h1{font-family:Georgia,serif;font-size:30px;font-weight:700;margin-bottom:4px}
      .date{font-size:12px;color:#78716c;margin-bottom:28px;text-transform:uppercase;letter-spacing:.1em}
      .section{margin-bottom:22px}
      .section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.16em;color:#3b5b3f;border-bottom:1px solid #d8decf;padding-bottom:4px;margin-bottom:8px}
      .item{display:flex;align-items:baseline;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f1f1ee}
      .item-name{font-size:15px;font-weight:500}
      .item-qty{font-size:13px;color:#78716c;margin-left:12px;white-space:nowrap}
      .checkbox{width:13px;height:13px;border:1.5px solid #c9cbc2;border-radius:3px;display:inline-block;margin-right:10px}
      @media print{body{padding:20px}}
    </style></head><body><h1>Shopping List</h1><div class="date">${today}</div>${sectionsHtml}</body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  if (total === 0) {
    return (
      <main className="screen">
        <SectionHeader eyebrow="step four" title="Shopping list" subtitle="Your list builds from selected meals, pantry, and extras." />
        <Empty icon="cart" message="Nothing on the list yet — plan a few meals to fill it." />
      </main>
    )
  }

  return (
    <main className="screen">
      <div className="spread" style={{ alignItems: 'flex-end' }}>
        <SectionHeader eyebrow="step four" title="Shopping list" subtitle={`${total} item${total !== 1 ? 's' : ''} across ${groups.length} section${groups.length !== 1 ? 's' : ''}`} />
        <div className="row" style={{ gap: 'var(--sp-2)', marginBottom: 'var(--sp-5)' }}>
          <button className="btn sm" onClick={handlePrint}><Icon name="print" size={16} /> Print</button>
          <button className="btn sm" onClick={onNewTrip}><Icon name="cart" size={16} /> New trip</button>
        </div>
      </div>

      <div className="stack" style={{ gap: 'var(--sp-5)' }}>
        {groups.map((g) => (
          <div key={g.section}>
            <SectionLabel name={g.section} count={g.items.length} />
            <div className="listcard">
              {g.items.map((item) => {
                const isChecked = checked.includes(item.name)
                const qty = sumQuantities(item.quantities)
                return (
                  <div key={item.name} className={`listrow ${isChecked ? 'checked' : ''}`}>
                    <button className="row grow" style={{ background: 'none', border: 'none', textAlign: 'left', gap: 'var(--sp-3)', minWidth: 0 }} onClick={() => onToggle(item.name)}>
                      <Checkbox checked={isChecked} />
                      <span className="grow" style={{ minWidth: 0 }}>
                        <span className={isChecked ? 'strike' : ''} style={{ fontWeight: 'var(--fw-med)', color: isChecked ? 'var(--text-soft)' : 'var(--text)' }}>{item.name}</span>
                        {(qty || item.count > 1) && <span style={{ display: 'block', fontSize: 12, color: 'var(--text-soft)' }}>{qty}{item.count > 1 ? ` · needed for ${item.count} recipes` : ''}</span>}
                      </span>
                    </button>
                    <button className="icon-btn" style={{ width: 32, height: 32 }} aria-label="Move section" onClick={() => setReassigning(item.name)}>⋯</button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <Sheet open={!!reassigning} onClose={() => setReassigning(null)} title={reassigning ? `Move "${reassigning}"` : ''}>
        {reassigning && <p className="p-sub">Currently in {getSection(reassigning, sections)}</p>}
        <div className="stack" style={{ gap: 'var(--sp-2)' }}>
          {SECTION_ORDER.map((s) => (
            <button key={s} className="item" style={getSection(reassigning, sections) === s ? { borderColor: 'var(--app-accent)', background: 'var(--app-weak)' } : {}}
              onClick={() => { onSetSection(reassigning, s); setReassigning(null) }}>{s}</button>
          ))}
        </div>
      </Sheet>
    </main>
  )
}
