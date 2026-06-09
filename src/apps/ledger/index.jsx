import { useState } from 'react'
import BottomNav from '../../components/BottomNav'
import ScaffoldTab from '../../components/ScaffoldTab'

// Ledger — port target. Dual per-person 14-day pay cycles, 50/50 shared split,
// Chase PDF import (pdf.js, browser-side), rules engine, snowball projection.
// All compute is already client-side → fits the records-blob model directly.
export const meta = { id: 'ledger', name: 'Ledger', tagline: 'Budget & bills' }

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'overview' },
  { id: 'bills', label: 'Bills', icon: 'bills' },
  { id: 'budgets', label: 'Budgets', icon: 'budgets' },
  { id: 'txns', label: 'Txns', icon: 'list' },
  { id: 'goals', label: 'Goals', icon: 'goals' },
]

const NOTES = {
  overview: ['per-person pay-cycle cards', 'hero net/income → --fs-3xl mono (UI-POLISH §1)'],
  bills: ['recurring bills + per-month paid checkboxes', 'pair paid/unpaid with icon + strike (§2)'],
  budgets: ['dual 14-day cycles anchored to each paycheck', '50/50 shared split'],
  txns: ['the ledger; search/filter', 'Chase PDF import → review → commit', 'undo toast after commit (§4)'],
  goals: ['sinking-fund envelopes + snowball projection', 'mark estimates as estimates (§7)'],
}

const EMOJI = { overview: '📊', bills: '🧾', budgets: '⚖️', txns: '💳', goals: '🎯' }

export default function Ledger() {
  const [tab, setTab] = useState('overview')
  const t = TABS.find((x) => x.id === tab)
  return (
    <>
      <ScaffoldTab title={t.label} sub="Ledger" emoji={EMOJI[tab]} portsHere={NOTES[tab]} />
      <BottomNav tabs={TABS} active={tab} onSelect={setTab} />
    </>
  )
}
