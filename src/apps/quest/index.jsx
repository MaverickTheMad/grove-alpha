import { useState, useEffect, useCallback } from 'react'
import './quest.css'
import BottomNav from '../../components/BottomNav'
import { ToastProvider } from '../../components/Toast'
import * as store from './lib/store'
import { addRewardEvent } from '../../lib/rewards'
import { levelProgress, rankTitle, isoToLocalDateStr, todayStr, addDays } from './constants'
import QuestsTab from './tabs/QuestsTab'
import LogTab from './tabs/LogTab'
import TrendsTab from './tabs/TrendsTab'

export const meta = { id: 'quest', name: 'Quest', tagline: 'Goals worth the walk' }

const TABS = [
  { id: 'chronicle', label: 'Completed', icon: 'log' },
  { id: 'hero',      label: 'Tasks',     icon: 'goals' },
  { id: 'annals',    label: 'Insight',   icon: 'trends' },
]

function computeStreak(quests) {
  const days = new Set(quests.filter(q => q.completed_at).map(q => isoToLocalDateStr(q.completed_at)))
  let s = 0
  let cursor = todayStr()
  if (!days.has(cursor)) cursor = addDays(cursor, -1)
  while (days.has(cursor)) { s++; cursor = addDays(cursor, -1) }
  return s
}

export default function Quest() {
  const [tab, setTab]       = useState('hero')
  const [loading, setLoading] = useState(true)
  const [quests, setQuests] = useState([])
  const [totalXp, setTotalXp] = useState(0)

  const reload = useCallback(async () => {
    const [allQuests, gs] = await Promise.all([store.listAllQuests(), store.ensureGameState()])
    setQuests(allQuests)
    setTotalXp(gs.total_xp || 0)
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])

  const prog    = levelProgress(totalXp)
  const rank    = rankTitle(prog.level)
  const streak  = computeStreak(quests)

  const activeQuests    = quests.filter(q => !q.completed_at)
  const completedQuests = [...quests.filter(q => q.completed_at)]
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))

  const handleComplete = useCallback(async (quest) => {
    const xpGain = quest.xp_reward || 10
    const now = new Date().toISOString()
    setQuests(prev => prev.map(q => q.id === quest.id ? { ...q, completed_at: now } : q))
    const newXp = totalXp + xpGain
    setTotalXp(newXp)
    // eslint-disable-next-line no-unused-vars
    const { completed_at: _ca, createdAt: _cr, id: _id, ...fields } = quest
    await store.completeQuest(quest.id, fields)
    await store.updateGameState({ total_xp: newXp })
    await addRewardEvent('household', { source: 'quest', source_id: quest.id, pts: xpGain, label: quest.title })
  }, [totalXp])

  const handleDelete = useCallback(async (questId) => {
    setQuests(prev => prev.filter(q => q.id !== questId))
    await store.deleteQuest(questId)
  }, [])

  const handleRestore = useCallback(async (questId) => {
    await store.restoreQuest(questId)
    reload()
  }, [reload])

  const handleAdd = useCallback(async (fields) => {
    const rec = await store.createQuest(fields)
    setQuests(prev => [rec, ...prev])
  }, [])

  if (loading) {
    return (
      <ToastProvider>
        <main className="screen">
          <div className="quest-loading">Loading tasks…</div>
        </main>
      </ToastProvider>
    )
  }

  const ctx = { prog, rank, streak, totalXp, activeQuests, completedQuests, handleComplete, handleDelete, handleRestore, handleAdd }

  return (
    <ToastProvider>
      <div className="page">
        {tab === 'chronicle' && <LogTab ctx={ctx} />}
        {tab === 'hero'      && <QuestsTab ctx={ctx} />}
        {tab === 'annals'    && <TrendsTab ctx={ctx} />}
      </div>
      <BottomNav tabs={TABS} active={tab} onSelect={setTab} />
    </ToastProvider>
  )
}
