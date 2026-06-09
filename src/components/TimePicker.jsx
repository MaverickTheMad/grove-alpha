import { useState } from 'react'

// THE single TimePicker for the suite (journal & quest had drifted copies —
// build-spec §9). Quick presets + custom datetime. Returns an ISO string.
const PRESETS = [
  { label: 'Now', mins: 0 },
  { label: '30m ago', mins: 30 },
  { label: '1h ago', mins: 60 },
  { label: '2h ago', mins: 120 },
]

function toLocalInputValue(d) {
  // yyyy-MM-ddTHH:mm in local time for <input type=datetime-local>
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function TimePicker({ value, onChange }) {
  const [custom, setCustom] = useState(false)
  const current = value ? new Date(value) : new Date()

  const pick = (mins) => {
    setCustom(false)
    onChange(new Date(Date.now() - mins * 60000).toISOString())
  }

  const pickMorning = () => {
    setCustom(false)
    const d = new Date()
    d.setHours(8, 0, 0, 0)
    onChange(d.toISOString())
  }

  return (
    <div className="stack" style={{ gap: 'var(--sp-2)' }}>
      <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
        {PRESETS.map((p) => (
          <button key={p.label} className="chip" onClick={() => pick(p.mins)}>
            {p.label}
          </button>
        ))}
        <button className="chip" onClick={pickMorning}>This morning</button>
        <button className={`chip ${custom ? 'on' : ''}`} onClick={() => setCustom(true)}>
          Custom
        </button>
      </div>
      {custom && (
        <input
          className="input"
          type="datetime-local"
          value={toLocalInputValue(current)}
          max={toLocalInputValue(new Date())}
          onChange={(e) => onChange(new Date(e.target.value).toISOString())}
        />
      )}
    </div>
  )
}
