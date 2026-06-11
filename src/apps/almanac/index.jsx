import { useState } from 'react'
import './almanac.css'
import BottomNav from '../../components/BottomNav'
import WeekTab from './tabs/WeekTab'
import MonthTab from './tabs/MonthTab'
import UpcomingTab from './tabs/UpcomingTab'

export const meta = { id: 'almanac', name: 'Almanac', tagline: 'The family timeline' }

const TABS = [
  { id: 'week', label: 'Week', icon: 'calendar' },
  { id: 'month', label: 'Month', icon: 'overview' },
  { id: 'upcoming', label: 'Upcoming', icon: 'upcoming' },
]

export default function Almanac() {
  const [tab, setTab] = useState('week')
  return (
    <>
      <div className="almanac-page">
        {tab === 'week' && <WeekTab />}
        {tab === 'month' && <MonthTab />}
        {tab === 'upcoming' && <UpcomingTab />}
      </div>
      <BottomNav tabs={TABS} active={tab} onSelect={setTab} />
    </>
  )
}
