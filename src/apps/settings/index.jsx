import { useState, useEffect, useCallback } from 'react'
import './settings.css'
import * as db from '../../lib/data'
import { currentUser, members } from '../../lib/identity'
import { signOut } from '../../lib/auth'
import { mode as groveMode } from '../../config'
import { getTheme, setTheme, subscribeTheme } from '../../lib/theme'
import { useToast } from '../../components/Toast'
import Sheet from '../../components/Sheet'
import { sortByName } from '../../lib/sort'

export const meta = { id: 'settings', name: 'Settings', tagline: 'Appearance, account & data' }

const VERSION = '0.1.0 · alpha'

const DATA_APPS = [
  { id: 'almanac',  name: 'Almanac' },
  { id: 'fitness',  name: 'Fitness' },
  { id: 'journal',  name: 'Journal' },
  { id: 'ledger',   name: 'Ledger' },
  { id: 'media',    name: 'Media' },
  { id: 'pantry',   name: 'Pantry' },
  { id: 'pets',     name: 'Pets' },
  { id: 'quest',    name: 'Quest' },
]

const THEMES = [
  { id: 'auto',  label: 'Auto',  hint: 'Match system' },
  { id: 'light', label: 'Light' },
  { id: 'dark',  label: 'Dark' },
]

// Preset palette for member color swatches
const COLOR_PALETTE = [
  { label: 'Berry',  value: '#D06A82' },
  { label: 'Slate',  value: '#8593A6' },
  { label: 'Fern',   value: '#86B24F' },
  { label: 'Plum',   value: '#A986C4' },
  { label: 'Honey',  value: '#D8A24F' },
  { label: 'Coral',  value: '#CE6B62' },
  { label: 'Tide',   value: '#4CA39B' },
  { label: 'Dusk',   value: '#6F86C2' },
]

// App preferences — teaching placeholders; these will be wired to records in later builds
const APP_PREFS = [
  { id: 'media_autoplay',  label: 'Autoplay next episode',     app: 'Media',   type: 'toggle', default: true },
  { id: 'ledger_default',  label: 'Default account',           app: 'Ledger',  type: 'select',
    // TODO: read from data.list({ app:'ledger', type:'account' }) in Ledger build
    options: ['Personal checking', 'Joint savings'],
    default: 'Personal checking' },
  { id: 'pantry_remind',   label: 'Low-stock reminders',       app: 'Pantry',  type: 'toggle', default: false },
  { id: 'fitness_unit',    label: 'Weight unit',               app: 'Fitness', type: 'select',
    options: ['lbs', 'kg'],
    default: 'lbs' },
]

function Section({ title, subtitle, children }) {
  return (
    <section className="set-section">
      <header className="set-section-head">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </header>
      {children}
    </section>
  )
}

// ── Member sheet (add / edit) ──────────────────────────────────────────────
function MemberSheet({ open, onClose, member }) {
  const toast = useToast()
  const isNew = !member
  const [name, setName] = useState(member?.name ?? '')
  const [color, setColor] = useState(member?.color ?? COLOR_PALETTE[0].value)

  useEffect(() => {
    setName(member?.name ?? '')
    setColor(member?.color ?? COLOR_PALETTE[0].value)
  }, [member, open])

  const save = () => {
    if (!name.trim()) return
    // TODO (beta): persist member changes to identity/household record
    toast.show(isNew ? 'Member added in beta' : 'Changes apply in beta')
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isNew ? 'Add household member' : 'Edit member'}
      footer={
        <div className="sheet-row">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save} disabled={!name.trim()}>
            {isNew ? 'Add member' : 'Save changes'}
          </button>
        </div>
      }
    >
      <div className="set-field">
        <label htmlFor="member-name" className="set-label">Name</label>
        <input
          id="member-name"
          className="set-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Alex"
          autoComplete="off"
        />
      </div>
      <div className="set-field">
        <span className="set-label">Color</span>
        <div className="color-grid">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c.value}
              className={'color-swatch' + (color === c.value ? ' on' : '')}
              style={{ '--swatch': c.value }}
              aria-label={c.label}
              aria-pressed={color === c.value}
              onClick={() => setColor(c.value)}
            />
          ))}
        </div>
      </div>
    </Sheet>
  )
}

// ── Remove confirm sheet ───────────────────────────────────────────────────
function RemoveSheet({ open, onClose, member, onConfirm }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Remove member"
      footer={
        <div className="sheet-row">
          <button className="btn primary" onClick={onClose}>Keep {member?.name}</button>
          <button className="btn ghost danger-btn" onClick={onConfirm}>Remove</button>
        </div>
      }
    >
      <p className="set-consequence">
        Remove <strong>{member?.name}</strong> from the household? Their tagged entries stay, untagged.
      </p>
    </Sheet>
  )
}

export default function Settings() {
  const toast = useToast()
  const user = currentUser()
  const people = sortByName(members())

  // Theme
  const [theme, setThemeLocal] = useState(getTheme)
  useEffect(() => subscribeTheme(setThemeLocal), [])

  // Theme token preview values (resolved from CSS variables)
  const themePreview = { bg: 'var(--bg)', accent: 'var(--accent)' }

  // Member sheets
  const [editTarget, setEditTarget] = useState(null)    // null = closed, member obj = edit
  const [addOpen, setAddOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(null)

  const handleRemoveConfirm = () => {
    // TODO (beta): actually remove member from household
    toast.show(`${removeTarget?.name} removed`)
    setRemoveTarget(null)
  }

  // App preferences (local state; no backend yet)
  const [prefs, setPrefs] = useState(() =>
    Object.fromEntries(APP_PREFS.map((p) => [p.id, p.default]))
  )
  const setPref = (id, val) => setPrefs((prev) => ({ ...prev, [id]: val }))

  // Your data
  const [counts, setCounts] = useState(null)
  const [busy, setBusy] = useState(false)

  const loadCounts = useCallback(async () => {
    const entries = await Promise.all(
      DATA_APPS.map((a) => db.list({ app: a.id }).then((r) => [a.id, r.length]).catch(() => [a.id, 0])),
    )
    setCounts(Object.fromEntries(entries))
  }, [])
  useEffect(() => { loadCounts() }, [loadCounts])

  const totalRecords = counts ? Object.values(counts).reduce((s, n) => s + n, 0) : null

  const exportAll = async () => {
    setBusy(true)
    try {
      const data = {}
      for (const a of DATA_APPS) {
        try { data[a.id] = await db.list({ app: a.id }) } catch { data[a.id] = [] }
      }
      const payload = {
        grove: { version: VERSION, mode: groveMode, exported_at: new Date().toISOString() },
        data,
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `grove-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.show('Backup downloaded')
    } catch (e) {
      toast.show('Export failed: ' + (e.message || e))
    } finally {
      setBusy(false)
    }
  }

  const clearApp = async (app) => {
    const n = counts?.[app.id] || 0
    if (n === 0) return
    setBusy(true)
    try {
      const rows = await db.list({ app: app.id })
      await Promise.all(rows.map((r) => db.remove(r.id)))
      await loadCounts()
      toast.show(`Cleared ${app.name}`)
    } catch (e) {
      toast.show('Clear failed: ' + (e.message || e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="screen settings-page">

      {/* ── Theme ── */}
      <Section title="Theme">
        <div className="seg" role="tablist" aria-label="Theme">
          {THEMES.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={theme === t.id}
              className={'seg-btn' + (theme === t.id ? ' on' : '')}
              onClick={() => setTheme(t.id)}
            >
              <span className="seg-preview" aria-hidden>
                <span className="seg-preview-bg" />
                <span className="seg-preview-dot" />
              </span>
              {t.label}
              {t.hint && <span className="seg-hint">{t.hint}</span>}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Account ── */}
      <Section title="Account">
        <div className="card set-card">
          <div className="set-row">
            <div className="who">
              <span className="who-dot" style={{ background: user?.color || 'var(--info)' }} />
              <div>
                <div className="who-name">{user?.name || 'Member'}</div>
                {user?.username && <div className="who-sub">@{user.username}</div>}
              </div>
            </div>
          </div>
          <div className="set-row">
            <label className="set-inline-label" htmlFor="default-account">Default account</label>
            {/* TODO (Ledger build): populate from data.list({ app:'ledger', type:'account' }) */}
            <select id="default-account" className="set-select" value={prefs['ledger_default']}
              onChange={(e) => setPref('ledger_default', e.target.value)}>
              {APP_PREFS.find(p => p.id === 'ledger_default').options.map(o => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className="set-row set-row--sign-out">
            <button className="btn ghost sm" onClick={() => signOut()}>Sign out</button>
          </div>
        </div>
      </Section>

      {/* ── Household members ── */}
      <Section title="Household members" subtitle="Both members see the same records.">
        <div className="card set-card">
          {people.map((p) => (
            <div key={p.id} className="set-row member-row">
              <span className="who-dot" style={{ background: p.color }} />
              <span className="who-name">{p.name}</span>
              {user?.id === p.id && <span className="tag">you</span>}
              <div className="member-actions">
                <button className="btn ghost sm" onClick={() => setEditTarget(p)}>Edit</button>
                {user?.id !== p.id && (
                  <button className="btn ghost sm danger-btn" onClick={() => setRemoveTarget(p)}>Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button className="btn primary add-member-btn" onClick={() => setAddOpen(true)}>
          + Add household member
        </button>
      </Section>

      {/* ── App preferences ── */}
      <Section title="App preferences">
        <div className="card set-card">
          {APP_PREFS.filter(p => p.id !== 'ledger_default').map((p, i, arr) => (
            <div key={p.id} className="set-row pref-row">
              <div>
                <div className="pref-label">{p.label}</div>
                <div className="pref-app">{p.app}</div>
              </div>
              {p.type === 'toggle' ? (
                <button
                  role="switch"
                  aria-checked={prefs[p.id]}
                  className={'toggle' + (prefs[p.id] ? ' on' : '')}
                  onClick={() => setPref(p.id, !prefs[p.id])}
                  aria-label={p.label}
                />
              ) : (
                <select className="set-select" value={prefs[p.id]}
                  onChange={(e) => setPref(p.id, e.target.value)}>
                  {p.options.map(o => <option key={o}>{o}</option>)}
                </select>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* ── Your data ── */}
      <Section
        title="Your data"
        subtitle={totalRecords != null ? `${totalRecords} records across ${DATA_APPS.length} apps.` : 'Counting…'}
      >
        <div className="card set-card">
          <table className="data-table">
            <tbody>
              {DATA_APPS.map((a) => (
                <tr key={a.id}>
                  <td className="dt-name">{a.name}</td>
                  <td className="dt-count">{counts ? counts[a.id] : '·'}</td>
                  <td className="dt-action">
                    <button
                      className="btn ghost sm danger-btn"
                      disabled={busy || !counts || counts[a.id] === 0}
                      onClick={() => clearApp(a)}
                    >
                      Clear
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn ghost block" onClick={exportAll} disabled={busy}>
          {busy ? 'Working…' : 'Export a backup (JSON)'}
        </button>
        <p className="fine">
          Clearing soft-deletes an app's records; they're marked deleted rather than purged.
          Export downloads every record to a file you keep.
        </p>
      </Section>

      <p className="set-foot">Grove — rooted, quiet, warm.</p>

      {/* ── Sheets ── */}
      <MemberSheet
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        member={editTarget}
      />
      <MemberSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        member={null}
      />
      <RemoveSheet
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        member={removeTarget}
        onConfirm={handleRemoveConfirm}
      />
    </main>
  )
}
