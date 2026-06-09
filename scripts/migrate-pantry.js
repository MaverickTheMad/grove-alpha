/**
 * One-time migration: family-shopping-app (public schema) -> grove.records.
 * Idempotent via payload._src tagging. Run with the SERVICE ROLE key, server-side.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/migrate-pantry.js
 *
 * Mapping (constants.TYPES):
 *   recipes        -> type 'recipe'         (one record each; keeps ingredients jsonb)
 *   extras         -> type 'extra'          (one record each)
 *   sections       -> type 'section'        (collapsed into ONE map record)
 *   shopping_state -> type 'shopping_state' (the single id='current' row)
 *   meal_history   -> type 'meal_cooked'    (occurred_at = cooked_at)
 */
import { createClient } from '@supabase/supabase-js'

const HOUSEHOLD_ID = '00000000-0000-0000-0000-000000000001'
const APP = 'pantry'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY
if (!url || !serviceKey) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY'); process.exit(1) }

// family-shopping-app stored its tables in the public schema.
const legacy = createClient(url, serviceKey, { db: { schema: 'public' } })
const grove = createClient(url, serviceKey, { db: { schema: 'grove' } })

async function alreadyMigrated(srcKey) {
  const { count } = await grove.from('records').select('id', { count: 'exact', head: true })
    .eq('app', APP).contains('payload', { _src: srcKey })
  return (count ?? 0) > 0
}

async function insert(type, payload, occurred_at = null) {
  const { error } = await grove.from('records').insert({
    household_id: HOUSEHOLD_ID, app: APP, type, occurred_at, payload, enc: false,
  })
  if (error) console.error(`insert ${type}:`, error.message)
  return !error
}

async function run() {
  // recipes
  {
    const { data: rows = [] } = await legacy.from('recipes').select('*')
    let n = 0
    for (const r of rows) {
      const src = `recipes:${r.id}`
      if (await alreadyMigrated(src)) continue
      const [t, p] = TYPES_recipe(r, src)
      if (await insert(t, p)) n++
    }
    console.log(`recipes -> recipe: +${n} (of ${rows.length})`)
  }
  // extras
  {
    const { data: rows = [] } = await legacy.from('extras').select('*')
    let n = 0
    for (const e of rows) {
      const src = `extras:${e.id}`
      if (await alreadyMigrated(src)) continue
      const payload = { name: e.name, quantity: e.quantity || '', active: !!e.active, is_staple: !!e.is_staple, sort_order: e.sort_order ?? 0, _src: src }
      if (await insert('extra', payload)) n++
    }
    console.log(`extras -> extra: +${n} (of ${rows.length})`)
  }
  // sections -> one map record
  {
    const src = 'sections:all'
    if (!(await alreadyMigrated(src))) {
      const { data: rows = [] } = await legacy.from('sections').select('*')
      const map = {}
      rows.forEach((s) => { map[s.ingredient] = s.section })
      await insert('section', { map, _src: src })
      console.log(`sections -> section: +1 map (${Object.keys(map).length} ingredients)`)
    } else console.log('sections already migrated')
  }
  // shopping_state (id='current')
  {
    const src = 'shopping_state:current'
    if (!(await alreadyMigrated(src))) {
      const { data: st } = await legacy.from('shopping_state').select('*').eq('id', 'current').single()
      if (st) {
        await insert('shopping_state', {
          selected_meals: st.selected_meals || [],
          pantry_items: st.pantry_items || [],
          checked_items: st.checked_items || [],
          meal_plan: st.meal_plan || {},
          _src: src,
        })
        console.log('shopping_state -> shopping_state: +1')
      }
    } else console.log('shopping_state already migrated')
  }
  // meal_history
  {
    const { data: rows = [] } = await legacy.from('meal_history').select('*')
    let n = 0
    for (const h of rows) {
      const src = `meal_history:${h.id ?? h.recipe_id + ':' + h.cooked_at}`
      if (await alreadyMigrated(src)) continue
      if (await insert('meal_cooked', { recipe_id: h.recipe_id, _src: src }, h.cooked_at)) n++
    }
    console.log(`meal_history -> meal_cooked: +${n} (of ${rows.length})`)
  }
  console.log('done.')
}

function TYPES_recipe(r, src) {
  return ['recipe', {
    name: r.name, url: r.url || null, category: r.category || 'Other',
    notes: r.notes || '', cook_time: r.cook_time || '', servings: r.servings || '',
    pdf_url: r.pdf_url || '', ingredients: r.ingredients || [], is_favorite: !!r.is_favorite,
    _src: src,
  }]
}

run().catch((e) => { console.error(e); process.exit(1) })
