import Icon from './Icon'

// Bottom tab bar for an app. Active tab uses the full app accent (fill text +
// indicator); inactive tabs are --text-soft. Icon + label always (UI-POLISH §8).
export default function BottomNav({ tabs, active, onSelect }) {
  return (
    <nav className="bottom-nav" aria-label="App sections">
      {tabs.map((t) => {
        const on = t.id === active
        return (
          <button
            key={t.id}
            className={`nav-item ${on ? 'on' : ''}`}
            aria-current={on ? 'page' : undefined}
            onClick={() => onSelect(t.id)}
          >
            <Icon name={t.icon} size={22} />
            <span>{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
