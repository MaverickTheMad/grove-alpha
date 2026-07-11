import { useState, useEffect, useCallback, useRef } from 'react'
import './profile.css'
import { currentUser } from '../../lib/identity'
import { rankTitle, levelProgress } from '../../lib/rewards'
import { changePassword } from '../../lib/auth'
import { loadPrefs, setPref } from './lib/prefs'
import { loadAll } from './providers'
import { useToast } from '../../components/Toast'

export const meta = { id: 'profile', name: 'Profile', tagline: 'Your progress & preferences' }

// ── Personal prefs (moved from Settings) ──────────────────────────────────────
const PERSONAL_PREFS = [
  { id: 'fitness_unit',   label: 'Weight unit',          app: 'Reps',    type: 'select', options: ['lbs', 'kg'],    default: 'lbs' },
  { id: 'media_autoplay', label: 'Autoplay next episode', app: 'Media',   type: 'toggle', default: true },
  { id: 'pantry_remind',  label: 'Low-stock reminders',  app: 'Pantry',  type: 'toggle', default: false },
]

// ── XP bar ────────────────────────────────────────────────────────────────────
function XpBar({ xp, level }) {
  const prog = levelProgress(xp)
  return (
    <div className="profile-xp-section">
      <div className="profile-xp-track">
        <div className="profile-xp-fill" style={{ width: `${Math.round(prog.pct * 100)}%` }} />
      </div>
      <div className="profile-xp-meta">
        <span>Lv. {level}</span>
        <span>{prog.into} / {prog.span} XP</span>
        <span>Lv. {level + 1}</span>
      </div>
    </div>
  )
}

// ── Quest summary card ─────────────────────────────────────────────────────────
function QuestCard({ data }) {
  return (
    <div className="profile-card">
      <div className="profile-card-head">
        <span className="profile-card-title">Quest</span>
        <span className="profile-card-accent" style={{ background: 'var(--quest-accent, #86B24F)' }} />
      </div>
      {data ? (
        <div className="profile-card-rows">
          <div className="profile-card-row">
            <span className="profile-card-row-label">Active tasks</span>
            <span className="profile-card-row-val">{data.active_total}</span>
          </div>
          <div className="profile-card-row">
            <span className="profile-card-row-label">Assigned to me</span>
            <span className="profile-card-row-val">{data.active_mine}</span>
          </div>
          <div className="profile-card-row">
            <span className="profile-card-row-label">Done this week</span>
            <span className="profile-card-row-val">{data.completed_this_week}</span>
          </div>
        </div>
      ) : (
        <p className="profile-empty">No data</p>
      )}
    </div>
  )
}

// ── Fitness summary card ───────────────────────────────────────────────────────
function FitnessCard({ data }) {
  function lastWorkoutLabel(iso) {
    if (!iso) return '—'
    const days = Math.floor((Date.now() - new Date(iso)) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days}d ago`
  }
  return (
    <div className="profile-card">
      <div className="profile-card-head">
        <span className="profile-card-title">Reps</span>
        <span className="profile-card-accent" style={{ background: 'var(--fitness-accent, #CE6B62)' }} />
      </div>
      {data ? (
        <div className="profile-card-rows">
          <div className="profile-card-row">
            <span className="profile-card-row-label">Workouts this week</span>
            <span className="profile-card-row-val">{data.workouts_this_week}</span>
          </div>
          <div className="profile-card-row">
            <span className="profile-card-row-label">Last workout</span>
            <span className="profile-card-row-val">{lastWorkoutLabel(data.last_workout)}</span>
          </div>
          <div className="profile-card-row">
            <span className="profile-card-row-label">Total workouts</span>
            <span className="profile-card-row-val">{data.total_workouts}</span>
          </div>
        </div>
      ) : (
        <p className="profile-empty">No data</p>
      )}
    </div>
  )
}

// ── Ledger summary card ────────────────────────────────────────────────────────
function LedgerCard({ data }) {
  function ordinal(n) {
    const s = ['th','st','nd','rd'], v = n % 100
    return n + (s[(v - 20) % 10] || s[v] || s[0])
  }
  return (
    <div className="profile-card profile-card--wide">
      <div className="profile-card-head">
        <span className="profile-card-title">Ledger</span>
        <span className="profile-card-accent" style={{ background: 'var(--ledger-accent, #6F86C2)' }} />
      </div>
      {data ? (
        <div className="profile-card-rows">
          <div className="profile-card-row">
            <span className="profile-card-row-label">Bills unpaid this month</span>
            <span className="profile-card-row-val">{data.unpaid_count} / {data.total_bills}</span>
          </div>
          {data.next_due_name && (
            <div className="profile-card-row">
              <span className="profile-card-row-label">Next due</span>
              <span className="profile-card-row-val">
                {data.next_due_name}{data.next_due_day ? ` · ${ordinal(data.next_due_day)}` : ''}
              </span>
            </div>
          )}
        </div>
      ) : (
        <p className="profile-empty">No bill data</p>
      )}
    </div>
  )
}

// ── Journal summary card (Ren only) ───────────────────────────────────────────
function JournalCard({ data }) {
  return (
    <div className="profile-card profile-card--wide">
      <div className="profile-card-head">
        <span className="profile-card-title">Journal</span>
        <span className="profile-card-accent" style={{ background: 'var(--journal-accent, #D06A82)' }} />
      </div>
      {data ? (
        <div className="profile-card-rows">
          <div className="profile-card-row">
            <span className="profile-card-row-label">Cycle day</span>
            <span className="profile-card-row-val">{data.day_in_cycle}</span>
          </div>
          <div className="profile-card-row">
            <span className="profile-card-row-label">Flow today</span>
            <span className="profile-card-row-val" style={{ textTransform: 'capitalize' }}>{data.flow}</span>
          </div>
          <div className="profile-card-row">
            <span className="profile-card-row-label">Last period</span>
            <span className="profile-card-row-val">{data.last_start}</span>
          </div>
        </div>
      ) : (
        <p className="profile-empty">No cycle data yet</p>
      )}
    </div>
  )
}

// ── Prefs card ────────────────────────────────────────────────────────────────
function PrefsCard({ prefs, prefRows, onSetPref }) {
  return (
    <div className="profile-card profile-card--wide">
      <div className="profile-card-head">
        <span className="profile-card-title">Preferences</span>
      </div>
      {PERSONAL_PREFS.map((p) => {
        const val = prefs[p.id] ?? p.default
        return (
          <div key={p.id} className="profile-pref-row">
            <div>
              <div className="profile-pref-label">{p.label}</div>
              <div className="profile-pref-app">{p.app}</div>
            </div>
            {p.type === 'toggle' ? (
              <button
                role="switch"
                aria-checked={val}
                className={'toggle' + (val ? ' on' : '')}
                onClick={() => onSetPref(p.id, !val, prefRows)}
                aria-label={p.label}
              />
            ) : (
              <select
                className="profile-select"
                value={val}
                onChange={(e) => onSetPref(p.id, e.target.value, prefRows)}
              >
                {p.options.map((o) => <option key={o}>{o}</option>)}
              </select>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Change password ───────────────────────────────────────────────────────────
function PasswordCard({ user }) {
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext]       = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')
  const [ok, setOk]           = useState(false)

  async function submit(e) {
    e.preventDefault()
    setErr(''); setOk(false)
    if (next !== confirm) { setErr('New passwords don\'t match.'); return }
    if (next.length < 8) { setErr('Password must be at least 8 characters.'); return }
    setSaving(true)
    try {
      await changePassword(user.username, current, next)
      setCurrent(''); setNext(''); setConfirm('')
      setOk(true)
      toast.show('Password updated.')
    } catch (e) {
      setErr(e.message || 'Password change failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="profile-card profile-card--wide">
      <div className="profile-card-head">
        <span className="profile-card-title">Account</span>
      </div>
      <form className="profile-pw-form" onSubmit={submit}>
        <input
          type="password"
          className="profile-pw-input"
          placeholder="Current password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
        />
        <input
          type="password"
          className="profile-pw-input"
          placeholder="New password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
        />
        <input
          type="password"
          className="profile-pw-input"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />
        {err && <p className="profile-pw-error">{err}</p>}
        {ok  && <p className="profile-pw-ok">Password updated.</p>}
        <button
          type="submit"
          className="btn primary"
          disabled={saving || !current || !next || !confirm}
        >
          {saving ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function Profile() {
  const user = currentUser()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [prefs, setPrefs]     = useState(() =>
    Object.fromEntries(PERSONAL_PREFS.map((p) => [p.id, p.default]))
  )
  const prefRowsRef = useRef([])

  const reload = useCallback(async () => {
    if (!user) return
    const [summaries, { rows, prefs: loadedPrefs }] = await Promise.all([
      loadAll(user.id),
      loadPrefs(user.id),
    ])
    prefRowsRef.current = rows
    setPrefs((p) => ({ ...p, ...loadedPrefs }))
    setData(summaries)
    setLoading(false)
  }, [user?.id])

  useEffect(() => { reload() }, [reload])

  const handleSetPref = useCallback(async (key, value) => {
    setPrefs((p) => ({ ...p, [key]: value }))
    await setPref(user.id, key, value, prefRowsRef.current)
    // refresh rows so next write finds the record
    const { rows } = await loadPrefs(user.id)
    prefRowsRef.current = rows
  }, [user?.id])

  if (!user) return null

  const rewardsData = data?.rewards
  const rank = rankTitle(rewardsData?.level ?? 1)
  const xp = rewardsData?.xp ?? 0
  const level = rewardsData?.level ?? 1
  const streak = rewardsData?.current_streak ?? 0
  const tokens = rewardsData?.tokens ?? 0

  return (
    <main className="profile-page">
      {/* ── Header ── */}
      <div className="profile-header">
        <div className="profile-avatar">{user.name[0]?.toUpperCase()}</div>
        <div className="profile-identity">
          <div className="profile-name">{user.name}</div>
          <div className="profile-rank">
            <span className="profile-rank-title">{rank}</span>
            {' · Lv. '}{level}
          </div>
        </div>
      </div>

      {/* ── XP bar ── */}
      {rewardsData && <XpBar xp={xp} level={level} />}

      {/* ── Stats ── */}
      <div className="profile-stats">
        <div className="profile-stat">
          <span className="profile-stat-icon">🔥</span>
          <span className="profile-stat-val">{streak}</span>
          <span className="profile-stat-label">day streak</span>
        </div>
        <div className="profile-stat">
          <span className="profile-stat-icon">💎</span>
          <span className="profile-stat-val">{tokens}</span>
          <span className="profile-stat-label">tokens</span>
        </div>
      </div>

      {/* ── Cards ── */}
      {!loading && (
        <>
          <p className="profile-section-label">Your activity</p>
          <div className="profile-cards">
            <QuestCard data={data.quest} />
            <FitnessCard data={data.fitness} />
            <LedgerCard data={data.ledger} />
            {data.journal !== null && <JournalCard data={data.journal} />}
          </div>

          <p className="profile-section-label">Preferences</p>
          <div className="profile-cards">
            <PrefsCard
              prefs={prefs}
              prefRows={prefRowsRef.current}
              onSetPref={handleSetPref}
            />
          </div>

          <p className="profile-section-label">Account</p>
          <div className="profile-cards">
            <PasswordCard user={user} />
          </div>
        </>
      )}
    </main>
  )
}
