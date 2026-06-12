import { PEOPLE, levelTitle } from '../constants.js'

// Barbell mark — the Fitness (Reps) app identity mark. Inlined here since it's
// only used in this one component (build-spec §9: don't create a fork just for one icon).
function RepsMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none"
      stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="6" y1="14" x2="22" y2="14" />
      <rect x="6" y="8.5" width="2.6" height="11" rx="1.1" />
      <rect x="19.4" y="8.5" width="2.6" height="11" rx="1.1" />
      <rect x="3.2" y="10.5" width="2.2" height="7" rx="1" />
      <rect x="22.6" y="10.5" width="2.2" height="7" rx="1" />
      <line x1="1.6" y1="11.5" x2="1.6" y2="16.5" />
      <line x1="26.4" y1="11.5" x2="26.4" y2="16.5" />
    </svg>
  )
}

export default function PersonGate({ profiles, onChoose }) {
  return (
    <div className="gate">
      <div className="gate-inner">
        <div className="gate-brand"><RepsMark size={28} /><h1>Reps</h1></div>
        <p className="gate-prompt">Who's working out?</p>
        <div className="gate-cards">
          {PEOPLE.map((p) => {
            const prof = profiles[p.id]
            return (
              <button key={p.id} className="gate-card" onClick={() => onChoose(p.id)}>
                <span className="gate-avatar">{p.name[0]}</span>
                <span className="gate-name">{p.name}</span>
                {prof && (
                  <span className="gate-meta">
                    Lv {prof.level} · {levelTitle(prof.level)}
                  </span>
                )}
                {prof && (
                  <span className="gate-streak">🔥 {prof.current_streak} day{prof.current_streak === 1 ? '' : 's'}</span>
                )}
              </button>
            )
          })}
        </div>
        <p className="gate-foot muted sm">Pick your name so workouts log to the right person.</p>
      </div>
    </div>
  )
}
