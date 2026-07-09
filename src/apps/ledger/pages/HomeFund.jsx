import { useState, useMemo, useCallback } from 'react'
import { useRecords } from '../lib/useRecords'
import { fmt, currentMonth } from '../lib/format'
import { seedHomePlan, resetHomePlan } from '../lib/seedHomePlan'
import { monthBounds } from '../lib/period'
import { useIsDesktop } from '../../../lib/viewport'
import { useToast } from '../../../components/Toast'
import Sheet from '../../../components/Sheet'
import * as db from '../../../lib/data'
import { APP, TYPES } from '../constants'

function ProgressRing({ pct, size = 72, color = 'var(--app-accent)', strokeWidth = 8 }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const filled = (Math.min(100, Math.max(0, pct)) / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-sunken)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 300ms ease' }}
      />
    </svg>
  )
}

export default function HomeFund() {
  const isWide = useIsDesktop(1080)
  const toast = useToast()
  const [seeding, setSeeding] = useState(false)
  const [resetSheetOpen, setResetSheetOpen] = useState(false)
  const [seedNote, setSeedNote] = useState(null)

  const { data: plans, refetch: refetchPlans } = useRecords(TYPES.homePlan)
  const { data: debtTargets } = useRecords(TYPES.homeDebtTarget)
  const { data: fuelLines } = useRecords(TYPES.homeFuelLine)
  const { data: phases } = useRecords(TYPES.homePhase)
  const { data: milestones, update: updateMilestone } = useRecords(TYPES.homeMilestone)
  const { data: checklistItems } = useRecords(TYPES.homeChecklistItem)
  const { data: checklistStates, update: updateChecklistState } = useRecords(TYPES.homeChecklistState)
  const { data: debts } = useRecords(TYPES.debt)
  const { data: goals } = useRecords(TYPES.goal)
  const { data: transactions } = useRecords(TYPES.transaction)

  const plan = plans[0] || null
  const checklistState = checklistStates[0] || null

  const { year, month } = currentMonth()
  const { startISO: monthStart, endISO: monthEnd } = monthBounds(`${year}-${String(month).padStart(2, '0')}`)

  // ── Feature A: plan overview ─────────────────────────────────────
  const cardDebtRemaining = useMemo(() => {
    const creditCards = debts.filter(d => !d.paid_off)
    return creditCards.reduce((s, d) => s + Number(d.current_balance || 0), 0)
  }, [debts])

  const houseFundGoal = useMemo(() =>
    goals.find(g => g.name?.toLowerCase().includes('house') || g.name?.toLowerCase().includes('down')),
    [goals]
  )

  const activePhase = useMemo(() =>
    [...phases].sort((a, b) => a.order - b.order).find(p => p.status === 'active'),
    [phases]
  )

  const mortgageReadyPct = useMemo(() => {
    if (!plan) return 0
    const totalTarget = Number(plan.home_price_target || 0) * 0.2
    const fundBuilt = Number(houseFundGoal?.current_amount || 0)
    const debtPaid = debts.reduce((s, d) => s + Math.max(0, Number(d.starting_balance || 0) - Number(d.current_balance || 0)), 0)
    return totalTarget > 0 ? Math.min(100, ((fundBuilt + debtPaid) / totalTarget) * 100) : 0
  }, [plan, houseFundGoal, debts])

  // ── Feature B: debt tracker ──────────────────────────────────────
  const trackedDebts = useMemo(() => {
    return debtTargets
      .map(dt => {
        const debt = debts.find(d => d.id === dt.debt_id)
        if (!debt) return null
        return { ...dt, debt }
      })
      .filter(Boolean)
      .sort((a, b) => a.priority - b.priority)
  }, [debtTargets, debts])

  const activeTarget = useMemo(() =>
    trackedDebts.find(dt => !dt.debt.paid_off),
    [trackedDebts]
  )

  // ── Feature D: fuel plan ─────────────────────────────────────────
  const fuelActuals = useMemo(() => {
    return fuelLines.map(line => {
      let actual = 0
      if (line.track_category) {
        actual = transactions
          .filter(t => t.category_id === line.track_category && Number(t.amount) < 0 && t.date >= monthStart && t.date < monthEnd)
          .reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
      }
      const target = Number(line.monthly_target || 0)
      const over = actual > target
      const remaining = target - actual
      const pct = target > 0 ? Math.min(110, (actual / target) * 100) : (actual > 0 ? 100 : 0)
      return { ...line, actual, target, over, remaining, pct }
    })
  }, [fuelLines, transactions, monthStart, monthEnd])

  // ── Feature G: checklist ─────────────────────────────────────────
  const paydayItems = useMemo(() =>
    [...checklistItems.filter(i => i.group === 'payday')].sort((a, b) => a.order - b.order),
    [checklistItems]
  )
  const monthlyItems = useMemo(() =>
    [...checklistItems.filter(i => i.group === 'monthly')].sort((a, b) => a.order - b.order),
    [checklistItems]
  )

  const currentMonthKey = `${year}-${String(month).padStart(2, '0')}`

  const isChecked = useCallback((item) => {
    if (!checklistState) return false
    const state = checklistState[item.group] || {}
    const stored = state[item.id]
    if (!stored) return false
    if (item.group === 'monthly') return stored === currentMonthKey
    // payday: compare to current month key as approximation
    return stored === currentMonthKey
  }, [checklistState, currentMonthKey])

  const toggleChecklistItem = async (item) => {
    if (!checklistState) return
    const currentVal = isChecked(item)
    const newState = {
      ...checklistState,
      [item.group]: {
        ...(checklistState[item.group] || {}),
        [item.id]: currentVal ? null : currentMonthKey,
      }
    }
    await updateChecklistState(checklistState.id, newState)
  }

  // ── Seeding ──────────────────────────────────────────────────────
  const handleSeed = async () => {
    setSeeding(true)
    try {
      const result = await seedHomePlan()
      if (result.skipped?.length > 0) {
        setSeedNote(`${result.skipped.length} debt target(s) couldn't be matched by APR + balance — add them manually.`)
      }
      await refetchPlans()
    } catch (e) {
      console.error(e)
    }
    setSeeding(false)
  }

  // ── Reset ────────────────────────────────────────────────────────
  const handleReset = async () => {
    const result = await resetHomePlan()
    setResetSheetOpen(false)
    await refetchPlans()
    toast.show('Home Fund plan removed.', {
      actionLabel: 'Undo',
      onAction: async () => {
        for (const id of result.removed) {
          await db.restore(id)
        }
        await refetchPlans()
      }
    })
  }

  // ── Milestone actual edit ────────────────────────────────────────
  const setMilestoneActual = async (milestoneId, key, value) => {
    const m = milestones.find(x => x.id === milestoneId)
    if (!m) return
    await updateMilestone(milestoneId, { actual: { ...(m.actual || {}), [key]: value } })
  }

  // ── Empty state ──────────────────────────────────────────────────
  if (!plan) {
    return (
      <div className="ledger-page">
        <div className="page-header">
          <div>
            <p className="eyebrow">Home buying</p>
            <h1>Home Fund</h1>
          </div>
        </div>
        <div className="card">
          <div className="empty">
            <div className="big">🏡</div>
            <h3>No plan yet</h3>
            <p style={{ marginBottom: '1.25rem' }}>Set up your plan to track debt payoff, the down payment fund, monthly fuel, phases, milestones, and your payday checklist — all in one place.</p>
            <button className="btn" onClick={handleSeed} disabled={seeding}>
              {seeding ? 'Setting up…' : 'Set up the plan'}
            </button>
            {seedNote && <p style={{ marginTop: '0.75rem', fontSize: 'var(--fs-sm)', color: 'var(--warn)' }}>{seedNote}</p>}
          </div>
        </div>
      </div>
    )
  }

  // ── Sorted content ───────────────────────────────────────────────
  const sortedPhases = [...phases].sort((a, b) => a.order - b.order)
  const sortedMilestones = [...milestones].sort((a, b) => a.order - b.order)

  // ── Feature A card ───────────────────────────────────────────────
  const featureA = (
    <div className="card hf-card-a">
      <div className="card-head">
        <h3>The plan to buy</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => setResetSheetOpen(true)} style={{ color: 'var(--danger)' }}>Reset plan</button>
      </div>
      <div className="grid-4" style={{ marginBottom: 'var(--sp-4)' }}>
        <div>
          <div className="stat-label">Card debt remaining</div>
          <div className="stat-value" style={{ fontSize: 'var(--fs-2xl)' }}>{fmt(cardDebtRemaining, { showCents: false })}</div>
        </div>
        <div>
          <div className="stat-label">House fund</div>
          <div className="stat-value" style={{ fontSize: 'var(--fs-2xl)' }}>
            {houseFundGoal ? fmt(houseFundGoal.current_amount, { showCents: false }) : '—'}
          </div>
          <div className="stat-sub">{houseFundGoal ? `of ${fmt(houseFundGoal.target_amount || 0, { showCents: false })}` : 'Add a goal'}</div>
        </div>
        <div>
          <div className="stat-label">Current phase</div>
          <div className="stat-value" style={{ fontSize: 'var(--fs-xl)', fontFamily: 'var(--font-display)' }}>
            {activePhase?.title || '—'}
          </div>
        </div>
        <div>
          <div className="stat-label">Target window</div>
          <div className="stat-value" style={{ fontSize: 'var(--fs-xl)', fontFamily: 'var(--font-display)' }}>
            {plan.buy_by_date ? new Date(plan.buy_by_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-xs)', color: 'var(--text-soft)' }}>
        <span>Mortgage-ready progress</span>
        <span className="mono">{mortgageReadyPct.toFixed(0)}%</span>
      </div>
      <div className="progress" style={{ height: 10 }}>
        <div className="progress-fill" style={{ width: `${mortgageReadyPct}%` }} />
      </div>
    </div>
  )

  // ── Feature B: debt tracker ───────────────────────────────────────
  const featureB = (
    <div className="card">
      <div className="card-head"><h3>Debt payoff tracker</h3><span className="eyebrow">{trackedDebts.length} debts</span></div>
      {trackedDebts.length === 0 ? (
        <div className="empty"><p>No debts in the plan. Add debt targets above or in Snowball.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {trackedDebts.map(dt => {
            const d = dt.debt
            const isActive = dt.id === activeTarget?.id
            const paidPct = d.starting_balance > 0
              ? Math.min(100, ((Number(d.starting_balance) - Number(d.current_balance)) / Number(d.starting_balance)) * 100)
              : 0
            return (
              <div key={dt.id} className={'hf-debt-row' + (isActive ? ' hf-debt-active' : '')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--sp-2)' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-base)' }}>{d.name}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-soft)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                      {(Number(d.apr) * 100).toFixed(2)}% APR · min {fmt(Number(d.min_payment) || 0, { showCents: false })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ fontSize: 'var(--fs-lg)', fontWeight: 'var(--fw-med)' }}>{fmt(d.current_balance, { showCents: false })}</div>
                    {d.paid_off
                      ? <span className="pill pill-paid" style={{ marginTop: 4 }}>Paid</span>
                      : isActive
                        ? <span className="pill hf-pill-active" style={{ marginTop: 4 }}>Active target</span>
                        : dt.strategy === 'minimums_only'
                          ? <span className="pill" style={{ marginTop: 4 }}>Minimums only</span>
                          : <span className="pill" style={{ marginTop: 4 }}>Queued</span>}
                  </div>
                </div>
                <div className="progress">
                  <div className="progress-fill" style={{ width: `${paidPct}%`, background: isActive ? 'var(--app-accent)' : 'var(--text-soft)' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  // ── Feature C: down payment fund ─────────────────────────────────
  const featureC = (
    <div className="card">
      <div className="card-head"><h3>Down payment fund</h3></div>
      {!houseFundGoal ? (
        <div className="empty"><p>Add a goal named "House Downpayment" to track the fund here.</p></div>
      ) : (() => {
        const pct = houseFundGoal.target_amount
          ? Math.min(100, (Number(houseFundGoal.current_amount) / Number(houseFundGoal.target_amount)) * 100) : 0
        const remaining = Number(houseFundGoal.target_amount || 0) - Number(houseFundGoal.current_amount || 0)
        const monthsToGo = houseFundGoal.monthly_contribution > 0 && remaining > 0
          ? Math.ceil(remaining / Number(houseFundGoal.monthly_contribution)) : null
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
            <ProgressRing pct={pct} size={80} color="var(--app-accent)" />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-2xl)', fontWeight: 600 }}>{fmt(houseFundGoal.current_amount, { showCents: false })}</div>
              <div style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-sm)' }}>of {fmt(houseFundGoal.target_amount || 0, { showCents: false })} · {pct.toFixed(0)}%</div>
              {houseFundGoal.monthly_contribution > 0 && (
                <div style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-sm)' }}>{fmt(houseFundGoal.monthly_contribution, { showCents: false })}/mo</div>
              )}
              {monthsToGo && (
                <div style={{ marginTop: 'var(--sp-1)', fontSize: 'var(--fs-xs)', color: 'var(--text-soft)', fontStyle: 'italic' }}>
                  ~{monthsToGo} mo at current pace — estimate
                </div>
              )}
              {plan.buy_by_date && (
                <div style={{ marginTop: 'var(--sp-1)', fontSize: 'var(--fs-xs)', color: 'var(--text-soft)' }}>
                  Target: combine with reserves at closing.
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )

  // ── Feature D: fuel plan ─────────────────────────────────────────
  const featureD = (
    <div className="card">
      <div className="card-head"><h3>Monthly fuel plan</h3><span className="eyebrow">this month</span></div>
      {fuelActuals.length === 0 ? (
        <div className="empty"><p>Fuel lines will appear here after setup.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {fuelActuals.map(line => (
            <div key={line.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                  {line.over && <span style={{ fontSize: '0.9rem' }}>⚠</span>}
                  <span style={{ fontWeight: 500, fontSize: 'var(--fs-sm)' }}>{line.label}</span>
                </div>
                <span className="mono" style={{ fontSize: 'var(--fs-sm)', color: line.over ? 'var(--danger)' : line.remaining > 0 ? 'var(--ok)' : 'var(--text-soft)' }}>
                  {line.over
                    ? `over $${Math.abs(line.remaining).toFixed(0)}`
                    : `$${line.remaining.toFixed(0)} left`}
                </span>
              </div>
              <div className="progress">
                <div
                  className={'progress-fill' + (line.over ? ' over' : '')}
                  style={{ width: `${line.pct}%`, background: line.over ? 'var(--danger)' : 'var(--ok)' }}
                />
              </div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-soft)', marginTop: 3 }}>
                Spent {fmt(line.actual, { showCents: false })} of {fmt(line.target, { showCents: false })} cap
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ── Feature E: phase timeline ─────────────────────────────────────
  const featureE = (
    <div className="card">
      <div className="card-head"><h3>Phase timeline</h3></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)', position: 'relative' }}>
        {sortedPhases.map((p, i) => {
          const isActive = p.status === 'active'
          const isDone = p.status === 'done'
          return (
            <div key={p.id} style={{ display: 'flex', gap: 'var(--sp-3)', position: 'relative' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: isActive ? 'var(--app-accent)' : isDone ? 'var(--ok)' : 'var(--bg-sunken)', border: `2px solid ${isActive ? 'var(--app-accent)' : isDone ? 'var(--ok)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: isActive || isDone ? '#fff' : 'var(--text-soft)', fontWeight: 600 }}>
                  {isDone ? '✓' : i + 1}
                </div>
                {i < sortedPhases.length - 1 && (
                  <div style={{ width: 2, flex: 1, minHeight: 20, background: 'var(--border)', margin: '4px 0' }} />
                )}
              </div>
              <div style={{ paddingBottom: i < sortedPhases.length - 1 ? 'var(--sp-3)' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 2 }}>
                  <span style={{ fontWeight: 'var(--fw-title)', color: isActive ? 'var(--app-accent)' : 'var(--text)' }}>{p.title}</span>
                  <span className="pill" style={isActive ? { background: 'var(--app-soft)', color: 'var(--app-accent)', border: '1px solid var(--app-accent)' } : {}}>{p.chip}</span>
                </div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-soft)', marginBottom: 4 }}>{p.range_label}</div>
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-soft)', lineHeight: 1.5 }}>{p.description}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── Feature F: milestone schedule ────────────────────────────────
  const featureF = (
    <div className="card">
      <div className="card-head">
        <h3>Milestone schedule</h3>
        <span className="eyebrow">Actual column is editable</span>
      </div>
      {sortedMilestones.length === 0 ? (
        <div className="empty"><p>No milestones yet.</p></div>
      ) : isWide ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="ledger">
            <thead>
              <tr>
                <th>Checkpoint</th>
                <th style={{ textAlign: 'right' }}>House fund (projected)</th>
                <th style={{ textAlign: 'right' }}>Actual</th>
              </tr>
            </thead>
            <tbody>
              {sortedMilestones.map(m => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 500 }}>{m.checkpoint}</td>
                  <td className="num" style={{ color: 'var(--text-soft)' }}>{m.projected?.house_fund != null ? fmt(m.projected.house_fund, { showCents: false }) : '—'}</td>
                  <td className="num">
                    <input
                      type="number"
                      step="100"
                      className="input mono"
                      style={{ width: 110, padding: '0.25rem 0.5rem', fontSize: 13, textAlign: 'right' }}
                      value={m.actual?.house_fund ?? ''}
                      placeholder="—"
                      onChange={(e) => setMilestoneActual(m.id, 'house_fund', parseFloat(e.target.value) || null)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          {sortedMilestones.map(m => (
            <div key={m.id} className="card" style={{ padding: 'var(--sp-3)', marginBottom: 0 }}>
              <div style={{ fontWeight: 500, marginBottom: 'var(--sp-2)' }}>{m.checkpoint}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-sm)' }}>
                <span style={{ color: 'var(--text-soft)' }}>Projected</span>
                <span className="mono">{m.projected?.house_fund != null ? fmt(m.projected.house_fund, { showCents: false }) : '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-2)' }}>
                <span style={{ color: 'var(--text-soft)' }}>Actual</span>
                <input
                  type="number"
                  step="100"
                  className="input mono"
                  style={{ width: 100, padding: '0.25rem 0.5rem', fontSize: 13, textAlign: 'right' }}
                  value={m.actual?.house_fund ?? ''}
                  placeholder="—"
                  onChange={(e) => setMilestoneActual(m.id, 'house_fund', parseFloat(e.target.value) || null)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ── Feature G: checklist ─────────────────────────────────────────
  const ChecklistGroup = ({ title, items }) => (
    <div style={{ marginBottom: 'var(--sp-4)' }}>
      <div className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {items.map(item => {
          const checked = isChecked(item)
          return (
            <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', minHeight: 44, cursor: 'pointer', opacity: checked ? 0.6 : 1 }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleChecklistItem(item)}
                style={{ width: 20, height: 20, accentColor: 'var(--accent)', flexShrink: 0 }}
              />
              <span style={{ textDecoration: checked ? 'line-through' : 'none', fontSize: 'var(--fs-sm)' }}>{item.label}</span>
            </label>
          )
        })}
      </div>
    </div>
  )

  const featureG = (
    <div className="card">
      <div className="card-head"><h3>Payday &amp; monthly checklist</h3></div>
      {checklistItems.length === 0 ? (
        <div className="empty"><p>Checklist items will appear here after setup.</p></div>
      ) : (
        <>
          {paydayItems.length > 0 && <ChecklistGroup title="Payday" items={paydayItems} />}
          {monthlyItems.length > 0 && <ChecklistGroup title="Monthly" items={monthlyItems} />}
        </>
      )}
    </div>
  )

  // ── Feature H: ground rules ───────────────────────────────────────
  const featureH = (
    <div className="card" style={{ background: 'var(--bg-elevated)', borderStyle: 'dashed' }}>
      <div className="card-head"><h3>Ground rules</h3></div>
      <ol style={{ margin: 0, padding: '0 0 0 1.25rem', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {[
          "The grocery cap is the guardrail — if we’re over, cut dining before anything else.",
          'Any “found money” (bonus, refund, gift) goes to the active debt target first.',
          'One eating-out splurge per week max during Sprint phase.',
          "Don’t open new credit during Buy phase — no new accounts 6 months before applying.",
          'Subscriptions audit every quarter — cut anything unused.',
          "Emergency floor stays at floor at all times; don’t raid it for wants.",
        ].map((rule, i) => (
          <li key={i} style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-soft)', lineHeight: 1.5 }}>{rule}</li>
        ))}
      </ol>
    </div>
  )

  return (
    <div className="ledger-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Home buying</p>
          <h1>Home Fund</h1>
        </div>
      </div>

      {seedNote && (
        <div className="card" style={{ background: 'var(--warn-soft)', borderColor: 'var(--warn)', marginBottom: 'var(--sp-3)' }}>
          <p style={{ margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--warn)' }}>⚠ {seedNote}</p>
        </div>
      )}

      {isWide ? (
        <div className="hf-grid">
          <div className="hf-full">{featureA}</div>
          <div>
            {featureB}
            {featureG}
          </div>
          <div>
            {featureC}
            {featureD}
            {featureE}
          </div>
          <div className="hf-full">{featureF}</div>
          <div>{featureH}</div>
        </div>
      ) : (
        <>
          {featureA}
          {featureB}
          {featureC}
          {featureD}
          {featureE}
          {featureF}
          {featureG}
          {featureH}
        </>
      )}

      <Sheet open={resetSheetOpen} onClose={() => setResetSheetOpen(false)} title="Reset this plan?">
        <div style={{ padding: 'var(--sp-4)' }}>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-soft)', marginBottom: 'var(--sp-4)' }}>
            This removes all Home Fund plan records — phases, milestones, fuel lines, checklist, and debt targets.
            It does <strong>not</strong> delete your actual debts, goals, or transactions. The plan can be re-seeded, but your milestone actuals will be lost.
          </p>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setResetSheetOpen(false)}>Keep the plan</button>
            <button className="btn" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleReset}>
              Delete the plan
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  )
}
