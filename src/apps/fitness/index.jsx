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

export async function summary({ member }) {
  const workouts = await store.listWorkouts(member)
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thisWeek = workouts.filter((w) => new Date(w.performed_at) >= weekAgo)
  return {
    workouts_this_week: thisWeek.length,
    total_workouts: workouts.length,
    last_workout: workouts[0]?.performed_at || null,
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
