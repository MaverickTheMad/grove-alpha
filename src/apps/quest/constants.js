// Quest — difficulty table, categories, rank progression
export { isoToLocalDateStr, todayStr, addDays, localDayBounds } from '../../lib/time'

// ── Difficulty levels ──────────────────────────────────────────────────────────
export const DIFFICULTIES = [
  { id: 'easy',   label: 'Easy',   xp: 10  },
  { id: 'medium', label: 'Medium', xp: 25  },
  { id: 'hard',   label: 'Hard',   xp: 50  },
  { id: 'epic',   label: 'Epic',   xp: 100 },
]

export const EVENT_XP = Object.fromEntries(DIFFICULTIES.map(d => [d.id, d.xp]))

// ── Quest categories (alphabetical; drives pickers in add form) ────────────────
export const QUEST_CATEGORIES = [
  'Chores', 'Cooking', 'Errands', 'Home', 'Outdoor', 'Pets', 'Repairs', 'Shopping', 'Other',
]

// ── Starter quest templates (alphabetical within category) ────────────────────
export const DEFAULT_HABITS = [
  { title: 'Do the dishes',          difficulty: 'easy',   category: 'Chores'   },
  { title: 'Take out the trash',     difficulty: 'easy',   category: 'Chores'   },
  { title: 'Vacuum living room',     difficulty: 'easy',   category: 'Chores'   },
  { title: 'Cook dinner',            difficulty: 'medium', category: 'Cooking'  },
  { title: 'Grocery run',            difficulty: 'medium', category: 'Errands'  },
  { title: 'Deep clean bathroom',    difficulty: 'hard',   category: 'Chores'   },
  { title: 'Mow the lawn',           difficulty: 'hard',   category: 'Outdoor'  },
]

// ── XP / rank progression ──────────────────────────────────────────────────────
export function xpForLevel(level) {
  return Math.round(50 * (level - 1) + 25 * (level - 1) * (level - 1))
}
export function levelFromXp(totalXp) {
  let level = 1
  while (xpForLevel(level + 1) <= totalXp) level++
  return level
}
export function levelProgress(totalXp) {
  const level = levelFromXp(totalXp)
  const floor = xpForLevel(level)
  const ceil  = xpForLevel(level + 1)
  const into  = totalXp - floor
  const span  = ceil - floor
  return { level, into, span, pct: Math.max(0, Math.min(1, into / span)) }
}

export const RANK_TITLES = [
  { min: 1,  title: 'Commoner'   },
  { min: 5,  title: 'Squire'     },
  { min: 10, title: 'Adventurer' },
  { min: 18, title: 'Knight'     },
  { min: 28, title: 'Champion'   },
  { min: 40, title: 'Hero'       },
  { min: 55, title: 'Archmage'   },
  { min: 75, title: 'Legend'     },
]
export function rankTitle(level) {
  let t = RANK_TITLES[0].title
  for (const r of RANK_TITLES) if (level >= r.min) t = r.title
  return t
}

// ── Extra date helpers (not in lib/time.js) ────────────────────────────────────
export function prettyDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// Monday-anchored week start for the given YYYY-MM-DD
export function weekStart(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const dow = (dt.getDay() + 6) % 7 // 0 = Monday
  dt.setDate(dt.getDate() - dow)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
