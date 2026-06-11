import { useEffect, useState, useCallback } from 'react'
import { exposedApps } from './config'
import Launcher from './components/Launcher'
import AppShell from './components/AppShell'
import AuthGate from './components/AuthGate'
import { ToastProvider } from './components/Toast'
import { signOut } from './lib/auth'
import { currentUser } from './lib/identity'
import { getTheme, cycleTheme as cycleThemeShared, applyTheme, subscribeTheme, resolvedTheme } from './lib/theme'

// App registry. Each app module default-exports its root component and a
// `meta` { id, name, tagline }. Adding an app = add it here + to exposedApps.
import Journal, { meta as journalMeta } from './apps/journal'
import Pantry, { meta as pantryMeta } from './apps/pantry'
import Ledger, { meta as ledgerMeta } from './apps/ledger'
import Pets, { meta as petsMeta } from './apps/pets'
import Settings, { meta as settingsMeta } from './apps/settings'
import Quest, { meta as questMeta } from './apps/quest'
import Almanac, { meta as almanacMeta } from './apps/almanac'
import Fitness, { meta as fitnessMeta } from './apps/fitness'

const REGISTRY = {
  journal: { Component: Journal, meta: journalMeta },
  pantry: { Component: Pantry, meta: pantryMeta },
  ledger: { Component: Ledger, meta: ledgerMeta },
  pets: { Component: Pets, meta: petsMeta },
  settings: { Component: Settings, meta: settingsMeta },
  quest: { Component: Quest, meta: questMeta },
  almanac: { Component: Almanac, meta: almanacMeta },
  fitness: { Component: Fitness, meta: fitnessMeta },
}

function appIdFromPath() {
  const seg = window.location.pathname.replace(/^\/+/, '').split('/')[0]
  return REGISTRY[seg] ? seg : null
}

export default function App() {
  const [theme, setThemeState] = useState(getTheme)
  const [openApp, setOpenApp] = useState(appIdFromPath)

  useEffect(() => { applyTheme(theme) }, [theme])
  useEffect(() => subscribeTheme(setThemeState), [])

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

  const cycleTheme = useCallback(() => { cycleThemeShared() }, [])

  const apps = exposedApps.map((id) => ({ id, ...REGISTRY[id].meta }))
  const resolved = resolvedTheme(theme)

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
