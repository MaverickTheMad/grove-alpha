import { useState, useEffect, useCallback, useRef } from 'react'
import './profile.css'
import { currentUser } from '../../lib/identity'
import { rankTitle, levelProgress } from '../../lib/rewards'
import { changePassword, signOut } from '../../lib/auth'
import { loadPrefs, setPref } from './lib/prefs'
import { loadAll } from './providers'
import { useToast } from '../../components/Toast'
import Sheet from '../../components/Sheet'
import { Sparkline, AppCard, Button } from '../../ds'

export const meta = { id: 'profile', name: 'Profile', tagline: 'Your progress & preferences' }

const PERSONAL_PREFS = [
  { id: 'fitness_unit',   label: 'Weight unit',          sub: 'Fitness · lbs', subOff: 'Fitness · kg', app: 'Fitness', type: 'select', options: ['lbs', 'kg'], default: 'lbs' },
  { id: 'media_autoplay', label: 'Autoplay next',         sub: 'Media',          app: 'Media',   type: 'toggle', default: true },
  { id: 'pantry_remind',  label: 'Low-stock reminders',   sub: 'Pantry',         app: 'Pantry',  type: 'toggle', default: false },
  { id: 'pay_cycle',      label: 'Pay-cycle anchor',      sub: 'Ledger · primary paycheck', app: 'Ledger', type: 'toggle', default: false },
]

// ── Password Sheet ────────────────────────────────────────────────────────────
function PasswordSheet({ user, onClose }) {
  const toast = useToast()
  const [current, setCurrent] = useState('')
  const [next, setNext]       = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')

  async function submit(e) {
    e.preventDefault()
    setErr('')
    if (next !== confirm) { setErr("New passwords don't match."); return }
    if (next.length < 8)  { setErr('Password must be at least 8 characters.'); return }
    setSaving(true)
    try {
      await changePassword(user.username, current, next)
      toast.show('Password updated.')
      onClose()
    } catch (e) {
      setErr(e.message || 'Password change failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title="Change password">
      <form className="profile-pw-form" onSubmit={submit}>
        <input type="password" className="input" placeholder="Current password"
          value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        <input type="password" className="input" placeholder="New password"
          value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        <input type="password" className="input" placeholder="Confirm new password"
          value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        {err && <p className="profile-pw-error">{err}</p>}
        <button type="submit" className="btn primary block" disabled={saving || !current || !next || !confirm}>
          {saving ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </Sheet>
  )
}

// ── Format helpers ─────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtMoney(n) {
  if (!n && n !== 0) return null
  const abs = Math.abs(n)
  if (abs >= 1000) return `$${(abs / 1000).toFixed(1)}k`
  return `$${Math.round(abs)}`
}

function memberSince(createdAt) {
  if (!createdAt) return null
  const d = new Date(createdAt)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function Profile() {
  const user = currentUser()
  const [data, setData]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [prefs, setPrefs]         = useState(() =>
    Object.fromEntries(PERSONAL_PREFS.map((p) => [p.id, p.default]))
  )
  const prefRowsRef = useRef([])
  const [showPwSheet, setShowPwSheet] = useState(false)

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
    const { rows } = await loadPrefs(user.id)
    prefRowsRef.current = rows
  }, [user?.id])

  if (!user) return null

  const r = data?.rewards
  const level   = r?.level ?? 1
  const rank    = rankTitle(level)
  const xpInto  = r?.xp_into ?? 0
  const xpSpan  = r?.xp_span ?? 100
  const xpPct   = r?.xp_pct ?? 0
  const xpTotal = r?.xp ?? 0
  const streak  = r?.current_streak ?? 0
  const tokens  = r?.tokens ?? 0
  const xp30d   = r?.xp30d ?? 0
  const mostActive = r?.most_active_app || null

  const quest   = data?.quest
  const fitness = data?.fitness
  const ledger  = data?.ledger
  const journal = data?.journal

  // Frame A rows
  const horizonRows = []
  if (quest?.upcoming) {
    quest.upcoming.forEach((q) => horizonRows.push({
      type: 'quest', title: q.title,
      meta: `Due ${fmtDate(q.due)} · +${q.xp_reward ?? 10} XP`,
    }))
  }
  if (ledger?.upcoming_bills) {
    ledger.upcoming_bills.forEach((b) => horizonRows.push({
      type: 'ledger', title: b.name,
      meta: `Due ${fmtDate(b.due_date)}${b.amount ? ` · $${b.amount}` : ''}`,
    }))
  }
  if (journal?.next_estimate && user.id === 'ren') {
    horizonRows.push({
      type: 'journal', title: 'Next period estimate',
      meta: `~${fmtDate(journal.next_estimate)} · estimate`,
      dashed: true,
    })
  }

  const appDisplayName = { fitness: 'Fitness', quest: 'Quest', unknown: 'Grove' }

  return (
    <main className="profile-page">

      {/* ── Zone 1 — Identity ── */}
      <div className="profile-identity-card">
        <div className="profile-id-row">
          <div className="profile-avatar" style={{ background: user.color }}>
            {user.name[0]?.toUpperCase()}
          </div>
          <div className="profile-id-text">
            <div className="profile-name">{user.name}</div>
            <div className="profile-username">@{user.id}</div>
            {user.created_at && (
              <div className="profile-since">Member since {memberSince(user.created_at)}</div>
            )}
          </div>
        </div>

        {/* rewards badge */}
        <div className="profile-rewards-badge">
          <div className="profile-badge-top">
            <div className="profile-badge-rank">
              <span className="profile-badge-level">Lv. {level}</span>
              <span className="profile-badge-title">{rank}</span>
            </div>
            <div className="profile-badge-streak">
              <div className="profile-streak-dot" />
              <span className="profile-streak-val">{streak}d</span>
            </div>
          </div>
          <div className="profile-xp-track">
            <div className="profile-xp-fill" style={{ width: `${Math.round(xpPct * 100)}%` }} />
          </div>
          <div className="profile-badge-footer">
            <span>{xpInto} / {xpSpan} XP to Lv. {level + 1}</span>
            <span className="profile-badge-tokens">{tokens} tokens</span>
          </div>
        </div>

        <div className="profile-id-actions">
          <Button variant="primary" style={{ flex: 1 }} onClick={() => setShowPwSheet(true)}>
            Change password
          </Button>
          <Button onClick={() => signOut()}>Sign out</Button>
        </div>
      </div>

      {/* ── Frame A — Ahead ── */}
      {!loading && horizonRows.length > 0 && (
        <section className="profile-section">
          <h2 className="profile-section-head">Ahead · next 10 days</h2>
          <div className="profile-list-card">
            {horizonRows.map((row, i) => (
              <div
                key={i}
                className={'profile-horizon-row' + (i < horizonRows.length - 1 ? ' profile-horizon-row--border' : '')}
              >
                <div
                  className="profile-horizon-dot"
                  style={{ background: row.type === 'quest' ? 'var(--col-quest)' : row.type === 'journal' ? 'var(--col-journal)' : 'var(--info)' }}
                />
                <div className="profile-horizon-text">
                  <div className={'profile-horizon-title' + (row.dashed ? ' profile-horizon-title--dashed' : '')}>
                    {row.title}
                  </div>
                  <div className="profile-horizon-meta">{row.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Frame B — Last 30 days ── */}
      {!loading && (
        <section className="profile-section">
          <h2 className="profile-section-head">Last 30 days</h2>
          <div className="profile-b-grid">

            {/* Rewards */}
            <AppCard dotColor="var(--accent)" label="Rewards">
              <div className="profile-b-big">{xp30d > 0 ? `+${xp30d} XP` : '0 XP'}</div>
              <div className="profile-b-sub">{streak}d streak · {tokens} tokens earned</div>
            </AppCard>

            {/* Fitness */}
            <AppCard dotColor="var(--col-fitness)" label="Fitness">
              <div className="profile-b-big">{fitness ? `${fitness.workouts_30d} workouts` : '—'}</div>
              {fitness?.last_workout && (
                <div className="profile-b-sub">
                  last {fmtDate(fitness.last_workout)}
                </div>
              )}
              {fitness?.bars && (
                <Sparkline bars={fitness.bars} colorVar="var(--col-fitness)" height={36} />
              )}
            </AppCard>

            {/* Ledger — full width */}
            <AppCard dotColor="var(--info)" label="Ledger" wide>
              {ledger && (ledger.money_in > 0 || ledger.money_out > 0) ? (
                <>
                  <div className="profile-b-big profile-b-big--xl">
                    {fmtMoney(ledger.net_amount)}
                  </div>
                  <div className="profile-b-sub">
                    net · {fmtMoney(ledger.money_in)} in · {fmtMoney(ledger.money_out)} out
                  </div>
                </>
              ) : (
                <>
                  <div className="profile-b-big">{ledger ? `${ledger.unpaid_count}/${ledger.total_bills}` : '—'}</div>
                  <div className="profile-b-sub">bills unpaid this month</div>
                </>
              )}
            </AppCard>

            {/* Journal — Ren only, full width */}
            {journal && (
              <AppCard dotColor="var(--col-journal)" label="Journal" wide>
                <div className="profile-b-text">
                  {journal.phase} · day {journal.day_in_cycle}
                </div>
                {journal.bars && (
                  <Sparkline bars={journal.bars} colorVar="var(--col-journal)" height={32} />
                )}
              </AppCard>
            )}

            {/* Quest */}
            <AppCard dotColor="var(--col-quest)" label="Quest">
              {quest ? (
                <>
                  <div className="profile-b-big">{quest.completed30d}/{quest.active_total + quest.completed30d}</div>
                  <div className="profile-b-sub">completed · {quest.active_total} active</div>
                </>
              ) : <div className="profile-b-sub">—</div>}
            </AppCard>

            {/* Your rhythm */}
            <AppCard dotColor="var(--accent)" label="Your rhythm">
              <div className="profile-b-text">
                {streak > 0 ? `Logging streak: ${streak} days` : 'No streak yet'}
                {mostActive ? ` · most active in ${appDisplayName[mostActive] || mostActive} this month.` : '.'}
              </div>
            </AppCard>

          </div>
        </section>
      )}

      {/* ── Zone 3 — Preferences ── */}
      {!loading && (
        <section className="profile-section">
          <h2 className="profile-section-head">Preferences</h2>
          <div className="profile-list-card">
            {PERSONAL_PREFS.map((p, i) => {
              const val = prefs[p.id] ?? p.default
              return (
                <div
                  key={p.id}
                  className={'profile-pref-row' + (i < PERSONAL_PREFS.length - 1 ? ' profile-pref-row--border' : '')}
                >
                  <div>
                    <div className="profile-pref-label">{p.label}</div>
                    <div className="profile-pref-app">
                      {p.type === 'select' ? `${p.app} · ${val}` : p.app}
                    </div>
                  </div>
                  {p.type === 'toggle' ? (
                    <button
                      role="switch"
                      aria-checked={val}
                      className={'profile-toggle' + (val ? ' on' : '')}
                      onClick={() => handleSetPref(p.id, !val)}
                      aria-label={p.label}
                    />
                  ) : (
                    <select
                      className="profile-select"
                      value={val}
                      onChange={(e) => handleSetPref(p.id, e.target.value)}
                    >
                      {p.options.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  )}
                </div>
              )
            })}
            <div className="profile-pref-footer">Appearance is set per device in Settings.</div>
          </div>
        </section>
      )}

      {/* ── Zone 4 — Data & privacy ── */}
      {!loading && (
        <section className="profile-section">
          <h2 className="profile-section-head">Data &amp; privacy</h2>
          <div className="profile-privacy-card">
            <p className="profile-privacy-text">
              This page only shows your own records. Everything in Grove is login-gated now, and will be end-to-end encrypted in beta — so Grove itself can't read your data. Grove doesn't hide records between you and your housemate; it's a shared home, kept private from the outside world.
            </p>
            <Button size="sm">Export your data</Button>
            <p className="profile-privacy-note">Password &amp; sign-out live above, in Identity.</p>
            <div className="profile-passphrase-row">
              <span className="profile-privacy-text">Passphrase &amp; recovery key</span>
              <span className="profile-beta-badge">beta</span>
            </div>
          </div>
        </section>
      )}

      {showPwSheet && <PasswordSheet user={user} onClose={() => setShowPwSheet(false)} />}
    </main>
  )
}
