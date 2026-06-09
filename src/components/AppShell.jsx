import Icon from './Icon'

// Wraps an app. Sets [data-app] so the app's accent scope applies (App.css),
// and gives the top chrome: back-to-launcher + app name + theme toggle.
// The app itself owns its bottom tab bar (two-level nav, never two bottom bars).
export default function AppShell({ app, name, theme, onCycleTheme, onExit, children }) {
  return (
    <div className="app-root" data-app={app}>
      <header className="top-bar">
        <button className="icon-btn" aria-label="Back to Grove" onClick={onExit}>
          <Icon name="back" size={22} />
        </button>
        <span className="top-title">{name}</span>
        <button className="icon-btn" aria-label="Toggle theme" onClick={onCycleTheme}>
          <Icon name={theme === 'light' ? 'sun' : 'moon'} size={20} />
        </button>
      </header>
      {children}
    </div>
  )
}
