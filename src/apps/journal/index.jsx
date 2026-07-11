import { useState, useEffect, useCallback } from 'react'
import './journal.css'
import * as store from './lib/store'
import BottomNav from '../../components/BottomNav'
import IntakeTab from './tabs/IntakeTab'
import SetupScreen from './components/SetupScreen'
import TrendsTab from './tabs/TrendsTab'
import CalendarTab from './tabs/CalendarTab'

export const meta = { id: 'journal', name: "Ren's Journal", tagline: 'Cycle & symptoms' }

export async function summary({ member }) {
  if (member !== 'ren') return null
  const periodStarts = await store.loadPeriodStarts()
  if (!periodStarts.length) return null
  const todayStr = new Date().toISOString().slice(0, 10)
  const sorted = [...periodStarts].sort()
  const lastStart = sorted[sorted.length - 1]
  const dayInCycle = Math.floor((new Date(todayStr + 'T00:00:00') - new Date(lastStart + 'T00:00:00')) / 86400000) + 1
  // cycle phase — inline rather than importing computeCyclePhase to keep summary lightweight
  let phase = null
  if (dayInCycle <= 5) phase = 'Menstrual'
  else if (dayInCycle <= 13) phase = 'Follicular'
  else if (dayInCycle <= 16) phase = 'Ovulation'
  else phase = 'Luteal'
  // cycle length estimate
  const cycleLen = sorted.length >= 2
    ? Math.round((new Date(sorted[sorted.length - 1] + 'T00:00:00') - new Date(sorted[sorted.length - 2] + 'T00:00:00')) / 86400000)
    : 28
  const clamped = Math.max(21, Math.min(40, cycleLen))
  const nextEstimate = new Date(new Date(lastStart + 'T00:00:00').getTime() + clamped * 86400000).toISOString().slice(0, 10)
  // last 4 days flow for sparkline
  const cycleDays = await store.listCycleDays()
  const flowVal = { none: 0, spotting: 0.25, light: 0.5, medium: 0.75, heavy: 1 }
  const bars = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(Date.now() - (3 - i) * 86400000).toISOString().slice(0, 10)
    return flowVal[cycleDays[d]?.flow ?? 'none'] ?? 0
  })
  return { last_start: lastStart, day_in_cycle: dayInCycle, phase, next_estimate: nextEstimate, bars }
}

const TABS = [
  { id: 'intake', label: 'Log', icon: 'log' },
  { id: 'trends', label: 'Trends', icon: 'trends' },
  { id: 'calendar', label: 'Cycle', icon: 'calendar' },
]

export default function Journal() {
  const [tab, setTab] = useState('intake')
  const [loading, setLoading] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [periodStarts, setPeriodStarts] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)

  const reload = useCallback(async () => {
    const starts = await store.loadPeriodStarts()
    setPeriodStarts(starts)
    setNeedsSetup(starts.length === 0)
    setLoading(false)
  }, [])
  useEffect(() => { reload() }, [reload])

  const bump = () => setRefreshKey((k) => k + 1)

  if (loading) {
    return <main className="screen"><div className="empty" style={{ paddingTop: '20vh' }}><p className="line">Loading…</p></div></main>
  }
  if (needsSetup) {
    return <div className="journal-page page"><SetupScreen onComplete={reload} /></div>
  }

  return (
    <div className="journal-page page">
      {tab === 'intake' && <IntakeTab periodStarts={periodStarts} onChange={bump} refreshKey={refreshKey} />}
      {tab === 'trends' && <TrendsTab periodStarts={periodStarts} refreshKey={refreshKey} />}
      {tab === 'calendar' && (
        <CalendarTab
          periodStarts={periodStarts}
          onPeriodStartsChange={async () => { await reload(); bump() }}
          refreshKey={refreshKey}
        />
      )}
      <BottomNav tabs={TABS} active={tab} onSelect={setTab} />
    </div>
  )
}
