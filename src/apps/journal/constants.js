// ---------- FOOD TAXONOMY ----------
export const FOOD_CATEGORIES = [
  { name: 'Alcohol',               items: ['Beer', 'Cocktail', 'Liquor', 'Wine'] },
  { name: 'Artificial sweeteners', items: ['Diet soda', 'Sugar-free gum', 'Sugar-free snacks'] },
  { name: 'Caffeine',              items: ['Black tea', 'Coffee', 'Energy drink', 'Green tea', 'Matcha'] },
  { name: 'Citrus',                items: ['Grapefruit', 'Lemon', 'Lime', 'Orange'] },
  { name: 'Cruciferous veg',       items: ['Broccoli', 'Brussels sprouts', 'Cabbage', 'Cauliflower', 'Kale'] },
  { name: 'Dairy',                 items: ['Butter', 'Cheese', 'Cottage cheese', 'Cream', 'Ice cream', 'Milk', 'Sour cream', 'Yogurt'] },
  { name: 'Eggs',                  items: ['Eggs'] },
  { name: 'Gluten / Grains',       items: ['Bread', 'Cereal', 'Corn', 'Oats', 'Pasta', 'Rice', 'Wheat'] },
  { name: 'High-FODMAP',           items: ['Apples', 'Beans', 'Garlic', 'Lentils', 'Mushrooms', 'Onion'] },
  { name: 'High-histamine',        items: ['Aged cheese', 'Cured / deli meat', 'Fermented foods', 'Kefir', 'Kombucha', 'Leftovers / reheated', 'Smoked fish', 'Vinegar'] },
  { name: 'Nightshades',           items: ['Bell pepper', 'Eggplant', 'Potato', 'Tomato'] },
  { name: 'Nuts / Seeds',          items: ['Almond', 'Cashew', 'Peanut', 'Pumpkin seeds', 'Sunflower seeds', 'Walnut'] },
  { name: 'Processed / Fast food', items: ['Canned food', 'Chips', 'Deli meat', 'Fast food', 'Frozen meal', 'Packaged snacks'] },
  { name: 'Red meat',              items: ['Beef', 'Lamb', 'Pork'] },
  { name: 'White meat / Fish',   items: ['Chicken', 'Crab', 'Fish', 'Shellfish', 'Shrimp', 'Tuna', 'Turkey'] },
  { name: 'Soy',                   items: ['Edamame', 'Soy sauce', 'Tofu'] },
  { name: 'Spicy',                 items: ['Hot sauce', 'Peppers', 'Spicy dish'] },
  { name: 'Sugar / Sweets',        items: ['Baked goods', 'Candy', 'Chocolate', 'Dessert', 'Fruit juice', 'Honey', 'Maple syrup', 'Soda'] },
]

// Special picker option that lets you log a whole meal from the Pantry app.
// Not a real food category — selecting it shows the recipe list instead of items.
export const MEAL_PICKER = 'Meals'

// Catch-all category for meal ingredients that don't map to a trigger category
// above. Kept out of the manual picker; only meal logging produces it.
export const MEAL_FALLBACK_CATEGORY = 'Other / mixed'

// Map a free-text recipe ingredient name to one of the trigger categories above
// so the food→flare correlation still buckets meaningfully. First match wins;
// multi-word rules are listed before the looser single-word ones they'd shadow.
// Heuristic by design — unmatched ingredients fall back to 'Other / mixed'.
const INGREDIENT_RULES = [
  // exclusions first: watery/aromatic bases that shouldn't read as a trigger food
  [/broth|stock|bouillon/, MEAL_FALLBACK_CATEGORY],
  [/black pepper|white pepper|peppercorn/, MEAL_FALLBACK_CATEGORY],
  // spicy (before generic "pepper")
  [/calabrian|chili pepper|chile|jalapen|sriracha|cayenne|red pepper flake|hot sauce|chili powder|chipotle/, 'Spicy'],
  // citrus
  [/lemon|lime|orange|grapefruit/, 'Citrus'],
  // cruciferous
  [/broccoli|cauliflower|cabbage|brussels|kale/, 'Cruciferous veg'],
  // soy
  [/soy sauce|\btofu\b|edamame|tempeh|tamari/, 'Soy'],
  // nuts / seeds
  [/almond|cashew|peanut|walnut|pistachio|pecan|sunflower seed|pumpkin seed|sesame|poppy seed|nut butter/, 'Nuts / Seeds'],
  // alcohol (before "vinaigrette"/"vinegar")
  [/\bwine\b|cabernet|sauvignon|chardonnay|merlot|\bbeer\b|liquor|vodka|whiskey|bourbon|tequila|sherry|brandy|\brum\b/, 'Alcohol'],
  // high-histamine
  [/vinegar|balsamic|fermented|sauerkraut|kombucha|kefir|aged cheese|cured|smoked fish/, 'High-histamine'],
  // dairy
  [/butter|cheese|parmesan|mozzarella|ricotta|cheddar|boursin|queso|cream cheese|sour cream|heavy cream|\bcream\b|\bmilk\b|yogurt|half and half|mascarpone|gruyere|provolone|jarlsberg/, 'Dairy'],
  // eggs
  [/\beggs?\b/, 'Eggs'],
  // nightshades (before plain veg / "pepper")
  [/tomato|marinara|\bpotato|bell pepper|eggplant|paprika|pasta sauce|\bsalsa\b|fire roasted|\bpeppers?\b/, 'Nightshades'],
  // high-FODMAP
  [/garlic|jarlic|\bonion|mushroom|\bbeans?\b|lentil|chickpea|\bapple/, 'High-FODMAP'],
  // gluten / grains
  [/pasta|noodle|tortellini|orzo|couscous|\brice\b|\bbread|roll\b|rolls\b|hawaiian|flour|tortilla|breadcrumb|flatbread|bagel|\boats?\b|cereal|cracker|quinoa|sourdough|wheat|\bdough\b|calzone|pizza crust|pie crust/, 'Gluten / Grains'],
  // white meat / fish
  [/chicken|turkey|\bfish\b|salmon|\bcod\b|tuna|shrimp|\bcrab\b|shellfish|scallop|tilapia|halibut/, 'White meat / Fish'],
  // red meat (deli/cured meats grouped here)
  [/\bbeef\b|\bpork\b|\blamb\b|sausage|bacon|\bham\b|deli ham|steak|ribeye|brisket|meatball|kielbasa|pepperoni|prosciutto|salami|chorizo|\bribs?\b|roast/, 'Red meat'],
  // caffeine
  [/coffee|espresso|\btea\b|matcha|energy drink/, 'Caffeine'],
  // sugar / sweets
  [/sugar|honey|maple|chocolate|\bcandy\b|syrup|dessert|\bcake\b|cookie|brown sugar|powdered sugar/, 'Sugar / Sweets'],
  // processed / fast food
  [/canned|frozen meal|packaged|bouillon/, 'Processed / Fast food'],
]

export function categorizeIngredient(name) {
  const n = String(name || '').toLowerCase().trim()
  if (!n) return MEAL_FALLBACK_CATEGORY
  for (const [re, cat] of INGREDIENT_RULES) if (re.test(n)) return cat
  return MEAL_FALLBACK_CATEGORY
}


// ---------- SYMPTOMS ----------
export const SYMPTOMS = [
  'Acne', 'Back pain', 'Bloating', 'Breast tenderness', 'Constipation',
  'Cramps', 'Diarrhea', 'Dizziness', 'Fatigue', 'Gas',
  'Headache', 'Hot flashes', 'Joint pain', 'Migraine', 'Nausea', 'Stomach Ache',
]

// ---------- MOODS ----------
export const MOODS = [
  'Angry', 'Anxious', 'Calm', 'Energetic', 'Foggy',
  'Happy', 'Irritable', 'Sad', 'Sensitive',
]

// ---------- EXERCISE TYPES ----------
export const EXERCISE_TYPES = [
  'Cycling', 'Other', 'Pilates', 'Run', 'Strength', 'Swim', 'Walk', 'Yoga',
]

// ---------- FLOW ----------
export const FLOW_LEVELS = [
  { value: 'none',     label: 'None',     color: 'var(--line)' },
  { value: 'spotting', label: 'Spotting', color: 'var(--flow-spotting)' },
  { value: 'light',    label: 'Light',    color: 'var(--flow-light)' },
  { value: 'medium',   label: 'Medium',   color: 'var(--flow-medium)' },
  { value: 'heavy',    label: 'Heavy',    color: 'var(--flow-heavy)' },
]

// ---------- CYCLE PHASES ----------
// Default 28-day cycle, 5-day period.
// Phase windows (day-of-cycle, 1-indexed):
//   menstrual: 1–5
//   follicular: 6–13
//   ovulation: 14–16
//   luteal: 17–end
export const PHASES = {
  menstrual:  { label: 'Menstrual',  color: '#c0685a' },
  follicular: { label: 'Follicular', color: '#b8945a' },
  ovulation:  { label: 'Ovulation',  color: '#6b7a5a' },
  luteal:     { label: 'Luteal',     color: '#6b4a55' },
}

export function computeCyclePhase(dateStr, periodStarts) {
  // periodStarts: array of date strings, sorted ASC
  if (!periodStarts || periodStarts.length === 0) return null
  const date = new Date(dateStr + 'T00:00:00')
  // Find the most recent start on or before date
  const sorted = [...periodStarts].sort()
  let lastStart = null
  for (const s of sorted) {
    const sd = new Date(s + 'T00:00:00')
    if (sd <= date) lastStart = sd
    else break
  }
  if (!lastStart) return null

  // Day of cycle (1-indexed)
  const dayOfCycle = Math.floor((date - lastStart) / (1000 * 60 * 60 * 24)) + 1

  // Estimate cycle length: avg of recent gaps, or 28
  let cycleLength = 28
  if (sorted.length >= 2) {
    const gaps = []
    for (let i = 1; i < sorted.length; i++) {
      const a = new Date(sorted[i - 1] + 'T00:00:00')
      const b = new Date(sorted[i] + 'T00:00:00')
      gaps.push(Math.round((b - a) / (1000 * 60 * 60 * 24)))
    }
    const recent = gaps.slice(-3) // last 3 cycles
    cycleLength = Math.round(recent.reduce((s, g) => s + g, 0) / recent.length)
    if (cycleLength < 21 || cycleLength > 40) cycleLength = 28 // sanity
  }

  // If we're past expected cycle length, fall back to luteal (late period)
  if (dayOfCycle > cycleLength + 5) return null

  if (dayOfCycle <= 5)  return 'menstrual'
  if (dayOfCycle <= 13) return 'follicular'
  if (dayOfCycle <= 16) return 'ovulation'
  return 'luteal'
}

export function todayLocalISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatTimeLocal(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function formatDateLong(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

export function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// ---------- TIMEZONE-AWARE HELPERS ----------
// `dateStr` here is always a local-time YYYY-MM-DD.
// `localDayBounds` returns the start/end of that local day expressed as UTC
// ISO strings — used for filtering timestamptz columns in Supabase queries.
// Without this, late-evening events get pushed to the next UTC day and
// show up under the wrong calendar date.
export function localDayBounds(dateStr) {
  const startLocal = new Date(dateStr + 'T00:00:00')
  const endLocal   = new Date(dateStr + 'T23:59:59.999')
  return {
    startISO: startLocal.toISOString(),
    endISO:   endLocal.toISOString(),
  }
}

// Given a UTC ISO timestamp from the DB, return the YYYY-MM-DD it falls on
// in the user's local timezone. Used for bucketing events by day.
export function isoToLocalDateStr(iso) {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
