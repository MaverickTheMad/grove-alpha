import { useCallback, useEffect, useState } from 'react'
import * as store from '../lib/store.js'
import Sheet from '../../../components/Sheet'
import { useToast } from '../../../components/Toast'
import { IconPlus, IconDoc, IconCamera } from '../../../components/Icon'
import { DOC_TYPES, speciesMeta, fmtDate, fmtMoney, todayStr } from '../constants.js'

export default function DocsTab({ pets }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')   // 'all' | 'household' | pet.id
  const [adding, setAdding] = useState(false)
  const toast = useToast()

  const petById = (id) => pets.find((p) => p.id === id)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await store.listAll('document', 'doc_date', false)
    setDocs(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const del = async (doc) => {
    const snap = { ...doc }
    await store.remove(doc.id)
    load()
    toast.show(`Deleted "${doc.title}"`, {
      actionLabel: 'Undo',
      onAction: async () => {
        const { id, created_at, ...rest } = snap
        await store.add('document', rest)
        load()
      },
    })
  }

  const shown = docs.filter((d) =>
    filter === 'all' ? true : filter === 'household' ? !d.pet_id : d.pet_id === filter,
  )
  const typeLabel = (v) => DOC_TYPES.find((t) => t.value === v)?.label || 'Other'

  // Receipt/invoice total for the current filter
  const total = shown
    .filter((d) => ['receipt', 'invoice'].includes(d.doc_type) && d.amount != null)
    .reduce((s, d) => s + Number(d.amount), 0)

  return (
    <div className="tab-pad">
      <div className="p-page-header">
        <h1 className="p-title">Documents</h1>
        <button className="btn ghost sm" onClick={() => setAdding(true)}>
          <IconPlus size={14} /> Add
        </button>
      </div>

      {/* Filter chips */}
      <div className="filter-row">
        <button className={`chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>All</button>
        {pets.map((p) => (
          <button key={p.id}
            className={`chip ${filter === p.id ? 'on' : ''}`}
            onClick={() => setFilter(p.id)}>
            <span>{speciesMeta(p.species).icon}</span> {p.name}
          </button>
        ))}
        <button className={`chip ${filter === 'household' ? 'on' : ''}`} onClick={() => setFilter('household')}>
          Household
        </button>
      </div>

      {/* Total strip — Honey accent (hero value of this tab) */}
      {total > 0 && (
        <div className="totals-strip">
          <span className="label">
            Spend{filter !== 'all' ? ' · filtered' : ''}
          </span>
          <span className="value mono">{fmtMoney(total)}</span>
        </div>
      )}

      {loading ? (
        <div className="empty"><div className="big">⏳</div><p>Loading&hellip;</p></div>
      ) : shown.length === 0 ? (
        <div className="empty">
          <div className="p-empty-icon">
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
              <rect x="1" y="1" width="14" height="18" rx="2" stroke="var(--app-accent)" strokeWidth="2" />
            </svg>
          </div>
          <h3>No documents yet</h3>
          <p>Keep vet records, insurance, and invoices together, linked to each pet.</p>
          <button className="p-add-btn" style={{ padding: '12px 22px', marginTop: 6 }} onClick={() => setAdding(true)}>Add a document</button>
        </div>
      ) : (
        <div className="doc-grid">
          {shown.map((d) => {
            const pet = petById(d.pet_id)
            const headLabel = `${pet ? pet.name : 'Household'} · ${typeLabel(d.doc_type)}`
            return (
              <div className="doc-card" key={d.id}>
                <div className="doc-card-head">{headLabel}</div>
                <div className="doc-card-sub">{d.title}</div>
                <div className="doc-card-date">{fmtDate(d.doc_date)}{d.amount != null ? ` · ${fmtMoney(d.amount)}` : ''}</div>
                <div className="doc-card-foot">
                  {d.file_url
                    ? <a className="btn ghost sm" href={d.file_url} target="_blank" rel="noreferrer">Open</a>
                    : <span />}
                  <button className="row-x" aria-label="Delete document" onClick={() => del(d)}>✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AddDoc
        open={adding} pets={pets}
        onClose={() => setAdding(false)}
        onSaved={() => { setAdding(false); load() }}
      />

    </div>
  )
}

function AddDoc({ open, pets, onClose, onSaved }) {
  const [f, setF] = useState({
    pet_id: '', title: '', doc_type: 'receipt',
    doc_date: todayStr(), amount: '', notes: '', file_url: '',
  })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fileName, setFileName] = useState('')
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))

  useEffect(() => {
    if (open) {
      setF({ pet_id: '', title: '', doc_type: 'receipt', doc_date: todayStr(), amount: '', notes: '', file_url: '' })
      setFileName(''); setSaving(false); setUploading(false)
    }
  }, [open])

  const upload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setFileName(file.name)
    try {
      const safe = file.name.replace(/[^\w.\-]/g, '_')
      const path = `docs/${Date.now()}-${safe}`
      const url = await store.uploadFile(path, file)
      set('file_url', url)
      if (!f.title) set('title', file.name.replace(/\.[^.]+$/, ''))
    } catch (err) {
      console.error(err)
      alert('Upload failed — make sure the pet-docs bucket exists and is public.')
    }
    setUploading(false)
  }

  const save = async () => {
    if (!f.title.trim() || saving) return
    setSaving(true)
    await store.add('document', {
      pet_id: f.pet_id || null,
      title: f.title.trim(),
      doc_type: f.doc_type,
      doc_date: f.doc_date,
      amount: f.amount ? Number(f.amount) : null,
      file_url: f.file_url || null,
      notes: f.notes || null,
    })
    onSaved()
  }

  const showAmount = ['receipt', 'invoice'].includes(f.doc_type)
  const ctaLabel = saving ? 'Saving…' : 'Save document'

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add document"
      footer={
        <button className="btn primary block cta-big"
          disabled={!f.title.trim() || saving || uploading} onClick={save}>
          {ctaLabel}
        </button>
      }
    >
      <div className="field">
        <label>File</label>
        <label className="photo-pick">
          <IconCamera size={20} />
          <span className="label">
            {uploading ? 'Uploading…' : f.file_url ? `✓ ${fileName}` : 'Choose file (PDF or photo)'}
          </span>
          <input type="file" accept="image/*,application/pdf" onChange={upload} />
        </label>
        <div className="field-help">Optional — you can log a record without a file.</div>
      </div>

      <div className="field">
        <label>Title</label>
        <input className="input" value={f.title} onChange={(e) => set('title', e.target.value)}
          placeholder="e.g. Annual checkup invoice" />
      </div>

      <div className="field-row">
        <div className="field">
          <label>Pet</label>
          <select className="select" value={f.pet_id} onChange={(e) => set('pet_id', e.target.value)}>
            <option value="">Household / general</option>
            {pets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Type</label>
          <select className="select" value={f.doc_type} onChange={(e) => set('doc_type', e.target.value)}>
            {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Date</label>
          <input className="input" type="date" value={f.doc_date} onChange={(e) => set('doc_date', e.target.value)} />
        </div>
        {showAmount && (
          <div className="field">
            <label>Amount</label>
            <input className="input mono" type="number" inputMode="decimal" value={f.amount}
              onChange={(e) => set('amount', e.target.value)} placeholder="0.00" />
          </div>
        )}
      </div>

      <div className="field">
        <label>Notes</label>
        <textarea className="textarea" value={f.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>
    </Sheet>
  )
}
