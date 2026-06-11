import { useState } from 'react'

// Smart time picker: Now / 30m / 1h / 2h / this morning / custom.
// Returns an ISO timestamp via onChange. Tracks which preset is active
// so the selection is always visible, and shows the resolved time.
export default function TimePicker({ value, onChange }) {
  // active preset key: 'now' | '30' | '60' | '120' | 'morning' | 'custom'
  const [active, setActive] = useState('now')

  function setOffset(key, mins) {
    setActive(key)
    onChange(new Date(Date.now() - mins * 60000).toISOString())
  }
  function setMorning() {
    setActive('morning')
    const d = new Date()
    d.setHours(8, 0, 0, 0)
    onChange(d.toISOString())
  }
  function setCustomVal(localStr) {
    setActive('custom')
    onChange(new Date(localStr).toISOString())
  }

  const presets = [
    { key: 'now', label: 'Now', mins: 0 },
    { key: '30', label: '30m ago', mins: 30 },
    { key: '60', label: '1h ago', mins: 60 },
    { key: '120', label: '2h ago', mins: 120 },
  ]

  const localForInput = (() => {
    const d = value ? new Date(value) : new Date()
    const off = d.getTimezoneOffset()
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
  })()

  const chosenLabel = value
    ? new Date(value).toLocaleString('en-US', {
        weekday: 'short', hour: 'numeric', minute: '2-digit',
      })
    : ''

  return (
    <div>
      <div className="pill-wrap" style={{ marginBottom: 10 }}>
        {presets.map(p => (
          <button
            key={p.key}
            className={'pill' + (active === p.key ? ' sel' : '')}
            onClick={() => setOffset(p.key, p.mins)}
          >
            {p.label}
          </button>
        ))}
        <button className={'pill' + (active === 'morning' ? ' sel' : '')} onClick={setMorning}>This morning</button>
        <button className={'pill' + (active === 'custom' ? ' sel' : '')} onClick={() => setActive('custom')}>Custom</button>
      </div>

      {active === 'custom' && (
        <input
          type="datetime-local"
          value={localForInput}
          max={localForInput}
          onChange={e => setCustomVal(e.target.value)}
          style={{ width: '100%', padding: 10, borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--line)', marginBottom: 8 }}
        />
      )}

      {/* Confirmation line — always shows the resolved time */}
      <div className="time-confirm">
        <span className="time-confirm-dot">✓</span> Logging for <strong>{chosenLabel}</strong>
      </div>
    </div>
  )
}
