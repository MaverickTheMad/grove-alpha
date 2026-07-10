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

// ── Shopping state (granular records — one record per item) ──────────────────
// Replaces the legacy single shopping_state blob to fix last-writer-wins
// concurrency bugs when two devices edit the list simultaneously.

export async function loadGranularState() {
  const [meals, items, checked, slots] = await Promise.all([
    data.list({ app: APP, type: TYPES.selectedMeal }),
    data.list({ app: APP, type: TYPES.pantryItem }),
    data.list({ app: APP, type: TYPES.checkedItem }),
    data.list({ app: APP, type: TYPES.mealPlanSlot }),
  ])
  return {
    selected_meals: meals.map((r) => r.data.recipe_id),
    pantry_items:   items.map((r) => ({ _id: r.id, name: r.data.name, haveQty: r.data.haveQty || '' })),
    checked_items:  checked.map((r) => r.data.name),
    meal_plan:      Object.fromEntries(slots.map((r) => [String(r.data.day_index), r.data.recipe_id])),
    _slots:         Object.fromEntries(slots.map((r) => [String(r.data.day_index), r.id])),
    _mealRecordIds: Object.fromEntries(meals.map((r) => [r.data.recipe_id, r.id])),
    _itemRecordIds: Object.fromEntries(items.map((r) => [r.data.name, r.id])),
    _checkedIds:    Object.fromEntries(checked.map((r) => [r.data.name, r.id])),
  }
}

// Idempotent migration: if a legacy shopping_state record exists, decompose it
// into granular records then remove it. Safe to call on every load.
export async function migrateShoppingState() {
  const old = await data.list({ app: APP, type: TYPES.shoppingState })
  if (old.length === 0) return
  const blob = old[0].data ?? {}

  // Avoid duplicating granular records that may already exist
  const existing = await loadGranularState()
  const existingMeals = new Set(existing._mealRecordIds ? Object.keys(existing._mealRecordIds) : [])
  const existingItems = new Set(existing._itemRecordIds ? Object.keys(existing._itemRecordIds) : [])
  const existingChecked = new Set(existing._checkedIds ? Object.keys(existing._checkedIds) : [])
  const existingSlots = new Set(existing._slots ? Object.keys(existing._slots) : [])

  const writes = []
  for (const id of (blob.selected_meals ?? [])) {
    if (!existingMeals.has(id)) writes.push(data.create({ app: APP, type: TYPES.selectedMeal, data: { recipe_id: id } }))
  }
  for (const it of (blob.pantry_items ?? [])) {
    const name = typeof it === 'string' ? it : it.name
    if (!existingItems.has(name)) writes.push(data.create({ app: APP, type: TYPES.pantryItem, data: { name, haveQty: it.haveQty || '' } }))
  }
  for (const name of (blob.checked_items ?? [])) {
    if (!existingChecked.has(name)) writes.push(data.create({ app: APP, type: TYPES.checkedItem, data: { name } }))
  }
  for (const [k, v] of Object.entries(blob.meal_plan ?? {})) {
    if (!existingSlots.has(k)) writes.push(data.create({ app: APP, type: TYPES.mealPlanSlot, data: { day_index: Number(k), recipe_id: v } }))
  }
  await Promise.all(writes)
  // Remove all legacy records
  await Promise.all(old.map((r) => data.remove(r.id)))
}

// Granular write helpers — called directly from Pantry index.jsx on each change
export async function addSelectedMeal(recipeId) {
  return data.create({ app: APP, type: TYPES.selectedMeal, data: { recipe_id: recipeId } })
}
export async function removeSelectedMeal(recordId) {
  await data.remove(recordId)
}

export async function addPantryItem(name, haveQty = '') {
  return data.create({ app: APP, type: TYPES.pantryItem, data: { name, haveQty } })
}
export async function removePantryItem(recordId) {
  await data.remove(recordId)
}

export async function addCheckedItem(name) {
  return data.create({ app: APP, type: TYPES.checkedItem, data: { name } })
}
export async function removeCheckedItem(recordId) {
  await data.remove(recordId)
}

export async function setMealPlanSlot(dayIndex, recipeId, existingSlotId) {
  if (existingSlotId) {
    await data.update(existingSlotId, { data: { day_index: Number(dayIndex), recipe_id: recipeId } })
    return existingSlotId
  }
  const rec = await data.create({ app: APP, type: TYPES.mealPlanSlot, data: { day_index: Number(dayIndex), recipe_id: recipeId } })
  return rec.id
}
export async function removeMealPlanSlot(recordId) {
  await data.remove(recordId)
}

export async function clearAllShoppingState(mealRecordIds, itemRecordIds, checkedIds, slotIds) {
  await Promise.all([
    ...Object.values(mealRecordIds).map((id) => data.remove(id)),
    ...Object.values(itemRecordIds).map((id) => data.remove(id)),
    ...Object.values(checkedIds).map((id) => data.remove(id)),
    ...Object.values(slotIds).map((id) => data.remove(id)),
  ])
}

// ── LEGACY shopping state (kept only for migration, not used for new writes) ──
export async function loadState() {
  const rows = await data.list({ app: APP, type: TYPES.shoppingState })
  const rec = rows[0]
  const defaults = { selected_meals: [], pantry_items: [], checked_items: [], meal_plan: {} }
  return { recordId: rec?.id ?? null, ...defaults, ...(rec?.data ?? {}) }
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
  await migrateShoppingState()
  const [recipes, extras, sections, state, lastCooked] = await Promise.all([
    listRecipes(), listExtras(), loadSections(), loadGranularState(), loadLastCooked(),
  ])
  return { recipes, extras, sections, state, lastCooked }
}
