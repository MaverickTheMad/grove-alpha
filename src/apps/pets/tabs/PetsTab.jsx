import { useCallback, useEffect, useState } from 'react'
import * as store from '../lib/store.js'
import Sheet from '../../../components/Sheet'
import Confirm from '../components/Confirm.jsx'
import Toast from '../components/Toast.jsx'
import {
  IconPlus, IconEdit, IconCamera, IconSyringe, IconPill, IconStethoscope, IconScale,
  IconPaw, IconAlert, IconClock, IconCheck,
} from '../../../components/Icon'
import {
  SPECIES, COMMON_VACCINES, speciesMeta, ageFromBirthday, fmtDate, fmtMoney,
  relativeDays, daysUntil, todayStr,
} from '../constants.js'

export default function PetsTab({ pets, reloadPets }) {
  const [openPet, setOpenPet] = useState(null)
  const [editing, setEditing] = useState(null) // 'new' | pet object | null

  return (
    <div className="tab-pad">
      <div className="p-page-header">
        <h1 className="p-title">Pets</h1>
        <button className="p-add-btn" onClick={() => setEditing('new')}>Add pet</button>
      </div>

      {pets.length === 0 ? (
        <div className="empty full">
          <div className="p-empty-icon">
            <svg width="26" height="22" viewBox="0 0 26 22" fill="none">
              <ellipse cx="13" cy="14" rx="7" ry="6" fill="var(--app-accent)" />
              <circle cx="5" cy="4" r="3" fill="var(--app-accent)" />
              <circle cx="21" cy="4" r="3" fill="var(--app-accent)" />
            </svg>
          </div>
          <h3>No pets yet</h3>
          <p>Add a pet to track their care, reminders, and documents in one place.</p>
          <button className="p-add-btn" style={{ marginTop: 6, padding: '12px 22px' }} onClick={() => setEditing('new')}>Add your first pet</button>
        </div>
      ) : (
        <div className="pet-grid">
          {pets.map((p) => {
            const meta = speciesMeta(p.species)
            return (
              <button key={p.id} className="pet-card" onClick={() => setOpenPet(p)}>
                <div className="pet-card-photo">
                  {p.photo_url ? <img src={p.photo_url} alt={p.name} /> : meta.icon}
                </div>
                <div className="pet-card-body">
                  <div className="pet-name">{p.name}</div>
                  <div className="pet-sub">{meta.label}{p.breed ? ` · ${p.breed}` : ''}</div>
                  {p.birthday && (
                    <div className="pet-meta">{ageFromBirthday(p.birthday)}{p.birthday_estimated ? ' (est.)' : ''}</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {openPet && (
        <PetDetail
          pet={openPet}
          onClose={() => setOpenPet(null)}
          onEdit={() => { setEditing(openPet); setOpenPet(null) }}
        />
      )}

      <PetEditor
        open={!!editing}
        pet={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); reloadPets() }}
      />
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   Pet detail — profile + all sub-records
   ════════════════════════════════════════════════════════════════════ */
function PetDetail({ pet, onClose, onEdit }) {
  const meta = speciesMeta(pet.species)
  const [data, setData] = useState({ weights: [], vax: [], meds: [], conds: [], visits: [] })
  const [loading, setLoading] = useState(true)
  const [sub, setSub] = useState(null)         // which add-sheet is open
  const [editingVax, setEditingVax] = useState(null) // vax record | null
  const [toast, setToast] = useState(null)

  const load = useCallback(async () => {
    const [weights, vax, meds, conds, visits] = await Promise.all([
      store.listByPet('weight_log', pet.id, 'weighed_on', false),
      store.listByPet('vaccination', pet.id, 'next_due', true),
      store.listByPet('medication', pet.id, 'active', false),
      store.listByPet('condition', pet.id),
      store.listByPet('vet_visit', pet.id, 'visit_date', false),
    ])
    setData({ weights, vax, meds, conds, visits })
    setLoading(false)
  }, [pet.id])

  useEffect(() => { load() }, [load])

  // Delete with undo. We snapshot the row first so undo can re-insert it.
  const delWithUndo = async (type, id, label) => {
    const snap = await store.getOne(id)
    await store.remove(id)
    load()
    setToast({
      message: `Deleted ${label}`,
      undo: async () => {
        if (snap) { const { id: _omit, ...rest } = snap; await store.add(type, rest) }
        load()
      },
    })
  }

  const latestWeight = data.weights[0]
  const allergies = data.conds.filter((c) => c.kind === 'allergy')
  const conditions = data.conds.filter((c) => c.kind === 'condition')

  return (
    <Sheet
      open
      onClose={onClose}
      title={null}
    >
      {/* Hero photo strip */}
      {pet.photo_url ? (
        <div style={{ width: '100%', height: 160, overflow: 'hidden', borderRadius: 'var(--r-md)', marginBottom: 'var(--sp-3)', flexShrink: 0, background: 'var(--bg-elevated)' }}>
          <img src={pet.photo_url} alt={pet.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      ) : (
        <div style={{ width: '100%', height: 100, background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)', marginBottom: 'var(--sp-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, flexShrink: 0 }}>
          {meta.icon}
        </div>
      )}

      {/* Name + sub + edit */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text)' }}>{pet.name}</div>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-soft)', marginTop: 2 }}>
            {meta.label}{pet.breed ? ` · ${pet.breed}` : ''}
            {pet.sex ? ` · ${pet.sex}` : ''}{pet.fixed ? ' · fixed' : ''}
          </div>
        </div>
        <button className="btn ghost sm" onClick={onEdit}>
          <IconEdit size={13} /> Edit
        </button>
      </div>

      {/* Stats row in JetBrains Mono */}
      {(pet.birthday || latestWeight || pet.adoption_date) && (
        <div className="pet-stats-row" style={{ marginBottom: 'var(--sp-3)' }}>
          {pet.birthday && (
            <div className="pet-stat">
              <span className="pet-stat-label">Birthday</span>
              <span className="pet-stat-value">{fmtDate(pet.birthday)}</span>
            </div>
          )}
          {pet.birthday && (
            <div className="pet-stat">
              <span className="pet-stat-label">Age</span>
              <span className="pet-stat-value">{ageFromBirthday(pet.birthday)}{pet.birthday_estimated ? ' (est.)' : ''}</span>
            </div>
          )}
          {latestWeight && (
            <div className="pet-stat">
              <span className="pet-stat-label">Weight</span>
              <span className="pet-stat-value">{latestWeight.weight_lbs} lb</span>
            </div>
          )}
        </div>
      )}

      {/* Supplemental facts */}
      <div className="card" style={{ marginBottom: 'var(--sp-3)' }}>
        {pet.color && <div className="kv"><span className="k">Color / markings</span><span className="v">{pet.color}</span></div>}
        {pet.microchip && <div className="kv"><span className="k">Microchip</span><span className="v mono">{pet.microchip}</span></div>}
        {pet.vet_name && <div className="kv"><span className="k">Vet</span><span className="v">{pet.vet_name}</span></div>}
        {pet.vet_phone && (
          <div className="kv">
            <span className="k">Vet phone</span>
            <a className="subtle" href={`tel:${pet.vet_phone}`}>{pet.vet_phone}</a>
          </div>
        )}
        {(pet.food_brand || pet.food_amount) && (
          <div className="kv">
            <span className="k">Food</span>
            <span className="v">{[pet.food_brand, pet.food_amount].filter(Boolean).join(' · ')}</span>
          </div>
        )}
        {pet.adoption_date && <div className="kv"><span className="k">Adopted</span><span className="v">{fmtDate(pet.adoption_date)}</span></div>}
        {pet.notes && (
          <>
            <div className="divider" />
            <div className="muted sm" style={{ maxWidth: 'var(--measure)' }}>{pet.notes}</div>
          </>
        )}
      </div>

      {loading ? <div className="empty"><div className="big">⏳</div><p>Loading records&hellip;</p></div> : (
        <>
          {/* Allergies & conditions */}
          {(allergies.length > 0 || conditions.length > 0) && (
            <div className="card col-2">
              {allergies.length > 0 && (
                <>
                  <span className="section-sub">Allergies</span>
                  <div className="chip-row">
                    {allergies.map((a) => (
                      <span key={a.id} className="badge danger">
                        <IconAlert size={11} /> {a.name}
                      </span>
                    ))}
                  </div>
                </>
              )}
              {conditions.length > 0 && (
                <>
                  <span className="section-sub">Conditions</span>
                  <div className="chip-row">
                    {conditions.map((c) => (
                      <span key={c.id} className="badge soon">{c.name}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <SubSection title="Vaccinations" Ic={IconSyringe} onAdd={() => setSub('vax')}>
            {data.vax.length === 0 ? <Empty text="No vaccines logged" /> : data.vax.map((v) => {
              const d = daysUntil(v.next_due)
              const b = d == null ? 'later' : d < 0 ? 'overdue' : d <= 30 ? 'soon' : 'upcoming'
              return (
                <div className="row" key={v.id}>
                  <div className="grow">
                    <div className="title">{v.name}</div>
                    <div className="sub">
                      {v.date_given ? `Given ${fmtDate(v.date_given)}` : 'No date given'}
                      {v.next_due ? ` · next ${fmtDate(v.next_due)}` : ''}
                    </div>
                  </div>
                  {v.next_due && (
                    <span className={`badge ${b}`}>
                      {b === 'overdue' ? <IconAlert size={11} /> : <IconClock size={11} />}
                      {relativeDays(v.next_due)}
                    </span>
                  )}
                  <button className="icon-btn" aria-label="Edit vaccination"
                    onClick={() => setEditingVax(v)} style={{ width: 36, height: 36 }}>
                    <IconEdit size={15} />
                  </button>
                  <button className="row-x" aria-label="Delete vaccination"
                    onClick={() => delWithUndo('vaccination', v.id, v.name)}>✕</button>
                </div>
              )
            })}
          </SubSection>

          <SubSection title="Medications" Ic={IconPill} onAdd={() => setSub('med')}>
            {data.meds.length === 0 ? <Empty text="No medications" /> : data.meds.map((m) => (
              <div className="row" key={m.id}>
                <div className="grow">
                  <div className="title" style={{ display:'flex', alignItems:'center', gap:6 }}>
                    {m.name}
                    {!m.active && <span className="badge muted">inactive</span>}
                  </div>
                  <div className="sub">
                    {[m.dose, m.frequency].filter(Boolean).join(' · ')}
                    {m.refill_due ? ` · refill ${fmtDate(m.refill_due)}` : ''}
                  </div>
                </div>
                <button className="row-x" aria-label="Delete medication"
                  onClick={() => delWithUndo('medication', m.id, m.name)}>✕</button>
              </div>
            ))}
          </SubSection>

          <SubSection title="Vet visits" Ic={IconStethoscope} onAdd={() => setSub('visit')}>
            {data.visits.length === 0 ? <Empty text="No visits logged" /> : data.visits.map((v) => (
              <div className="row" key={v.id}>
                <div className="grow">
                  <div className="title">{v.reason || 'Visit'}</div>
                  <div className="sub">{fmtDate(v.visit_date)}{v.vet ? ` · ${v.vet}` : ''}</div>
                </div>
                {v.cost != null && <span className="badge app mono">{fmtMoney(v.cost)}</span>}
                <button className="row-x" aria-label="Delete visit"
                  onClick={() => delWithUndo('vet_visit', v.id, 'visit')}>✕</button>
              </div>
            ))}
          </SubSection>

          <SubSection title="Weight log" Ic={IconScale} onAdd={() => setSub('weight')}>
            {data.weights.length === 0 ? <Empty text="No weights yet" /> : (
              <>
                <WeightSparkline weights={data.weights} />
                {data.weights.slice(0, 6).map((w) => (
                  <div className="row" key={w.id}>
                    <div className="grow">
                      <div className="title mono">{w.weight_lbs} lbs</div>
                      <div className="sub">{fmtDate(w.weighed_on)}{w.notes ? ` · ${w.notes}` : ''}</div>
                    </div>
                    <button className="row-x" aria-label="Delete weight"
                      onClick={() => delWithUndo('weight_log', w.id, 'weight')}>✕</button>
                  </div>
                ))}
              </>
            )}
          </SubSection>

          <div className="section-h-row">
            <span className="section-sub">Allergy / condition</span>
            <button className="btn ghost sm" onClick={() => setSub('cond')}>
              <IconPlus size={14} /> Add
            </button>
          </div>
        </>
      )}

      <AddRecord
        open={!!sub} kind={sub} pet={pet}
        onClose={() => setSub(null)}
        onSaved={() => { setSub(null); load() }}
      />

      <EditVax
        vax={editingVax} pet={pet}
        onClose={() => setEditingVax(null)}
        onSaved={() => { setEditingVax(null); load() }}
      />

      <Toast
        toast={toast}
        onUndo={() => toast?.undo?.()}
        onDismiss={() => setToast(null)}
      />
    </Sheet>
  )
}

function Empty({ text }) {
  return <div className="muted sm" style={{ padding: '10px 2px' }}>{text}</div>
}

/* ════════════════════════════════════════════════════════════════════
   EditVax — edit an existing vaccination record
   ════════════════════════════════════════════════════════════════════ */
function EditVax({ vax, pet, onClose, onSaved }) {
  const [f, setF] = useState({})
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  useEffect(() => {
    if (vax) {
      setF({ name: vax.name || '', date_given: vax.date_given || '', next_due: vax.next_due || '' })
      setSaving(false)
    }
  }, [vax])

  const valid = f.name?.trim()

  const save = async () => {
    if (!valid || saving) return
    setSaving(true)
    try {
      await store.update(vax.id, {
        name: f.name.trim(),
        date_given: f.date_given || null,
        next_due: f.next_due || null,
      })
      onSaved()
    } catch (e) {
      console.error(e); setSaving(false)
    }
  }

  return (
    <Sheet
      open={!!vax}
      onClose={onClose}
      title="Edit vaccination"
      footer={
        <button className="btn primary block cta-big" disabled={!valid || saving} onClick={save}>
          {saving ? 'Saving…' : 'Save vaccination'}
        </button>
      }
    >
      <div className="field">
        <label>Vaccine</label>
        <input className="input" value={f.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Rabies" />
        {pet && (
          <div className="chip-row" style={{ marginTop: 8 }}>
            {(COMMON_VACCINES[pet.species] || []).map((v) => (
              <button key={v} type="button"
                className={`chip ${f.name === v ? 'on' : ''}`}
                onClick={() => set('name', v)}>{v}</button>
            ))}
          </div>
        )}
      </div>
      <div className="field-row">
        <div className="field">
          <label>Date given</label>
          <input className="input" type="date" max={todayStr()} value={f.date_given || ''} onChange={(e) => set('date_given', e.target.value)} />
        </div>
        <div className="field">
          <label>Next due</label>
          <input className="input" type="date" value={f.next_due || ''} onChange={(e) => set('next_due', e.target.value)} />
        </div>
      </div>
    </Sheet>
  )
}

function SubSection({ title, Ic, onAdd, children }) {
  return (
    <section className="col-2">
      <div className="section-h-row">
        <span className="section-sub" style={{ display:'inline-flex', alignItems:'center', gap:6 }}>
          {Ic && <Ic size={13} />} {title}
        </span>
        <button className="btn ghost sm" onClick={onAdd}>
          <IconPlus size={14} /> Add
        </button>
      </div>
      <div className="card flush-list">{children}</div>
    </section>
  )
}

/* Tiny inline SVG sparkline of weight over time. Honey accent line. */
function WeightSparkline({ weights }) {
  if (weights.length < 2) return null
  const pts = [...weights].reverse() // oldest → newest
  const vals = pts.map((w) => Number(w.weight_lbs))
  const min = Math.min(...vals), max = Math.max(...vals)
  const range = max - min || 1
  const W = 300, H = 60, pad = 6
  const coords = pts.map((w, i) => {
    const x = pad + (i / (pts.length - 1)) * (W - pad * 2)
    const y = H - pad - ((Number(w.weight_lbs) - min) / range) * (H - pad * 2)
    return `${x},${y}`
  }).join(' ')
  return (
    <div className="spark-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="spark">
        <polyline points={coords} fill="none" stroke="var(--app-accent)" strokeWidth="2"
          strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="spark-meta">
        <span>{min} lbs</span>
        <span>{max} lbs</span>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   AddRecord — one sheet handles vax / med / visit / weight / cond
   ════════════════════════════════════════════════════════════════════ */
function AddRecord({ open, kind, pet, onClose, onSaved }) {
  const [f, setF] = useState({})
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  // Reset form when the sheet opens with a new kind
  useEffect(() => {
    if (open) {
      setF({
        name: '', date_given: todayStr(), next_due: '',
        dose: '', frequency: '', refill_due: '',
        reason: '', visit_date: todayStr(), vet: pet?.vet_name || '', cost: '',
        weight_lbs: '', weighed_on: todayStr(),
        kindSel: 'allergy', notes: '',
      })
      setSaving(false)
    }
  }, [open, kind, pet])

  const titles = {
    vax: 'Add vaccination', med: 'Add medication', visit: 'Add vet visit',
    weight: 'Add weight', cond: 'Add allergy or condition',
  }
  const ctas = {
    vax: 'Save vaccination', med: 'Save medication', visit: 'Save visit',
    weight: 'Save weight', cond: 'Save record',
  }

  const valid =
    (kind === 'vax'    && f.name?.trim()) ||
    (kind === 'med'    && f.name?.trim()) ||
    (kind === 'visit'  && true) ||
    (kind === 'weight' && f.weight_lbs) ||
    (kind === 'cond'   && f.name?.trim())

  const save = async () => {
    if (!valid || saving) return
    setSaving(true)
    try {
      if (kind === 'vax') {
        await store.add('vaccination', {
          pet_id: pet.id, name: f.name.trim(),
          date_given: f.date_given || null, next_due: f.next_due || null,
          notes: f.notes || null,
        })
      } else if (kind === 'med') {
        await store.add('medication', {
          pet_id: pet.id, name: f.name.trim(), active: true,
          dose: f.dose || null, frequency: f.frequency || null,
          refill_due: f.refill_due || null, notes: f.notes || null,
        })
      } else if (kind === 'visit') {
        await store.add('vet_visit', {
          pet_id: pet.id, reason: f.reason || null, visit_date: f.visit_date,
          vet: f.vet || null, cost: f.cost ? Number(f.cost) : null, notes: f.notes || null,
        })
      } else if (kind === 'weight') {
        await store.add('weight_log', {
          pet_id: pet.id, weight_lbs: Number(f.weight_lbs),
          weighed_on: f.weighed_on, notes: f.notes || null,
        })
      } else if (kind === 'cond') {
        await store.add('condition', {
          pet_id: pet.id, kind: f.kindSel, name: f.name.trim(), notes: f.notes || null,
        })
      }
      onSaved()
    } catch (e) {
      console.error(e); setSaving(false)
    }
  }

  return (
    <Sheet
      open={open && !!kind}
      onClose={onClose}
      title={titles[kind] || ''}
      footer={
        <button className="btn primary block cta-big" disabled={!valid || saving} onClick={save}>
          {saving ? 'Saving…' : (ctas[kind] || 'Save')}
        </button>
      }
    >
      {kind === 'vax' && (
        <>
          <div className="field">
            <label>Vaccine</label>
            <input className="input" value={f.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Rabies" />
            <div className="chip-row" style={{ marginTop: 8 }}>
              {(COMMON_VACCINES[pet.species] || []).map((v) => (
                <button key={v} type="button"
                  className={`chip ${f.name === v ? 'on' : ''}`}
                  onClick={() => set('name', v)}>{v}</button>
              ))}
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Date given</label>
              <input className="input" type="date" value={f.date_given || ''} onChange={(e) => set('date_given', e.target.value)} />
            </div>
            <div className="field">
              <label>Next due</label>
              <input className="input" type="date" value={f.next_due || ''} onChange={(e) => set('next_due', e.target.value)} />
            </div>
          </div>
        </>
      )}

      {kind === 'med' && (
        <>
          <div className="field">
            <label>Medication</label>
            <input className="input" value={f.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Apoquel" />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Dose</label>
              <input className="input" value={f.dose || ''} onChange={(e) => set('dose', e.target.value)} placeholder="50mg" />
            </div>
            <div className="field">
              <label>Frequency</label>
              <input className="input" value={f.frequency || ''} onChange={(e) => set('frequency', e.target.value)} placeholder="1× daily" />
            </div>
          </div>
          <div className="field">
            <label>Refill due</label>
            <input className="input" type="date" value={f.refill_due || ''} onChange={(e) => set('refill_due', e.target.value)} />
          </div>
        </>
      )}

      {kind === 'visit' && (
        <>
          <div className="field">
            <label>Reason</label>
            <input className="input" value={f.reason || ''} onChange={(e) => set('reason', e.target.value)} placeholder="Annual checkup" />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Date</label>
              <input className="input" type="date" value={f.visit_date || ''} onChange={(e) => set('visit_date', e.target.value)} />
            </div>
            <div className="field">
              <label>Cost</label>
              <input className="input" type="number" inputMode="decimal" value={f.cost || ''}
                onChange={(e) => set('cost', e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="field">
            <label>Vet / clinic</label>
            <input className="input" value={f.vet || ''} onChange={(e) => set('vet', e.target.value)} />
          </div>
        </>
      )}

      {kind === 'weight' && (
        <div className="field-row">
          <div className="field">
            <label>Weight (lbs)</label>
            <input className="input mono" type="number" inputMode="decimal" value={f.weight_lbs || ''}
              onChange={(e) => set('weight_lbs', e.target.value)} placeholder="0" />
          </div>
          <div className="field">
            <label>Date</label>
            <input className="input" type="date" value={f.weighed_on || ''} onChange={(e) => set('weighed_on', e.target.value)} />
          </div>
        </div>
      )}

      {kind === 'cond' && (
        <>
          <div className="field">
            <label>Type</label>
            <div className="chip-row">
              <button type="button" className={`chip ${f.kindSel === 'allergy' ? 'on' : ''}`}
                onClick={() => set('kindSel', 'allergy')}>Allergy</button>
              <button type="button" className={`chip ${f.kindSel === 'condition' ? 'on' : ''}`}
                onClick={() => set('kindSel', 'condition')}>Condition</button>
            </div>
          </div>
          <div className="field">
            <label>Name</label>
            <input className="input" value={f.name || ''} onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Chicken, or Arthritis" />
          </div>
        </>
      )}

      <div className="field">
        <label>Notes</label>
        <textarea className="textarea" value={f.notes || ''} onChange={(e) => set('notes', e.target.value)} />
      </div>
    </Sheet>
  )
}

/* ════════════════════════════════════════════════════════════════════
   PetEditor — create / edit profile (with photo upload, archive)
   ════════════════════════════════════════════════════════════════════ */
function PetEditor({ open, pet, onClose, onSaved }) {
  const blank = {
    name: '', species: 'dog', breed: '', sex: '', fixed: false,
    birthday: '', birthday_estimated: false, adoption_date: '',
    color: '', microchip: '', photo_url: '',
    vet_name: '', vet_phone: '', vet_address: '',
    food_brand: '', food_amount: '', notes: '',
  }
  const [f, setF] = useState(blank)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  useEffect(() => {
    if (open) {
      setF(pet ? { ...blank, ...pet } : blank)
      setSaving(false); setUploading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pet?.id])

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `photos/${Date.now()}.${ext}`
      const url = await store.uploadFile(path, file, { upsert: true })
      set('photo_url', url)
    } catch (err) {
      console.error(err)
      alert('Photo upload failed — check the pet-docs bucket exists.')
    }
    setUploading(false)
  }

  const save = async () => {
    if (!f.name?.trim() || saving) return
    setSaving(true)
    const payload = {
      ...f, name: f.name.trim(),
      birthday: f.birthday || null, adoption_date: f.adoption_date || null,
    }
    delete payload.id; delete payload.created_at
    if (pet) await store.updatePet(pet.id, payload)
    else await store.addPet(payload)
    onSaved()
  }

  const archive = async () => {
    if (!pet) return
    await store.archivePet(pet.id)
    onSaved()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={pet ? `Edit ${pet.name}` : 'Add a pet'}
      footer={
        <>
          <button className="btn primary block cta-big" disabled={!f.name?.trim() || saving} onClick={save}>
            {saving ? 'Saving…' : pet ? 'Save changes' : 'Add pet'}
          </button>
          {pet && (
            <button className="btn danger-text block" onClick={() => setConfirmArchive(true)}>
              Remove {pet.name}
            </button>
          )}
        </>
      }
    >
      {/* Photo */}
      <div className="center" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
        <div className="avatar lg app-tint">
          {f.photo_url ? <img src={f.photo_url} alt="" /> : speciesMeta(f.species).icon}
        </div>
        <label className="btn ghost sm" style={{ display: 'inline-flex' }}>
          <IconCamera size={13} />
          {uploading ? 'Uploading…' : f.photo_url ? 'Change photo' : 'Add photo'}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadPhoto} />
        </label>
      </div>

      <div className="field">
        <label>Name</label>
        <input className="input" value={f.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Mochi" />
      </div>

      <div className="field">
        <label>Species</label>
        <div className="chip-row">
          {SPECIES.map((s) => (
            <button key={s.value} type="button"
              className={`chip ${f.species === s.value ? 'on' : ''}`}
              onClick={() => set('species', s.value)}>
              <span>{s.icon}</span> {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Breed</label>
          <input className="input" value={f.breed || ''} onChange={(e) => set('breed', e.target.value)} placeholder="e.g. Tabby" />
        </div>
        <div className="field">
          <label>Sex</label>
          <select className="select" value={f.sex || ''} onChange={(e) => set('sex', e.target.value)}>
            <option value="">—</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Birthday</label>
          <input className="input" type="date" value={f.birthday || ''} onChange={(e) => set('birthday', e.target.value)} />
        </div>
        <div className="field">
          <label>Adopted</label>
          <input className="input" type="date" value={f.adoption_date || ''} onChange={(e) => set('adoption_date', e.target.value)} />
        </div>
      </div>

      <div className="field-row" style={{ gap:'var(--sp-4)' }}>
        <label className="field-check">
          <input type="checkbox" checked={!!f.fixed} onChange={(e) => set('fixed', e.target.checked)} />
          Spayed / neutered
        </label>
        <label className="field-check">
          <input type="checkbox" checked={!!f.birthday_estimated} onChange={(e) => set('birthday_estimated', e.target.checked)} />
          Age estimated
        </label>
      </div>

      <div className="field">
        <label>Color / markings</label>
        <input className="input" value={f.color || ''} onChange={(e) => set('color', e.target.value)} placeholder="e.g. black with white chest" />
      </div>
      <div className="field">
        <label>Microchip #</label>
        <input className="input mono" value={f.microchip || ''} onChange={(e) => set('microchip', e.target.value)} />
      </div>

      <div className="divider" />

      <div className="field">
        <label>Vet / clinic</label>
        <input className="input" value={f.vet_name || ''} onChange={(e) => set('vet_name', e.target.value)} />
      </div>
      <div className="field">
        <label>Vet phone</label>
        <input className="input" type="tel" value={f.vet_phone || ''} onChange={(e) => set('vet_phone', e.target.value)} />
      </div>

      <div className="divider" />

      <div className="field-row">
        <div className="field">
          <label>Food brand</label>
          <input className="input" value={f.food_brand || ''} onChange={(e) => set('food_brand', e.target.value)} placeholder="e.g. Purina Pro Plan" />
        </div>
        <div className="field">
          <label>Amount / schedule</label>
          <input className="input" value={f.food_amount || ''} onChange={(e) => set('food_amount', e.target.value)} placeholder="1 cup 2× / day" />
        </div>
      </div>

      <div className="field">
        <label>Notes</label>
        <textarea className="textarea" value={f.notes || ''} onChange={(e) => set('notes', e.target.value)} />
      </div>

      <Confirm
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        onConfirm={archive}
        title={`Remove ${pet?.name || 'this pet'}?`}
        body={<>This removes {pet?.name || 'this pet'}&rsquo;s profile, care history, and reminders. Documents already saved to Documents will stay in place.</>}
        confirmLabel={`Remove ${pet?.name || 'pet'}`}
        cancelLabel="Keep pet"
      />
    </Sheet>
  )
}
