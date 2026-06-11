import { PEOPLE, levelTitle } from '../constants.js'
import { RepsMark } from './Icons.jsx'

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
