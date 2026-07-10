import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import BottomNav from '../../components/BottomNav'
import Sheet from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { todayStr } from '../../lib/time'
import * as store from './lib/store'
import { detectSection } from './lib/shopping'
import { buildAggregate, buildPantryMap, buildShoppingGroups } from './lib/aggregate'
import MealsTab from './tabs/MealsTab'
import RecipesTab from './tabs/RecipesTab'
import RecipeView from './tabs/RecipeView'
import RecipeEditor from './tabs/RecipeEditor'
import PantryTab from './tabs/PantryTab'
import ExtrasTab from './tabs/ExtrasTab'
import ListTab from './tabs/ListTab'

export const meta = { id: 'pantry', name: 'Pantry & List', tagline: 'Meals & shopping' }

const TABS = [
  { id: 'meals', label: 'Meals', icon: 'meals' },
  { id: 'recipes', label: 'Recipes', icon: 'recipes' },
  { id: 'pantry', label: 'Pantry', icon: 'pantry' },
  { id: 'extras', label: 'Extras', icon: 'extras' },
  { id: 'list', label: 'List', icon: 'list' },
]

const NEW_RECIPE = { id: 'new', name: '', url: '', category: 'Other', notes: '', cook_time: '', servings: '', ingredients: [] }

export default function Pantry() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('meals')

  const [recipes, setRecipes] = useState([])
  const [extras, setExtras] = useState([])
  const [sectionsMap, setSectionsMap] = useState({})
  const sectionsRecordId = useRef(null)
  const [lastCooked, setLastCooked] = useState({})

  const [selectedMeals, setSelectedMeals] = useState([])
  const [mealMultipliers, setMealMultipliers] = useState({})
  const [pantryItems, setPantryItems] = useState([])
  const [checkedItems, setCheckedItems] = useState([])
  const [mealPlan, setMealPlan] = useState({})

  // Record-ID maps so we know which record to remove for each item
  const mealRecordIds = useRef({})   // { recipeId: recordId }
  const itemRecordIds = useRef({})   // { name: recordId }
  const checkedIds    = useRef({})   // { name: recordId }
  const slots         = useRef({})   // { dayIndex: recordId }

  const [editingRecipe, setEditingRecipe] = useState(null)
  const [viewingRecipe, setViewingRecipe] = useState(null)
  const [newTrip, setNewTrip] = useState(null) // shopping date string while confirming

  const loaded = useRef(false)

  // ── initial load ──
  useEffect(() => {
    let alive = true
    store.loadAll().then((d) => {
      if (!alive) return
      setRecipes(d.recipes)
      setExtras(d.extras)
      setSectionsMap(d.sections.map); sectionsRecordId.current = d.sections.recordId
      setLastCooked(d.lastCooked)
      setSelectedMeals(d.state.selected_meals)
      setPantryItems(d.state.pantry_items)
      setCheckedItems(d.state.checked_items)
      setMealPlan(d.state.meal_plan)
      mealRecordIds.current = d.state._mealRecordIds || {}
      itemRecordIds.current = d.state._itemRecordIds || {}
      checkedIds.current    = d.state._checkedIds    || {}
      slots.current         = d.state._slots         || {}
      setLoading(false)
      loaded.current = true
    })
    // realtime: reload changed slices from the other device
    const unsub = store.subscribe(({ record }) => {
      const t = record?.type
      if (t === 'recipe') store.listRecipes().then(setRecipes)
      else if (t === 'extra') store.listExtras().then(setExtras)
      else if (t === 'section') store.loadSections().then((s) => { setSectionsMap(s.map); sectionsRecordId.current = s.recordId })
      else if (['selected_meal','pantry_item','checked_item','meal_plan_slot'].includes(t)) {
        store.loadGranularState().then((s) => {
          setSelectedMeals(s.selected_meals)
          setPantryItems(s.pantry_items)
          setCheckedItems(s.checked_items)
          setMealPlan(s.meal_plan)
          mealRecordIds.current = s._mealRecordIds || {}
          itemRecordIds.current = s._itemRecordIds || {}
          checkedIds.current    = s._checkedIds    || {}
          slots.current         = s._slots         || {}
        })
      }
    })
    return () => { alive = false; unsub() }
  }, [])

  // ── derived (verbatim aggregation) ──
  const agg = useMemo(() => buildAggregate(selectedMeals, recipes, mealMultipliers), [selectedMeals, recipes, mealMultipliers])
  const pantryMap = useMemo(() => buildPantryMap(pantryItems), [pantryItems])
  const allIngredients = useMemo(() => Object.keys(agg).sort(), [agg])
  const shoppingGroups = useMemo(() => buildShoppingGroups(agg, pantryMap, extras, sectionsMap), [agg, pantryMap, extras, sectionsMap])
  const pantrySkipCount = Object.keys(pantryMap).filter((p) => agg[p]).length
  const totalItems = shoppingGroups.reduce((s, g) => s + g.items.length, 0)

  // ── meal/state handlers (granular writes — each change is its own record) ──
  const toggleMeal = useCallback(async (id) => {
    const existing = mealRecordIds.current[id]
    if (existing) {
      setSelectedMeals((p) => p.filter((x) => x !== id))
      setMealMultipliers((p) => { const n = { ...p }; delete n[id]; return n })
      delete mealRecordIds.current[id]
      await store.removeSelectedMeal(existing)
    } else {
      setSelectedMeals((p) => [...p, id])
      const rec = await store.addSelectedMeal(id)
      mealRecordIds.current[id] = rec.id
    }
  }, [])
  const setMultiplier = useCallback((id, val) => setMealMultipliers((p) => ({ ...p, [id]: Math.max(1, Math.min(10, Number(val) || 1)) })), [])
  const assignDay = useCallback(async (dayIndex, recipeId) => {
    const key = String(dayIndex)
    // Remove old recipe from the slot's previous assignment
    const prevRecipe = mealPlan[key]
    if (prevRecipe && prevRecipe !== recipeId) {
      // Only unselect if not assigned to another day
      const stillUsed = Object.entries(mealPlan).some(([k, v]) => k !== key && v === prevRecipe)
      if (!stillUsed && mealRecordIds.current[prevRecipe]) {
        setSelectedMeals((p) => p.filter((x) => x !== prevRecipe))
        const rid = mealRecordIds.current[prevRecipe]; delete mealRecordIds.current[prevRecipe]
        await store.removeSelectedMeal(rid)
      }
    }
    // Update slot record
    if (recipeId) {
      const slotId = await store.setMealPlanSlot(dayIndex, recipeId, slots.current[key])
      slots.current[key] = slotId
      setMealPlan((p) => ({ ...p, [key]: recipeId }))
      if (!mealRecordIds.current[recipeId]) {
        setSelectedMeals((p) => (p.includes(recipeId) ? p : [...p, recipeId]))
        const rec = await store.addSelectedMeal(recipeId)
        mealRecordIds.current[recipeId] = rec.id
      }
    } else {
      if (slots.current[key]) { await store.removeMealPlanSlot(slots.current[key]); delete slots.current[key] }
      setMealPlan((p) => { const n = { ...p }; delete n[key]; return n })
    }
  }, [mealPlan])
  const togglePantry = useCallback(async (name, haveQty) => {
    const existing = itemRecordIds.current[name]
    if (existing) {
      setPantryItems((prev) => prev.filter((p) => (typeof p === 'string' ? p : p.name) !== name))
      delete itemRecordIds.current[name]
      await store.removePantryItem(existing)
    } else {
      setPantryItems((prev) => [...prev, { name, haveQty: haveQty || '' }])
      const rec = await store.addPantryItem(name, haveQty || '')
      itemRecordIds.current[name] = rec.id
    }
  }, [])
  const toggleChecked = useCallback(async (name) => {
    const existing = checkedIds.current[name]
    if (existing) {
      setCheckedItems((p) => p.filter((x) => x !== name))
      delete checkedIds.current[name]
      await store.removeCheckedItem(existing)
    } else {
      setCheckedItems((p) => [...p, name])
      const rec = await store.addCheckedItem(name)
      checkedIds.current[name] = rec.id
    }
  }, [])

  // ── sections ──
  const handleSetSection = useCallback(async (ing, section) => {
    setSectionsMap((prev) => {
      const next = { ...prev, [ing]: section }
      store.saveSections(sectionsRecordId.current, next).then((id) => { sectionsRecordId.current = id })
      return next
    })
  }, [])

  // ── recipes ──
  const saveRecipe = useCallback(async (recipe) => {
    // auto-detect sections for any new ingredient names
    const next = { ...sectionsMap }; let changed = false
    ;(recipe.ingredients || []).forEach((raw) => { const nm = raw?.name || ''; if (nm && !next[nm]) { next[nm] = detectSection(nm); changed = true } })
    if (changed) { setSectionsMap(next); sectionsRecordId.current = await store.saveSections(sectionsRecordId.current, next) }
    const saved = await store.saveRecipe(recipe)
    setRecipes((p) => {
      const exists = p.some((r) => r.id === saved.id)
      const arr = exists ? p.map((r) => (r.id === saved.id ? saved : r)) : [...p, saved]
      return arr.sort((a, b) => a.name.localeCompare(b.name))
    })
    setEditingRecipe(null)
    toast.show(recipe.id && !String(recipe.id).startsWith('new') ? 'Recipe saved' : 'Recipe added')
  }, [sectionsMap, toast])

  const deleteRecipe = useCallback(async (id) => {
    setEditingRecipe(null)
    setRecipes((p) => p.filter((r) => r.id !== id))
    if (mealRecordIds.current[id]) {
      const rid = mealRecordIds.current[id]; delete mealRecordIds.current[id]
      setSelectedMeals((p) => p.filter((x) => x !== id))
      await store.removeSelectedMeal(rid)
    }
    await store.deleteRecipe(id)
    toast.show('Recipe deleted', { actionLabel: 'Undo', onAction: async () => { const r = await store.restoreRecipe(id); setRecipes((p) => [...p, r].sort((a, b) => a.name.localeCompare(b.name))) } })
  }, [toast])

  const toggleFavorite = useCallback(async (recipe) => {
    const next = { ...recipe, is_favorite: !recipe.is_favorite }
    setRecipes((p) => p.map((r) => (r.id === recipe.id ? next : r)))
    if (viewingRecipe?.id === recipe.id) setViewingRecipe(next)
    await store.saveRecipe(next)
  }, [viewingRecipe])

  // ── extras ──
  const stripId = ({ id, ...rest }) => rest
  const addExtra = useCallback(async (name, quantity, isStaple) => {
    if (!name.trim()) return
    const e = await store.addExtra({ name, quantity, is_staple: isStaple, sort_order: extras.length })
    setExtras((p) => [...p, e])
  }, [extras.length])
  const toggleExtra = useCallback(async (item) => {
    const next = { ...item, active: !item.active }
    setExtras((p) => p.map((e) => (e.id === item.id ? next : e)))
    await store.updateExtra(item.id, stripId(next))
  }, [])
  const updateExtraQty = useCallback(async (item, quantity) => {
    const next = { ...item, quantity }
    setExtras((p) => p.map((e) => (e.id === item.id ? next : e)))
    await store.updateExtra(item.id, stripId(next))
  }, [])
  const deleteExtra = useCallback(async (id) => {
    setExtras((p) => p.filter((e) => e.id !== id))
    await store.deleteExtra(id)
  }, [])

  // ── new trip (went shopping) ──
  const confirmNewTrip = useCallback(async () => {
    const shopDate = new Date(newTrip + 'T12:00:00')
    const nextShop = new Date(shopDate); nextShop.setDate(shopDate.getDate() + 14)
    if (selectedMeals.length > 0) {
      const iso = shopDate.toISOString()
      await store.logCooked(selectedMeals, iso)
      setLastCooked((prev) => { const u = { ...prev }; selectedMeals.forEach((id) => { u[id] = iso }); return u })
    }
    const startOfWeek = new Date(); startOfWeek.setHours(0, 0, 0, 0); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    const daysUntilNext = Math.round((nextShop - startOfWeek) / 86400000)

    // Carry forward slots that fall in the next cycle
    const newPlan = {}
    Object.entries(mealPlan).forEach(([k, v]) => { const off = parseInt(k); if (off >= daysUntilNext) newPlan[String(off - daysUntilNext)] = v })

    // Remove all granular records and recreate only carried-forward slots
    await store.clearAllShoppingState(mealRecordIds.current, itemRecordIds.current, checkedIds.current, slots.current)
    mealRecordIds.current = {}; itemRecordIds.current = {}; checkedIds.current = {}; slots.current = {}

    // Re-add carried-forward meals + slots
    const carryMeals = [...new Set(Object.values(newPlan))]
    for (const recipeId of carryMeals) {
      const rec = await store.addSelectedMeal(recipeId)
      mealRecordIds.current[recipeId] = rec.id
    }
    for (const [k, v] of Object.entries(newPlan)) {
      const slotId = await store.setMealPlanSlot(Number(k), v, null)
      slots.current[k] = slotId
    }

    setSelectedMeals(carryMeals)
    setMealPlan(newPlan)
    setPantryItems([]); setCheckedItems([])
    const toDeactivate = extras.filter((e) => e.active && !e.is_staple)
    setExtras((p) => p.map((e) => (e.is_staple ? e : { ...e, active: false })))
    await Promise.all(toDeactivate.map((e) => store.updateExtra(e.id, stripId({ ...e, active: false }))))
    setNewTrip(null)
    setTab('meals')
    toast.show(`Logged ${selectedMeals.length} meal${selectedMeals.length !== 1 ? 's' : ''} — next trip around ${nextShop.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`)
  }, [newTrip, selectedMeals, mealPlan, extras, toast])

  if (loading) {
    return <main className="screen"><p className="p-sub" style={{ textAlign: 'center' }}>Loading your kitchen…</p></main>
  }

  return (
    <>
      {tab === 'meals' && (
        <MealsTab recipes={recipes} selected={selectedMeals} multipliers={mealMultipliers} mealPlan={mealPlan}
          onToggle={toggleMeal} onSetMultiplier={setMultiplier} onAssignDay={assignDay}
          onEdit={setEditingRecipe} onAddRecipe={() => setEditingRecipe(NEW_RECIPE)}
          onNewTrip={() => setNewTrip(todayStr())} />
      )}
      {tab === 'recipes' && (
        <RecipesTab recipes={recipes} selected={selectedMeals} lastCooked={lastCooked}
          onView={setViewingRecipe} onToggleFavorite={toggleFavorite} onAddRecipe={() => setEditingRecipe(NEW_RECIPE)} />
      )}
      {tab === 'pantry' && (
        <PantryTab ingredients={allIngredients} agg={agg} pantryMap={pantryMap} onToggle={togglePantry} skipCount={pantrySkipCount} />
      )}
      {tab === 'extras' && (
        <ExtrasTab extras={extras} onToggle={toggleExtra} onAdd={addExtra} onDelete={deleteExtra} onUpdateQty={updateExtraQty} />
      )}
      {tab === 'list' && (
        <ListTab groups={shoppingGroups} checked={checkedItems} onToggle={toggleChecked} total={totalItems} sections={sectionsMap} onSetSection={handleSetSection} onNewTrip={() => setNewTrip(todayStr())} />
      )}

      <BottomNav tabs={TABS} active={tab} onSelect={setTab} />

      {editingRecipe && (
        <RecipeEditor recipe={editingRecipe} sections={sectionsMap} onSave={saveRecipe} onCancel={() => setEditingRecipe(null)}
          onDelete={editingRecipe.id && !String(editingRecipe.id).startsWith('new') ? () => deleteRecipe(editingRecipe.id) : null}
          onSetSection={handleSetSection} />
      )}
      {viewingRecipe && (
        <RecipeView recipe={viewingRecipe} isSelected={selectedMeals.includes(viewingRecipe.id)}
          onToggle={() => toggleMeal(viewingRecipe.id)} onEdit={() => { setEditingRecipe(viewingRecipe); setViewingRecipe(null) }}
          onClose={() => setViewingRecipe(null)} onToggleFavorite={toggleFavorite} lastCooked={lastCooked} />
      )}

      <Sheet open={!!newTrip} onClose={() => setNewTrip(null)} title="Start a new trip?"
        footer={<>
          <button className="btn ghost grow" onClick={() => setNewTrip(null)}>Keep current</button>
          <button className="btn primary grow" onClick={confirmNewTrip}>Start new trip</button>
        </>}>
        <p style={{ maxWidth: 'var(--measure)' }}>
          This logs your meals to history and clears the meal plan, pantry, and shopping list. Running-low staples stay.
        </p>
        <label className="field-label">Shopping date</label>
        <input className="input" type="date" value={newTrip || todayStr()} max={todayStr()} onChange={(e) => setNewTrip(e.target.value)} />
      </Sheet>
    </>
  )
}
