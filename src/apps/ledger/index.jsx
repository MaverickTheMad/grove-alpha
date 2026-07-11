import { useState, lazy, Suspense } from 'react'
import * as db from '../../lib/data'
import './ledger.css'
import BottomNav from '../../components/BottomNav'
import { SubTabs } from './ui'
import Overview from './pages/Overview'
import Transactions from './pages/Transactions'
import Bills from './pages/Bills'
import Budgets from './pages/Budgets'
import Goals from './pages/Goals'
import Snowball from './pages/Snowball'
import Rules from './pages/Rules'
import HomeFund from './pages/HomeFund'
const Insights = lazy(() => import('./pages/Insights'))
const Imports = lazy(() => import('./pages/Imports'))
import Settings from './pages/Settings'

export const meta = { id: 'ledger', name: 'Ledger', tagline: 'Budget & bills' }

export async function summary() {
  const [bills, payments] = await Promise.all([
    db.list({ app: 'ledger', type: 'bill' }),
    db.list({ app: 'ledger', type: 'bill_payment' }),
  ])
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const mm = String(month).padStart(2, '0')
  const paidKeys = new Set(
    payments.filter((p) => p.data?.paid).map((p) => `${p.data.bill_id}::${p.data.due_date}`)
  )
  const unpaid = bills.filter((b) => {
    const dueDate = `${year}-${mm}-${String(b.data?.due_day || 1).padStart(2, '0')}`
    return !paidKeys.has(`${b.id}::${dueDate}`)
  })
  const sorted = [...unpaid].sort((a, b) => (a.data?.due_day ?? 1) - (b.data?.due_day ?? 1))
  const nextDue = sorted[0]
  return {
    unpaid_count: unpaid.length,
    total_bills: bills.length,
    next_due_name: nextDue?.data?.name || null,
    next_due_day: nextDue?.data?.due_day || null,
  }
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'overview' },
  { id: 'money', label: 'Money', icon: 'cart' },
  { id: 'home', label: 'Home Fund', icon: 'home' },
  { id: 'insights', label: 'Insights', icon: 'trends' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
]

const MONEY_TABS = [
  { id: 'transactions', label: 'Transactions' },
  { id: 'imports', label: 'Imports' },
  { id: 'rules', label: 'Rules' },
]
const HOME_TABS = [
  { id: 'homefund', label: 'Home Fund' },
  { id: 'budgets', label: 'Budgets' },
  { id: 'bills', label: 'Bills' },
  { id: 'goals', label: 'Goals' },
  { id: 'snowball', label: 'Snowball' },
]

export default function Ledger() {
  const [tab, setTab] = useState('overview')
  const [moneyView, setMoneyView] = useState('transactions')
  const [homeView, setHomeView] = useState('homefund')

  return (
    <>
      {tab === 'overview' && <Overview />}

      {tab === 'money' && (
        <div>
          <SubTabs tabs={MONEY_TABS} current={moneyView} onChange={setMoneyView} />
          {moneyView === 'transactions' && <Transactions />}
          {moneyView === 'imports' && (
            <Suspense fallback={<div className="ledger-page"><div className="empty"><p>Loading importer…</p></div></div>}>
              <Imports />
            </Suspense>
          )}
          {moneyView === 'rules' && <Rules />}
        </div>
      )}

      {tab === 'home' && (
        <div>
          <SubTabs tabs={HOME_TABS} current={homeView} onChange={setHomeView} />
          {homeView === 'homefund' && <HomeFund />}
          {homeView === 'budgets' && <Budgets />}
          {homeView === 'bills' && <Bills />}
          {homeView === 'goals' && <Goals />}
          {homeView === 'snowball' && <Snowball />}
        </div>
      )}

      {tab === 'insights' && (
        <Suspense fallback={<div className="ledger-page"><div className="empty"><p>Loading charts…</p></div></div>}>
          <Insights />
        </Suspense>
      )}
      {tab === 'settings' && <Settings />}

      <BottomNav tabs={TABS} active={tab} onSelect={setTab} />
    </>
  )
}
