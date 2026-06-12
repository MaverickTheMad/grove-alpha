import { useCallback, useEffect, useState } from 'react'
import './pets.css'
import BottomNav from '../../components/BottomNav'
import * as store from './lib/store'
import RemindersTab from './tabs/RemindersTab'
import PetsTab from './tabs/PetsTab'
import DocsTab from './tabs/DocsTab'

export const meta = { id: 'pets', name: 'Pets', tagline: 'Health & reminders' }

const TABS = [
  { id: 'reminders', label: 'Reminders', icon: 'upcoming' },
  { id: 'pets', label: 'Pets', icon: 'pets' },
  { id: 'docs', label: 'Documents', icon: 'list' },
]

export default function Pets() {
  const [tab, setTab] = useState('reminders')
  const [pets, setPets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadPets = useCallback(async () => {
    try {
      setPets(await store.listPets())
      setError('')
    } catch (e) {
      setError(e.message || 'Could not load pets.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { loadPets() }, [loadPets])

  if (loading) {
    return <main className="screen"><div className="empty full" style={{ paddingTop: '20vh' }}><div className="big">⏳</div><p>Loading…</p></div></main>
  }
  if (error) {
    return (
      <main className="screen">
        <div className="empty full" style={{ paddingTop: '18vh' }}>
          <div className="big">⚠️</div>
          <h3>Couldn’t load</h3>
          <p>{error}</p>
          <button className="btn primary" onClick={loadPets} style={{ marginTop: 12 }}>Retry</button>
        </div>
      </main>
    )
  }

  return (
    <>
      <div className="pets-page page">
        {tab === 'reminders' && <RemindersTab pets={pets} onJump={setTab} />}
        {tab === 'pets' && <PetsTab pets={pets} reloadPets={loadPets} />}
        {tab === 'docs' && <DocsTab pets={pets} />}
      </div>
      <BottomNav tabs={TABS} active={tab} onSelect={setTab} />
    </>
  )
}
