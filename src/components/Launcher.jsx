import { useEffect, useState } from 'react'
import GroveMark from './GroveMark'
import Icon from './Icon'
import * as data from '../lib/data'
import { members } from '../lib/identity'
import { byName } from '../lib/sort'

function useHiddenApps() {
  const [hidden, setHidden] = useState([])
  useEffect(() => {
    let alive = true
    data.list({ app: 'settings', type: 'app_setting' }).then((rows) => {
      if (!alive) return
      const r = rows.find((row) => row.data?.key === 'hidden_apps')
      if (r && Array.isArray(r.data.value)) setHidden(r.data.value)
    })
    return () => { alive = false }
  }, [])
  return hidden
}

// ── App metadata ──────────────────────────────────────────────────────────────
const APP_META = {
  almanac: { icon: 'calendar', tagline: 'Seasons, dates & the year ahead' },
  fitness: { icon: 'workout',  tagline: 'Movement, logged gently' },
  journal: { icon: 'journal',  tagline: 'One line or a thousand' },
  ledger:  { icon: 'ledger',   tagline: 'Money, kept honest' },
  media:   { icon: 'media',    tagline: "What you're watching & reading" },
  pantry:  { icon: 'pantry',   tagline: "What's in the kitchen" },
  pets:    { icon: 'pets',     tagline: 'Care for the whole menagerie' },
  quest:   { icon: 'quest',    tagline: 'Goals worth the walk' },
  settings:{ icon: 'settings', tagline: 'Household & preferences' },
}

const APP_DISPLAY_NAMES = {
  almanac: 'Almanac', fitness: 'Fitness', journal: 'Journal', ledger: 'Ledger',
  media: 'Media', pantry: 'Pantry', pets: 'Pets', quest: 'Quest', settings: 'Settings',
}

function ordinal(n) {
  const s = ['th','st','nd','rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

// ── Greeting ──────────────────────────────────────────────────────────────────
function dayName() { return DAYS[new Date().getDay()] }

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
function useSummaryRows() {
  const [rows, setRows] = useState([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const results = await Promise.allSettled([
        // Almanac: events this week
        (async () => {
          const recs = await data.list({ app: 'almanac', type: 'event' })
          const now = new Date()
          const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay())
          const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7)
          const thisWeek = recs.filter(r => {
            const d = r.data?.date ? new Date(r.data.date) : null
            return d && d >= weekStart && d < weekEnd
          })
          return thisWeek.length
            ? { app: 'almanac', label: 'This week', value: `${thisWeek.length} event${thisWeek.length === 1 ? '' : 's'}` }
            : null
        })(),

        // Pantry: meals planned this week
        (async () => {
          const rows = await data.list({ app: 'pantry', type: 'shopping_state' })
          const state = rows[0]?.data ?? {}
          const count = (state.selected_meals ?? []).length
          if (count === 0) return null
          return { app: 'pantry', label: 'Planned', value: `${count} meal${count === 1 ? '' : 's'}` }
        })(),

        // Ledger: unpaid bills this month
        (async () => {
          const now = new Date()
          const year = now.getFullYear()
          const month = now.getMonth() + 1
          const today = now.getDate()
          const mm = String(month).padStart(2, '0')
          const [bills, payments] = await Promise.all([
            data.list({ app: 'ledger', type: 'bill' }),
            data.list({ app: 'ledger', type: 'bill_payment' }),
          ])
          const paidKeys = new Set(
            payments.filter(p => p.data?.paid).map(p => `${p.data.bill_id}::${p.data.due_date}`)
          )
          const unpaid = bills
            .map(b => ({ ...b.data, id: b.id }))
            .filter(b => {
              const dueDate = `${year}-${mm}-${String(b.due_day || 1).padStart(2, '0')}`
              return !paidKeys.has(`${b.id}::${dueDate}`)
            })
            .sort((a, b) => (a.due_day ?? 1) - (b.due_day ?? 1))
          const nextDue = unpaid.find(b => (b.due_day ?? 1) >= today) || unpaid[0]
          if (!nextDue) return null
          return { app: 'ledger', label: `due the ${ordinal(nextDue.due_day ?? 1)}`, value: nextDue.name }
        })(),

        // Pets: overdue or upcoming vaccines
        (async () => {
          const recs = await data.list({ app: 'pets', type: 'vaccination' })
          const today = new Date(); today.setHours(0, 0, 0, 0)
          const vax = recs.map(r => r.data).filter(v => v.next_due)
          if (vax.length === 0) return null
          const overdue = vax.filter(v => new Date(v.next_due) < today)
          const upcoming = vax.filter(v => {
            const d = new Date(v.next_due)
            return d >= today && (d - today) / 86400000 <= 30
          })
          if (overdue.length > 0) {
            return { app: 'pets', label: overdue.length === 1 ? 'vaccine overdue' : 'vaccines overdue', value: overdue.length === 1 ? overdue[0].name : `${overdue.length}` }
          }
          if (upcoming.length > 0) {
            return { app: 'pets', label: 'vaccine due soon', value: upcoming[0].name }
          }
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
      <ul className="launcher-summary-rows">
        {rows.map((r) => (
          <li key={r.app} className="launcher-summary-row" data-app={r.app}>
            <span className="launcher-summary-mark" aria-hidden>
              <GroveMark size={24} color="var(--app-accent)" />
            </span>
            <span className="launcher-summary-body">
              <span className="launcher-summary-label">{APP_DISPLAY_NAMES[r.app] || r.app}</span>
              {' '}
              <span className="launcher-summary-sub">{r.label}</span>
            </span>
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
  const tagline = app.tagline || m.tagline
  return (
    <button
      className="tile"
      data-app={app.id}
      onClick={() => onOpen(app.id)}
      aria-label={`Open ${app.name} — ${tagline}`}
    >
      <span className="tile-mark" aria-hidden>
        <GroveMark size={24} color="var(--app-accent)" />
      </span>
      <span className="tile-texts">
        <span className="tile-name">{app.name}</span>
        <span className="tile-sub">{tagline}</span>
      </span>
    </button>
  )
}

// ── Launcher ──────────────────────────────────────────────────────────────────
export default function Launcher({ apps, onOpen, user, onSignOut, theme, onCycleTheme }) {
  const household = members()
  const hiddenApps = useHiddenApps()
  const settingsApp = apps.find(a => a.id === 'settings')
  const mainApps = apps.filter(a => a.id !== 'settings' && !hiddenApps.includes(a.id)).sort(byName)
  const tod = timeOfDay()

  return (
    <div className="app-root launcher-root">
      {/* ── Nav rail (desktop) / bottom bar (mobile) ── */}
      <nav className="bottom-nav" aria-label="Grove">
        <span className="rail-brand" aria-hidden>
          <GroveMark size={34} color="var(--accent)" />
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
        <header className="top-bar launcher-top-bar">
          <span className="row" style={{ gap: 'var(--sp-2)', flex: 1 }}>
            <GroveMark size={22} color="var(--accent)" aria-hidden />
            <span className="launcher-wordmark">Grove</span>
          </span>
          {onCycleTheme && (
            <div className="theme-pill" role="group" aria-label="Theme">
              <button
                className={`theme-pill-opt${theme !== 'light' ? ' on' : ''}`}
                onClick={() => theme === 'light' && onCycleTheme()}
                aria-pressed={theme !== 'light'}
              >Dark</button>
              <button
                className={`theme-pill-opt${theme === 'light' ? ' on' : ''}`}
                onClick={() => theme !== 'light' && onCycleTheme()}
                aria-pressed={theme === 'light'}
              >Light</button>
            </div>
          )}
          {user && (
            <button
              className="launcher-avatar-btn"
              onClick={() => onOpen('profile')}
              aria-label="Open profile"
              title={user.name}
            >
              <span className="launcher-avatar-initial">{user.name[0]?.toUpperCase()}</span>
            </button>
          )}
        </header>

        <div className="launcher-body">
          {/* Greeting: eyebrow + h1 */}
          <div className="launcher-greeting">
            <p className="launcher-eyebrow">{dayName().toLowerCase()} {tod.toLowerCase()}</p>
            <h1 className="launcher-hello">{tod}, {greetingFor(household)}</h1>
          </div>

          {/* Summary section: label + card — sits right-col on desktop, above apps on mobile */}
          <div className="launcher-summary-section">
            <p className="launcher-section-label">Around the house</p>
            <SummaryCard />
          </div>

          {/* Apps section: label + 2-col grid */}
          <div className="launcher-apps-section">
            <p className="launcher-section-label">All apps</p>
            <div className="tile-grid" role="list" aria-label="Apps">
              {mainApps.map((a) => (
                <div key={a.id} role="listitem">
                  <AppTile app={a} onOpen={onOpen} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
