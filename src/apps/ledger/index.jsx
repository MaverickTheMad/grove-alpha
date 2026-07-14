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

export async function summary({ now = new Date() } = {}) {
  const todayStr = now.toISOString().slice(0, 10)
  const tenDaysStr = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const cutoff30Str = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const year = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')

  const [bills, payments, transactions] = await Promise.all([
    db.list({ app: 'ledger', type: 'bill' }),
    db.list({ app: 'ledger', type: 'bill_payment' }),
    db.list({ app: 'ledger', type: 'transaction' }).catch(() => []),
  ])

  const paidKeys = new Set(
    payments.filter((p) => p.data?.paid).map((p) => `${p.data.bill_id}::${p.data.due_date}`)
  )
  const unpaid = bills.filter((b) => {
    const dueDate = `${year}-${mm}-${String(b.data?.due_day || 1).padStart(2, '0')}`
    return !paidKeys.has(`${b.id}::${dueDate}`)
  }).sort((a, b) => (a.data?.due_day ?? 1) - (b.data?.due_day ?? 1))

  const upcomingBills = unpaid
    .filter((b) => {
      const due = `${year}-${mm}-${String(b.data?.due_day || 1).padStart(2, '0')}`
      return due >= todayStr && due <= tenDaysStr
    })
    .map((b) => ({
      name: b.data?.name || 'Bill',
      due_date: `${year}-${mm}-${String(b.data?.due_day || 1).padStart(2, '0')}`,
      amount: b.data?.amount || null,
    }))

  const recent = transactions.filter((t) => {
    const d = t.data?.date || t.occurredAt?.slice(0, 10) || ''
    return d >= cutoff30Str
  })
  const moneyIn  = recent.filter((t) => Number(t.data?.amount || 0) > 0).reduce((s, t) => s + Number(t.data?.amount || 0), 0)
  const moneyOut = recent.filter((t) => Number(t.data?.amount || 0) < 0).reduce((s, t) => s + Math.abs(Number(t.data?.amount || 0)), 0)

  return {
    unpaid_count: unpaid.length,
    total_bills: bills.length,
    upcoming_bills: upcomingBills,
    net_amount: moneyIn - moneyOut,
    money_in: moneyIn,
    money_out: moneyOut,
    has_transactions: transactions.length > 0,
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
          <SubTabs name="money" tabs={MONEY_TABS} current={moneyView} onChange={setMoneyView} />
          <div role="tabpanel" id={`money-panel-${moneyView}`} aria-labelledby={`money-tab-${moneyView}`}>
            {moneyView === 'transactions' && <Transactions />}
            {moneyView === 'imports' && (
              <Suspense fallback={<div className="ledger-page"><div className="empty"><p>Loading importer…</p></div></div>}>
                <Imports />
              </Suspense>
            )}
            {moneyView === 'rules' && <Rules />}
          </div>
        </div>
      )}

      {tab === 'home' && (
        <div>
          <SubTabs name="home" tabs={HOME_TABS} current={homeView} onChange={setHomeView} />
          <div role="tabpanel" id={`home-panel-${homeView}`} aria-labelledby={`home-tab-${homeView}`}>
            {homeView === 'homefund' && <HomeFund />}
            {homeView === 'budgets' && <Budgets />}
            {homeView === 'bills' && <Bills />}
            {homeView === 'goals' && <Goals />}
            {homeView === 'snowball' && <Snowball />}
          </div>
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
