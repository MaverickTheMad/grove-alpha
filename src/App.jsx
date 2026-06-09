import { useEffect, useState, useCallback } from 'react'
import { exposedApps } from './config'
import Launcher from './components/Launcher'
import AppShell from './components/AppShell'
import AuthGate from './components/AuthGate'
import { ToastProvider } from './components/Toast'
import { signOut } from './lib/auth'
import { currentUser } from './lib/identity'

// App registry. Each app module default-exports its root component and a
// `meta` { id, name, tagline }. Adding an app = add it here + to exposedApps.
import Journal, { meta as journalMeta } from './apps/journal'
import Pantry, { meta as pantryMeta } from './apps/pantry'
import Ledger, { meta as ledgerMeta } from './apps/ledger'
import Pets, { meta as petsMeta } from './apps/pets'
import Media, { meta as mediaMeta } from './apps/media'

const REGISTRY = {
  journal: { Component: Journal, meta: journalMeta },
  pantry: { Component: Pantry, meta: pantryMeta },
  ledger: { Component: Ledger, meta: ledgerMeta },
  pets: { Component: Pets, meta: petsMeta },
  media: { Component: Media, meta: mediaMeta },
}

const THEME_KEY = 'grove_theme'
const THEME_CYCLE = ['auto', 'dark', 'light']

function applyTheme(theme) {
  const root = document.documentElement
  root.classList.remove('theme-dark', 'theme-light')
  if (theme === 'dark') root.classList.add('theme-dark')
  if (theme === 'light') root.classList.add('theme-light')
}

function appIdFromPath() {
  const seg = window.location.pathname.replace(/^\/+/, '').split('/')[0]
  return REGISTRY[seg] ? seg : null
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'auto')
  const [openApp, setOpenApp] = useState(appIdFromPath)

  useEffect(() => applyTheme(theme), [theme])
  useEffect(() => localStorage.setItem(THEME_KEY, theme), [theme])

  // path-based routing (/journal, /pantry, ...) with browser back support
  useEffect(() => {
    const onPop = () => setOpenApp(appIdFromPath())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const open = useCallback((id) => {
    window.history.pushState({}, '', `/${id}`)
    setOpenApp(id)
  }, [])

  const exit = useCallback(() => {
    window.history.pushState({}, '', '/')
    setOpenApp(null)
  }, [])

  const cycleTheme = useCallback(() => {
    setTheme((t) => THEME_CYCLE[(THEME_CYCLE.indexOf(t) + 1) % THEME_CYCLE.length])
  }, [])

  const apps = exposedApps.map((id) => ({ id, ...REGISTRY[id].meta }))
  const resolved =
    theme === 'auto'
      ? window.matchMedia?.('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark'
      : theme

  return (
    <ToastProvider>
      <AuthGate>
        {openApp && REGISTRY[openApp] ? (
          <AppShell
            app={openApp}
            name={REGISTRY[openApp].meta.name}
            theme={resolved}
            onCycleTheme={cycleTheme}
            onExit={exit}
          >
            {(() => {
              const Active = REGISTRY[openApp].Component
              return <Active />
            })()}
          </AppShell>
        ) : (
          <Launcher
            apps={apps}
            onOpen={open}
            user={currentUser()}
            onSignOut={signOut}
          />
        )}
      </AuthGate>
    </ToastProvider>
  )
}
