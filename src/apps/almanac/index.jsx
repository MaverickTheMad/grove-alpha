import { useState } from 'react'
import BottomNav from '../../components/BottomNav'
import ScaffoldTab from '../../components/ScaffoldTab'

// Almanac — the family calendar that AGGREGATES events from the other apps
// (bills, paydays, goals, period + predicted, meals, pets). Port target — and
// the app that gains the most from the merge: instead of cross-querying five
// schemas, it reads grove.records across apps and projects them onto a timeline.
// Bring over useTimeline / WeekAgenda / WeekTimeGrid and the prediction logic.
export const meta = { id: 'almanac', name: 'Almanac', tagline: 'The family calendar' }

const TABS = [
  { id: 'week', label: 'Week', icon: 'calendar' },
  { id: 'month', label: 'Month', icon: 'overview' },
  { id: 'upcoming', label: 'Upcoming', icon: 'upcoming' },
]

const NOTES = {
  week: ['WeekAgenda + WeekTimeGrid', 'reads events across apps via lib/data.js (one query, many app/types)'],
  month: ['month grid; event dots by source app (data colors, §7)'],
  upcoming: ['useTimeline aggregation + period prediction', 'Calendar / Family filters'],
}
const EMOJI = { week: '🗓️', month: '📅', upcoming: '🔮' }

export default function Almanac() {
  const [tab, setTab] = useState('week')
  const t = TABS.find((x) => x.id === tab)
  return (
    <>
      <ScaffoldTab title={t.label} sub="Almanac" emoji={EMOJI[tab]} portsHere={NOTES[tab]} />
      <BottomNav tabs={TABS} active={tab} onSelect={setTab} />
    </>
  )
}
