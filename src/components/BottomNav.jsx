import Icon from './Icon'
import GroveMark from './GroveMark'

// Bottom tab bar for an app. Active tab uses the full app accent (fill text +
// indicator); inactive tabs are --text-soft. Icon + label always (UI-POLISH §8).
//
// On mobile (< 720px): fixed bottom bar in the thumb zone.
// On desktop (≥ 720px): transforms into a fixed left rail via CSS only.
// The .rail-brand shows the Grove mark at the top of the rail on desktop;
// it is hidden on mobile.
export default function BottomNav({ tabs, active, onSelect }) {
  return (
    <nav className="bottom-nav" aria-label="App sections">
      {/* Grove mark — visible only in the desktop rail (CSS toggles display) */}
      <span className="rail-brand" aria-hidden>
        <GroveMark size={26} color="var(--accent)" />
      </span>

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
