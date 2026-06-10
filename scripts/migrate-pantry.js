/**
 * One-time migration: family-shopping-app (public schema) -> grove.records.
 * Idempotent via payload._src tagging. Run with the SERVICE ROLE key, server-side.
 *
 *   export SUPABASE_URL="https://ceomcgjbizynplactgiq.supabase.co"
 *   export SUPABASE_SERVICE_KEY="<service_role key>"
 *   node scripts/migrate-pantry.js
 */
import { createClient } from '@supabase/supabase-js'

const HOUSEHOLD_ID = '00000000-0000-0000-0000-000000000001'
const APP = 'pantry'

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY
if (!url || !serviceKey) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY'); process.exit(1) }

const opts = { auth: { persistSession: false, autoRefreshToken: false } }
// The old family-shopping-app lives in its own `shopping` schema (each legacy
// app has its own). Override with LEGACY_SCHEMA if needed.
const LEGACY_SCHEMA = process.env.LEGACY_SCHEMA || 'shopping'
const legacy = createClient(url, serviceKey, { db: { schema: LEGACY_SCHEMA }, ...opts })
const grove = createClient(url, serviceKey, { db: { schema: 'grove' }, ...opts })

async function read(table) {
  const { data, error } = await legacy.from(table).select('*')
  if (error) { console.error(`  ✗ read ${LEGACY_SCHEMA}.${table}: ${error.message}`); return null }
  return data || []
}
async function alreadyMigrated(srcKey) {
  const { count, error } = await grove.from('records').select('id', { count: 'exact', head: true }).eq('app', APP).contains('payload', { _src: srcKey })
  if (error) { console.error(`  ✗ check grove.records: ${error.message}`); return false }
  return (count ?? 0) > 0
}
async function insert(type, payload, occurred_at = null) {
  const { error } = await grove.from('records').insert({ household_id: HOUSEHOLD_ID, app: APP, type, occurred_at, payload, enc: false })
  if (error) { console.error(`  ✗ insert ${type}: ${error.message}`); return false }
  return true
}

function dumpError(label, err) {
  console.error(`  ✗ ${label}`)
  console.error(`      message: ${err.message || '(empty)'}`)
  console.error(`      code:    ${err.code || '(none)'}`)
  console.error(`      hint:    ${err.hint || '(none)'}`)
  console.error(`      details: ${err.details || '(none)'}`)
}

async function preflight() {
  console.log('Preflight checks…')
  // Real GET (not head) so PostgREST returns a readable error body.
  const g = await grove.from('records').select('id').limit(1)
  if (g.error) {
    dumpError('cannot reach grove.records', g.error)
    console.error('    → PGRST106 / "schema must be one of…" means `grove` is not in Settings → API → Exposed schemas.')
    console.error('    → A JWT/"Invalid API key"/401 message means SUPABASE_SERVICE_KEY is wrong or rotated.')
    return false
  }
  console.log('  ✓ grove.records is reachable')
  const r = await legacy.from('recipes').select('id').limit(1)
  if (r.error) {
    dumpError(`cannot reach ${LEGACY_SCHEMA}.recipes`, r.error)
    console.error(`    → permission denied (42501) means service_role needs grants on the ${LEGACY_SCHEMA} schema (see the grant SQL).`)
    return false
  }
  console.log(`  ✓ ${LEGACY_SCHEMA}.recipes is reachable`)
  return true
}

async function run() {
  if (!(await preflight())) { console.error('\nPreflight failed — fix the above and re-run. Nothing was written.'); process.exit(1) }
  console.log('\nMigrating…')

  // recipes
  const recipes = await read('recipes')
  if (recipes) {
    let n = 0
    for (const r of recipes) {
      const src = `recipes:${r.id}`
      if (await alreadyMigrated(src)) continue
      const ok = await insert('recipe', {
        name: r.name, url: r.url || null, category: r.category || 'Other',
        notes: r.notes || '', cook_time: r.cook_time || '', servings: r.servings || '',
        pdf_url: r.pdf_url || '', ingredients: r.ingredients || [], is_favorite: !!r.is_favorite, _src: src,
      })
      if (ok) n++
    }
    console.log(`  recipes -> recipe: +${n} (of ${recipes.length})`)
  }

  // extras
  const extras = await read('extras')
  if (extras) {
    let n = 0
    for (const e of extras) {
      const src = `extras:${e.id}`
      if (await alreadyMigrated(src)) continue
      if (await insert('extra', { name: e.name, quantity: e.quantity || '', active: !!e.active, is_staple: !!e.is_staple, sort_order: e.sort_order ?? 0, _src: src })) n++
    }
    console.log(`  extras -> extra: +${n} (of ${extras.length})`)
  }

  // sections -> one map record
  const sections = await read('sections')
  if (sections) {
    const src = 'sections:all'
    if (await alreadyMigrated(src)) console.log('  sections already migrated')
    else {
      const map = {}
      sections.forEach((s) => { map[s.ingredient] = s.section })
      if (await insert('section', { map, _src: src })) console.log(`  sections -> section: +1 map (${Object.keys(map).length} ingredients)`)
    }
  }

  // shopping_state (id='current')
  const states = await read('shopping_state')
  if (states) {
    const src = 'shopping_state:current'
    if (await alreadyMigrated(src)) console.log('  shopping_state already migrated')
    else {
      const st = states.find((x) => x.id === 'current') || states[0]
      if (st) {
        if (await insert('shopping_state', {
          selected_meals: st.selected_meals || [], pantry_items: st.pantry_items || [],
          checked_items: st.checked_items || [], meal_plan: st.meal_plan || {}, _src: src,
        })) console.log('  shopping_state -> shopping_state: +1')
      } else console.log('  shopping_state: no rows')
    }
  }

  // meal_history
  const history = await read('meal_history')
  if (history) {
    let n = 0
    for (const h of history) {
      const src = `meal_history:${h.id ?? h.recipe_id + ':' + h.cooked_at}`
      if (await alreadyMigrated(src)) continue
      if (await insert('meal_cooked', { recipe_id: h.recipe_id, _src: src }, h.cooked_at)) n++
    }
    console.log(`  meal_history -> meal_cooked: +${n} (of ${history.length})`)
  }

  console.log('\nDone.')
  process.exit(0)
}

run().catch((e) => { console.error('Fatal:', e.message); process.exit(1) })
