import { useState } from 'react'
import BottomNav from '../../components/BottomNav'
import ScaffoldTab from '../../components/ScaffoldTab'

// Pets — half-baked in the suite; alpha still exposes it (config.exposedApps),
// beta drops it until polished. No app summary exists yet → port from its repo.
export const meta = { id: 'pets', name: 'Pets', tagline: 'Care & records' }

const TABS = [
  { id: 'pets', label: 'Pets', icon: 'pets' },
  { id: 'log', label: 'Log', icon: 'log' },
]

export default function Pets() {
  const [tab, setTab] = useState('pets')
  return (
    <>
      <ScaffoldTab
        title={tab === 'pets' ? 'Pets' : 'Care log'}
        sub="Pets"
        emoji="🐾"
        portsHere={['pet profiles + Sheet.jsx add/edit', 'care events → records (type: care_event)', 'write a README (was missing — build-spec §9)']}
      />
      <BottomNav tabs={TABS} active={tab} onSelect={setTab} />
    </>
  )
}
