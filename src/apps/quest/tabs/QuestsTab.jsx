import { BADGES, CHALLENGES, DEFAULT_HABITS } from '../constants'

export default function QuestsTab({ ctx }) {
  const {
    prog, rank, perfectStreak, habitStreaks, earnedBadges,
    challengeStatus, claimChallenge, totalPerfectDays, workoutCount, daysLogged, totalXp,
  } = ctx

  const dailies = CHALLENGES.filter(c => c.scope === 'daily')
  const weeklies = CHALLENGES.filter(c => c.scope === 'weekly')
  const earnedCount = earnedBadges.length

  return (
    <>
      {/* Character sheet */}
      <div className="card">
        <div className="card-title">Character Sheet</div>
        <div className="stat-grid" style={{ marginBottom: 10 }}>
          <div className="stat"><div className="v num">{prog.level}</div><div className="k">Level</div></div>
          <div className="stat"><div className="v num">{totalXp}</div><div className="k">Experience</div></div>
          <div className="stat"><div className="v num">{perfectStreak}</div><div className="k">Flame</div></div>
        </div>
        <div className="stat-grid">
          <div className="stat"><div className="v num">{totalPerfectDays}</div><div className="k">Flawless</div></div>
          <div className="stat"><div className="v num">{workoutCount}</div><div className="k">Trials Won</div></div>
          <div className="stat"><div className="v num">{daysLogged}</div><div className="k">Days Inscribed</div></div>
        </div>
      </div>

      {/* Daily challenges */}
      <div className="card">
        <div className="card-title">Daily Quests</div>
        {dailies.map(c => {
          const s = challengeStatus(c)
          return (
            <div key={c.id} className={'chal' + (s.claimed ? ' done' : '')}>
              <div className="chal-info">
                <div className="chal-name"><span className="scope">daily</span>{c.name}</div>
                <div className="chal-desc">{c.desc}</div>
                <div className="chal-prog"><div className="chal-prog-fill" style={{ width: `${(s.progress / s.target) * 100}%` }} /></div>
              </div>
              {s.claimed ? (
                <span className="chal-bonus">✓ claimed</span>
              ) : s.complete ? (
                <button className="btn" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => claimChallenge(c)}>+{c.bonus}</button>
              ) : (
                <span className="chal-bonus">{s.progress}/{s.target}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Weekly challenges */}
      <div className="card">
        <div className="card-title">Weekly Quests</div>
        {weeklies.map(c => {
          const s = challengeStatus(c)
          return (
            <div key={c.id} className={'chal' + (s.claimed ? ' done' : '')}>
              <div className="chal-info">
                <div className="chal-name"><span className="scope">weekly</span>{c.name}</div>
                <div className="chal-desc">{c.desc}</div>
                <div className="chal-prog"><div className="chal-prog-fill" style={{ width: `${(s.progress / s.target) * 100}%` }} /></div>
              </div>
              {s.claimed ? (
                <span className="chal-bonus">✓ claimed</span>
              ) : s.complete ? (
                <button className="btn" style={{ padding: '8px 12px', fontSize: 12 }} onClick={() => claimChallenge(c)}>+{c.bonus}</button>
              ) : (
                <span className="chal-bonus">{s.progress}/{s.target}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Badges */}
      <div className="card">
        <div className="card-title">Hall of Deeds <span style={{ color: 'var(--amber)' }}>{earnedCount}/{BADGES.length}</span></div>
        <div className="badge-grid">
          {BADGES.map(b => {
            const earned = earnedBadges.includes(b.id)
            return (
              <div key={b.id} className={'badge' + (earned ? ' earned' : '')}>
                <div className="b-ico">{b.icon}</div>
                <div className="b-name">{b.name}</div>
                <div className="b-desc">{earned ? b.desc : '???'}</div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
