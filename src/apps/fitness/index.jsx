import { useState } from 'react'
import BottomNav from '../../components/BottomNav'
import ScaffoldTab from '../../components/ScaffoldTab'

// Fitness — per-person workout tracker. Port target. PersonGate (per-person,
// like Ledger — fold into identity.members()), RestTimer, workout categories
// (General / Cardio / Pilates-Yoga / Legs / Arms / Chest-Abs-Back), and a
// rewards/streak layer. Events → records(app:'fitness', type:'workout'|'set').
export const meta = { id: 'fitness', name: 'Fitness', tagline: 'Workouts & progress' }

const TABS = [
  { id: 'workout', label: 'Workout', icon: 'workout' },
  { id: 'progress', label: 'Progress', icon: 'trends' },
  { id: 'rewards', label: 'Rewards', icon: 'goals' },
]

const NOTES = {
  workout: ['category picker + set logging', 'RestTimer component', 'PersonGate → identity.members()'],
  progress: ['volume / PR charts — bars or lines per data shape (§7)'],
  rewards: ['streaks / rewards state'],
}
const EMOJI = { workout: '🏋️', progress: '📈', rewards: '🏅' }

export default function Fitness() {
  const [tab, setTab] = useState('workout')
  const t = TABS.find((x) => x.id === tab)
  return (
    <>
      <ScaffoldTab title={t.label} sub="Fitness" emoji={EMOJI[tab]} portsHere={NOTES[tab]} />
      <BottomNav tabs={TABS} active={tab} onSelect={setTab} />
    </>
  )
}
