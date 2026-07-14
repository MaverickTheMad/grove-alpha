import { useEffect, useState } from 'react'
import * as store from '../lib/store.js'
import { awardXp } from '../../../lib/rewards'
import {
  CATEGORIES, CATEGORY_EMOJI, CATEGORY_LABEL, FALLBACK_EXERCISES, MODES,
  BASE_XP, BASE_TOKENS, STREAK_TOKEN_MILESTONES,
  fmtRelative, isoToLocalDateStr,
  levelForXp, levelTitle, nextStreakState, streakXp, summarizeExercise,
  todayStr, unlocksAtLevel,
} from '../constants.js'
import { byKey } from '../../../lib/sort.js'
import Sheet from '../../../components/Sheet'
import { Button, Card, Chip } from '../../../ds'

const SORTED_CATEGORIES = [...CATEGORIES].sort(byKey('label'))
const REST_PRESETS = [30, 45, 60, 90]

let keySeq = 0
const newKey = () => `row_${++keySeq}`

export default function WorkoutTab({ person, profile, onProfileChange }) {
  const [library, setLibrary] = useState(null)
  const [category, setCategory] = useState(null)
  const [session, setSession] = useState([])
  const [startedAt, setStartedAt] = useState(null)
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [confirmRest, setConfirmRest] = useState(false)
  const [restOpen, setRestOpen] = useState(false)
  const [restSeconds, setRestSeconds] = useState(0)
  const [restRunning, setRestRunning] = useState(false)
  const [lastWorkout, setLastWorkout] = useState(undefined)

  useEffect(() => {
    let alive = true
    ;(async () => {
      let data
      try { data = await store.listExercises(person) } catch { data = null }
      if (!alive) return
      if (!data || data.length === 0) {
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

  useEffect(() => {
    store.listWorkouts(person, { limit: 1 })
      .then(data => setLastWorkout(data?.[0] ?? null))
      .catch(() => setLastWorkout(null))
  }, [person])

  // Lifted rest timer — survives sheet open/close
  useEffect(() => {
    if (!restRunning) return
    if (restSeconds <= 0) {
      setRestRunning(false)
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = 660; gain.gain.value = 0.08
        osc.start(); osc.stop(ctx.currentTime + 0.18)
      } catch {}
      if (navigator.vibrate) navigator.vibrate(120)
      return
    }
    const t = setTimeout(() => setRestSeconds(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [restRunning, restSeconds])

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

  const resumeLast = () => {
    if (!lastWorkout || lastWorkout.category === 'rest') return
    const exercises = lastWorkout.workout_exercises || []
    if (!exercises.length) return
    const rows = exercises.map(e => ({
      key: newKey(),
      exercise_id: e.exercise_id,
      name: e.name,
      machine: e.machine || null,
      muscle_group: e.muscle_group || null,
      mode: e.mode || 'reps',
      sets: e.sets ?? null,
      reps: e.reps ?? null,
      seconds: e.seconds ?? null,
      weight: e.weight ?? null,
      notes: e.notes || '',
      done: true,
    }))
    setCategory(lastWorkout.category)
    setSession(rows)
    setStartedAt(Date.now())
  }

  const patchRow = (key, field, value) =>
    setSession((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
  const removeRow = (key) => setSession((prev) => prev.filter((r) => r.key !== key))

  const cancelSession = () => {
    setCategory(null); setSession([]); setStartedAt(null)
    setRestRunning(false); setRestSeconds(0); setRestOpen(false)
  }

  const doneCount = session.filter((r) => r.done).length

  const restMm = String(Math.floor(restSeconds / 60)).padStart(1, '0')
  const restSs = String(restSeconds % 60).padStart(2, '0')

  async function award({ rest }) {
    if (saving) return
    setSaving(true)
    try {
      const fresh = await store.getProfile(person)
      const p = fresh || profile

      // Compute XP using Fitness-specific streak bonus (same numbers as before)
      let xpGain = 0
      if (!rest) {
        const today = todayStr()
        const streak = nextStreakState(
          { lastActiveDate: p.last_active_date, currentStreak: p.current_streak, longestStreak: p.longest_streak },
          today,
        )
        xpGain = BASE_XP + streakXp(streak.current)
      }

      const rows = rest ? [] : session.filter((r) => r.done)
      const minutes = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 60000)) : null
      const w = await store.addWorkout(person, {
        category: rest ? 'rest' : category,
        duration_minutes: rest ? null : minutes,
        xp_awarded: xpGain,
        tokens_awarded: 0, // filled in by awardXp
      })

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

      let tokenGain = 0, milestone = null, leveledUp = false, newLevel = p.level, currentStreak = p.current_streak
      if (xpGain > 0) {
        const result = await awardXp(person, { pts: xpGain, source: 'fitness', source_id: w.id, label: rest ? 'Rest day' : category })
        if (result) {
          tokenGain   = result.tokenGain
          milestone   = result.milestone
          leveledUp   = result.leveledUp
          newLevel    = result.newLevel
          currentStreak = result.streak
        }
      }

      setSummary({
        rest,
        xpGain, tokenGain, milestone,
        streak: currentStreak,
        leveledUp, newLevel,
        unlocked: leveledUp ? unlocksAtLevel(newLevel) : [],
      })
      cancelSession()
      onProfileChange?.()
    } catch (e) {
      alert('Could not save the workout: ' + (e.message || e))
    } finally {
      setSaving(false)
    }
  }

  // ─── RENDER ───
  if (library === null) {
    return <div className="empty"><div className="big">⏳</div><p>Loading exercises…</p></div>
  }

  // Active session view
  if (category) {
    return (
      <div className="tab-pad">
        <div className="session-head">
          <Button variant="ghost" size="sm" onClick={cancelSession}>← Cancel</Button>
          <h2 className="session-title">{CATEGORY_LABEL[category]}</h2>
          <span className="muted sm">{doneCount}/{session.length} done</span>
        </div>

        <Button
          variant="ghost" block
          className={`rest-open-btn${restRunning ? ' rest-running' : ''}`}
          onClick={() => setRestOpen(true)}
        >
          ⏱ {restRunning ? `${restMm}:${restSs}` : 'Start rest timer'}
        </Button>

        <div className="ex-list">
          {session.map((r) => {
            const e1rm = r.mode === 'reps' && r.weight > 0 && r.reps > 1
              ? Math.round(r.weight * (1 + r.reps / 30))
              : null
            return (
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
                {e1rm && (
                  <div className="e1rm-line">
                    ~{e1rm} lbs <span className="e1rm-label">estimated 1RM</span>
                  </div>
                )}
                {r.notes && <div className="ex-note">{r.notes}</div>}
              </div>
            )
          })}
        </div>

        <Button variant="ghost" block onClick={() => setAddOpen(true)}>+ Add exercise</Button>

        <Button variant="primary" block disabled={saving || doneCount === 0}
          className="big-cta" onClick={() => award({ rest: false })}>
          {saving ? 'Saving…' : `Finish workout · ${doneCount} exercise${doneCount === 1 ? '' : 's'}`}
        </Button>

        {/* Rest timer — bottom sheet on mobile, centered dialog on desktop */}
        <Sheet open={restOpen} onClose={() => setRestOpen(false)} title="Rest timer">
          <div className="rest-content">
            <div className={`rest-clock-big${restRunning ? ' on' : ''}`}>
              {restMm}:{restSs}
            </div>
            {restRunning ? (
              <button className="btn ghost block"
                onClick={() => { setRestRunning(false); setRestSeconds(0) }}>
                Stop timer
              </button>
            ) : (
              <div className="rest-presets-grid">
                {REST_PRESETS.map(s => (
                  <button key={s} className="btn ghost"
                    onClick={() => { setRestSeconds(s); setRestRunning(true) }}>
                    {s < 60 ? `${s}s` : `${s / 60}m`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Sheet>

        <AddExerciseSheet
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onAdd={(ex) => { setSession((prev) => [...prev, { key: newKey(), done: true, ...ex }]); setAddOpen(false) }}
        />
        <SummaryModal summary={summary} onClose={() => setSummary(null)} />
      </div>
    )
  }

  // Home: category picker
  const canResume = lastWorkout && lastWorkout.category !== 'rest' && (lastWorkout.workout_exercises || []).length > 0
  return (
    <div className="tab-pad">
      <header className="f-page-header">
        <h1 className="f-title">Reps</h1>
      </header>
      <LevelStrip profile={profile} />

      {canResume && (
        <Card as="button" className="resume-card" onClick={resumeLast}>
          <span className="cat-emoji">{CATEGORY_EMOJI[lastWorkout.category] || '🏋️'}</span>
          <div className="grow">
            <div className="ex-name">Resume last workout</div>
            <div className="sub">
              {CATEGORY_LABEL[lastWorkout.category]} · {fmtRelative(isoToLocalDateStr(lastWorkout.performed_at))}
            </div>
          </div>
          <span className="caret">›</span>
        </Card>
      )}

      <h2 className="section-h">Start a workout</h2>
      <div className="cat-grid">
        {SORTED_CATEGORIES.map((c) => {
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

      <Button variant="ghost" block className="rest-cta" onClick={() => setConfirmRest(true)}>
        🌿 Log a rest / stretch / walk day
      </Button>
      <p className="muted sm center">Rest days keep your streak alive — they just don't earn XP or tokens.</p>

      <Sheet
        open={confirmRest}
        onClose={() => setConfirmRest(false)}
        title="Log a rest day?"
        footer={
          <div className="row-btns">
            <Button variant="ghost" onClick={() => setConfirmRest(false)}>Cancel</Button>
            <Button variant="primary" disabled={saving}
              onClick={() => { setConfirmRest(false); award({ rest: true }) }}>
              Log rest day
            </Button>
          </div>
        }
      >
        <p className="muted">This counts as an active day so your streak doesn't break. No XP or tokens awarded.</p>
      </Sheet>

      <SummaryModal summary={summary} onClose={() => setSummary(null)} />
    </div>
  )
}

// ─── Sub-components ───

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

  // Alphabetical: cardio → reps → time
  const SORTED_MODES = ['cardio', 'reps', 'time']
  const MODE_LABEL = { reps: 'Reps + weight', time: 'Timed hold', cardio: 'Cardio' }

  return (
    <Sheet open={open} onClose={onClose} title="Add an exercise"
      footer={
        <div className="row-btns">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!name.trim()} onClick={add}>Add</Button>
        </div>
      }>
      <label className="field block"><span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Cable fly" />
      </label>
      <label className="field block"><span>Machine (optional)</span>
        <input value={machine} onChange={(e) => setMachine(e.target.value)} placeholder="e.g. Cable" />
      </label>
      <div className="field block"><span>Type</span>
        <div className="chip-row">
          {SORTED_MODES.map((m) => (
            <Chip key={m} active={mode === m} onClick={() => setMode(m)}>
              {MODE_LABEL[m]}
            </Chip>
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
        <Button variant="primary" block onClick={onClose}>Nice</Button>
      </div>
    </div>
  )
}
