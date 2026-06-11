import { useMemo, useState, useEffect } from 'react'
import { useRecords } from '../lib/useRecords'
import { fmt, monthShort, currentMonth } from '../lib/format'
import {
  monthKeyOf, monthKeysFrom, monthKeyLabel, monthBounds, stepMonthKey,
  QUARTERS,
} from '../lib/period'
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell,
  LineChart, Line, Legend, PieChart, Pie,
} from 'recharts'

const TOOLTIP_STYLE = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 13, color: 'var(--text)' }

export default function Insights() {
  const [tab, setTab] = useState('trends')   // 'trends' | 'compare'

  return (
    <div className="ledger-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>Insights</h1>
          <p>The pattern of where the money goes — by year, quarter, or month.</p>
        </div>
        <div className="seg">
          <button className={'seg-btn' + (tab === 'trends' ? ' active' : '')} onClick={() => setTab('trends')}>Trends</button>
          <button className={'seg-btn' + (tab === 'compare' ? ' active' : '')} onClick={() => setTab('compare')}>Compare months</button>
        </div>
      </div>
      {tab === 'trends' ? <Trends /> : <Compare />}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   TRENDS — year view with granularity + quarter controls + drill-down
   ════════════════════════════════════════════════════════════════════ */
function Trends() {
  const { year: thisYear } = currentMonth()
  const [year, setYear] = useState(thisYear)
  const [chartMode, setChartMode] = useState('fytd')      // 'fytd' | 'monthly'
  const [granularity, setGranularity] = useState('monthly') // 'monthly' | 'quarterly'
  const [quarter, setQuarter] = useState('all')           // 'all' | 'Q1'..'Q4'
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)

  const { data: allTx } = useRecords('transaction')
  const transactions = useMemo(
    () => allTx.filter((t) => t.date >= `${year}-01-01` && t.date < `${year + 1}-01-01`),
    [allTx, year]
  )
  const { data: categories } = useRecords('category', { orderBy: 'sort_order' })
  const { data: accounts } = useRecords('account')

  // Months allowed by the quarter filter (1-indexed).
  const allowedMonths = useMemo(() => {
    if (quarter === 'all') return null
    return QUARTERS.find(q => q.id === quarter)?.months || null
  }, [quarter])

  const inScope = (t) => {
    if (!allowedMonths) return true
    const m = new Date(t.date).getMonth() + 1
    return allowedMonths.includes(m)
  }

  /* --- Per-period cashflow --- */
  const cashflow = useMemo(() => {
    const scoped = transactions.filter(inScope)
    if (granularity === 'quarterly') {
      return QUARTERS
        .filter(q => quarter === 'all' || q.id === quarter)
        .map(q => {
          const qtx = scoped.filter(t => q.months.includes(new Date(t.date).getMonth() + 1))
          const income = qtx.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0)
          const expense = qtx.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
          return { label: q.id, income: Math.round(income), expense: Math.round(expense), net: Math.round(income - expense) }
        })
    }
    const months = allowedMonths || Array.from({ length: 12 }, (_, i) => i + 1)
    return months.map(month => {
      const mtx = scoped.filter(t => new Date(t.date).getMonth() + 1 === month)
      const income = mtx.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0)
      const expense = mtx.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
      return { label: monthShort(month), income: Math.round(income), expense: Math.round(expense), net: Math.round(income - expense) }
    })
  }, [transactions, granularity, allowedMonths, quarter])

  const activePeriods = useMemo(() => {
    const n = cashflow.filter(p => p.expense > 0 || p.income > 0).length
    return n || 1
  }, [cashflow])

  /* --- Category breakdown (respects quarter filter) --- */
  const categoryDataTotal = useMemo(() => {
    const scoped = transactions.filter(inScope)
    return categories
      .filter(c => c.kind !== 'income')
      .map(c => {
        const spent = scoped
          .filter(t => t.category_id === c.id && Number(t.amount) < 0)
          .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
        return { id: c.id, name: c.name, value: Math.round(spent), color: c.color }
      })
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [transactions, categories, allowedMonths, quarter])

  const periodLabel = granularity === 'quarterly' ? 'quarter' : 'month'
  const categoryData = useMemo(() => {
    if (chartMode === 'monthly') {
      return categoryDataTotal.map(c => ({ ...c, value: Math.round(c.value / activePeriods) }))
    }
    return categoryDataTotal
  }, [categoryDataTotal, chartMode, activePeriods])

  const totalScoped = useMemo(() => categoryDataTotal.reduce((s, c) => s + c.value, 0), [categoryDataTotal])
  const avgPerPeriod = totalScoped / activePeriods
  const scopeLabel = quarter === 'all' ? `FY ${year}` : `${quarter} ${year}`
  const modeLabel = chartMode === 'fytd' ? `${quarter === 'all' ? 'FYTD' : quarter} total` : `Per ${periodLabel} avg`

  /* --- Drill-down detail for the selected category --- */
  const detail = useMemo(() => {
    if (!selectedCategoryId) return null
    const cat = categories.find(c => c.id === selectedCategoryId)
    if (!cat) return null
    const txns = transactions
      .filter(t => t.category_id === selectedCategoryId && Number(t.amount) < 0 && inScope(t))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
    const total = txns.reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
    const byMonth = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      const spent = txns
        .filter(t => new Date(t.date).getMonth() + 1 === month)
        .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
      return { month: monthShort(month), spent: Math.round(spent) }
    })
    const byQuarter = QUARTERS.map(q => {
      const spent = txns
        .filter(t => q.months.includes(new Date(t.date).getMonth() + 1))
        .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
      return { month: q.id, spent: Math.round(spent) }
    })
    const activeMonths = byMonth.filter(m => m.spent > 0).length || 1
    return {
      cat, txns, total, count: txns.length,
      avgPerMonth: total / activeMonths,
      avgPerTxn: txns.length ? total / txns.length : 0,
      byMonth: granularity === 'quarterly' ? byQuarter : byMonth,
    }
  }, [selectedCategoryId, categories, transactions, allowedMonths, quarter, granularity])

  return (
    <div>
      <div className="card insights-controls" style={{ marginBottom: '1.25rem' }}>
        <div className="ic-group">
          <span className="ic-label">Year</span>
          <div className="seg">
            <button className="seg-btn" onClick={() => { setYear(year - 1); setSelectedCategoryId(null) }}>&larr; {year - 1}</button>
            <span className="seg-static">{year}</span>
            <button className="seg-btn" onClick={() => { setYear(year + 1); setSelectedCategoryId(null) }}>{year + 1} &rarr;</button>
          </div>
        </div>
        <div className="ic-group">
          <span className="ic-label">Period</span>
          <div className="seg">
            <button className={'seg-btn' + (granularity === 'monthly' ? ' active' : '')} onClick={() => setGranularity('monthly')}>Monthly</button>
            <button className={'seg-btn' + (granularity === 'quarterly' ? ' active' : '')} onClick={() => setGranularity('quarterly')}>Quarterly</button>
          </div>
        </div>
        <div className="ic-group">
          <span className="ic-label">Quarter</span>
          <select className="select" style={{ minWidth: 150 }} value={quarter} onChange={(e) => { setQuarter(e.target.value); setSelectedCategoryId(null) }}>
            <option value="all">Whole year</option>
            {QUARTERS.map(q => <option key={q.id} value={q.id}>{q.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">{scopeLabel} spent</div>
          <div className="stat-value">{fmt(totalScoped, { showCents: false })}</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-label">Per-{periodLabel} average</div>
          <div className="stat-value">{fmt(avgPerPeriod, { showCents: false })}</div>
          <div className="stat-sub">Across {activePeriods} active {periodLabel}{activePeriods !== 1 ? 's' : ''}</div>
        </div>
        <div className="stat-card warm">
          <div className="stat-label">Top category</div>
          <div className="stat-value" style={{ fontSize: '1.4rem' }}>{categoryDataTotal[0]?.name || '—'}</div>
          <div className="stat-sub">{categoryDataTotal[0] ? fmt(categoryDataTotal[0].value, { showCents: false }) : 'No data yet'}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-head">
          <h3>{granularity === 'quarterly' ? 'Quarterly' : 'Monthly'} cashflow</h3>
          <span className="eyebrow">Income · Expense · Net</span>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          {granularity === 'quarterly' ? (
            <BarChart data={cashflow} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
              <XAxis dataKey="label" stroke="var(--text-soft)" style={{ fontSize: 12 }} />
              <YAxis stroke="var(--text-soft)" style={{ fontSize: 12 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmt(v, { showCents: false })} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" fill="var(--ok)" radius={[4,4,0,0]} />
              <Bar dataKey="expense" fill="var(--danger)" radius={[4,4,0,0]} />
              <Bar dataKey="net" fill="var(--app-accent)" radius={[4,4,0,0]} />
            </BarChart>
          ) : (
            <LineChart data={cashflow} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
              <XAxis dataKey="label" stroke="var(--text-soft)" style={{ fontSize: 12 }} />
              <YAxis stroke="var(--text-soft)" style={{ fontSize: 12 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmt(v, { showCents: false })} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="income" stroke="var(--ok)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
              <Line type="monotone" dataKey="expense" stroke="var(--danger)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
              <Line type="monotone" dataKey="net" stroke="var(--app-accent)" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} connectNulls={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem', gap: 4 }}>
        <button className={'btn btn-sm ' + (chartMode === 'fytd' ? '' : 'btn-ghost')} onClick={() => setChartMode('fytd')}>{quarter === 'all' ? 'FYTD' : quarter} total</button>
        <button className={'btn btn-sm ' + (chartMode === 'monthly' ? '' : 'btn-ghost')} onClick={() => setChartMode('monthly')}>Per-{periodLabel} avg</button>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-head">
            <h3>By category</h3>
            <span className="eyebrow">{modeLabel} · click to drill in</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
              <XAxis type="number" stroke="var(--text-soft)" style={{ fontSize: 11 }} tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`} />
              <YAxis type="category" dataKey="name" stroke="var(--text-soft)" style={{ fontSize: 11 }} width={100} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmt(v, { showCents: false })} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} cursor="pointer"
                onClick={(d) => { const id = d?.id || d?.payload?.id; if (id) setSelectedCategoryId(id) }}>
                {categoryData.map((c, i) => (
                  <Cell key={i} fill={c.color} opacity={selectedCategoryId && selectedCategoryId !== c.id ? 0.4 : 1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Share of spend</h3>
            <span className="eyebrow">{modeLabel}</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={55} paddingAngle={2}
                cursor="pointer"
                onClick={(d) => { const id = d?.id || d?.payload?.id; if (id) setSelectedCategoryId(id) }}>
                {categoryData.map((c, i) => (
                  <Cell key={i} fill={c.color} opacity={selectedCategoryId && selectedCategoryId !== c.id ? 0.4 : 1} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmt(v, { showCents: false })} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-head">
          <h3>Categories</h3>
          <span className="eyebrow">{modeLabel}</span>
        </div>
        <table className="ledger ledger-tight">
          <tbody>
            {categoryData.map(c => (
              <tr key={c.id} style={{ cursor: 'pointer', background: selectedCategoryId === c.id ? 'var(--accent-weak)' : 'transparent' }}
                onClick={() => setSelectedCategoryId(c.id)}>
                <td style={{ width: 30 }}><span className="dot" style={{ background: c.color }}></span></td>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td className="num">{fmt(c.value, { showCents: false })}</td>
                <td style={{ width: 30, textAlign: 'right', color: 'var(--ink-muted)' }}>&rsaquo;</td>
              </tr>
            ))}
          </tbody>
        </table>
        {categoryData.length === 0 && <div className="empty"><p>No spending recorded for {scopeLabel} yet.</p></div>}
      </div>

      {detail && (
        <div className="card" style={{ marginTop: '1.5rem', borderTop: `3px solid ${detail.cat.color}` }}>
          <div className="card-head">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="dot" style={{ background: detail.cat.color }}></span>
              {detail.cat.name}
            </h3>
            <button className="icon-btn" onClick={() => setSelectedCategoryId(null)} title="Close">&times;</button>
          </div>

          <div className="grid-4" style={{ marginBottom: '1.25rem' }}>
            <div className="stat-card">
              <div className="stat-label">Total {scopeLabel}</div>
              <div className="stat-value" style={{ fontSize: '1.5rem' }}>{fmt(detail.total, { showCents: false })}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Transactions</div>
              <div className="stat-value" style={{ fontSize: '1.5rem' }}>{detail.count}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Avg / month</div>
              <div className="stat-value" style={{ fontSize: '1.5rem' }}>{fmt(detail.avgPerMonth, { showCents: false })}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Avg / transaction</div>
              <div className="stat-value" style={{ fontSize: '1.5rem' }}>{fmt(detail.avgPerTxn, { showCents: false })}</div>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>{granularity === 'quarterly' ? 'Quarter by quarter' : 'Month by month'}</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={detail.byMonth} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                <XAxis dataKey="month" stroke="var(--text-soft)" style={{ fontSize: 11 }} />
                <YAxis stroke="var(--text-soft)" style={{ fontSize: 11 }} tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmt(v, { showCents: false })} />
                <Bar dataKey="spent" radius={[4, 4, 0, 0]} fill={detail.cat.color} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="eyebrow" style={{ marginBottom: 8 }}>All transactions ({detail.count})</div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            <table className="ledger ledger-tight">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Account</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {detail.txns.map(t => {
                  const acct = accounts.find(a => a.id === t.account_id)
                  return (
                    <tr key={t.id}>
                      <td className="mono col-date">{t.date}</td>
                      <td>
                        <span className="tx-desc">{t.description}</span>
                        {t.notes && <span className="tx-note">{t.notes}</span>}
                      </td>
                      <td style={{ fontSize: 13 }}>{acct?.name || <span style={{ color: 'var(--ink-faint)' }}>—</span>}</td>
                      <td className="num amount amount-neg">{fmt(t.amount, { signed: true })}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   COMPARE — pick two months, see category-by-category deltas
   ════════════════════════════════════════════════════════════════════ */
function Compare() {
  // Pull a wide window so both dropdowns have history to choose from.
  const { data: transactions } = useRecords('transaction', { orderBy: 'date', ascending: false })
  const { data: categories } = useRecords('category', { orderBy: 'sort_order' })

  const monthOptions = useMemo(() => monthKeysFrom(transactions), [transactions])

  const [monthA, setMonthA] = useState('')
  const [monthB, setMonthB] = useState('')

  // Seed the two pickers once transactions arrive: B = latest month with data,
  // A = the month before it (so the default view is "this month vs last month").
  useEffect(() => {
    if (monthOptions.length === 0) return
    if (!monthB) {
      const b = monthOptions[0]
      const a = monthOptions[1] || stepMonthKey(b, -1)
      setMonthB(b)
      setMonthA(a)
    }
  }, [monthOptions, monthB])

  const spendByCategory = (monthKey) => {
    const { startISO, endISO } = monthBounds(monthKey)
    const map = {}
    for (const t of transactions) {
      if (t.date < startISO || t.date >= endISO) continue
      if (Number(t.amount) >= 0) continue
      const key = t.category_id || '__none'
      map[key] = (map[key] || 0) + Math.abs(Number(t.amount))
    }
    return map
  }

  const totalsFor = (monthKey) => {
    const { startISO, endISO } = monthBounds(monthKey)
    let income = 0, expense = 0
    for (const t of transactions) {
      if (t.date < startISO || t.date >= endISO) continue
      if (Number(t.amount) >= 0) income += Number(t.amount)
      else expense += Math.abs(Number(t.amount))
    }
    return { income, expense, net: income - expense }
  }

  const rows = useMemo(() => {
    const a = spendByCategory(monthA)
    const b = spendByCategory(monthB)
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    return [...keys].map(key => {
      const cat = categories.find(c => c.id === key)
      const av = a[key] || 0, bv = b[key] || 0
      return {
        key,
        name: cat?.name || 'Uncategorized',
        color: cat?.color || 'var(--ink-faint)',
        a: av, b: bv, delta: bv - av,
        pct: av > 0 ? ((bv - av) / av) * 100 : (bv > 0 ? 100 : 0),
      }
    }).sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta))
  }, [transactions, categories, monthA, monthB])

  const tA = totalsFor(monthA)
  const tB = totalsFor(monthB)
  const chartData = rows.slice(0, 10).map(r => ({ name: r.name, [monthKeyLabel(monthA)]: Math.round(r.a), [monthKeyLabel(monthB)]: Math.round(r.b), color: r.color }))

  if (monthOptions.length === 0) {
    return <div className="card"><div className="empty"><h3>Nothing to compare yet</h3><p>Add or import transactions, then compare any two months side by side.</p></div></div>
  }
  if (!monthA || !monthB) {
    return <div className="card"><div className="empty"><p>Loading…</p></div></div>
  }

  return (
    <div>
      <div className="card compare-pickers" style={{ marginBottom: '1.25rem' }}>
        <div className="ic-group">
          <span className="ic-label">Month A</span>
          <select className="select" value={monthA} onChange={(e) => setMonthA(e.target.value)}>
            {monthOptions.map(m => <option key={m} value={m}>{monthKeyLabel(m, { long: true })}</option>)}
          </select>
        </div>
        <span className="compare-vs">vs</span>
        <div className="ic-group">
          <span className="ic-label">Month B</span>
          <select className="select" value={monthB} onChange={(e) => setMonthB(e.target.value)}>
            {monthOptions.map(m => <option key={m} value={m}>{monthKeyLabel(m, { long: true })}</option>)}
          </select>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">{monthKeyLabel(monthA)} spent</div>
          <div className="stat-value">{fmt(tA.expense, { showCents: false })}</div>
          <div className="stat-sub">Net {fmt(tA.net, { showCents: false, signed: true })}</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-label">{monthKeyLabel(monthB)} spent</div>
          <div className="stat-value">{fmt(tB.expense, { showCents: false })}</div>
          <div className="stat-sub">Net {fmt(tB.net, { showCents: false, signed: true })}</div>
        </div>
        <div className="stat-card warm">
          <div className="stat-label">Change in spend</div>
          <div className="stat-value" style={{ color: (tB.expense - tA.expense) <= 0 ? 'var(--positive)' : 'var(--negative)' }}>
            {fmt(tB.expense - tA.expense, { showCents: false, signed: true })}
          </div>
          <div className="stat-sub">{tA.expense > 0 ? `${(((tB.expense - tA.expense) / tA.expense) * 100).toFixed(0)}% vs A` : ''}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-head">
          <h3>Top categories, side by side</h3>
          <span className="eyebrow">Largest movers first</span>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
            <XAxis type="number" stroke="var(--text-soft)" style={{ fontSize: 11 }} tickFormatter={(v) => `$${(v/1000).toFixed(1)}k`} />
            <YAxis type="category" dataKey="name" stroke="var(--text-soft)" style={{ fontSize: 11 }} width={100} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmt(v, { showCents: false })} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey={monthKeyLabel(monthA)} fill="var(--text-soft)" radius={[0, 4, 4, 0]} />
            <Bar dataKey={monthKeyLabel(monthB)} fill="var(--app-accent)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="ledger ledger-tight">
          <thead>
            <tr>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>{monthKeyLabel(monthA)}</th>
              <th style={{ textAlign: 'right' }}>{monthKeyLabel(monthB)}</th>
              <th style={{ textAlign: 'right' }}>Change</th>
              <th style={{ textAlign: 'right' }}>%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.key}>
                <td>
                  <span className="cat-chip"><span className="dot" style={{ background: r.color }}></span>{r.name}</span>
                </td>
                <td className="num">{fmt(r.a, { showCents: false })}</td>
                <td className="num">{fmt(r.b, { showCents: false })}</td>
                <td className="num" style={{ color: r.delta <= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                  {fmt(r.delta, { showCents: false, signed: true })}
                </td>
                <td className="num" style={{ color: r.delta <= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                  {r.a > 0 ? `${r.pct > 0 ? '+' : ''}${r.pct.toFixed(0)}%` : (r.b > 0 ? 'new' : '—')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="empty"><p>No spending in either month.</p></div>}
      </div>
    </div>
  )
}
