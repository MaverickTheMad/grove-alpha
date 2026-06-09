import { useEffect, useState, useCallback } from 'react'
import * as data from '../../lib/data'
import BottomNav from '../../components/BottomNav'
import SetupScreen from '../../components/SetupScreen'
import { todayStr } from '../../lib/time'
import { EVENT_TYPES, computeCyclePhase } from './constants'
import LogTab from './tabs/LogTab'
import TrendsTab from './tabs/TrendsTab'
import CalendarTab from './tabs/CalendarTab'

export const meta = { id: 'journal', name: "Ren's Journal", tagline: 'Cycle & symptoms' }

const TABS = [
  { id: 'log', label: 'Log', icon: 'log' },
  { id: 'trends', label: 'Trends', icon: 'trends' },
  { id: 'cycle', label: 'Cycle', icon: 'calendar' },
]

export default function Journal() {
  const [tab, setTab] = useState('log')
  const [periodStarts, setPeriodStarts] = useState(null) // null = loading
  const [setupDate, setSetupDate] = useState(todayStr())

  const loadStarts = useCallback(async () => {
    const rows = await data.list({ app: 'journal', type: EVENT_TYPES.periodStart })
    setPeriodStarts(rows.map((r) => r.data.date).sort())
  }, [])

  useEffect(() => { loadStarts() }, [loadStarts])

  const addPeriodStart = useCallback(async (date) => {
    await data.create({
      app: 'journal',
      type: EVENT_TYPES.periodStart,
      occurredAt: new Date(`${date}T12:00:00`).toISOString(),
      data: { date },
    })
    await loadStarts()
  }, [loadStarts])

  const removePeriodStart = useCallback(async (date) => {
    const rows = await data.list({ app: 'journal', type: EVENT_TYPES.periodStart, from: date, to: date })
    for (const r of rows) if (r.data.date === date) await data.remove(r.id)
    await loadStarts()
  }, [loadStarts])

  const phaseFor = useCallback(
    (dateStr) => (periodStarts?.length ? computeCyclePhase(dateStr, periodStarts) : null),
    [periodStarts],
  )

  if (periodStarts === null) {
    return <main className="screen"><p className="sub" style={{ textAlign: 'center', color: 'var(--text-soft)' }}>Loading…</p></main>
  }

  // first-run setup gate: need at least one period start to compute phases
  if (periodStarts.length === 0) {
    return (
      <SetupScreen
        appName="Ren's Journal"
        prompt="When did your most recent period start? This anchors your cycle phases — you can add past starts later."
        continueLabel="Start tracking"
        onContinue={() => addPeriodStart(setupDate)}
      >
        <input className="input" type="date" max={todayStr()} value={setupDate} onChange={(e) => setSetupDate(e.target.value)} />
      </SetupScreen>
    )
  }

  return (
    <>
      {tab === 'log' && <LogTab periodStarts={periodStarts} phaseFor={phaseFor} />}
      {tab === 'trends' && <TrendsTab periodStarts={periodStarts} />}
      {tab === 'cycle' && (
        <CalendarTab periodStarts={periodStarts} addPeriodStart={addPeriodStart} removePeriodStart={removePeriodStart} />
      )}
      <BottomNav tabs={TABS} active={tab} onSelect={setTab} />
    </>
  )
}
