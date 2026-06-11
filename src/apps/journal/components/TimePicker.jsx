import { useState } from 'react'

// Returns an ISO timestamp for a quick offset.
function offsetIso(minutesAgo) {
  const d = new Date(Date.now() - minutesAgo * 60_000)
  return d.toISOString()
}

function toLocalDateTimeValue(iso) {
  // for <input type="datetime-local">
  const d = new Date(iso)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalDateTimeValue(v) {
  // local string -> ISO UTC
  return new Date(v).toISOString()
}

export default function TimePicker({ value, onChange }) {
  const [showCustom, setShowCustom] = useState(false)

  const setOffset = (mins) => {
    setShowCustom(false)
    onChange(offsetIso(mins))
  }

  const quickOptions = [
    { label: 'Now',      mins: 0 },
    { label: '30m ago',  mins: 30 },
    { label: '1h ago',   mins: 60 },
    { label: '2h ago',   mins: 120 },
    { label: 'This morning', mins: morningOffset() },
  ]

  return (
    <div className="time-picker">
      <div className="chip-row">
        {quickOptions.map(opt => (
          <button
            key={opt.label}
            type="button"
            className="chip chip-sm"
            onClick={() => setOffset(opt.mins)}
          >
            {opt.label}
          </button>
        ))}
        <button
          type="button"
          className={`chip chip-sm ${showCustom ? 'on' : ''}`}
          onClick={() => setShowCustom(s => !s)}
        >
          Custom
        </button>
      </div>
      {showCustom && (
        <input
          type="datetime-local"
          className="input"
          style={{ marginTop: 10 }}
          value={toLocalDateTimeValue(value)}
          onChange={e => onChange(fromLocalDateTimeValue(e.target.value))}
        />
      )}
      <p className="time-picker-preview">
        Logging at <strong>{new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</strong>
        <span className="muted"> · {new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
      </p>
      <style>{`
        .time-picker-preview {
          margin: 10px 0 0;
          font-size: 13px;
          color: var(--text-soft);
        }
      `}</style>
    </div>
  )
}

// "This morning" → 8am today
function morningOffset() {
  const now = new Date()
  const morning = new Date(now)
  morning.setHours(8, 0, 0, 0)
  const diff = Math.floor((now - morning) / 60_000)
  return diff > 0 ? diff : 0
}
