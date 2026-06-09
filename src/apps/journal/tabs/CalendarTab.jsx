import { useState } from 'react'
import { todayStr } from '../../../lib/time'
import { fmtDate } from '../../../lib/money'
import { PHASES, PHASE_COLOR } from '../constants'
import { useToast } from '../../../components/Toast'
import Sheet from '../../../components/Sheet'
import Icon from '../../../components/Icon'

// The full SVG cycle-ring wheel (wedge-per-day, phase arcs, textPath labels)
// ports from the real CalendarTab (§13 #5). This alpha screen owns the data
// that drives phases: the period-start history (add/remove), plus the phase
// legend. computeCyclePhase reads these starts.
export default function CalendarTab({ periodStarts, addPeriodStart, removePeriodStart }) {
  const [confirm, setConfirm] = useState(null) // date pending removal
  const [newDate, setNewDate] = useState(todayStr())
  const toast = useToast()

  const sorted = [...periodStarts].sort().reverse()

  const add = async () => {
    if (periodStarts.includes(newDate)) return
    await addPeriodStart(newDate)
    toast.show('Period start added')
  }

  const doRemove = async () => {
    const d = confirm
    setConfirm(null)
    await removePeriodStart(d)
    // removing a start re-shifts every computed phase — undo offered (§4)
    toast.show('Period start removed', { actionLabel: 'Undo', onAction: () => addPeriodStart(d) })
  }

  return (
    <main className="screen">
      <div className="page-head">
        <h1>Cycle</h1>
        <p className="sub">Phases &amp; period history</p>
      </div>

      {/* phase legend (data colors via CSS vars) */}
      <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
        <div className="title" style={{ marginBottom: 'var(--sp-3)' }}>Phases</div>
        {PHASES.map((p) => (
          <div className="row" key={p.id} style={{ marginBottom: 'var(--sp-2)' }}>
            <span className="event-dot" style={{ background: PHASE_COLOR[p.id] }} />
            <span className="grow">{p.label}</span>
            <span className="sub num">days {p.start}{p.end ? `–${p.end}` : '+'}</span>
          </div>
        ))}
      </div>

      {/* period history */}
      <div className="card">
        <div className="spread" style={{ marginBottom: 'var(--sp-3)' }}>
          <span className="title">Period starts</span>
        </div>
        <div className="row" style={{ marginBottom: 'var(--sp-3)' }}>
          <input className="input" type="date" max={todayStr()} value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <button className="btn primary" onClick={add}>Add</button>
        </div>
        {sorted.length === 0 ? (
          <p className="sub">No period starts yet — add one above to compute phases.</p>
        ) : (
          <div className="stack">
            {sorted.map((d) => (
              <div className="row" key={d}>
                <span className="grow num">{fmtDate(d, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                <button className="btn danger sm" onClick={() => setConfirm(d)}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="scaffold-note" style={{ marginTop: 'var(--sp-4)' }}>
        <Icon name="info" size={16} /> The SVG cycle-ring wheel (per-day wedges, phase arcs, curved
        <code> textPath</code> labels, period-start ★) ports from the real <code>CalendarTab</code>.
      </div>

      {/* confirm removal — re-computes all phases, so confirm (§4) */}
      <Sheet
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Remove period start?"
        footer={
          <>
            <button className="btn ghost grow" onClick={() => setConfirm(null)}>Keep it</button>
            <button className="btn danger grow" onClick={doRemove}>Remove start</button>
          </>
        }
      >
        <p style={{ maxWidth: 'var(--measure)' }}>
          Removing {confirm && fmtDate(confirm, { month: 'long', day: 'numeric' })} re-shifts every
          computed cycle phase after it. You can undo right after.
        </p>
      </Sheet>
    </main>
  )
}
