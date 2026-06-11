import { useState, lazy, Suspense } from 'react'
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
const Insights = lazy(() => import('./pages/Insights'))
const Imports = lazy(() => import('./pages/Imports'))
import Settings from './pages/Settings'

export const meta = { id: 'ledger', name: 'Ledger', tagline: 'Budget & bills' }

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'overview' },
  { id: 'money', label: 'Money', icon: 'cart' },
  { id: 'plan', label: 'Plan', icon: 'calendar' },
  { id: 'insights', label: 'Insights', icon: 'trends' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
]

const MONEY_TABS = [
  { id: 'transactions', label: 'Transactions' },
  { id: 'imports', label: 'Imports' },
  { id: 'rules', label: 'Rules' },
]
const PLAN_TABS = [
  { id: 'budgets', label: 'Budgets' },
  { id: 'bills', label: 'Bills' },
  { id: 'goals', label: 'Goals' },
  { id: 'snowball', label: 'Snowball' },
]

export default function Ledger() {
  const [tab, setTab] = useState('overview')
  const [moneyView, setMoneyView] = useState('transactions')
  const [planView, setPlanView] = useState('budgets')

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

      {tab === 'plan' && (
        <div>
          <SubTabs tabs={PLAN_TABS} current={planView} onChange={setPlanView} />
          {planView === 'budgets' && <Budgets />}
          {planView === 'bills' && <Bills />}
          {planView === 'goals' && <Goals />}
          {planView === 'snowball' && <Snowball />}
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
