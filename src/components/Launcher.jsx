import GroveMark from './GroveMark'
import Icon from './Icon'

// Grove home: the launcher. A grid of app tiles, each = the Grove leaf mark
// tinted in that app's accent on the dark tile (BRAND-GUIDE §6). House green
// chrome; the tiles carry the per-app color.
const TILE_ACCENT = {
  journal: '#D06A82',
  pantry: '#CB7A4F',
  ledger: '#6F86C2',
  pets: '#D8A24F',
  media: '#4CA39B',
}

export default function Launcher({ apps, onOpen, user, onSignOut }) {
  return (
    <div className="app-root launcher">
      <header className="launcher-head">
        <div className="spread">
          <div className="row" style={{ gap: 'var(--sp-3)' }}>
            <GroveMark size={36} color="var(--accent)" />
            <h1 className="wordmark">Grove</h1>
          </div>
          {user && (
            <button className="btn ghost sm" onClick={onSignOut} aria-label="Sign out">
              <Icon name="back" size={18} /> Sign out
            </button>
          )}
        </div>
        <p className="sub">
          {user ? `Welcome back, ${user.name}.` : 'The warm room you come home to.'}
        </p>
      </header>

      <div className="tile-grid">
        {apps.map((a) => (
          <button
            key={a.id}
            className="tile"
            data-app={a.id}
            onClick={() => onOpen(a.id)}
          >
            <span className="tile-mark">
              <GroveMark size={48} color={TILE_ACCENT[a.id]} tile />
            </span>
            <span className="tile-name">{a.name}</span>
            <span className="tile-sub">{a.tagline}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
