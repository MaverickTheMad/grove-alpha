import { useMemo, useState } from 'react'
import { useRecords } from '../lib/useRecords'
import { fmt } from '../lib/format'
import { currentMonthKey, monthKeyLabel, monthBounds, stepMonthKey, monthKeysFrom } from '../lib/period'
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell } from 'recharts'
import { useIsDesktop } from '../../../lib/viewport'

const TOOLTIP_STYLE = { background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font-mono)' }

export default function Insights() {
  const { data: allTx } = useRecords('transaction')
  const { data: categories } = useRecords('category', { orderBy: 'name' })
  const { data: monthlyBudgets } = useRecords('monthly_budget')
  const isWide = useIsDesktop(1080)

  const nowKey = currentMonthKey()
  const [selectedKey, setSelectedKey] = useState(nowKey)
  const [yearMode, setYearMode] = useState(false)

  const monthsWithData = useMemo(() => monthKeysFrom(allTx), [allTx])
  const selectedYear = parseInt(selectedKey.split('-')[0], 10)

  const cashflowYear = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      const key = `${selectedYear}-${String(m).padStart(2, '0')}`
      const { startISO, endISO } = monthBounds(key)
      const isFuture = key > nowKey
      if (isFuture) return { key, short: ['J','F','M','A','M','J','J','A','S','O','N','D'][i], net: null, isFuture: true }
      const txns = allTx.filter(t => t.date >= startISO && t.date < endISO)
      const income = txns.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0)
      const expense = txns.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
      return { key, short: ['J','F','M','A','M','J','J','A','S','O','N','D'][i], net: Math.round(income - expense), isFuture: false }
    })
  }, [allTx, selectedYear, nowKey])

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

  const kpis = [
    { label: 'Income', value: fmt(kpi.income, { showCents: false }), valueColor: 'var(--ok)', subText: 'this period', subArrow: '', subColor: 'var(--text-soft)' },
    { label: 'Spending', value: fmt(kpi.expense, { showCents: false }), valueColor: 'var(--text)', subText: kpi.momDelta !== null ? `${kpi.momDelta > 0 ? '▲' : '▼'} ${Math.abs(kpi.momDelta).toFixed(0)}% vs last month` : 'vs last month', subArrow: '', subColor: kpi.momDelta !== null ? (kpi.momDelta <= 0 ? 'var(--ok)' : 'var(--danger)') : 'var(--text-soft)' },
    { label: 'Net', value: fmt(kpi.net, { showCents: false, signed: true }), valueColor: kpi.net >= 0 ? 'var(--ok)' : 'var(--danger)', subText: kpi.net >= 0 ? 'surplus' : 'deficit', subArrow: '', subColor: 'var(--text-soft)' },
    { label: 'Transactions', value: selTx.length, valueColor: 'var(--text)', subText: monthKeyLabel(selectedKey), subArrow: '', subColor: 'var(--text-soft)' },
  ]

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
  const totalSpend = catSpend.reduce((s, c) => s + c.value, 0)
  const topCat = catSpend[0]

  const budgetVsActual = useMemo(() => {
    return categories
      .filter(c => c.tracked_in_budget)
      .map(c => {
        const budget = monthlyBudgets.find(b => b.category_id === c.id && b.period_start?.startsWith(selectedKey))
        const budgetAmt = Number(budget?.amount || 0)
        const spent = selTx.filter(t => t.category_id === c.id && Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
        const over = budgetAmt > 0 && spent > budgetAmt
        const pct = budgetAmt > 0 ? Math.min(110, (spent / budgetAmt) * 100) : (spent > 0 ? 100 : 0)
        const remaining = budgetAmt - spent
        return { ...c, budgetAmt, spent, over, pct, remaining }
      })
      .filter(c => c.budgetAmt > 0 || c.spent > 0)
  }, [monthlyBudgets, selTx, categories, selectedKey])

  // Donut as conic-gradient
  const donutGradient = useMemo(() => {
    if (catSpend.length === 0 || totalSpend === 0) return null
    let cumPct = 0
    const stops = []
    for (const c of catSpend) {
      const pct = (c.value / totalSpend) * 100
      stops.push(`${c.color} ${cumPct.toFixed(1)}% ${(cumPct + pct).toFixed(1)}%`)
      cumPct += pct
    }
    return `conic-gradient(${stops.join(', ')})`
  }, [catSpend, totalSpend])

  const canGoNext = stepMonthKey(selectedKey, 1) <= nowKey
  const availableMonths = [...monthsWithData].reverse()

  const cardStyle = { background: 'var(--bg-paper)', border: '1px solid var(--border)', borderRadius: 16 }
  const h3Style = { fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-lg)', color: 'var(--text)', margin: 0 }
  const segActive = { background: 'var(--bg-elevated)', color: 'var(--text)', border: 'none', boxShadow: 'none' }
  const segInactive = { background: 'transparent', color: 'var(--text-soft)', border: 'none', boxShadow: 'none' }

  return (
    <div className="ledger-page" style={{ paddingTop: isWide ? 'var(--sp-5)' : undefined }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Head + toggle */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: isWide ? 'var(--fs-2xl)' : 'var(--fs-xl)', color: 'var(--text)', margin: 0 }}>Insights</h2>
            <p style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-sm)', margin: '4px 0 0' }}>Where the money went, month by month</p>
          </div>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-sunken)', padding: 4, borderRadius: 999, border: '1px solid var(--border)' }}>
            <button onClick={() => setYearMode(false)} style={{ ...(!yearMode ? segActive : segInactive), fontFamily: 'inherit', fontWeight: 500, fontSize: 'var(--fs-sm)', padding: '6px 15px', borderRadius: 999, cursor: 'pointer' }}>Month</button>
            <button onClick={() => setYearMode(true)} style={{ ...(yearMode ? segActive : segInactive), fontFamily: 'inherit', fontWeight: 500, fontSize: 'var(--fs-sm)', padding: '6px 15px', borderRadius: 999, cursor: 'pointer' }}>Year</button>
          </div>
        </div>

        {/* Scrubber */}
        <div style={{ ...cardStyle, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setSelectedKey(stepMonthKey(selectedKey, -1))} style={{ width: 40, height: 40, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', fontSize: 18, cursor: 'pointer' }}>‹</button>
            <div style={{ minWidth: isWide ? 190 : 120, textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: isWide ? 'var(--fs-xl)' : 'var(--fs-lg)', color: 'var(--text)' }}>
              {monthKeyLabel(selectedKey, { long: true })}
            </div>
            <button onClick={() => setSelectedKey(stepMonthKey(selectedKey, 1))} disabled={!canGoNext} style={{ width: 40, height: 40, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', fontSize: 18, cursor: 'pointer', opacity: canGoNext ? 1 : 0.4 }}>›</button>
          </div>
          {isWide && availableMonths.length > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-soft)', fontSize: 'var(--fs-sm)' }}>
              Jump to
              <select value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)} style={{ fontFamily: 'inherit', fontSize: 'var(--fs-sm)', background: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}>
                {availableMonths.map(k => <option key={k} value={k}>{monthKeyLabel(k, { long: true })}</option>)}
              </select>
            </label>
          )}
        </div>

        {/* KPI 4-up */}
        <div style={{ display: 'grid', gridTemplateColumns: isWide ? 'repeat(4,1fr)' : 'repeat(2,1fr)', gap: 12 }}>
          {kpis.map((k, i) => (
            <div key={i} style={{ ...cardStyle, padding: '15px 17px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span style={{ fontWeight: 500, fontSize: 'var(--fs-sm)', color: 'var(--text-soft)' }}>{k.label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: isWide ? 'var(--fs-2xl)' : 'var(--fs-xl)', fontWeight: 500, lineHeight: 1, color: k.valueColor }}>{k.value}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 'var(--fs-sm)', color: k.subColor }}>{k.subText}</span>
            </div>
          ))}
        </div>

        {/* Cashflow chart */}
        <div style={{ ...cardStyle, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <h3 style={h3Style}>Cashflow · net by month</h3>
            <span style={{ color: 'var(--text-soft)', fontSize: 11 }}>selected month in {isWide ? 'accent' : ''} · future months gapped</span>
          </div>
          <div style={{ height: isWide ? 180 : 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashflowYear} margin={{ top: 6, right: 0, bottom: 0, left: 0 }} barCategoryGap="30%">
                <XAxis dataKey="short" stroke="var(--text-soft)" style={{ fontSize: isWide ? 10 : 8, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => v == null ? '—' : fmt(v, { showCents: false })} cursor={{ fill: 'color-mix(in srgb, var(--app-accent) 8%, transparent)' }} />
                <Bar dataKey="net" radius={[4, 4, 2, 2]}>
                  {cashflowYear.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.isFuture ? 'transparent' : entry.key === selectedKey ? 'var(--app-accent)' : 'var(--bg-elevated)'}
                      stroke={entry.isFuture ? 'var(--border)' : 'none'}
                      strokeDasharray={entry.isFuture ? '4 2' : undefined}
                      style={{ cursor: 'pointer' }}
                      onClick={() => !entry.isFuture && setSelectedKey(entry.key)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category bars + donut */}
        <div style={{ display: 'flex', gap: 16, flexDirection: isWide ? 'row' : 'column', alignItems: 'stretch' }}>
          {/* Category bars */}
          <div style={{ ...cardStyle, padding: '18px 20px', flex: isWide ? '1.35' : undefined }}>
            <h3 style={{ ...h3Style, marginBottom: 10 }}>Spending by category</h3>
            {catSpend.length === 0 ? (
              <p style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-sm)' }}>No spending recorded for {monthKeyLabel(selectedKey, { long: true })}.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {catSpend.map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '7px 0' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0 }} />
                    <span style={{ width: isWide ? 104 : 74, flexShrink: 0, color: 'var(--text)', fontSize: isWide ? 'var(--fs-sm)' : 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    <div style={{ flex: 1, height: 10, background: 'var(--bg-sunken)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(c.value / maxCatSpend) * 100}%`, background: c.color, borderRadius: 999 }} />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', color: 'var(--text)', width: isWide ? 80 : 60, textAlign: 'right' }}>{fmt(c.value, { showCents: false })}</span>
                    {isWide && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: c.delta > 0 ? 'var(--danger)' : c.delta < 0 ? 'var(--ok)' : 'var(--text-soft)', width: 54, textAlign: 'right' }}>
                        {c.delta !== 0 ? `${c.delta > 0 ? '▲' : '▼'} ${fmt(Math.abs(c.delta), { showCents: false })}` : '—'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Donut */}
          <div style={{ ...cardStyle, padding: '18px 20px', flex: isWide ? '1' : undefined, display: 'flex', flexDirection: 'column', gap: 14, alignItems: isWide ? undefined : 'center' }}>
            <h3 style={{ ...h3Style, alignSelf: 'flex-start' }}>Share of spend</h3>
            {donutGradient ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <div style={{ position: 'relative', width: isWide ? 172 : 150, height: isWide ? 172 : 150, borderRadius: '50%', background: donutGradient }}>
                    <div style={{ position: 'absolute', inset: isWide ? 26 : 23, borderRadius: '50%', background: 'var(--bg-paper)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <span style={{ color: 'var(--text-soft)', fontSize: 11 }}>Spent</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: isWide ? 'var(--fs-lg)' : 'var(--fs-base)', color: 'var(--text)' }}>{fmt(totalSpend, { showCents: false })}</span>
                      {topCat && isWide && <span style={{ color: 'var(--text-soft)', fontSize: 10 }}>{topCat.name} · {Math.round((topCat.value / totalSpend) * 100)}%</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 14px', alignSelf: 'stretch' }}>
                  {catSpend.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-soft)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{Math.round((c.value / totalSpend) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-sm)' }}>No spending this month.</p>
            )}
          </div>
        </div>

        {/* Budget vs actual */}
        {budgetVsActual.length > 0 && (
          <div style={{ ...cardStyle, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 style={h3Style}>Budget vs actual</h3>
              <span style={{ color: 'var(--text-soft)', fontSize: 11 }}>over-budget flagged ⚠</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {budgetVsActual.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                  <span style={{ width: isWide ? 104 : 80, flexShrink: 0, color: 'var(--text)', fontSize: 'var(--fs-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                  <div style={{ flex: 1, height: 12, background: 'var(--bg-sunken)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${r.pct}%`, background: r.over ? 'var(--danger)' : r.color, borderRadius: 999 }} />
                  </div>
                  {isWide ? (
                    <>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', color: 'var(--text)', width: 158, textAlign: 'right' }}>
                        {fmt(r.spent, { showCents: false })} / {fmt(r.budgetAmt, { showCents: false })}
                      </span>
                      <span style={{ fontSize: 11, width: 128, textAlign: 'right', color: r.over ? 'var(--danger)' : 'var(--text-soft)' }}>
                        {r.over ? `⚠ ${fmt(r.spent - r.budgetAmt, { showCents: false })} over` : `${fmt(r.remaining, { showCents: false })} left`}
                      </span>
                    </>
                  ) : (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: r.over ? 'var(--danger)' : 'var(--text-soft)', flexShrink: 0 }}>
                      {r.over ? '⚠ over' : `${Math.round(r.pct)}%`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
