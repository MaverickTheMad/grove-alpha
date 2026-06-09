import { useState } from 'react'
import BottomNav from '../../components/BottomNav'
import ScaffoldTab from '../../components/ScaffoldTab'

// Media — half-baked; Tide accent sits closest to the house green, so primary
// actions use house green (handled in App.css), the Tide accent only for
// identity (BRAND-GUIDE §3.3). Jellyfin key stays server-side via api/ proxy
// (build-spec §6 — single api/foo.js + vercel.json rewrite, not a catch-all).
export const meta = { id: 'media', name: 'Media', tagline: 'The shelf' }

const TABS = [
  { id: 'shelf', label: 'Shelf', icon: 'media' },
  { id: 'list', label: 'Watchlist', icon: 'list' },
]

export default function Media() {
  const [tab, setTab] = useState('shelf')
  return (
    <>
      <ScaffoldTab
        title={tab === 'shelf' ? 'Shelf' : 'Watchlist'}
        sub="Media"
        emoji="🎬"
        portsHere={['Jellyfin proxy via api/ (server-side secret)', 'delete the duplicate/dead proxy (build-spec §9)', 'watchlist → records (type: watch_item)']}
      />
      <BottomNav tabs={TABS} active={tab} onSelect={setTab} />
    </>
  )
}
