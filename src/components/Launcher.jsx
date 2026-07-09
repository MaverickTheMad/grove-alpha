import { useEffect, useState } from 'react'
import GroveMark from './GroveMark'
import Icon from './Icon'
import * as data from '../lib/data'
import { members } from '../lib/identity'
import { byName } from '../lib/sort'

// ── App metadata ──────────────────────────────────────────────────────────────
// Taglines from the brand guide (design §1c).
const APP_META = {
  almanac: { icon: 'calendar', tagline: 'Seasons, dates & the year ahead' },
  fitness: { icon: 'workout',  tagline: 'Movement, logged gently' },
  journal: { icon: 'journal',  tagline: 'One line or a thousand' },
  ledger:  { icon: 'ledger',   tagline: 'Money, kept honest' },
  media:   { icon: 'media',    tagline: 'What you\'re watching & reading' },
  pantry:  { icon: 'pantry',   tagline: 'What\'s in the kitchen' },
  pets:    { icon: 'pets',     tagline: 'Care for the whole menagerie' },
  quest:   { icon: 'quest',    tagline: 'Goals worth the walk' },
  settings:{ icon: 'settings', tagline: 'Household & preferences' },
}

// ── Greeting ──────────────────────────────────────────────────────────────────
function timeOfDay() {
  const h = new Date().getHours()
  if (h < 5)  return 'Late night'
  if (h < 12) return 'Morning'
  if (h < 17) return 'Afternoon'
  if (h < 21) return 'Evening'
  return 'Night'
}

function greetingFor(household) {
  if (!household.length) return 'Welcome home.'
  if (household.length === 1) return `${household[0].name}.`
  if (household.length === 2) return 'you two.'
  return 'everyone.'
}

// ── Summary card ─────────────────────────────────────────────────────────────
// Each row: { icon, label, value }. Row hidden when value is null.
function useSummaryRows() {
  const [rows, setRows] = useState([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const results = await Promise.allSettled([
        // Almanac: events this week
        (async () => {
          // TODO: filter by week bounds once almanac event structure confirmed
          const recs = await data.list({ app: 'almanac', type: 'event' })
          const now = new Date()
          const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay())
          const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7)
          const thisWeek = recs.filter(r => {
            const d = r.data?.date ? new Date(r.data.date) : null
            return d && d >= weekStart && d < weekEnd
          })
          return thisWeek.length
            ? { app: 'almanac', icon: 'calendar', label: 'This week', value: `${thisWeek.length} event${thisWeek.length === 1 ? '' : 's'}` }
            : null
        })(),

        // Pantry: items running low (TODO: confirm type + status field)
        (async () => {
          // TODO wire: await data.list({ app: 'pantry', type: 'pantry_item' }) filter status low/out
          return null
        })(),

        // Ledger: next bill due (TODO: requires bill + payment join)
        (async () => {
          // TODO wire: upcoming bill from records
          return null
        })(),

        // Pets: next reminder (TODO: confirm reminder type)
        (async () => {
          // TODO wire: upcoming pet reminder
          return null
        })(),
      ])
      if (cancelled) return
      const built = results
        .filter(r => r.status === 'fulfilled' && r.value !== null)
        .map(r => r.value)
      setRows(built)
    }
    load()
    return () => { cancelled = true }
  }, [])

  return rows
}

function SummaryCard() {
  const rows = useSummaryRows()
  if (!rows.length) return null
  return (
    <div className="card launcher-summary-card">
      <p className="launcher-summary-eyebrow">Around the house</p>
      <ul className="launcher-summary-rows">
        {rows.map((r) => (
          <li key={r.app} className="launcher-summary-row" data-app={r.app}>
            <GroveMark size={16} color="var(--app-accent)" className="launcher-summary-mark" />
            <span className="launcher-summary-label">{r.label}</span>
            <span className="launcher-summary-value">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── App tile ──────────────────────────────────────────────────────────────────
function AppTile({ app, onOpen }) {
  const m = APP_META[app.id] || {}
  return (
    <button
      className="tile"
      data-app={app.id}
      onClick={() => onOpen(app.id)}
      aria-label={`Open ${app.name} — ${app.tagline || m.tagline}`}
    >
      <span className="tile-mark" aria-hidden>
        <GroveMark size={40} color="var(--app-accent)" />
      </span>
      <span className="tile-name">{app.name}</span>
      <span className="tile-sub">{app.tagline || m.tagline}</span>
    </button>
  )
}

// ── Launcher ──────────────────────────────────────────────────────────────────
export default function Launcher({ apps, onOpen, user, onSignOut, theme, onCycleTheme }) {
  const household = members()

  // Split settings from main apps; sort main apps alphabetically.
  const settingsApp = apps.find(a => a.id === 'settings')
  const mainApps = apps
    .filter(a => a.id !== 'settings')
    .sort(byName)

  return (
    <div className="app-root launcher-root">
      {/* ── Nav rail (desktop) / bottom bar (mobile) ── */}
      <nav className="bottom-nav" aria-label="Grove">
        <span className="rail-brand" aria-hidden>
          <GroveMark size={26} color="var(--accent)" />
        </span>
        {mainApps.map((a) => (
          <button
            key={a.id}
            className="nav-item"
            onClick={() => onOpen(a.id)}
            aria-label={a.name}
          >
            <Icon name={APP_META[a.id]?.icon || a.id} size={22} />
            <span>{a.name}</span>
          </button>
        ))}
        {settingsApp && (
          <button
            className="nav-item launcher-nav-settings"
            onClick={() => onOpen('settings')}
            aria-label="Settings"
          >
            <Icon name="settings" size={22} />
            <span>Settings</span>
          </button>
        )}
      </nav>

      {/* ── Content ── */}
      <div className="launcher-content">
        <header className="top-bar">
          <span className="row" style={{ gap: 'var(--sp-2)', flex: 1 }}>
            <GroveMark size={24} color="var(--accent)" aria-hidden />
            <span className="top-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Grove</span>
          </span>
          {onCycleTheme && (
            <button className="icon-btn" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} onClick={onCycleTheme}>
              <Icon name={theme === 'light' ? 'moon' : 'sun'} size={20} />
            </button>
          )}
          {user && (
            <button className="btn ghost sm" onClick={onSignOut}>Sign out</button>
          )}
        </header>

        <div className="launcher-body page wide">
          {/* Left column: greeting + app grid */}
          <section className="launcher-apps">
            <div className="launcher-greeting">
              <p className="launcher-eyebrow">{timeOfDay()}</p>
              <h1 className="launcher-hello">Hello, {greetingFor(household)}</h1>
            </div>

            <div className="tile-grid" role="list" aria-label="Apps">
              {mainApps.map((a) => (
                <div key={a.id} role="listitem">
                  <AppTile app={a} onOpen={onOpen} />
                </div>
              ))}
            </div>
          </section>

          {/* Right column: summary (desktop) / below grid (mobile) */}
          <aside className="launcher-aside">
            <SummaryCard />
          </aside>
        </div>
      </div>
    </div>
  )
}
