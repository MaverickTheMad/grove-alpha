import { useCallback, useEffect, useState } from 'react'
import * as store from '../lib/store.js'
import Sheet from '../../../components/Sheet'
import Toast from '../components/Toast.jsx'
import {
  IconSyringe, IconPill, IconBell, IconAlert, IconClock, IconCheck, IconPlus, IconPaw,
} from '../../../components/Icon'
import {
  daysUntil, relativeDays, fmtDate, todayStr, speciesMeta, UPCOMING_WINDOW_DAYS,
} from '../constants.js'

// Severity bucket from days-until value.
function bucket(days) {
  if (days == null) return 'later'
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  if (days <= 7) return 'soon'
  if (days <= UPCOMING_WINDOW_DAYS) return 'upcoming'
  return 'later'
}

function BucketBadge({ b, due }) {
  const Ic = b === 'overdue' ? IconAlert : b === 'today' ? IconCheck : IconClock
  return (
    <span className={`badge ${b}`}>
      <Ic size={11} />
      {relativeDays(due)}
    </span>
  )
}

export default function RemindersTab({ pets, onJump }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState(null)

  const petById = (id) => pets.find((p) => p.id === id)

  const load = useCallback(async () => {
    setLoading(true)
    const petIds = pets.map((p) => p.id)
    if (petIds.length === 0) { setItems([]); setLoading(false); return }

    const petSet = new Set(petIds)
    const [vaxAll, medsAll, remAll] = await Promise.all([
      store.listAll('vaccination'),
      store.listAll('medication'),
      store.listAll('reminder'),
    ])
    const vax = vaxAll.filter((v) => petSet.has(v.pet_id) && v.next_due != null)
    const meds = medsAll.filter((m) => petSet.has(m.pet_id) && m.active && m.refill_due != null)
    const rem = remAll.filter((r) => petSet.has(r.pet_id) && !r.done)

    const all = []
    ;(vax || []).forEach((v) =>
      all.push({ key: 'vax-' + v.id, kind: 'Vaccine', label: v.name, due: v.next_due, pet_id: v.pet_id, Ic: IconSyringe }))
    ;(meds || []).forEach((m) =>
      all.push({ key: 'med-' + m.id, kind: 'Med refill', label: m.name, due: m.refill_due, pet_id: m.pet_id, Ic: IconPill }))
    ;(rem || []).forEach((r) =>
      all.push({ key: 'rem-' + r.id, kind: 'Reminder', label: r.title, due: r.due_date, pet_id: r.pet_id, Ic: IconBell, remId: r.id, repeat_days: r.repeat_days }))

    all.sort((a, b) => (a.due || '').localeCompare(b.due || ''))
    setItems(all); setLoading(false)
  }, [pets])

  useEffect(() => { load() }, [load])

  // Mark a custom reminder done. Auto-rolls forward if it has a repeat interval.
  // Either way, surface an Undo toast so a misfire is recoverable (polish §4).
  const markDone = async (item) => {
    if (item.repeat_days) {
      const next = new Date(item.due + 'T00:00:00')
      next.setDate(next.getDate() + Number(item.repeat_days))
      const nextStr = next.toISOString().slice(0, 10)
      await store.update(item.remId, { due_date: nextStr })
      setToast({
        message: `Done — rolled forward to ${fmtDate(nextStr)}`,
        undo: async () => { await store.update(item.remId, { due_date: item.due }); load() },
      })
    } else {
      await store.update(item.remId, { done: true })
      setToast({
        message: 'Done',
        undo: async () => { await store.update(item.remId, { done: false }); load() },
      })
    }
    load()
  }

  // ─── Empty: no pets ───
  if (pets.length === 0) {
    return (
      <div className="tab-pad">
        <h1 className="p-title" style={{ marginBottom: 20 }}>Reminders</h1>
        <div className="empty full">
          <div className="p-empty-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="1" width="14" height="15" rx="3" stroke="var(--app-accent)" strokeWidth="2" />
              <line x1="0" y1="15" x2="20" y2="15" stroke="var(--app-accent)" strokeWidth="2" />
            </svg>
          </div>
          <h3>No pets yet</h3>
          <p>Add Mav &amp; Ren&rsquo;s pets to start tracking vaccines, meds, and grooming.</p>
          <button className="p-add-btn" style={{ padding: '12px 22px', marginTop: 6 }} onClick={() => onJump('pets')}>Add a pet</button>
        </div>
      </div>
    )
  }

  const overdue  = items.filter((i) => bucket(daysUntil(i.due)) === 'overdue')
  const today    = items.filter((i) => bucket(daysUntil(i.due)) === 'today')
  const soon     = items.filter((i) => bucket(daysUntil(i.due)) === 'soon')
  const upcoming = items.filter((i) => bucket(daysUntil(i.due)) === 'upcoming')
  const later    = items.filter((i) => bucket(daysUntil(i.due)) === 'later')

  const Group = ({ title, list }) =>
    list.length === 0 ? null : (
      <section className="col-2">
        <div className="section-h-row">
          <span className="section-sub">{title}</span>
          <span className="muted sm mono">{list.length}</span>
        </div>
        <div className="card flush-list">
          {list.map((it) => {
            const pet = petById(it.pet_id)
            const b = bucket(daysUntil(it.due))
            return (
              <div className="rem-row" key={it.key}>
                {it.remId ? (
                  <input
                    type="checkbox"
                    className="rem-check"
                    aria-label={`Mark ${it.label} done`}
                    onChange={() => markDone(it)}
                  />
                ) : (
                  <div className="avatar app-tint">
                    {pet?.photo_url
                      ? <img src={pet.photo_url} alt="" />
                      : <it.Ic size={20} />}
                  </div>
                )}
                <div className="rem-row-body">
                  <div className="rem-row-title">{it.label}</div>
                  <div className="rem-row-sub">{pet?.name || '—'} · {it.kind}</div>
                </div>
                <span className={`rem-date ${b}`}>{relativeDays(it.due)}</span>
              </div>
            )
          })}
        </div>
      </section>
    )

  return (
    <div className="tab-pad">
      <div className="p-page-header">
        <h1 className="p-title">Reminders</h1>
        <button className="btn ghost sm" onClick={() => setAdding(true)}>
          <IconPlus size={14} /> Add
        </button>
      </div>

      {loading ? (
        <div className="empty"><div className="big">⏳</div><p>Loading&hellip;</p></div>
      ) : items.length === 0 ? (
        <div className="empty">
          <div className="p-empty-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="1" width="14" height="15" rx="3" stroke="var(--app-accent)" strokeWidth="2" />
              <line x1="0" y1="15" x2="20" y2="15" stroke="var(--app-accent)" strokeWidth="2" />
            </svg>
          </div>
          <h3>All caught up</h3>
          <p>Meds, vet visits, and grooming will show up here as they come due.</p>
          <button className="p-add-btn" style={{ padding: '12px 22px', marginTop: 6 }} onClick={() => setAdding(true)}>Add a reminder</button>
        </div>
      ) : (
        <>
          <Group title="Overdue" list={overdue} />
          <Group title="Today" list={today} />
          <Group title="This week" list={soon} />
          <Group title={`Next ${UPCOMING_WINDOW_DAYS} days`} list={upcoming} />
          <Group title="Later" list={later} />
        </>
      )}

      <AddReminder
        open={adding} pets={pets}
        onClose={() => setAdding(false)}
        onSaved={() => { setAdding(false); load() }}
      />

      <Toast
        toast={toast}
        onUndo={() => toast?.undo?.()}
        onDismiss={() => setToast(null)}
      />
    </div>
  )
}

function AddReminder({ open, pets, onClose, onSaved }) {
  const [petId, setPetId] = useState(pets[0]?.id || '')
  const [title, setTitle] = useState('')
  const [due, setDue] = useState(todayStr())
  const [repeat, setRepeat] = useState('')
  const [saving, setSaving] = useState(false)

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setPetId(pets[0]?.id || '')
      setTitle(''); setDue(todayStr()); setRepeat(''); setSaving(false)
    }
  }, [open, pets])

  const QUICK = [
    { label: 'Flea / tick',  repeat: 30 },
    { label: 'Heartworm',    repeat: 30 },
    { label: 'Nail trim',    repeat: 42 },
    { label: 'Grooming',     repeat: 56 },
  ]

  const save = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    await store.add('reminder', {
      pet_id: petId || null,
      title: title.trim(),
      due_date: due,
      repeat_days: repeat ? Number(repeat) : null,
      done: false,
    })
    onSaved()
  }

  return (
    <Sheet
      open={open} onClose={onClose} title="Add reminder"
      footer={
        <button className="btn primary block cta-big" disabled={!title.trim() || saving} onClick={save}>
          {saving ? 'Saving…' : 'Save reminder'}
        </button>
      }
    >
      <div className="field">
        <label>Pet</label>
        <select className="select" value={petId} onChange={(e) => setPetId(e.target.value)}>
          {pets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="field">
        <label>What</label>
        <input className="input" value={title} placeholder="e.g. Flea & tick dose"
          onChange={(e) => setTitle(e.target.value)} />
        <div className="chip-row" style={{ marginTop: 8 }}>
          {QUICK.map((q) => (
            <button key={q.label} className="chip" type="button"
              onClick={() => { setTitle(q.label); setRepeat(String(q.repeat)) }}>
              {q.label}
            </button>
          ))}
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>Due date</label>
          <input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        <div className="field">
          <label>Repeats every</label>
          <input className="input" type="number" inputMode="numeric" value={repeat}
            placeholder="optional · days" onChange={(e) => setRepeat(e.target.value)} />
          <div className="field-help">e.g. 30 for monthly</div>
        </div>
      </div>
    </Sheet>
  )
}
