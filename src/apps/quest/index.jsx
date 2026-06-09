import { useState } from 'react'
import BottomNav from '../../components/BottomNav'
import ScaffoldTab from '../../components/ScaffoldTab'

// Mav's Quest Log — gamified wellness log (RPG flavor). Port target.
// The themed taxonomy maps to ordinary wellness events: "Draught of Vigor" =
// hydration, "Trial of Might" = exercise, "Provisions" = food, "Commune Within"
// = mood/meditation, "Adventurer's Rest" = sleep. Events → records(app:'quest').
// During the port, reconcile its drifted TimePicker into the shared one (§9).
export const meta = { id: 'quest', name: "Mav's Quest Log", tagline: 'Habits, questified' }

const TABS = [
  { id: 'chronicle', label: 'Chronicle', icon: 'log' },
  { id: 'hero', label: 'Hero', icon: 'quest' },
  { id: 'annals', label: 'Annals', icon: 'trends' },
]

const NOTES = {
  chronicle: ['themed quick-log (Vigor / Might / Provisions / Commune / Rest)', 'shared TimePicker (reconcile the drifted copy)', 'events → records(app:quest)'],
  hero: ['quests / streaks / XP logic', 'level + reward state'],
  annals: ['trends over time — bars for discrete buckets (UI-POLISH §7)'],
}
const EMOJI = { chronicle: '📜', hero: '🛡️', annals: '📖' }

export default function Quest() {
  const [tab, setTab] = useState('chronicle')
  const t = TABS.find((x) => x.id === tab)
  return (
    <>
      <ScaffoldTab title={t.label} sub="Mav's Quest Log" emoji={EMOJI[tab]} portsHere={NOTES[tab]} />
      <BottomNav tabs={TABS} active={tab} onSelect={setTab} />
    </>
  )
}
