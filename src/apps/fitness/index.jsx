import { useState, useEffect, useCallback } from 'react'
import './fitness.css'
import BottomNav from '../../components/BottomNav'
import { PEOPLE } from './constants'
import * as store from './lib/store'
import PersonGate from './components/PersonGate'
import WorkoutTab from './tabs/WorkoutTab'
import ProgressTab from './tabs/ProgressTab'
import RewardsTab from './tabs/RewardsTab'

export const meta = { id: 'fitness', name: 'Reps', tagline: 'Workouts & progress' }

export async function summary({ member, now = new Date() }) {
  const workouts = await store.listWorkouts(member, { limit: 200 })
  const cutoff30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const workouts30d = workouts.filter((w) => new Date(w.performed_at) >= cutoff30)
  // last 7 days bar chart: count per day
  const bars = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() - (6 - i) * 86400000).toISOString().slice(0, 10)
    return workouts30d.filter((w) => (w.performed_at || '').slice(0, 10) === d).length
  })
  return {
    workouts_30d: workouts30d.length,
    last_workout: workouts[0]?.performed_at || null,
    bars,
  }
}

const TABS = [
  { id: 'workout', label: 'Workout', icon: 'workout' },
  { id: 'progress', label: 'Progress', icon: 'trends' },
  { id: 'rewards', label: 'Rewards', icon: 'goals' },
]

export default function Fitness() {
  const [tab, setTab] = useState('workout')
  const [person, setPerson] = useState(null) // null = choose via the gate first
  const [profiles, setProfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadProfiles = useCallback(async () => {
    try {
      await store.ensureProfiles(PEOPLE)
      setProfiles(await store.loadProfiles())
      setError('')
    } catch (e) {
      setError(e.message || 'Could not load profiles.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { loadProfiles() }, [loadProfiles])

  const profile = profiles[person]

  if (loading) {
    return <main className="screen"><div className="empty" style={{ paddingTop: '20vh' }}><p className="line">Loading…</p></div></main>
  }
  if (error) {
    return (
      <main className="screen">
        <div className="empty" style={{ paddingTop: '20vh' }}>
          <p className="line">{error}</p>
          <button className="btn primary" onClick={loadProfiles} style={{ marginTop: 12 }}>Retry</button>
        </div>
      </main>
    )
  }
  if (!person) {
    return <div className="fitness-page page"><PersonGate profiles={profiles} onChoose={setPerson} /></div>
  }

  return (
    <>
      <div className="fitness-page page">
        <div className="who-bar">
          <button className="who-pill" onClick={() => setPerson(null)} aria-label="Switch person">
            <span className="who-avatar">{profile?.display_name?.[0]}</span>
            <span className="who-name">{profile?.display_name}</span>
            <span className="who-switch">Switch</span>
          </button>
        </div>
        {tab === 'workout' && <WorkoutTab person={person} profile={profile} onProfileChange={loadProfiles} />}
        {tab === 'progress' && <ProgressTab person={person} profile={profile} onProfileChange={loadProfiles} />}
        {tab === 'rewards' && <RewardsTab person={person} profile={profile} onProfileChange={loadProfiles} />}
      </div>
      <BottomNav tabs={TABS} active={tab} onSelect={setTab} />
    </>
  )
}
