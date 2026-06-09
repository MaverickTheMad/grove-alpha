import { useState } from 'react'
import BottomNav from '../../components/BottomNav'
import ScaffoldTab from '../../components/ScaffoldTab'

// Pantry & List — port target. During its port: split the legacy 2,000-line
// App.jsx into these tabs (build-spec §9 / UI-POLISH #5), rewire all data to
// lib/data.js (recipe / extras / shopping_state / meal_history → records rows),
// add the New Trip confirm sheet (UI-POLISH §4).
export const meta = { id: 'pantry', name: 'Pantry & List', tagline: 'Meals & shopping' }

const TABS = [
  { id: 'meals', label: 'Meals', icon: 'meals' },
  { id: 'recipes', label: 'Recipes', icon: 'recipes' },
  { id: 'pantry', label: 'Pantry', icon: 'pantry' },
  { id: 'extras', label: 'Extras', icon: 'extras' },
  { id: 'list', label: 'List', icon: 'list' },
]

const NOTES = {
  meals: ['3-week calendar planner', 'serving-size multiplier (− 1× +)', 'meal_plan jsonb → record payload'],
  recipes: ['card grid + filters/sort/favorites', 'URL (JSON-LD) + PDF.js import', 'recipe rows → records (type: recipe)'],
  pantry: ['have-it / partial subtraction', 'section grouping'],
  extras: ['running-low staples + one-time extras'],
  list: ['fuzzy ingredient merge + quantity math', 'store-section ordering', 'print view', 'New Trip confirm sheet (§4)'],
}

const EMOJI = { meals: '🍲', recipes: '📖', pantry: '🧺', extras: '🧂', list: '🛒' }

export default function Pantry() {
  const [tab, setTab] = useState('meals')
  const t = TABS.find((x) => x.id === tab)
  return (
    <>
      <ScaffoldTab title={t.label} sub="Pantry & List" emoji={EMOJI[tab]} portsHere={NOTES[tab]} />
      <BottomNav tabs={TABS} active={tab} onSelect={setTab} />
    </>
  )
}
