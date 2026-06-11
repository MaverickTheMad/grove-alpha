// ───────────────────────── People ─────────────────────────
export const PEOPLE = [
  { id: 'mav', name: 'Mav' },
  { id: 'ren', name: 'Ren' },
]

// ───────────────────────── Workout categories ─────────────────────────
// `unlock` = the level at which this whole category becomes available.
export const CATEGORIES = [
  { id: 'general',      label: 'General',            emoji: '🏋️', unlock: 1, blurb: 'Light full-body session' },
  { id: 'cardio',       label: 'Cardio',             emoji: '🏃', unlock: 1, blurb: 'Get the heart going' },
  { id: 'pilates_yoga', label: 'Pilates / Yoga',     emoji: '🧘', unlock: 1, blurb: 'Gentle mobility & core' },
  { id: 'legs',         label: 'Legs',               emoji: '🦵', unlock: 2, blurb: 'Legs & glutes' },
  { id: 'arms',         label: 'Arms',               emoji: '💪', unlock: 2, blurb: 'Arms & shoulders' },
  { id: 'core',         label: 'Chest / Abs / Back', emoji: '🔥', unlock: 3, blurb: 'Core & upper body' },
]

export const CATEGORY_LABEL = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.label]),
)
export const CATEGORY_EMOJI = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.emoji]),
)
// 'rest' is a pseudo-category used for rest/stretch/walk days.
CATEGORY_LABEL.rest = 'Rest / Walk'
CATEGORY_EMOJI.rest = '🌿'

// ───────────────────────── Exercise modes ─────────────────────────
// reps   → sets × reps @ weight (machines, free weights, bodyweight)
// time   → sets × seconds (planks, holds, yoga poses)
// cardio → minutes (elliptical, treadmill, bike)
export const MODES = ['reps', 'time', 'cardio']

// ───────────────────────── Gamification: XP & levels ─────────────────────────
// Consistency-first: a finished workout is always worth a flat base, regardless
// of how long or heavy it was. Streaks add a gentle, capped bonus.
export const BASE_XP = 100
export const STREAK_XP_PER_DAY = 10
export const STREAK_XP_CAP = 50
export const BASE_TOKENS = 10

// Token bonuses handed out when the current streak hits these day milestones.
export const STREAK_TOKEN_MILESTONES = { 3: 10, 7: 25, 14: 50, 30: 100 }

// Cumulative XP required to *reach* each level (index 0 = level 1).
// Fast early wins, then a steady +500 per level from level 6 on.
const LEVEL_TABLE = [0, 100, 300, 600, 1000]

export function xpForLevel(level) {
  if (level <= LEVEL_TABLE.length) return LEVEL_TABLE[level - 1]
  return LEVEL_TABLE[LEVEL_TABLE.length - 1] + (level - LEVEL_TABLE.length) * 500
}

export function levelForXp(xp) {
  let level = 1
  while (xp >= xpForLevel(level + 1)) level++
  return level
}

// Returns everything the UI needs to draw a progress bar toward the next level.
export function levelProgress(xp) {
  const level = levelForXp(xp)
  const floor = xpForLevel(level)
  const next = xpForLevel(level + 1)
  const into = xp - floor
  const span = next - floor
  return {
    level,
    into,
    span,
    nextAt: next,
    toNext: next - xp,
    pct: Math.max(0, Math.min(100, Math.round((into / span) * 100))),
  }
}

export const LEVEL_TITLES = {
  1: 'Getting Started',
  2: 'Finding a Rhythm',
  3: 'Building Momentum',
  4: 'In the Groove',
  5: 'Hitting Stride',
  6: 'Strong & Steady',
  8: 'Powerhouse',
  10: 'Unstoppable',
}
export function levelTitle(level) {
  let title = LEVEL_TITLES[1]
  for (const k of Object.keys(LEVEL_TITLES).map(Number).sort((a, b) => a - b)) {
    if (level >= k) title = LEVEL_TITLES[k]
  }
  return title
}

// What unlocks at a given level — used for the "Unlocks at Lv N" hints.
export function unlocksAtLevel(level) {
  const cats = CATEGORIES.filter((c) => c.unlock === level).map((c) => c.label)
  const out = [...cats]
  if (level === 4) out.push('Intermediate variations')
  if (level === 5) out.push('Advanced moves')
  return out
}

// ───────────────────────── Streak math ─────────────────────────
// Given a profile's stored streak state and "today", returns the new state.
// A rest day counts as activity (keeps/extends the streak) but earns nothing.
export function nextStreakState({ lastActiveDate, currentStreak, longestStreak }, today) {
  if (lastActiveDate === today) {
    // Already active today — second session, streak unchanged.
    return { current: currentStreak || 1, longest: Math.max(longestStreak || 0, currentStreak || 1), changed: false }
  }
  const yesterday = addDays(today, -1)
  let current
  if (lastActiveDate === yesterday) current = (currentStreak || 0) + 1
  else current = 1
  return { current, longest: Math.max(longestStreak || 0, current), changed: true }
}

export function streakXp(currentStreak) {
  return Math.min(STREAK_XP_PER_DAY * currentStreak, STREAK_XP_CAP)
}

// ───────────────────────── Time helpers (copied from Ren's Journal) ─────────────────────────
// Store UTC, bucket in local time. Use localDayBounds in every date-range query.
export function localDayBounds(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const start = new Date(y, m - 1, d, 0, 0, 0, 0)
  const end = new Date(y, m - 1, d, 23, 59, 59, 999)
  return { startISO: start.toISOString(), endISO: end.toISOString() }
}

export function isoToLocalDateStr(iso) {
  const dt = new Date(iso)
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, '0')
  const d = String(dt.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayStr() {
  return isoToLocalDateStr(new Date().toISOString())
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function fmtDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function fmtRelative(dateStr) {
  const today = todayStr()
  if (dateStr === today) return 'Today'
  if (dateStr === addDays(today, -1)) return 'Yesterday'
  const a = new Date(today)
  const b = new Date(dateStr)
  const days = Math.round((a - b) / 86400000)
  if (days > 1 && days < 7) return `${days} days ago`
  return fmtDate(dateStr)
}

// How an exercise's actuals read as a one-line summary.
export function summarizeExercise(ex) {
  if (ex.mode === 'cardio') return ex.seconds ? `${Math.round(ex.seconds / 60)} min` : '—'
  if (ex.mode === 'time') {
    const dur = ex.seconds ? `${ex.seconds}s` : '—'
    return ex.sets ? `${ex.sets} × ${dur}` : dur
  }
  const sr = `${ex.sets || '-'} × ${ex.reps || '-'}`
  return ex.weight ? `${sr} @ ${ex.weight} lbs` : sr
}

// ───────────────────────── Fallback exercise library ─────────────────────────
// The DB `exercises` table (seeded by schema.sql) is the source of truth. This
// mirror lets the app render templates even before the table loads, and documents
// the starting catalogue. `unlock` is the level at which an exercise appears.
export const FALLBACK_EXERCISES = [
  // General (full-body, mirrors the old Day-1 plan)
  { category: 'general', name: 'Elliptical (warm-up)', machine: 'Elliptical', mode: 'cardio', seconds: 300, notes: 'Aim for a light sweat.', unlock: 1, tier: 'base' },
  { category: 'general', name: 'Leg Press', machine: 'Leg Press', mode: 'reps', sets: 3, reps: 15, weight: 100, notes: 'Feet shoulder-width, push through heels.', unlock: 1, tier: 'base' },
  { category: 'general', name: 'Seated Row', machine: 'Seated Row', mode: 'reps', sets: 3, reps: 12, weight: 50, notes: 'Pull toward chest, squeeze shoulder blades.', unlock: 1, tier: 'base' },
  { category: 'general', name: 'Chest Press', machine: 'Chest Press', mode: 'reps', sets: 3, reps: 12, weight: 40, notes: 'Push handles forward steadily.', unlock: 1, tier: 'base' },
  { category: 'general', name: 'Shoulder Press', machine: 'Shoulder Press', mode: 'reps', sets: 3, reps: 12, weight: 30, notes: 'Press overhead, controlled.', unlock: 1, tier: 'base' },
  { category: 'general', name: 'Ab Crunch', machine: 'Ab Crunch', mode: 'reps', sets: 3, reps: 15, weight: 30, notes: 'Crunch slowly, brace the core.', unlock: 1, tier: 'base' },
  { category: 'general', name: 'Elliptical (cool-down)', machine: 'Elliptical', mode: 'cardio', seconds: 600, notes: 'Moderate pace.', unlock: 1, tier: 'base' },

  // Cardio
  { category: 'cardio', name: 'Elliptical', machine: 'Elliptical', mode: 'cardio', seconds: 1200, notes: 'Steady, conversational pace.', unlock: 1, tier: 'base' },
  { category: 'cardio', name: 'Treadmill Walk', machine: 'Treadmill', mode: 'cardio', seconds: 1200, notes: 'Add a slight incline.', unlock: 1, tier: 'base' },
  { category: 'cardio', name: 'Stationary Bike', machine: 'Bike', mode: 'cardio', seconds: 1200, notes: 'Keep cadence smooth.', unlock: 1, tier: 'base' },
  { category: 'cardio', name: 'Stair Climber', machine: 'Stair Climber', mode: 'cardio', seconds: 600, notes: 'Intermediate — short and steady.', unlock: 4, tier: 'intermediate' },

  // Pilates / Yoga
  { category: 'pilates_yoga', name: 'Cat-Cow', mode: 'time', sets: 1, seconds: 60, notes: 'Flow with the breath.', unlock: 1, tier: 'base' },
  { category: 'pilates_yoga', name: "Child's Pose", mode: 'time', sets: 1, seconds: 60, notes: 'Sink hips back, breathe.', unlock: 1, tier: 'base' },
  { category: 'pilates_yoga', name: 'Bridge Hold', mode: 'time', sets: 3, seconds: 30, notes: 'Squeeze glutes at the top.', unlock: 1, tier: 'base' },
  { category: 'pilates_yoga', name: 'Seated Forward Fold', mode: 'time', sets: 1, seconds: 45, notes: 'Hinge from the hips.', unlock: 1, tier: 'base' },
  { category: 'pilates_yoga', name: 'Plank Hold', mode: 'time', sets: 3, seconds: 30, notes: 'Flat back, brace.', unlock: 1, tier: 'base' },
  { category: 'pilates_yoga', name: 'Sun Salutation Flow', mode: 'time', sets: 3, seconds: 90, notes: 'Intermediate — link the poses.', unlock: 4, tier: 'intermediate' },

  // Legs
  { category: 'legs', name: 'Leg Press', machine: 'Leg Press', mode: 'reps', sets: 3, reps: 15, weight: 100, notes: 'Push through heels.', unlock: 2, tier: 'base' },
  { category: 'legs', name: 'Seated Leg Curl', machine: 'Seated Leg Curl', mode: 'reps', sets: 3, reps: 15, weight: 40, notes: 'Curl heels toward glutes slowly.', unlock: 2, tier: 'base' },
  { category: 'legs', name: 'Leg Extension', machine: 'Leg Extension', mode: 'reps', sets: 3, reps: 12, weight: 40, notes: 'Pause at the top.', unlock: 2, tier: 'base' },
  { category: 'legs', name: 'Calf Raise', machine: 'Calf Raise', mode: 'reps', sets: 3, reps: 15, weight: 50, notes: 'Full range, slow lower.', unlock: 2, tier: 'base' },
  { category: 'legs', name: 'Goblet Squat', mode: 'reps', sets: 3, reps: 12, weight: 20, notes: 'Chest up, sit back.', unlock: 2, tier: 'base' },
  { category: 'legs', name: 'Walking Lunge', mode: 'reps', sets: 3, reps: 10, weight: 0, notes: 'Per leg. Knee tracks over toe.', unlock: 4, tier: 'intermediate' },
  { category: 'legs', name: 'Bulgarian Split Squat', mode: 'reps', sets: 3, reps: 8, weight: 0, notes: 'Advanced — rear foot elevated, per leg.', unlock: 5, tier: 'advanced' },

  // Arms
  { category: 'arms', name: 'Bicep Curl', mode: 'reps', sets: 3, reps: 12, weight: 15, notes: 'No swinging.', unlock: 2, tier: 'base' },
  { category: 'arms', name: 'Tricep Pushdown', machine: 'Cable', mode: 'reps', sets: 3, reps: 12, weight: 25, notes: 'Elbows pinned.', unlock: 2, tier: 'base' },
  { category: 'arms', name: 'Shoulder Press', machine: 'Shoulder Press', mode: 'reps', sets: 3, reps: 12, weight: 30, notes: 'Press overhead steadily.', unlock: 2, tier: 'base' },
  { category: 'arms', name: 'Lateral Raise', mode: 'reps', sets: 3, reps: 12, weight: 8, notes: 'Lead with the elbows.', unlock: 2, tier: 'base' },
  { category: 'arms', name: 'Hammer Curl', mode: 'reps', sets: 3, reps: 12, weight: 15, notes: 'Neutral grip.', unlock: 4, tier: 'intermediate' },

  // Chest / Abs / Back (core)
  { category: 'core', name: 'Chest Press', machine: 'Chest Press', mode: 'reps', sets: 3, reps: 12, weight: 40, notes: 'Push handles forward.', unlock: 3, tier: 'base' },
  { category: 'core', name: 'Seated Row', machine: 'Seated Row', mode: 'reps', sets: 3, reps: 12, weight: 50, notes: 'Squeeze shoulder blades.', unlock: 3, tier: 'base' },
  { category: 'core', name: 'Ab Crunch', machine: 'Ab Crunch', mode: 'reps', sets: 3, reps: 15, weight: 30, notes: 'Slow and controlled.', unlock: 3, tier: 'base' },
  { category: 'core', name: 'Regular Plank', mode: 'time', sets: 3, seconds: 60, notes: 'Flat back, brace.', unlock: 3, tier: 'base' },
  { category: 'core', name: 'Side Plank', mode: 'time', sets: 2, seconds: 45, notes: 'Per side. Stack the hips.', unlock: 3, tier: 'base' },
  { category: 'core', name: 'Bicycle Crunch', mode: 'reps', sets: 3, reps: 20, weight: 0, notes: 'Slow, opposite elbow to knee.', unlock: 3, tier: 'base' },
  { category: 'core', name: 'Push-ups', mode: 'reps', sets: 3, reps: 12, weight: 0, notes: 'Knees down is fine to start.', unlock: 3, tier: 'base' },
  { category: 'core', name: 'Back Extension', mode: 'reps', sets: 3, reps: 12, weight: 0, notes: "Don't over-arch.", unlock: 4, tier: 'intermediate' },
  // Advanced (from the old Sheet8)
  { category: 'core', name: 'Advanced V-Up', mode: 'reps', sets: 3, reps: 10, weight: 0, notes: 'Advanced — legs & arms meet at the top.', unlock: 5, tier: 'advanced' },
  { category: 'core', name: 'Mountain-Climber Complex', mode: 'reps', sets: 3, reps: 10, weight: 0, notes: 'Advanced — drive knees, keep hips low.', unlock: 5, tier: 'advanced' },
  { category: 'core', name: 'Up/Down Planks', mode: 'time', sets: 3, seconds: 60, notes: 'Advanced — plank to forearms and back.', unlock: 5, tier: 'advanced' },
]

// ───────────────────────── Default rewards shop ─────────────────────────
export const DEFAULT_REWARDS = [
  { emoji: '🍦', name: 'Ice cream', cost_tokens: 30 },
  { emoji: '☕', name: 'Fancy coffee', cost_tokens: 40 },
  { emoji: '🎬', name: 'See a movie', cost_tokens: 80 },
  { emoji: '📚', name: 'New book', cost_tokens: 120 },
  { emoji: '🍽️', name: 'Dinner out', cost_tokens: 200 },
  { emoji: '🎮', name: 'Buy a video game', cost_tokens: 300 },
]

export const REWARD_EMOJIS = ['🍦', '☕', '🎬', '📚', '🍽️', '🎮', '🛍️', '💆', '🎧', '🍕', '🍫', '🌮', '🎁', '🏖️', '⛳', '🎟️']
