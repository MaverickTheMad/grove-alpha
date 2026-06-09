// Ren's Journal taxonomy + pure helpers (REN-JOURNAL-SUMMARY).
// NOTE: SYMPTOMS / MOODS / EXERCISE_TYPES / FLOW / PHASES match the summary.
// FOOD items below are a STARTER set — replace with the canonical 18-category,
// 90-item list from the real journal/constants.js during the port (§13 #5).
// computeCyclePhase mirrors the documented algorithm; reconcile against the
// real implementation before cutover.

import { addDays, daysBetween } from '../../lib/time'

export const SYMPTOMS = [
  'cramps', 'headache', 'migraine', 'bloating', 'nausea', 'fatigue',
  'breast tenderness', 'back pain', 'joint pain', 'acne', 'hot flashes',
  'dizziness', 'constipation', 'diarrhea', 'gas',
]

export const MOODS = [
  'happy', 'calm', 'irritable', 'anxious', 'sad', 'energetic',
  'tired', 'foggy', 'emotional',
]

export const EXERCISE_TYPES = [
  'walk', 'run', 'cycling', 'strength', 'yoga', 'swim', 'hike', 'other',
]

export const FLOW_LEVELS = ['none', 'spotting', 'light', 'medium', 'heavy']

export const WATER_OPTIONS = [4, 8, 12, 16, 20, 24, 32]

export const PHASES = [
  { id: 'menstrual', label: 'Menstrual', start: 1, end: 5 },
  { id: 'follicular', label: 'Follicular', start: 6, end: 13 },
  { id: 'ovulation', label: 'Ovulation', start: 14, end: 16 },
  { id: 'luteal', label: 'Luteal', start: 17, end: null }, // end = cycle length
]

// data colors (route through CSS vars so dark mode recolors — UI-POLISH §7)
export const PHASE_COLOR = {
  menstrual: 'var(--danger)',
  follicular: 'var(--ok)',
  ovulation: 'var(--secondary)',
  luteal: 'var(--warn)',
}

// STARTER food set — replace with the canonical 90-item list from source.
export const FOOD_CATEGORIES = {
  Alcohol: ['beer', 'wine', 'cocktail'],
  Caffeine: ['coffee', 'tea', 'energy drink'],
  Citrus: ['orange', 'lemon', 'grapefruit'],
  Dairy: ['milk', 'cheese', 'yogurt', 'butter'],
  Eggs: ['eggs'],
  'Gluten / Grains': ['bread', 'pasta', 'oats', 'rice'],
  Nightshades: ['tomato', 'pepper', 'potato', 'eggplant'],
  'Nuts / Seeds': ['almonds', 'peanuts', 'walnuts'],
  'Processed / Fast food': ['fast food', 'chips', 'frozen meal'],
  'Red meat': ['beef', 'pork', 'lamb'],
  Seafood: ['fish', 'shrimp', 'shellfish'],
  Soy: ['tofu', 'soy sauce', 'edamame'],
  Spicy: ['hot sauce', 'chili', 'curry'],
  'Sugar / Sweets': ['candy', 'dessert', 'soda'],
}

export const EVENT_TYPES = {
  symptom: 'symptom_event',
  food: 'food_event',
  mood: 'mood_event',
  water: 'water_event',
  exercise: 'exercise_event',
  cycleDay: 'cycle_day',
  periodStart: 'period_start',
}

// Average of the last up-to-3 cycle gaps; fallback 28.
export function avgCycleLength(periodStarts) {
  const sorted = [...periodStarts].sort()
  if (sorted.length < 2) return 28
  const gaps = []
  for (let i = sorted.length - 1; i > 0 && gaps.length < 3; i--) {
    gaps.push(daysBetween(sorted[i - 1], sorted[i]))
  }
  const valid = gaps.filter((g) => g > 0)
  if (!valid.length) return 28
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length)
}

// Auto-calc the cycle phase for a local date from the period-start history.
export function computeCyclePhase(dateStr, periodStarts) {
  const sorted = [...periodStarts].sort()
  const lastStart = [...sorted].reverse().find((s) => s <= dateStr)
  if (!lastStart) return null
  const len = avgCycleLength(sorted)
  const dayN = daysBetween(lastStart, dateStr) + 1
  for (const p of PHASES) {
    const end = p.end ?? len
    if (dayN >= p.start && dayN <= end) return { phase: p.id, day: dayN, length: len }
  }
  // past the computed length → still luteal (cycle running long)
  return { phase: 'luteal', day: dayN, length: len }
}

export function nextPeriodEstimate(periodStarts) {
  const sorted = [...periodStarts].sort()
  if (!sorted.length) return null
  return addDays(sorted[sorted.length - 1], avgCycleLength(sorted))
}
