import { useState } from 'react'
import * as store from '../lib/store'
import { todayStr } from '../constants'
import { Button } from '../../../ds'

export default function AddEvent({ defaultDate, onDone }) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(defaultDate || todayStr())
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const save = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const event_time = time ? new Date(`${date}T${time}`).toISOString() : null
      await store.addEvent({
        title: title.trim(),
        event_date: date,
        event_time,
        kind: 'family',
        notes: notes.trim() || null,
      })
      onDone?.()
    } catch (e) {
      setError(e.message || String(e))
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <label className="field">
        <span>Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Dentist, trash day, birthday…"
          autoFocus
        />
      </label>
      <div className="field-row">
        <label className="field">
          <span>Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span>Time (optional)</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      <label className="field">
        <span>Notes (optional)</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. bring paperwork" />
      </label>
      {error && <div className="error">{error}</div>}
      <Button
        variant="primary"
        block
        onClick={save}
        disabled={saving || !title.trim()}
      >
        {saving ? 'Saving…' : 'Save event'}
      </Button>
    </div>
  )
}
