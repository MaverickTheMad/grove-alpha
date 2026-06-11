import { useState } from 'react'
import * as store from '../lib/store.js'
import { todayLocalISO } from '../constants.js'

export default function SetupScreen({ onComplete }) {
  const [lastPeriod, setLastPeriod] = useState('')
  const [priorPeriod, setPriorPeriod] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const today = todayLocalISO()

  const save = async () => {
    setError('')
    if (!lastPeriod) {
      setError("Please enter at least the most recent period start date.")
      return
    }
    setSaving(true)
    try {
      await store.addPeriodStart(lastPeriod)
      if (priorPeriod && priorPeriod !== lastPeriod) await store.addPeriodStart(priorPeriod)
    } catch (e) {
      setSaving(false); setError("Couldn't save — " + e.message); return
    }
    setSaving(false)
    onComplete()
  }

  return (
    <div className="setup-screen">
      <div className="setup-card rise">
        <h1 className="setup-title">
          Ren's Journal
        </h1>
        <p className="setup-lede">
          A quiet place to notice patterns — what your body's doing, what you've eaten, how you feel.
        </p>

        <div className="divider" />

        <p className="setup-prompt">
          To get started, when did your most recent period begin?
        </p>

        <label className="field-label">Most recent period start</label>
        <input
          type="date"
          className="input"
          value={lastPeriod}
          max={today}
          onChange={e => setLastPeriod(e.target.value)}
        />

        <label className="field-label" style={{ marginTop: 16 }}>
          Period before that <span className="muted" style={{ textTransform: 'none', fontWeight: 400 }}>(optional — helps estimate cycle length)</span>
        </label>
        <input
          type="date"
          className="input"
          value={priorPeriod}
          max={lastPeriod || today}
          onChange={e => setPriorPeriod(e.target.value)}
        />

        {error && <p className="setup-error">{error}</p>}

        <button
          className="btn primary block"
          style={{ marginTop: 24 }}
          onClick={save}
          disabled={saving || !lastPeriod}
        >
          {saving ? 'Saving…' : 'Begin'}
        </button>

        <p className="setup-footer">
          You can adjust or add more period dates later from the Calendar.
        </p>
      </div>

      <style>{`
        .setup-screen {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
        }
        .setup-card {
          max-width: 440px;
          width: 100%;
          background: var(--bg-paper);
          border: 1px solid var(--border);
          border-radius: var(--r-xl);
          padding: 36px 28px;
          box-shadow: 0 8px 32px rgba(0,0,0,.35);
        }
        .setup-title {
          font-family: var(--font-display);
          font-size: 38px;
          line-height: 1.1;
          margin: 0 0 12px;
          display: flex;
          align-items: baseline;
          gap: 12px;
        }
        .setup-lede {
          color: var(--text-soft);
          font-size: 15px;
          line-height: 1.55;
          margin: 0 0 4px;
        }
        .setup-prompt {
          font-family: var(--font-display);
          font-size: 19px;
          color: var(--text);
          margin: 0 0 18px;
          line-height: 1.4;
        }
        .setup-error {
          color: var(--app-accent);
          font-size: 13px;
          margin: 12px 0 0;
        }
        .setup-footer {
          font-size: 12px;
          color: var(--text-soft);
          text-align: center;
          margin: 18px 0 0;
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
