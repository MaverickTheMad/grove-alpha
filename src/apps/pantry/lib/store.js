// Pantry data layer — the rewire from raw Supabase tables to grove.records.
// Tabs/index call THIS, never lib/data.js directly is fine (this IS the layer
// that calls lib/data.js, which is the only module touching Supabase). Legacy
// tables map to record types (see constants.TYPES):
//   recipes        -> type 'recipe'        (record.id = recipe id)
//   extras         -> type 'extra'         (record.id = extra id)
//   sections       -> type 'section'       (ONE record, payload.map = {ing:sec})
//   shopping_state -> type 'shopping_state'(ONE record)
//   meal_history   -> type 'meal_cooked'   (occurred_at = cooked_at)

import * as data from '../../../lib/data'
import { TYPES } from '../constants'
import { detectSection } from './shopping'
import { SEED_RECIPES, SEED_EXTRAS } from '../seed'

const APP = 'pantry'

// ── Recipes ─────────────────────────────────────────────────────────────────
function recipeFromRecord(r) {
  return { id: r.id, ...r.data }
}

export async function listRecipes() {
  const rows = await data.list({ app: APP, type: TYPES.recipe })
  return rows.map(recipeFromRecord).sort((a, b) => a.name.localeCompare(b.name))
}

// Upsert the full recipe payload. Returns the saved recipe ({id, ...}).
export async function saveRecipe(recipe) {
  const payload = {
    name: recipe.name,
    url: recipe.url || null,
    category: recipe.category,
    notes: recipe.notes || '',
    cook_time: recipe.cook_time || '',
    servings: recipe.servings || '',
    pdf_url: recipe.pdf_url || '',
    ingredients: recipe.ingredients || [],
    is_favorite: !!recipe.is_favorite,
  }
  const existing = recipe.id && !String(recipe.id).startsWith('new')
  const rec = existing
    ? await data.update(recipe.id, { data: payload })
    : await data.create({ app: APP, type: TYPES.recipe, data: payload })
  return recipeFromRecord(rec)
}

export async function deleteRecipe(id) {
  await data.remove(id)
}

export async function restoreRecipe(id) {
  const r = await data.restore(id)
  return recipeFromRecord(r)
}

// ── Extras ──────────────────────────────────────────────────────────────────
function extraFromRecord(r) {
  return { id: r.id, ...r.data }
}

export async function listExtras() {
  const rows = await data.list({ app: APP, type: TYPES.extra })
  return rows.map(extraFromRecord).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}

export async function addExtra({ name, quantity = '', is_staple = false, sort_order = 0 }) {
  const rec = await data.create({
    app: APP, type: TYPES.extra,
    data: { name: name.trim(), quantity: quantity.trim(), active: true, is_staple, sort_order },
  })
  return extraFromRecord(rec)
}

// Pass the full, merged extra payload (data.update replaces the payload).
export async function updateExtra(id, payload) {
  const rec = await data.update(id, { data: payload })
  return extraFromRecord(rec)
}

export async function deleteExtra(id) {
  await data.remove(id)
}

// ── Sections (single map record) ──────────────────────────────────────────────
export async function loadSections() {
  const rows = await data.list({ app: APP, type: TYPES.section })
  const rec = rows[0]
  return { recordId: rec?.id ?? null, map: rec?.data?.map ?? {} }
}

export async function saveSections(recordId, map) {
  if (recordId) {
    await data.update(recordId, { data: { map } })
    return recordId
  }
  const rec = await data.create({ app: APP, type: TYPES.section, data: { map } })
  return rec.id
}

// ── Shopping state (single record) ────────────────────────────────────────────
const STATE_DEFAULTS = { selected_meals: [], pantry_items: [], checked_items: [], meal_plan: {} }

export async function loadState() {
  const rows = await data.list({ app: APP, type: TYPES.shoppingState })
  const rec = rows[0]
  return { recordId: rec?.id ?? null, ...STATE_DEFAULTS, ...(rec?.data ?? {}) }
}

export async function saveState(recordId, state) {
  const payload = { ...STATE_DEFAULTS, ...state }
  if (recordId) {
    await data.update(recordId, { data: payload })
    return recordId
  }
  const rec = await data.create({ app: APP, type: TYPES.shoppingState, data: payload })
  return rec.id
}

// ── Meal history ──────────────────────────────────────────────────────────────
export async function loadLastCooked() {
  const rows = await data.list({ app: APP, type: TYPES.mealCooked }) // newest first
  const lastCooked = {}
  rows.forEach((r) => {
    const rid = r.data.recipe_id
    if (rid && !lastCooked[rid]) lastCooked[rid] = r.occurredAt
  })
  return lastCooked
}

export async function logCooked(recipeIds, iso) {
  await Promise.all(
    recipeIds.map((recipe_id) =>
      data.create({ app: APP, type: TYPES.mealCooked, occurredAt: iso, data: { recipe_id } }),
    ),
  )
}

// ── First-run seed (only if no recipes exist for this household) ──────────────
export async function seedIfEmpty() {
  const existing = await data.list({ app: APP, type: TYPES.recipe })
  if (existing.length > 0) return false
  await Promise.all(
    SEED_RECIPES.map((r) =>
      data.create({ app: APP, type: TYPES.recipe, data: {
        name: r.name, url: r.url || null, category: r.category,
        notes: '', cook_time: '', servings: '', pdf_url: '',
        ingredients: r.ingredients, is_favorite: false,
      } }),
    ),
  )
  await Promise.all(
    SEED_EXTRAS.map((name, i) =>
      data.create({ app: APP, type: TYPES.extra, data: {
        name, quantity: '', active: false, is_staple: false, sort_order: i,
      } }),
    ),
  )
  const map = {}
  SEED_RECIPES.forEach((r) => r.ingredients.forEach((ing) => { if (ing.name && !map[ing.name]) map[ing.name] = detectSection(ing.name) }))
  SEED_EXTRAS.forEach((name) => { if (!map[name]) map[name] = detectSection(name) })
  await data.create({ app: APP, type: TYPES.section, data: { map } })
  return true
}

// ── Storage (recipe PDFs) ─────────────────────────────────────────────────────
// Storage isn't part of the records model, so this is the one spot that uses the
// Supabase client directly. Bucket `recipe-pdfs` must exist (public).
import { supabase } from '../../../supabase'

export async function uploadRecipePdf(file) {
  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  const { data, error } = await supabase.storage
    .from('recipe-pdfs')
    .upload(fileName, file, { contentType: 'application/pdf', upsert: false })
  if (error || !data) return null
  const { data: urlData } = supabase.storage.from('recipe-pdfs').getPublicUrl(fileName)
  return urlData?.publicUrl || null
}

// ── Realtime ──────────────────────────────────────────────────────────────────
// Subscribe to all pantry record changes; caller reloads the affected slice.
export function subscribe(onChange) {
  return data.subscribe({ app: APP }, onChange)
}

// Load everything the app needs in one go.
export async function loadAll() {
  await seedIfEmpty()
  const [recipes, extras, sections, state, lastCooked] = await Promise.all([
    listRecipes(), listExtras(), loadSections(), loadState(), loadLastCooked(),
  ])
  return { recipes, extras, sections, state, lastCooked }
}
