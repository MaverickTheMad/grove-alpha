import { useState, useEffect, useCallback } from 'react'
import './quest.css'
import BottomNav from '../../components/BottomNav'
import { ToastProvider } from '../../components/Toast'
import * as store from './lib/store'
import { awardXp } from '../../lib/rewards'
import { currentUser, members } from '../../lib/identity'
import { levelProgress, rankTitle, isoToLocalDateStr, todayStr, addDays } from './constants'
import QuestsTab from './tabs/QuestsTab'
import LogTab from './tabs/LogTab'
import TrendsTab from './tabs/TrendsTab'

export const meta = { id: 'quest', name: 'Quest', tagline: 'Goals worth the walk' }

export async function summary({ member, now = new Date() }) {
  const quests = await store.listAllQuests()
  const active = quests.filter((q) => !q.completed_at)
  const completed = quests.filter((q) => q.completed_at)
  const cutoff30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const completed30d = completed.filter((q) => q.completed_at && new Date(q.completed_at) >= cutoff30)
  const todayStr = now.toISOString().slice(0, 10)
  const tenDaysStr = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const upcoming = active
    .filter((q) => q.due && q.due >= todayStr && q.due <= tenDaysStr)
    .sort((a, b) => a.due.localeCompare(b.due))
  return {
    active_total: active.length,
    completed30d: completed30d.length,
    total_in_period: active.length + completed30d.length,
    upcoming,
  }
}

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

  const handleComplete = useCallback(async (quest, completed_by) => {
    const xpGain = quest.xp_reward || 10
    const now = new Date().toISOString()
    setQuests(prev => prev.map(q => q.id === quest.id ? { ...q, completed_at: now } : q))
    const newXp = totalXp + xpGain
    setTotalXp(newXp)
    // eslint-disable-next-line no-unused-vars
    const { completed_at: _ca, createdAt: _cr, id: _id, ...fields } = quest
    // Track 1: household co-op XP
    await store.completeQuest(quest.id, { ...fields, completed_by })
    await store.updateGameState({ total_xp: newXp })
    // Track 2: personal XP for the completer
    await awardXp(completed_by, { pts: xpGain, source: 'quest', source_id: quest.id, label: quest.category || quest.title })
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

  const me = currentUser()
  const ctx = { prog, rank, streak, totalXp, activeQuests, completedQuests, handleComplete, handleDelete, handleRestore, handleAdd, currentUser: me, members: members() }

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
