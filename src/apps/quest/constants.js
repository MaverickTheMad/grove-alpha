// ============================================================
//  Mav's Quest Log — constants & game config
// ============================================================

// ---------- Logged-event taxonomy ----------
export const MOODS = [
  'great', 'good', 'okay', 'low', 'stressed', 'anxious', 'tired', 'wired', 'focused',
]

export const EXERCISE_TYPES = [
  'lifting', 'running', 'cycling', 'walking', 'swimming', 'yoga', 'sports', 'climbing', 'hiit', 'mobility',
]

// Each category carries a preset list of tap-to-add items (alphabetical),
// so you rarely need to type. Free-text box stays as a fallback.
export const FOOD_CATEGORIES = {
  'Lean protein':   ['Chicken', 'Cod', 'Eggs', 'Greek yogurt', 'Ground turkey', 'Pork loin', 'Salmon', 'Shellfish', 'Shrimp', 'Steak', 'Tofu', 'Tuna', 'Turkey', 'Tempeh'],
  'Red meat':       ['Bacon', 'Beef', 'Brisket', 'Burger', 'Lamb', 'Meatballs', 'Pork', 'Ribs', 'Sausage', 'Steak'],
  'Deli meat':      ['Bologna', 'Capicola', 'Corned beef', 'Ham', 'Pastrami', 'Pepperoni', 'Prosciutto', 'Roast beef', 'Salami', 'Turkey breast'],
  'Veg':            ['Asparagus', 'Bell pepper', 'Broccoli', 'Brussels sprouts', 'Cabbage', 'Carrots', 'Cauliflower', 'Corn', 'Cucumber', 'Eggplant', 'Green beans', 'Kale', 'Mushrooms', 'Onion', 'Peas', 'Potato', 'Salad', 'Spinach', 'Squash', 'Sweet potato', 'Tomato', 'Zucchini'],
  'Fruit':          ['Apple', 'Banana', 'Berries', 'Cherries', 'Grapes', 'Mango', 'Melon', 'Orange', 'Peach', 'Pear', 'Pineapple', 'Strawberries', 'Watermelon'],
  'Grains / starch':['Bagel', 'Bread', 'Brown rice', 'Cereal', 'Couscous', 'Crackers', 'Oats', 'Pasta', 'Quinoa', 'Rice', 'Sourdough', 'Tortilla', 'Wheat bread'],
  'Dairy':          ['Butter', 'Cheese', 'Cottage cheese', 'Cream', 'Cream cheese', 'Milk', 'Sour cream', 'Yogurt'],
  'Nuts / seeds':   ['Almonds', 'Cashews', 'Nut butter', 'Peanuts', 'Pistachios', 'Pumpkin seeds', 'Sunflower seeds', 'Trail mix', 'Walnuts'],
  'Beans / legumes':['Beans', 'Chickpeas', 'Edamame', 'Hummus', 'Lentils', 'Peanut butter'],
  'Fast food':      ['Burger', 'Burrito', 'Chicken nuggets', 'Fries', 'Hot dog', 'Pizza', 'Sandwich', 'Sub', 'Tacos', 'Wings'],
  'Processed / snacks':['Canned food', 'Chips', 'Frozen meal', 'Granola bar', 'Jerky', 'Microwave meal', 'Packaged snacks', 'Popcorn', 'Pretzels'],
  'Sugar / sweets': ['Baked goods', 'Cake', 'Candy', 'Chocolate', 'Cookies', 'Dessert', 'Donut', 'Honey', 'Ice cream', 'Maple syrup', 'Pastry', 'Pie'],
  'Condiments / sauce':['BBQ sauce', 'Dressing', 'Gravy', 'Hot sauce', 'Ketchup', 'Mayo', 'Mustard', 'Soy sauce', 'Syrup'],
  'Beverages':      ['Coffee', 'Energy drink', 'Juice', 'Milkshake', 'Smoothie', 'Soda', 'Sports drink', 'Tea', 'Water'],
  'Alcohol':        ['Beer', 'Cider', 'Cocktail', 'Liquor', 'Seltzer', 'Wine'],
}

export const FOOD_CATEGORY_NAMES = Object.keys(FOOD_CATEGORIES)

// Special picker option that logs a whole meal from the Pantry app in one tap.
// Not a real category — selecting it shows the recipe list instead of items.
export const MEAL_PICKER = 'Meal'

// Catch-all for meal ingredients that don't map to a category above.
export const MEAL_FALLBACK_CATEGORY = 'Other / mixed'

// Map a free-text recipe ingredient to one of the categories above. First match
// wins; multi-word rules precede looser ones. Heuristic — unmatched → fallback.
const INGREDIENT_RULES = [
  [/soy sauce|hot sauce|bbq sauce|ketchup|mustard|\bmayo\b|gravy|dressing|vinaigrette|worcestershire|tomato paste|tomato sauce|marinara|pasta sauce|broth|stock|bouillon|vinegar|balsamic|\bsyrup\b/, 'Condiments / sauce'],
  [/coffee|espresso|\btea\b|matcha|energy drink|soda|juice|smoothie|milkshake|sports drink|\bwater\b/, 'Beverages'],
  [/\bwine\b|cabernet|sauvignon|chardonnay|\bbeer\b|cider|liquor|vodka|whiskey|bourbon|tequila|seltzer|cocktail/, 'Alcohol'],
  [/almond|cashew|peanut|walnut|pistachio|pecan|sunflower seed|pumpkin seed|sesame|poppy seed|nut butter|trail mix/, 'Nuts / seeds'],
  [/\bbeans?\b|chickpea|lentil|edamame|hummus|peanut butter/, 'Beans / legumes'],
  [/butter|cheese|parmesan|mozzarella|ricotta|cheddar|boursin|queso|cream cheese|sour cream|heavy cream|\bcream\b|\bmilk\b|yogurt|mascarpone|provolone/, 'Dairy'],
  [/sugar|honey|maple|chocolate|\bcandy\b|dessert|\bcake\b|cookie|\bpie\b|ice cream|pastry|donut|baked goods/, 'Sugar / sweets'],
  [/pasta|noodle|tortellini|orzo|couscous|\brice\b|\bbread|roll\b|rolls\b|hawaiian|flour|tortilla|breadcrumb|flatbread|bagel|\boats?\b|cereal|cracker|quinoa|sourdough|wheat|\bdough\b|cornstarch|corn starch/, 'Grains / starch'],
  [/bologna|capicola|corned beef|deli ham|\bham\b|pastrami|pepperoni|prosciutto|salami|deli meat/, 'Deli meat'],
  [/\bbeef\b|\bpork\b|\blamb\b|sausage|bacon|steak|ribeye|brisket|meatball|kielbasa|chorizo|\bribs?\b|\broast\b|burger|ground beef/, 'Red meat'],
  [/chicken|turkey|\bfish\b|salmon|\bcod\b|tuna|shrimp|\bcrab\b|shellfish|scallop|tilapia|\btofu\b|tempeh|greek yogurt|\beggs?\b/, 'Lean protein'],
  [/apple|banana|berr|cherr|grape|mango|melon|orange|peach|\bpear\b|pineapple|strawberr|watermelon|lemon|lime/, 'Fruit'],
  [/black pepper|white pepper|peppercorn/, 'Condiments / sauce'],
  [/onion|garlic|jarlic|tomato|potato|pepper|broccoli|cauliflower|cabbage|carrot|celery|spinach|kale|mushroom|zucchini|squash|cucumber|eggplant|green bean|\bpeas?\b|asparagus|\bcorn\b|\bsalad\b|bay leaves|thyme|rosemary|sage|basil|oregano|parsley/, 'Veg'],
  [/burrito|fries|hot dog|\bpizza\b|sandwich|\bsub\b|tacos|wings|nuggets/, 'Fast food'],
  [/canned|frozen meal|microwave meal|chips|jerky|granola bar|popcorn|pretzel|packaged/, 'Processed / snacks'],
]

export function categorizeIngredient(name) {
  const n = String(name || '').toLowerCase().trim()
  if (!n) return MEAL_FALLBACK_CATEGORY
  for (const [re, cat] of INGREDIENT_RULES) if (re.test(n)) return cat
  return MEAL_FALLBACK_CATEGORY
}

export const WATER_OPTIONS = [8, 12, 16, 20, 24, 32]

// ---------- Daily habits (binary check-offs) ----------
// These drive the streak engine. Each completion awards XP.
// `id` is stable — used as the DB key. Order = display order.
export const DEFAULT_HABITS = [
  { id: 'water',   label: 'Draught of Vigor',  hint: 'Drink 8+ glasses of water',  icon: '🧪', xp: 15 },
  { id: 'sleep',   label: "Adventurer's Rest", hint: 'Sleep 7+ hours',             icon: '🌙', xp: 20 },
  { id: 'workout', label: 'Trial of Might',    hint: 'Exercise today',             icon: '⚔️', xp: 25 },
  { id: 'eatwell', label: 'Provisions',        hint: 'Eat clean, no junk food',    icon: '🍞', xp: 15 },
  { id: 'mood',    label: 'Commune Within',    hint: 'Log how you feel',           icon: '🔮', xp: 10 },
]

// ---------- XP awarded for logged events (separate from habits) ----------
export const EVENT_XP = {
  mood: 5,
  food: 3,
  water: 4,
  exercise: 10,
  sleep: 8,
}

// ---------- Level curve ----------
// XP needed to reach level n (cumulative). Gentle quadratic so early
// levels come fast (dopamine) and later ones feel earned.
export function xpForLevel(level) {
  // total cumulative XP required to be AT this level
  return Math.round(50 * (level - 1) + 25 * (level - 1) * (level - 1))
}

export function levelFromXp(totalXp) {
  let level = 1
  while (xpForLevel(level + 1) <= totalXp) level++
  return level
}

// Returns { level, into, span, pct } for the XP bar
export function levelProgress(totalXp) {
  const level = levelFromXp(totalXp)
  const floor = xpForLevel(level)
  const ceil = xpForLevel(level + 1)
  const into = totalXp - floor
  const span = ceil - floor
  return { level, into, span, pct: Math.max(0, Math.min(1, into / span)) }
}

export const RANK_TITLES = [
  { min: 1,  title: 'Commoner' },
  { min: 5,  title: 'Squire' },
  { min: 10, title: 'Adventurer' },
  { min: 18, title: 'Knight' },
  { min: 28, title: 'Champion' },
  { min: 40, title: 'Hero' },
  { min: 55, title: 'Archmage' },
  { min: 75, title: 'Legend' },
]

export function rankTitle(level) {
  let t = RANK_TITLES[0].title
  for (const r of RANK_TITLES) if (level >= r.min) t = r.title
  return t
}

// ---------- Badges / achievements ----------
// `check(ctx)` receives a context object computed in App and returns bool.
// ctx = { totalXp, level, perfectStreak, habitStreaks, totalPerfectDays,
//         workoutCount, daysLogged, maxWaterStreak }
export const BADGES = [
  { id: 'firststep',  name: 'The First Page',   desc: 'Log your first day',               icon: '📜', check: c => c.daysLogged >= 1 },
  { id: 'streak3',    name: 'Kindled',          desc: '3-day perfect streak',             icon: '🔥', check: c => c.perfectStreak >= 3 },
  { id: 'streak7',    name: 'Ever-Burning',     desc: '7-day perfect streak',             icon: '⚡', check: c => c.perfectStreak >= 7 },
  { id: 'streak30',   name: 'Eternal Flame',    desc: '30-day perfect streak',            icon: '💎', check: c => c.perfectStreak >= 30 },
  { id: 'hydra7',     name: 'Ever-Full Flask',  desc: '7-day hydration streak',           icon: '⚗️', check: c => (c.habitStreaks.water || 0) >= 7 },
  { id: 'lift10',     name: 'Hardened',         desc: 'Log 10 workouts',                  icon: '🛡️', check: c => c.workoutCount >= 10 },
  { id: 'lift50',     name: 'Mighty Thews',     desc: 'Log 50 workouts',                  icon: '🪓', check: c => c.workoutCount >= 50 },
  { id: 'lvl5',       name: 'Dubbed Squire',    desc: 'Reach level 5',                    icon: '⭐', check: c => c.level >= 5 },
  { id: 'lvl10',      name: 'Seasoned',         desc: 'Reach level 10',                   icon: '🌟', check: c => c.level >= 10 },
  { id: 'lvl25',      name: 'Ascended',         desc: 'Reach level 25',                   icon: '👑', check: c => c.level >= 25 },
  { id: 'perfect10',  name: 'Ten Flawless Days',desc: '10 perfect days total',            icon: '✨', check: c => c.totalPerfectDays >= 10 },
  { id: 'devoted',    name: 'The Devoted',      desc: 'Log 30 different days',            icon: '📖', check: c => c.daysLogged >= 30 },
]

// ---------- Daily / weekly challenges ----------
// Rotating bonus objectives. `kind` decides how App evaluates progress.
export const CHALLENGES = [
  { id: 'allhabits',  scope: 'daily',  name: 'Flawless Day',    desc: 'Complete all daily quests today',    bonus: 50,  kind: 'allHabitsToday' },
  { id: 'triple',     scope: 'daily',  name: "Hero's Trinity",  desc: 'Log a mood, water & a workout today', bonus: 30,  kind: 'tripleToday' },
  { id: 'week5',      scope: 'weekly', name: 'Unwavering',      desc: '5 perfect days this week',           bonus: 100, kind: 'perfectThisWeek', target: 5 },
  { id: 'hydraweek',  scope: 'weekly', name: 'Flask-Bearer',    desc: 'Hit hydration 6 days this week',     bonus: 60,  kind: 'habitThisWeek', habit: 'water', target: 6 },
]

// ---------- Timezone helpers (ported from Ren's Journal) ----------
// Returns { startISO, endISO } in UTC for a given local YYYY-MM-DD.
// Used in all Supabase date-range queries to avoid timezone drift.
export function localDayBounds(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const start = new Date(y, m - 1, d, 0, 0, 0, 0)
  const end = new Date(y, m - 1, d, 23, 59, 59, 999)
  return { startISO: start.toISOString(), endISO: end.toISOString() }
}

// UTC ISO timestamp -> local YYYY-MM-DD for bucketing events by day.
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
  return isoToLocalDateStr(dt.toISOString())
}

// Monday-anchored start of the week containing dateStr
export function weekStart(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const dow = (dt.getDay() + 6) % 7 // 0 = Monday
  dt.setDate(dt.getDate() - dow)
  return isoToLocalDateStr(dt.toISOString())
}

export function prettyDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}
