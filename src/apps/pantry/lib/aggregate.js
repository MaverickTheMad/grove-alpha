// Shopping-list aggregation — ported VERBATIM from family-shopping-app
// (App.jsx lines ~435-509). Pure functions, so the merge/scale/subtract
// behavior is identical to the live app. Used by the Pantry index + tabs.

import {
  normIng, normalizeIngName, ingredientsSimilar, scaleQuantity,
  getSection, sectionOrder, subtractQuantity,
} from './shopping'

// selectedMeals: recipe ids · recipes: [{id, ingredients}] · mealMultipliers: {id:n}
// → agg: { canonicalName: { count, quantities[] } }  (similar names merged)
export function buildAggregate(selectedMeals, recipes, mealMultipliers) {
  const agg = {}
  const aggNameMap = {} // normalized name -> canonical key in agg

  selectedMeals.forEach((id) => {
    const recipe = recipes.find((r) => r.id === id)
    if (!recipe) return
    const mult = mealMultipliers[id] || 1
    ;(recipe.ingredients || []).forEach((raw) => {
      const { name, quantity } = normIng(raw)
      if (!name) return

      const normName = normalizeIngName(name)
      let key = aggNameMap[normName]
      if (!key) {
        const similarKey = Object.keys(agg).find((k) => ingredientsSimilar(k, name))
        if (similarKey) {
          key = similarKey
          aggNameMap[normName] = key
        } else {
          key = name
          aggNameMap[normName] = key
        }
      }

      if (!agg[key]) agg[key] = { count: 0, quantities: [] }
      agg[key].count += mult
      if (quantity) agg[key].quantities.push(scaleQuantity(quantity, mult))
    })
  })

  return agg
}

// pantryItems supports both legacy string[] and {name, haveQty}[].
export function buildPantryMap(pantryItems) {
  const pantryMap = {}
  pantryItems.forEach((p) => {
    if (typeof p === 'string') pantryMap[p] = ''
    else pantryMap[p.name] = p.haveQty || ''
  })
  return pantryMap
}

// Final shopping list grouped + ordered by store section, with pantry
// subtraction and active/staple extras folded in.
export function buildShoppingGroups(agg, pantryMap, extras, sections) {
  const map = {}
  Object.entries(agg).forEach(([name, info]) => {
    if (name in pantryMap) {
      const haveQty = pantryMap[name]
      if (!haveQty) return // fully have it → skip
      const neededQtys = info.quantities.map((q) => subtractQuantity(q, haveQty)).filter(Boolean)
      if (neededQtys.length === 0) return // fully covered
      const sec = getSection(name, sections)
      if (!map[sec]) map[sec] = []
      map[sec].push({ name, count: info.count, quantities: neededQtys, partial: true })
      return
    }
    const sec = getSection(name, sections)
    if (!map[sec]) map[sec] = []
    map[sec].push({ name, count: info.count, quantities: info.quantities })
  })

  extras.filter((e) => e.active || e.is_staple).forEach((e) => {
    const sec = getSection(e.name, sections)
    if (!map[sec]) map[sec] = []
    const ex = map[sec].find((x) => x.name === e.name)
    if (ex) ex.count += 1
    else map[sec].push({ name: e.name, count: 1, quantities: e.quantity ? [e.quantity] : [] })
  })

  return Object.keys(map)
    .sort((a, b) => sectionOrder(a) - sectionOrder(b))
    .map((sec) => ({ section: sec, items: map[sec].sort((a, b) => a.name.localeCompare(b.name)) }))
}
