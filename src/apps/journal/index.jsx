import { useState, useEffect, useCallback } from 'react'
import './journal.css'
import BottomNav from '../../components/BottomNav'
import * as store from './lib/store'
import IntakeTab from './tabs/IntakeTab'
import SetupScreen from './components/SetupScreen'
import TrendsTab from './tabs/TrendsTab'
import CalendarTab from './tabs/CalendarTab'

export const meta = { id: 'journal', name: "Ren's Journal", tagline: 'Cycle & symptoms' }

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
    return <div className="journal-page"><SetupScreen onComplete={reload} /></div>
  }

  return (
    <>
      <div className="journal-page">
        {tab === 'intake' && <IntakeTab periodStarts={periodStarts} onChange={bump} refreshKey={refreshKey} />}
        {tab === 'trends' && <TrendsTab periodStarts={periodStarts} refreshKey={refreshKey} />}
        {tab === 'calendar' && (
          <CalendarTab
            periodStarts={periodStarts}
            onPeriodStartsChange={async () => { await reload(); bump() }}
            refreshKey={refreshKey}
          />
        )}
      </div>
      <BottomNav tabs={TABS} active={tab} onSelect={setTab} />
    </>
  )
}
