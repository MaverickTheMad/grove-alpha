import { useState, useEffect, useCallback, useRef } from 'react'
import './quest.css'
import BottomNav from '../../components/BottomNav'
import * as store from './lib/store'
import {
  DEFAULT_HABITS, BADGES,
  levelProgress, rankTitle, todayStr, addDays, weekStart,
} from './constants'
import LogTab from './tabs/LogTab'
import QuestsTab from './tabs/QuestsTab'
import TrendsTab from './tabs/TrendsTab'

export const meta = { id: 'quest', name: "Mav's Quest Log", tagline: 'Habits & adventure' }

const TABS = [
  { id: 'log', label: 'Chronicle', icon: 'log' },
  { id: 'quests', label: 'Hero', icon: 'goals' },
  { id: 'trends', label: 'Annals', icon: 'trends' },
]

export default function Quest() {
  const [tab, setTab] = useState('log')
  const [loading, setLoading] = useState(true)

  const [totalXp, setTotalXp] = useState(0)
  const [earnedBadges, setEarnedBadges] = useState([])
  const [claimedChallenges, setClaimedChallenges] = useState([])
  const [completions, setCompletions] = useState({})
  const [workoutCount, setWorkoutCount] = useState(0)

  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const reload = useCallback(async () => {
    const [gs, hc, exCount] = await Promise.all([
      store.ensureGameState(),
      store.listHabitCompletions(),
      store.countWorkouts(),
    ])
    setTotalXp(gs.total_xp || 0)
    setEarnedBadges(gs.earned_badges || [])
    setClaimedChallenges(gs.claimed_challenges || [])
    const map = {}
    for (const r of hc) {
      if (!map[r.date]) map[r.date] = []
      map[r.date].push(r.habit_id)
    }
    setCompletions(map)
    setWorkoutCount(exCount || 0)
    setLoading(false)
  }, [])
  useEffect(() => { reload() }, [reload])

  const persistGame = useCallback(async (patch) => { await store.updateGameState(patch) }, [])

  const awardXp = useCallback((amount, label) => {
    setTotalXp((prev) => {
      const next = prev + amount
      persistGame({ total_xp: next })
      return next
    })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(`+${amount} XP${label ? ' · ' + label : ''}`)
    toastTimer.current = setTimeout(() => setToast(null), 1200)
  }, [persistGame])

  const computeHabitStreak = useCallback((habitId) => {
    let streak = 0
    let cursor = todayStr()
    if (!(completions[cursor] || []).includes(habitId)) cursor = addDays(cursor, -1)
    while ((completions[cursor] || []).includes(habitId)) { streak++; cursor = addDays(cursor, -1) }
    return streak
  }, [completions])

  const isPerfectDay = useCallback((dateStr) => {
    const done = completions[dateStr] || []
    return DEFAULT_HABITS.every((h) => done.includes(h.id))
  }, [completions])

  const computePerfectStreak = useCallback(() => {
    let streak = 0
    let cursor = todayStr()
    if (!isPerfectDay(cursor)) cursor = addDays(cursor, -1)
    while (isPerfectDay(cursor)) { streak++; cursor = addDays(cursor, -1) }
    return streak
  }, [isPerfectDay])

  const habitStreaks = {}
  for (const h of DEFAULT_HABITS) habitStreaks[h.id] = computeHabitStreak(h.id)
  const perfectStreak = computePerfectStreak()
  const totalPerfectDays = Object.keys(completions).filter(isPerfectDay).length
  const daysLogged = Object.keys(completions).length
  const maxWaterStreak = habitStreaks.water || 0

  const prog = levelProgress(totalXp)
  const rank = rankTitle(prog.level)

  useEffect(() => {
    if (loading) return
    const ctx = { totalXp, level: prog.level, perfectStreak, habitStreaks, totalPerfectDays, workoutCount, daysLogged, maxWaterStreak }
    const newly = BADGES.filter((b) => !earnedBadges.includes(b.id) && b.check(ctx)).map((b) => b.id)
    if (newly.length) {
      const updated = [...earnedBadges, ...newly]
      setEarnedBadges(updated)
      persistGame({ earned_badges: updated })
      const b = BADGES.find((x) => x.id === newly[0])
      if (toastTimer.current) clearTimeout(toastTimer.current)
      setToast(`✦ ${b.name} earned!`)
      toastTimer.current = setTimeout(() => setToast(null), 1800)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalXp, completions, workoutCount, loading])

  const toggleHabit = useCallback(async (habitId) => {
    const today = todayStr()
    const done = completions[today] || []
    const isOn = done.includes(habitId)
    const habit = DEFAULT_HABITS.find((h) => h.id === habitId)
    setCompletions((prev) => {
      const cur = prev[today] || []
      const nextDay = isOn ? cur.filter((x) => x !== habitId) : [...cur, habitId]
      return { ...prev, [today]: nextDay }
    })
    if (isOn) {
      await store.removeHabitCompletion(today, habitId)
    } else {
      await store.addHabitCompletion(today, habitId)
      awardXp(habit.xp, habit.label)
    }
  }, [completions, awardXp])

  const challengeStatus = useCallback((chal) => {
    const today = todayStr()
    const wk = weekStart(today)
    const periodKey = chal.scope === 'daily' ? today : wk
    const claimKey = `${chal.id}:${periodKey}`
    const claimed = claimedChallenges.includes(claimKey)
    let progress = 0, target = chal.target || 1, complete = false
    const doneToday = completions[today] || []
    if (chal.kind === 'allHabitsToday') {
      progress = doneToday.length; target = DEFAULT_HABITS.length; complete = progress >= target
    } else if (chal.kind === 'tripleToday') {
      const need = ['mood', 'water', 'workout']
      progress = need.filter((h) => doneToday.includes(h)).length; target = 3; complete = progress >= target
    } else if (chal.kind === 'perfectThisWeek') {
      let n = 0
      for (let i = 0; i < 7; i++) { const d = addDays(wk, i); if (DEFAULT_HABITS.every((h) => (completions[d] || []).includes(h.id))) n++ }
      progress = n; complete = progress >= target
    } else if (chal.kind === 'habitThisWeek') {
      let n = 0
      for (let i = 0; i < 7; i++) { const d = addDays(wk, i); if ((completions[d] || []).includes(chal.habit)) n++ }
      progress = n; complete = progress >= target
    }
    return { claimKey, claimed, progress, target, complete }
  }, [completions, claimedChallenges])

  const claimChallenge = useCallback((chal) => {
    const { claimKey, claimed, complete } = challengeStatus(chal)
    if (claimed || !complete) return
    const updated = [...claimedChallenges, claimKey]
    setClaimedChallenges(updated)
    persistGame({ claimed_challenges: updated })
    awardXp(chal.bonus, chal.name)
  }, [challengeStatus, claimedChallenges, persistGame, awardXp])

  if (loading) {
    return <main className="screen"><div className="empty" style={{ paddingTop: '20vh' }}><p className="line">Unfurling the scroll…</p></div></main>
  }

  const gameCtx = {
    totalXp, prog, rank, perfectStreak, habitStreaks,
    completions, toggleHabit, awardXp, reload,
    earnedBadges, claimedChallenges, challengeStatus, claimChallenge,
    totalPerfectDays, workoutCount, daysLogged,
  }

  return (
    <>
      <div className="quest-page page">
        <section className="hud">
          <div className="hud-top">
            <div>
              <h1 className="hud-title">Mav's <b>Adventuring Log</b></h1>
              <div className="hud-rank">{rank}</div>
            </div>
            <div className="lvl-badge">
              <span className="n">{prog.level}</span>
              <span className="l">lvl</span>
            </div>
          </div>
          <div className="xpbar-wrap">
            <div className="xpbar-meta">
              <span className="streak-chip">🔥 {perfectStreak} day{perfectStreak === 1 ? '' : 's'}</span>
              <span className="xp">{prog.into} / {prog.span} XP</span>
            </div>
            <div className="xpbar"><div className="xpbar-fill" style={{ width: `${prog.pct * 100}%` }} /></div>
          </div>
        </section>

        {tab === 'log' && <LogTab ctx={gameCtx} />}
        {tab === 'quests' && <QuestsTab ctx={gameCtx} />}
        {tab === 'trends' && <TrendsTab ctx={gameCtx} />}
      </div>

      {toast && <div className="xp-toast">{toast}</div>}
      <BottomNav tabs={TABS} active={tab} onSelect={setTab} />
    </>
  )
}
