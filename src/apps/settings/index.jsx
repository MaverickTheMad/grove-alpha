import { useState, useEffect, useCallback } from 'react'
import './settings.css'
import * as db from '../../lib/data'
import { currentUser, members } from '../../lib/identity'
import { signOut } from '../../lib/auth'
import { mode as groveMode } from '../../config'
import { getTheme, setTheme, subscribeTheme } from '../../lib/theme'
import { useToast } from '../../components/Toast'

export const meta = { id: 'settings', name: 'Settings', tagline: 'Appearance, account & data' }

const VERSION = '0.1.0 · alpha'

// Apps that own records (Settings itself stores nothing).
const DATA_APPS = [
  { id: 'journal', name: "Ren's Journal" },
  { id: 'pantry', name: 'Pantry & List' },
  { id: 'ledger', name: 'Ledger' },
  { id: 'fitness', name: 'Reps' },
  { id: 'quest', name: "Mav's Quest Log" },
  { id: 'pets', name: 'Pets' },
  { id: 'almanac', name: 'Almanac' },
]

const THEMES = [
  { id: 'auto', label: 'Auto', hint: 'Match system' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
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

export default function Settings() {
  const toast = useToast()
  const user = currentUser()
  const people = members()

  const [theme, setThemeLocal] = useState(getTheme)
  useEffect(() => subscribeTheme(setThemeLocal), [])
  const chooseTheme = (t) => setTheme(t)

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
    const ok = window.confirm(
      `Clear all ${n} ${app.name} record${n === 1 ? '' : 's'}?\n\nThis soft-deletes them (they're marked deleted, not purged). Export a backup first if you're unsure.`,
    )
    if (!ok) return
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
      <div className="set-head">
        <h1>Settings</h1>
        <p>Grove — one home for the household's tools.</p>
      </div>

      <Section title="Appearance" subtitle="Grove is dark-first; pick what suits the room.">
        <div className="seg" role="tablist" aria-label="Theme">
          {THEMES.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={theme === t.id}
              className={'seg-btn' + (theme === t.id ? ' on' : '')}
              onClick={() => chooseTheme(t.id)}
            >
              {t.label}
              {t.hint && <span className="seg-hint">{t.hint}</span>}
            </button>
          ))}
        </div>
      </Section>

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
            <button className="btn ghost" onClick={() => signOut()}>Sign out</button>
          </div>
        </div>
      </Section>

      <Section title="Household" subtitle="Grove is a shared vault — both members see the same records.">
        <div className="card set-card">
          {people.map((p) => (
            <div key={p.id} className="set-row member-row">
              <span className="who-dot" style={{ background: p.color }} />
              <span className="who-name">{p.name}</span>
              {user?.id === p.id && <span className="tag">you</span>}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Your data" subtitle={totalRecords != null ? `${totalRecords} records across ${DATA_APPS.length} apps.` : 'Counting…'}>
        <div className="card set-card">
          <table className="data-table">
            <tbody>
              {DATA_APPS.map((a) => (
                <tr key={a.id}>
                  <td className="dt-name">{a.name}</td>
                  <td className="dt-count">{counts ? counts[a.id] : '·'}</td>
                  <td className="dt-action">
                    <button
                      className="btn ghost sm danger-text"
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
        <button className="btn primary block" onClick={exportAll} disabled={busy}>
          {busy ? 'Working…' : 'Export a backup (JSON)'}
        </button>
        <p className="fine">
          Export downloads every record to a file you keep. Clearing soft-deletes an app's records;
          they're marked deleted rather than purged.
        </p>
      </Section>

      <Section title="About Grove">
        <div className="card set-card about">
          <div className="set-row"><span>Version</span><span className="mono">{VERSION}</span></div>
          <div className="set-row"><span>Mode</span><span className="mono">{groveMode}</span></div>
          <div className="set-row"><span>Apps</span><span className="mono">{DATA_APPS.length} + settings</span></div>
          <p className="fine about-note">
            Grove keeps the household's tools under one roof. In <strong>alpha</strong>, records are
            stored as plain JSON behind your login. <strong>Beta</strong> flips on end-to-end
            encryption and per-household accounts — the same code, one switch. Nothing here is sold,
            mined, or shown to anyone outside the household.
          </p>
        </div>
      </Section>

      <p className="set-foot">Grove — rooted, quiet, warm.</p>
    </main>
  )
}
