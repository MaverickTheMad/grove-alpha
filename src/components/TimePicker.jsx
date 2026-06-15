import { useState } from 'react'

// THE single TimePicker for the suite (journal & quest had drifted copies —
// build-spec §9). Quick presets + custom datetime. Returns an ISO string.
//
// The active preset highlights (.chip.on) and the resolved time is always shown
// below, so it's clear *when* an entry will be logged before you save.
const PRESETS = [
  { key: 'now', label: 'Now', mins: 0 },
  { key: '30m', label: '30m ago', mins: 30 },
  { key: '1h', label: '1h ago', mins: 60 },
  { key: '2h', label: '2h ago', mins: 120 },
]

function toLocalInputValue(d) {
  // yyyy-MM-ddTHH:mm in local time for <input type=datetime-local>
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Infer which preset a value corresponds to, so the right chip lights up on
// first render (e.g. editing an existing entry, or re-opening a panel).
function inferKey(value) {
  if (!value) return 'now'
  const t = new Date(value).getTime()
  const now = Date.now()
  for (const p of PRESETS) {
    // within 90s of the preset's target time → treat as that preset
    if (Math.abs(now - p.mins * 60000 - t) < 90000) return p.key
  }
  const d = new Date(value)
  const morning = new Date(); morning.setHours(8, 0, 0, 0)
  if (Math.abs(d.getTime() - morning.getTime()) < 60000) return 'morning'
  return 'custom'
}

function formatWhen(value) {
  const d = value ? new Date(value) : new Date()
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  if (sameDay) return `Today · ${time}`
  return `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${time}`
}

export default function TimePicker({ value, onChange }) {
  const [picked, setPicked] = useState(() => inferKey(value))
  const current = value ? new Date(value) : new Date()

  const pick = (p) => {
    setPicked(p.key)
    onChange(new Date(Date.now() - p.mins * 60000).toISOString())
  }

  const pickMorning = () => {
    setPicked('morning')
    const d = new Date()
    d.setHours(8, 0, 0, 0)
    onChange(d.toISOString())
  }

  return (
    <div className="stack" style={{ gap: 'var(--sp-2)' }}>
      <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
        {PRESETS.map((p) => (
          <button
            key={p.key}
            className={`chip ${picked === p.key ? 'on' : ''}`}
            aria-pressed={picked === p.key}
            onClick={() => pick(p)}
          >
            {p.label}
          </button>
        ))}
        <button
          className={`chip ${picked === 'morning' ? 'on' : ''}`}
          aria-pressed={picked === 'morning'}
          onClick={pickMorning}
        >
          This morning
        </button>
        <button
          className={`chip ${picked === 'custom' ? 'on' : ''}`}
          aria-pressed={picked === 'custom'}
          onClick={() => setPicked('custom')}
        >
          Custom
        </button>
      </div>

      {picked === 'custom' && (
        <input
          className="input"
          type="datetime-local"
          value={toLocalInputValue(current)}
          max={toLocalInputValue(new Date())}
          onChange={(e) => onChange(new Date(e.target.value).toISOString())}
        />
      )}

      {/* Always show the resolved time so it's clear when this will be logged */}
      <div className="tp-when" aria-live="polite">
        Logging at <strong>{formatWhen(value)}</strong>
      </div>

      <style>{`
        .tp-when {
          font-size: var(--fs-sm);
          color: var(--text-soft);
        }
        .tp-when strong {
          color: var(--text);
          font-family: var(--font-mono);
          font-weight: var(--fw-med);
        }
      `}</style>
    </div>
  )
}
