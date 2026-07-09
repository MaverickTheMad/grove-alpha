import { useMemo, useState } from 'react'
import { useRecords } from '../lib/useRecords'
import { fmt } from '../lib/format'
import { currentMonthKey, monthKeyLabel, monthBounds, stepMonthKey, monthKeysFrom } from '../lib/period'
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, PieChart, Pie } from 'recharts'
import { useIsDesktop } from '../../../lib/viewport'

const TOOLTIP_STYLE = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 13, color: 'var(--text)' }

export default function Insights() {
  const { data: allTx } = useRecords('transaction')
  const { data: categories } = useRecords('category', { orderBy: 'name' })
  const { data: monthlyBudgets } = useRecords('monthly_budget')
  const isWide = useIsDesktop(1080)

  const nowKey = currentMonthKey()
  const [selectedKey, setSelectedKey] = useState(nowKey)
  const [yearMode, setYearMode] = useState(false)

  const monthsWithData = useMemo(() => monthKeysFrom(allTx), [allTx])

  // Year derived from selected key
  const selectedYear = parseInt(selectedKey.split('-')[0], 10)

  // Cashflow by month for the selected year (12 bars)
  const cashflowYear = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      const key = `${selectedYear}-${String(m).padStart(2, '0')}`
      const { startISO, endISO } = monthBounds(key)
      const isFuture = key > nowKey
      if (isFuture) return { key, label: key.slice(5), income: null, expense: null, net: null, isFuture: true }
      const txns = allTx.filter(t => t.date >= startISO && t.date < endISO)
      const income = txns.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0)
      const expense = txns.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
      return { key, label: key.slice(5), income: Math.round(income), expense: Math.round(expense), net: Math.round(income - expense), isFuture: false }
    })
    return months
  }, [allTx, selectedYear, nowKey])

  // Selected month data
  const { startISO: selStart, endISO: selEnd } = monthBounds(selectedKey)
  const prevKey = stepMonthKey(selectedKey, -1)
  const { startISO: prevStart, endISO: prevEnd } = monthBounds(prevKey)

  const selTx = useMemo(() => allTx.filter(t => t.date >= selStart && t.date < selEnd), [allTx, selStart, selEnd])
  const prevTx = useMemo(() => allTx.filter(t => t.date >= prevStart && t.date < prevEnd), [allTx, prevStart, prevEnd])

  const kpi = useMemo(() => {
    const income = selTx.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0)
    const expense = selTx.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
    const net = income - expense
    const prevExpense = prevTx.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
    const momDelta = prevExpense > 0 ? ((expense - prevExpense) / prevExpense) * 100 : null
    return { income, expense, net, momDelta }
  }, [selTx, prevTx])

  // Category spend for selected month with MoM delta
  const catSpend = useMemo(() => {
    const prev = {}
    for (const t of prevTx) {
      if (Number(t.amount) >= 0) continue
      const k = t.category_id || '__none'
      prev[k] = (prev[k] || 0) + Math.abs(Number(t.amount))
    }
    return categories
      .filter(c => c.kind !== 'income')
      .map(c => {
        const curr = selTx.filter(t => t.category_id === c.id && Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
        const prevAmt = prev[c.id] || 0
        const delta = curr - prevAmt
        return { id: c.id, name: c.name, color: c.color, value: Math.round(curr), prevValue: Math.round(prevAmt), delta: Math.round(delta) }
      })
      .filter(c => c.value > 0 || c.prevValue > 0)
      .sort((a, b) => b.value - a.value)
  }, [selTx, prevTx, categories])

  const maxCatSpend = catSpend.reduce((m, c) => Math.max(m, c.value), 1)

  // Budget vs actual for selected month
  const budgetVsActual = useMemo(() => {
    const [y, m] = selectedKey.split('-').map(Number)
    const monthStart = `${y}-${String(m).padStart(2, '0')}-01`
    return categories
      .filter(c => c.tracked_in_budget)
      .map(c => {
        const budget = monthlyBudgets.find(b => b.category_id === c.id && b.period_start?.startsWith(selectedKey))
        const budgetAmt = Number(budget?.amount || 0)
        const spent = selTx.filter(t => t.category_id === c.id && Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
        const over = budgetAmt > 0 && spent > budgetAmt
        const pct = budgetAmt > 0 ? Math.min(110, (spent / budgetAmt) * 100) : (spent > 0 ? 100 : 0)
        return { ...c, budgetAmt, spent, over, pct }
      })
      .filter(c => c.budgetAmt > 0 || c.spent > 0)
  }, [monthlyBudgets, selTx, categories, selectedKey])

  const donutData = catSpend.filter(c => c.value > 0)

  const canGoNext = stepMonthKey(selectedKey, 1) <= nowKey

  return (
    <div className="ledger-page">
      {/* Month scrubber */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-5)', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelectedKey(stepMonthKey(selectedKey, -1))}>‹</button>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--fw-title)', fontSize: 'var(--fs-xl)', minWidth: 160, textAlign: 'center' }}>
            {monthKeyLabel(selectedKey, { long: true })}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelectedKey(stepMonthKey(selectedKey, 1))} disabled={!canGoNext}>›</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          {selectedKey !== nowKey && (
            <button className="btn btn-ghost btn-sm" onClick={() => setSelectedKey(nowKey)}>Today</button>
          )}
          <div className="seg">
            <button className={'seg-btn' + (!yearMode ? ' active' : '')} onClick={() => setYearMode(false)}>Month</button>
            <button className={'seg-btn' + (yearMode ? ' active' : '')} onClick={() => setYearMode(true)}>Year</button>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className={isWide ? 'grid-4' : 'grid-2'} style={{ marginBottom: 'var(--sp-5)' }}>
        <div className="stat-card accent">
          <div className="stat-label">In</div>
          <div className="stat-value">{fmt(kpi.income, { showCents: false })}</div>
        </div>
        <div className="stat-card warm">
          <div className="stat-label">Out</div>
          <div className="stat-value">{fmt(kpi.expense, { showCents: false })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Net</div>
          <div className="stat-value" style={{ color: kpi.net >= 0 ? 'var(--ok)' : 'var(--danger)' }}>{fmt(kpi.net, { showCents: false, signed: true })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">vs last month</div>
          {kpi.momDelta !== null ? (
            <div className="stat-value" style={{ color: kpi.momDelta <= 0 ? 'var(--ok)' : 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>{kpi.momDelta <= 0 ? '▼' : '▲'}</span>
              <span>{Math.abs(kpi.momDelta).toFixed(0)}%</span>
            </div>
          ) : <div className="stat-value" style={{ color: 'var(--text-soft)' }}>—</div>}
          <div className="stat-sub">spend</div>
        </div>
      </div>

      {/* Cashflow bar chart — full width */}
      <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
        <div className="card-head">
          <h3>Net by month</h3>
          <span className="eyebrow">{selectedYear} · selected in accent · future gaps</span>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={cashflowYear} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <XAxis dataKey="label" stroke="var(--text-soft)" style={{ fontSize: 11 }} />
            <YAxis stroke="var(--text-soft)" style={{ fontSize: 11 }} tickFormatter={(v) => v === 0 ? '0' : `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => v == null ? '—' : fmt(v, { showCents: false })} />
            <Bar dataKey="net" radius={[4, 4, 0, 0]}>
              {cashflowYear.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.isFuture ? 'transparent' : entry.key === selectedKey ? 'var(--app-accent)' : 'var(--bg-elevated)'}
                  stroke={entry.isFuture ? 'var(--border)' : 'none'}
                  strokeDasharray={entry.isFuture ? '4 2' : undefined}
                  opacity={entry.isFuture ? 0.4 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category bars + donut — side by side on desktop */}
      <div className={isWide ? 'grid-2' : undefined} style={{ marginBottom: 'var(--sp-4)' }}>
        <div className="card">
          <div className="card-head">
            <h3>Spending by category</h3>
            <span className="eyebrow">{monthKeyLabel(selectedKey)}</span>
          </div>
          {catSpend.length === 0 ? (
            <div className="empty"><p>No spending recorded for {monthKeyLabel(selectedKey, { long: true })}.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              {catSpend.map(c => (
                <div key={c.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 4 }}>
                    <span className="dot" style={{ background: c.color }}></span>
                    <span style={{ flex: 1, fontSize: 'var(--fs-sm)', fontWeight: 500 }}>{c.name}</span>
                    <span className="mono" style={{ fontSize: 'var(--fs-sm)' }}>{fmt(c.value, { showCents: false })}</span>
                    {c.delta !== 0 && (
                      <span style={{ fontSize: 'var(--fs-xs)', color: c.delta > 0 ? 'var(--danger)' : 'var(--ok)', minWidth: 48, textAlign: 'right' }}>
                        {c.delta > 0 ? '▲' : '▼'} {fmt(Math.abs(c.delta), { showCents: false })}
                      </span>
                    )}
                  </div>
                  <div className="progress">
                    <div className="progress-fill" style={{ width: `${(c.value / maxCatSpend) * 100}%`, background: c.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Share of spend</h3>
            <span className="eyebrow">{monthKeyLabel(selectedKey)}</span>
          </div>
          {donutData.length === 0 ? (
            <div className="empty"><p>No spending this month.</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={55} paddingAngle={2}>
                  {donutData.map((c, i) => (
                    <Cell key={i} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => fmt(v, { showCents: false })} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Budget vs actual — full width */}
      {budgetVsActual.length > 0 && (
        <div className="card">
          <div className="card-head">
            <h3>Budget vs actual</h3>
            <span className="eyebrow">{monthKeyLabel(selectedKey)}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            {budgetVsActual.map(r => (
              <div key={r.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 6 }}>
                  <span className="dot" style={{ background: r.color }}></span>
                  <span style={{ flex: 1, fontSize: 'var(--fs-sm)', fontWeight: 500 }}>{r.name}</span>
                  {r.over && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--danger)' }}>⚠ over</span>}
                  <span className="mono" style={{ fontSize: 'var(--fs-sm)', color: r.over ? 'var(--danger)' : 'inherit' }}>
                    {fmt(r.spent, { showCents: false })} / {fmt(r.budgetAmt, { showCents: false })}
                  </span>
                </div>
                <div className="progress" style={{ height: 8 }}>
                  <div
                    className={'progress-fill' + (r.over ? ' over' : '')}
                    style={{ width: `${r.pct}%`, background: r.over ? 'var(--danger)' : r.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
