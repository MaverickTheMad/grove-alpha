import { useState } from 'react'
import { Button } from '../../../ds'
import Icon from '../../../components/Icon'
import Sheet from '../../../components/Sheet'
import { getSection, sumQuantities } from '../lib/shopping'
import { SECTION_ORDER } from '../constants'
import { PageHeader, SectionLabel, Empty, Checkbox } from '../ui'

export default function ListTab({ groups, checked, onToggle, total, sections, onSetSection, onNewTrip }) {
  const [reassigning, setReassigning] = useState(null)
  const [showPrint, setShowPrint] = useState(false)

  function handlePrint() {
    window.print()
  }

  if (total === 0) {
    return (
      <main className="screen">
        <PageHeader title="List" />
        <Empty icon="cart" message="Nothing on the list yet — plan a few meals to fill it." />
      </main>
    )
  }

  return (
    <main className="screen">
      <PageHeader title="List" action={
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" onClick={() => setShowPrint(true)}><Icon name="print" size={16} /> Print / PDF</Button>
          <button style={{ background: 'var(--accent)', color: '#0B0F09', border: 'none', borderRadius: 12, padding: '10px 14px', fontFamily: 'inherit', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 44 }} onClick={onNewTrip}>New trip</button>
        </div>
      } />

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

      {/* P4: In-app print/PDF — stays in the SPA on mobile */}
      <Sheet
        open={showPrint}
        onClose={() => setShowPrint(false)}
        title="Shopping list"
        footer={
          <div style={{ display: 'flex', gap: 'var(--sp-2)', width: '100%' }}>
            <Button variant="ghost" className="grow" onClick={() => setShowPrint(false)}>Back to Pantry</Button>
            <Button variant="primary" className="grow" onClick={handlePrint}>Print / Save PDF</Button>
          </div>
        }
      >
        <p style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-sm)', marginBottom: 'var(--sp-4)' }}>
          Tap "Print / Save PDF" to open your browser's print dialog. On iOS, choose "Save to PDF"; on Android, choose "Save as PDF".
        </p>
        {groups.map((g) => (
          <div key={g.section} style={{ marginBottom: 'var(--sp-4)' }}>
            <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--text-soft)', borderBottom: '1px solid var(--border)', paddingBottom: 4, marginBottom: 'var(--sp-2)' }}>{g.section}</div>
            {g.items.map((item) => {
              const qty = sumQuantities(item.quantities)
              return (
                <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 'var(--fs-sm)' }}>
                  <span>{item.name}</span>
                  {qty && <span style={{ color: 'var(--text-soft)' }}>{qty}</span>}
                </div>
              )
            })}
          </div>
        ))}
      </Sheet>
    </main>
  )
}
