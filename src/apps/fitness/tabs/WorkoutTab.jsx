import { useEffect, useMemo, useState } from 'react'
import * as store from '../lib/store.js'
import {
  CATEGORIES, CATEGORY_LABEL, FALLBACK_EXERCISES, MODES,
  BASE_XP, BASE_TOKENS, STREAK_TOKEN_MILESTONES,
  levelForXp, levelTitle, nextStreakState, streakXp, summarizeExercise,
  todayStr, unlocksAtLevel,
} from '../constants.js'
import Sheet from '../components/Sheet.jsx'
import RestTimer from '../components/RestTimer.jsx'

let keySeq = 0
const newKey = () => `row_${++keySeq}`

export default function WorkoutTab({ person, profile, onProfileChange }) {
  const [library, setLibrary] = useState(null)   // null = not loaded yet
  const [category, setCategory] = useState(null)
  const [session, setSession] = useState([])      // editable rows
  const [startedAt, setStartedAt] = useState(null)
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [confirmRest, setConfirmRest] = useState(false)

  // Load the exercise library (presets + this person's custom rows).
  useEffect(() => {
    let alive = true
    ;(async () => {
      let data
      try { data = await store.listExercises(person) } catch { data = null }
      if (!alive) return
      if (!data || data.length === 0) {
        // Fall back to the bundled catalogue so the app still works.
        setLibrary(FALLBACK_EXERCISES.map((e, i) => ({
          id: null, sort_order: i, unlock_level: e.unlock, tier: e.tier,
          default_sets: e.sets, default_reps: e.reps, default_seconds: e.seconds,
          default_weight: e.weight, ...e,
        })))
      } else {
        setLibrary(data)
      }
    })()
    return () => { alive = false }
  }, [person])

  const level = profile.level

  const startCategory = (cat) => {
    const rows = (library || [])
      .filter((e) => e.category === cat && (e.unlock_level ?? e.unlock ?? 1) <= level)
      .map((e) => ({
        key: newKey(),
        exercise_id: e.id ?? null,
        name: e.name,
        machine: e.machine || null,
        muscle_group: e.muscle_group || null,
        mode: e.mode || 'reps',
        sets: e.default_sets ?? e.sets ?? null,
        reps: e.default_reps ?? e.reps ?? null,
        seconds: e.default_seconds ?? e.seconds ?? null,
        weight: e.default_weight ?? e.weight ?? null,
        notes: e.notes || '',
        done: true,
      }))
    setCategory(cat)
    setSession(rows)
    setStartedAt(Date.now())
  }

  const patchRow = (key, field, value) =>
    setSession((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
  const removeRow = (key) => setSession((prev) => prev.filter((r) => r.key !== key))

  const cancelSession = () => { setCategory(null); setSession([]); setStartedAt(null) }

  const doneCount = session.filter((r) => r.done).length

  // ── Award XP / tokens / streak and write the session ──────────────
  async function award({ rest }) {
    if (saving) return
    setSaving(true)
    try {
      // Re-read the profile so concurrent device edits don't clobber state.
      const fresh = await store.getProfile(person)
      const p = fresh || profile
      const today = todayStr()
      const streak = nextStreakState(
        { lastActiveDate: p.last_active_date, currentStreak: p.current_streak, longestStreak: p.longest_streak },
        today,
      )

      let xpGain = 0, tokenGain = 0, milestone = null
      if (!rest) {
        xpGain = BASE_XP + streakXp(streak.current)
        tokenGain = BASE_TOKENS
        if (streak.changed && STREAK_TOKEN_MILESTONES[streak.current]) {
          milestone = STREAK_TOKEN_MILESTONES[streak.current]
          tokenGain += milestone
        }
      }

      const newXp = p.xp + xpGain
      const newLevel = levelForXp(newXp)
      const leveledUp = newLevel > p.level

      // 1) write the workout header
      const rows = rest ? [] : session.filter((r) => r.done)
      const minutes = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 60000)) : null
      const w = await store.addWorkout(person, {
        category: rest ? 'rest' : category,
        duration_minutes: rest ? null : minutes,
        xp_awarded: xpGain,
        tokens_awarded: tokenGain,
      })

      // 2) write the per-exercise rows
      if (rows.length) {
        const exRows = rows.map((r, i) => ({
          workout_id: w.id,
          exercise_id: r.exercise_id,
          name: r.name,
          machine: r.machine,
          muscle_group: r.muscle_group,
          mode: r.mode,
          sets: r.sets, reps: r.reps, seconds: r.seconds, weight: r.weight,
          notes: r.notes || null,
          sort_order: i,
        }))
        await store.addWorkoutExercises(exRows)
      }

      // 3) update the profile
      await store.updateProfile(person, {
        xp: newXp,
        level: newLevel,
        tokens: p.tokens + tokenGain,
        current_streak: streak.current,
        longest_streak: streak.longest,
        last_active_date: today,
      })

      setSummary({
        rest,
        xpGain, tokenGain, milestone,
        streak: streak.current,
        leveledUp,
        newLevel,
        unlocked: leveledUp ? unlocksAtLevel(newLevel) : [],
      })
      cancelSession()
      onProfileChange?.()
    } catch (e) {
      alert('Could not save the workout: ' + (e.message || e))
    } finally {
      setSaving(false)   // after onDone-equivalent to avoid double-submit re-enable
    }
  }

  // ─────────────────────────── RENDER ───────────────────────────
  if (library === null) {
    return <div className="empty"><div className="big">⏳</div><p>Loading exercises…</p></div>
  }

  // Active session view
  if (category) {
    return (
      <div className="tab-pad">
        <div className="session-head">
          <button className="btn ghost sm" onClick={cancelSession}>← Cancel</button>
          <h2 className="session-title">{CATEGORY_LABEL[category]}</h2>
          <span className="muted sm">{doneCount}/{session.length} done</span>
        </div>

        <RestTimer />

        <div className="ex-list">
          {session.map((r) => (
            <div key={r.key} className={`ex-card ${r.done ? '' : 'skipped'}`}>
              <div className="ex-top">
                <button
                  className={`check ${r.done ? 'on' : ''}`}
                  onClick={() => patchRow(r.key, 'done', !r.done)}
                  aria-label="Toggle done"
                >{r.done ? '✓' : ''}</button>
                <div className="grow">
                  <div className="ex-name">{r.name}</div>
                  {r.machine && <div className="sub">{r.machine}</div>}
                </div>
                <button className="ex-remove" onClick={() => removeRow(r.key)} aria-label="Remove">✕</button>
              </div>

              <div className="ex-fields">
                {r.mode === 'cardio' ? (
                  <Stepper label="Minutes" step={1} min={1}
                    value={r.seconds == null ? null : Math.round(r.seconds / 60)}
                    onChange={(v) => patchRow(r.key, 'seconds', v == null ? null : v * 60)} />
                ) : r.mode === 'time' ? (
                  <>
                    <Stepper label="Sets" step={1} min={1} value={r.sets} onChange={(v) => patchRow(r.key, 'sets', v)} />
                    <Stepper label="Seconds" step={5} min={5} value={r.seconds} onChange={(v) => patchRow(r.key, 'seconds', v)} />
                  </>
                ) : (
                  <>
                    <Stepper label="Sets" step={1} min={1} value={r.sets} onChange={(v) => patchRow(r.key, 'sets', v)} />
                    <Stepper label="Reps" step={1} min={1} value={r.reps} onChange={(v) => patchRow(r.key, 'reps', v)} />
                    <Stepper label="Weight" unit="lbs" step={5} min={0} value={r.weight} onChange={(v) => patchRow(r.key, 'weight', v)} />
                  </>
                )}
              </div>
              {r.notes && <div className="ex-note">{r.notes}</div>}
            </div>
          ))}
        </div>

        <button className="btn ghost block" onClick={() => setAddOpen(true)}>+ Add exercise</button>

        <button className="btn primary block big-cta" disabled={saving || doneCount === 0}
          onClick={() => award({ rest: false })}>
          {saving ? 'Saving…' : `Finish workout · ${doneCount} exercise${doneCount === 1 ? '' : 's'}`}
        </button>

        <AddExerciseSheet
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onAdd={(ex) => { setSession((prev) => [...prev, { key: newKey(), done: true, ...ex }]); setAddOpen(false) }}
        />
        <SummaryModal summary={summary} onClose={() => setSummary(null)} />
      </div>
    )
  }

  // Category picker (home)
  return (
    <div className="tab-pad">
      <LevelStrip profile={profile} />

      <h2 className="section-h">Start a workout</h2>
      <div className="cat-grid">
        {CATEGORIES.map((c) => {
          const locked = level < c.unlock
          return (
            <button
              key={c.id}
              className={`cat-card ${locked ? 'locked' : ''}`}
              disabled={locked}
              onClick={() => startCategory(c.id)}
            >
              <span className="cat-emoji">{c.emoji}</span>
              <span className="cat-label">{c.label}</span>
              <span className="cat-blurb">{locked ? `Unlocks at Lv ${c.unlock}` : c.blurb}</span>
              {locked && <span className="lock">🔒</span>}
            </button>
          )
        })}
      </div>

      <button className="btn ghost block rest-cta" onClick={() => setConfirmRest(true)}>
        🌿 Log a rest / stretch / walk day
      </button>
      <p className="muted sm center">Rest days keep your streak alive — they just don't earn XP or tokens.</p>

      <Sheet
        open={confirmRest}
        onClose={() => setConfirmRest(false)}
        title="Log a rest day?"
        footer={
          <div className="row-btns">
            <button className="btn ghost" onClick={() => setConfirmRest(false)}>Cancel</button>
            <button className="btn primary" disabled={saving}
              onClick={() => { setConfirmRest(false); award({ rest: true }) }}>
              Log rest day
            </button>
          </div>
        }
      >
        <p className="muted">This counts as an active day so your streak doesn't break. No XP or tokens awarded.</p>
      </Sheet>

      <SummaryModal summary={summary} onClose={() => setSummary(null)} />
    </div>
  )
}

// ─────────────────────────── Sub-components ───────────────────────────
function Stepper({ label, value, onChange, step = 1, min = 0, unit }) {
  const v = value == null ? min : value
  const set = (n) => onChange(Math.max(min, n))
  return (
    <div className="field">
      <span>{unit ? `${label} (${unit})` : label}</span>
      <div className="stepper">
        <button className="step-btn" onClick={() => set(v - step)} aria-label={`Decrease ${label}`}>−</button>
        <span className="step-val">
          <input type="number" inputMode="numeric" value={value ?? ''}
            placeholder={String(min)}
            onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
        </span>
        <button className="step-btn" onClick={() => set(v + step)} aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  )
}

function LevelStrip({ profile }) {
  return (
    <div className="level-strip">
      <div>
        <div className="lvl-title">{levelTitle(profile.level)}</div>
        <div className="muted sm">Level {profile.level} · {profile.display_name}</div>
      </div>
      <div className="streak-pill">🔥 {profile.current_streak} day{profile.current_streak === 1 ? '' : 's'}</div>
    </div>
  )
}

function AddExerciseSheet({ open, onClose, onAdd }) {
  const [name, setName] = useState('')
  const [mode, setMode] = useState('reps')
  const [machine, setMachine] = useState('')
  useEffect(() => { if (open) { setName(''); setMode('reps'); setMachine('') } }, [open])

  const add = () => {
    if (!name.trim()) return
    const base = { name: name.trim(), machine: machine.trim() || null, mode, notes: '' }
    if (mode === 'cardio') Object.assign(base, { seconds: 600 })
    else if (mode === 'time') Object.assign(base, { sets: 3, seconds: 30 })
    else Object.assign(base, { sets: 3, reps: 12, weight: 0 })
    onAdd(base)
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add an exercise"
      footer={
        <div className="row-btns">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!name.trim()} onClick={add}>Add</button>
        </div>
      }>
      <label className="field block"><span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cable Fly" />
      </label>
      <label className="field block"><span>Machine (optional)</span>
        <input value={machine} onChange={(e) => setMachine(e.target.value)} placeholder="e.g. Cable" />
      </label>
      <div className="field block"><span>Type</span>
        <div className="chip-row">
          {MODES.map((m) => (
            <button key={m} className={`chip ${mode === m ? 'on' : ''}`} onClick={() => setMode(m)}>
              {m === 'reps' ? 'Reps + weight' : m === 'time' ? 'Timed hold' : 'Cardio'}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}

function SummaryModal({ summary, onClose }) {
  if (!summary) return null
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="summary-card" onClick={(e) => e.stopPropagation()}>
        {summary.rest ? (
          <>
            <div className="summary-emoji">🌿</div>
            <h3>Rest day logged</h3>
            <p className="muted">Your streak is safe at 🔥 {summary.streak} day{summary.streak === 1 ? '' : 's'}.</p>
          </>
        ) : (
          <>
            <div className="summary-emoji">{summary.leveledUp ? '🎉' : '💪'}</div>
            <h3>{summary.leveledUp ? `Level ${summary.newLevel}!` : 'Workout complete'}</h3>
            <div className="summary-gains">
              <span className="gain xp">+{summary.xpGain} XP</span>
              <span className="gain tok">+{summary.tokenGain} 🪙</span>
              <span className="gain streak">🔥 {summary.streak}</span>
            </div>
            {summary.milestone && <p className="muted sm">Streak milestone bonus: +{summary.milestone} 🪙</p>}
            {summary.leveledUp && summary.unlocked.length > 0 && (
              <p className="unlock-line">Unlocked: {summary.unlocked.join(' · ')}</p>
            )}
          </>
        )}
        <button className="btn primary block" onClick={onClose}>Nice</button>
      </div>
    </div>
  )
}
