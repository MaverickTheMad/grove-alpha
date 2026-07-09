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

const IconTransfer = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v13M6 12l6 6 6-6" /><path d="M3 20h18" />
  </svg>
)
const IconHouse = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 11 L12 4 L20 11" /><path d="M6 10 V20 H18 V10" />
  </svg>
)
const IconActiveDot = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" fill="currentColor" />
  </svg>
)
const IconClock = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
  </svg>
)
const IconMinus = () => (
  <svg width="11" height="7" viewBox="0 0 24 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6" />
  </svg>
)
const IconCheckSmall = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12l5 5L20 6" />
  </svg>
)
const IconCheckbox = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0B0F09" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12l5 5L20 6" />
  </svg>
)
const IconWarn = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 9v4" /><path d="M12 17h.01" />
    <path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
  </svg>
)

const MILESTONE_KEYS   = ['citi', 'cap_one_sm', 'cap_one_big', 'house_fund']
const MILESTONE_LABELS = { citi: 'Citi', cap_one_sm: 'CapOne sm', cap_one_big: 'CapOne big', house_fund: 'House fund' }

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

  const cardDebtRemaining = useMemo(() =>
    debts.filter(d => !d.paid_off).reduce((s, d) => s + Number(d.current_balance || 0), 0),
    [debts]
  )

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

  const trackedDebts = useMemo(() => debtTargets
    .map(dt => { const debt = debts.find(d => d.id === dt.debt_id); return debt ? { ...dt, debt } : null })
    .filter(Boolean)
    .sort((a, b) => a.priority - b.priority),
    [debtTargets, debts]
  )

  const activeTarget = useMemo(() => trackedDebts.find(dt => !dt.debt.paid_off), [trackedDebts])

  const fuelActuals = useMemo(() => fuelLines.map(line => {
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
  }), [fuelLines, transactions, monthStart, monthEnd])

  const shoppingCapLine = useMemo(() =>
    fuelActuals.find(l => l.is_cap || l.label?.toLowerCase().includes('shop') || l.label?.toLowerCase().includes('cap')),
    [fuelActuals]
  )
  const otherFuelLines = useMemo(() => fuelActuals.filter(l => l !== shoppingCapLine), [fuelActuals, shoppingCapLine])
  const totalFuel = useMemo(() => fuelLines.reduce((s, l) => s + Number(l.monthly_target || 0), 0), [fuelLines])

  const paydayItems  = useMemo(() => [...checklistItems.filter(i => i.group === 'payday')].sort((a, b) => a.order - b.order), [checklistItems])
  const monthlyItems = useMemo(() => [...checklistItems.filter(i => i.group === 'monthly')].sort((a, b) => a.order - b.order), [checklistItems])
  const currentMonthKey = `${year}-${String(month).padStart(2, '0')}`

  const isChecked = useCallback((item) => {
    if (!checklistState) return false
    return (checklistState[item.group] || {})[item.id] === currentMonthKey
  }, [checklistState, currentMonthKey])

  const toggleChecklistItem = async (item) => {
    if (!checklistState) return
    const newState = {
      ...checklistState,
      [item.group]: { ...(checklistState[item.group] || {}), [item.id]: isChecked(item) ? null : currentMonthKey }
    }
    await updateChecklistState(checklistState.id, newState)
  }

  const sortedPhases     = useMemo(() => [...phases].sort((a, b) => a.order - b.order), [phases])
  const sortedMilestones = useMemo(() => [...milestones].sort((a, b) => a.order - b.order), [milestones])

  const planMonthNum = useMemo(() => {
    if (!plan?.created_at) return 1
    const start = new Date(plan.created_at)
    const now = new Date()
    return Math.max(1, (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth() + 1)
  }, [plan])

  const totalMonths = useMemo(() => {
    for (const p of [...sortedPhases].reverse()) {
      const m = p.range_label?.match(/(\d+)\s*$/)
      if (m) return parseInt(m[1])
    }
    return sortedMilestones.length || null
  }, [sortedPhases, sortedMilestones])

  const currentMonthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const result = await seedHomePlan()
      if (result.skipped?.length > 0) {
        setSeedNote(`${result.skipped.length} debt target(s) couldn't be matched by APR + balance — add them manually.`)
      }
      await refetchPlans()
    } catch (e) { console.error(e) }
    setSeeding(false)
  }

  const handleReset = async () => {
    const result = await resetHomePlan()
    setResetSheetOpen(false)
    await refetchPlans()
    toast.show('Home Fund plan removed.', {
      actionLabel: 'Undo',
      onAction: async () => {
        for (const id of result.removed) await db.restore(id)
        await refetchPlans()
      }
    })
  }

  const setMilestoneActual = async (milestoneId, key, value) => {
    const m = milestones.find(x => x.id === milestoneId)
    if (!m) return
    await updateMilestone(milestoneId, { actual: { ...(m.actual || {}), [key]: value } })
  }

  // ── Empty state ──────────────────────────────────────────────────
  if (!plan) {
    return (
      <div className="ledger-page">
        <div className="card" style={{ padding: '30px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 18 }}>
          <div style={{ width: 58, height: 58, borderRadius: 16, background: 'var(--app-weak)', color: 'var(--app-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconHouse />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-lg)', color: 'var(--text)', margin: 0 }}>No plan yet</h3>
            <p style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-sm)', margin: 0, lineHeight: 1.5, maxWidth: '32ch' }}>
              Set your target home price, buy-by date, and monthly fuel. We'll map your cards, phases, and a milestone schedule you can check off on payday.
            </p>
          </div>
          <button className="btn" onClick={handleSeed} disabled={seeding} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
            {seeding ? 'Setting up…' : 'Set up the plan'}
          </button>
          {seedNote && <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--warn)', margin: 0 }}>{seedNote}</p>}
        </div>
      </div>
    )
  }

  // ── A: overview strip ─────────────────────────────────────────────
  const featureA = (
    <div className="card" style={{ padding: isWide ? '18px 20px' : 15 }}>
      <div className="hf-overview-grid">
        <div className="hf-overview-col">
          <div className="hf-stat-label">Card debt remaining</div>
          <div className="hf-stat-val-accent">{fmt(cardDebtRemaining, { showCents: false })}</div>
        </div>
        <div className="hf-overview-col">
          <div className="hf-stat-label">House fund</div>
          <div className="hf-stat-val-accent">
            {houseFundGoal ? fmt(houseFundGoal.current_amount, { showCents: false }) : '—'}
            {houseFundGoal?.target_amount > 0 && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-soft)', fontWeight: 400 }}>
                {' '}/ {fmt(houseFundGoal.target_amount, { showCents: false })}
              </span>
            )}
          </div>
        </div>
        <div className="hf-overview-col">
          <div className="hf-stat-label">Current phase</div>
          <div className="hf-stat-val-phase">{activePhase?.title || '—'}</div>
        </div>
        <div className="hf-overview-col">
          <div className="hf-stat-label">Target window</div>
          <div className="hf-stat-val-mono">Mo {planMonthNum}{totalMonths ? ` / ~${totalMonths}` : ''}</div>
        </div>
      </div>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)' }}>Mortgage-ready progress</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', color: 'var(--accent)' }}>{mortgageReadyPct.toFixed(0)}%</span>
        </div>
        <div className="hf-progress h10">
          <div className="hf-progress-fill" style={{ width: `${mortgageReadyPct}%`, background: 'var(--accent)' }} />
        </div>
      </div>
    </div>
  )

  // ── B: debt tracker ───────────────────────────────────────────────
  const featureB = (
    <div className="card">
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-lg)', margin: '0 0 12px', color: 'var(--text)' }}>Debt payoff tracker</h3>
      {trackedDebts.length === 0
        ? <div className="empty"><p>No debts in the plan.</p></div>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {trackedDebts.map(dt => {
              const d = dt.debt
              const isActive = dt.id === activeTarget?.id
              const isPaid   = !!d.paid_off
              const isMins   = dt.strategy === 'minimums_only'
              const paidPct  = Number(d.starting_balance) > 0
                ? Math.min(100, ((Number(d.starting_balance) - Number(d.current_balance)) / Number(d.starting_balance)) * 100)
                : 0
              const aprStr = `${(Number(d.apr) * 100).toFixed(1)}% APR · ${fmt(Number(d.min_payment) || 0, { showCents: false })} min`

              if (isPaid) return (
                <div key={dt.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '12px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, opacity: .7 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-base)', color: 'var(--text)' }}>{d.name}</span>
                    <span className="hf-pill-paid-ok"><IconCheckSmall /> Paid · paused</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', color: 'var(--text-soft)' }}>$0 · resumes Phase 2</span>
                </div>
              )

              if (isMins) return (
                <div key={dt.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '14px 15px', display: 'flex', flexDirection: 'column', gap: 10, opacity: .9 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-base)', color: 'var(--text)' }}>{d.name}</span>
                        <span className="hf-pill-minimums"><IconMinus /> Minimums only</span>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-soft)' }}>{aprStr}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 'var(--fs-xl)', color: 'var(--text)' }}>{fmt(d.current_balance, { showCents: false })}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>Low APR — paid on autopay, no extra</span>
                </div>
              )

              return (
                <div key={dt.id} style={{
                  border: isActive ? '1.5px solid var(--app-accent)' : '1px solid var(--border)',
                  borderRadius: 12, padding: '14px 15px',
                  background: isActive ? 'var(--bg-elevated)' : undefined,
                  display: 'flex', flexDirection: 'column', gap: 10
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-base)', color: 'var(--text)' }}>{d.name}</span>
                        {isActive
                          ? <span className="hf-pill-active"><IconActiveDot /> Active target</span>
                          : <span className="hf-pill-queued"><IconClock /> Queued</span>}
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-soft)' }}>{aprStr}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 'var(--fs-xl)', color: 'var(--text)' }}>{fmt(d.current_balance, { showCents: false })}</span>
                  </div>
                  <div className="hf-progress h8">
                    <div className="hf-progress-fill" style={{ width: `${paidPct}%`, background: isActive ? 'var(--app-accent)' : 'var(--text-soft)' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>
                      {fmt(Math.max(0, Number(d.starting_balance) - Number(d.current_balance)), { showCents: false })} of {fmt(d.starting_balance, { showCents: false })} paid
                    </span>
                    {dt.payoff_month && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: isActive ? 'var(--app-accent)' : 'var(--text-soft)' }}>
                        Payoff ~Month {dt.payoff_month}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
    </div>
  )

  // ── C: down payment fund ──────────────────────────────────────────
  const featureC = (() => {
    if (!houseFundGoal) return (
      <div className="card">
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-lg)', margin: '0 0 12px', color: 'var(--text)' }}>Down payment fund</h3>
        <div className="empty"><p>Add a goal named "House Downpayment" to track the fund here.</p></div>
      </div>
    )
    const pct = houseFundGoal.target_amount
      ? Math.min(100, (Number(houseFundGoal.current_amount) / Number(houseFundGoal.target_amount)) * 100) : 0
    const ringSize   = isWide ? 112 : 84
    const ringStroke = isWide ? 10 : 8
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-lg)', margin: 0, color: 'var(--text)' }}>Down payment fund</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ position: 'relative', width: ringSize, height: ringSize, flexShrink: 0 }}>
            <ProgressRing pct={pct} size={ringSize} strokeWidth={ringStroke} color="var(--app-accent)" />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 'var(--fs-lg)', color: 'var(--app-accent)' }}>{pct.toFixed(0)}%</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 'var(--fs-xl)', color: 'var(--text)' }}>{fmt(houseFundGoal.current_amount, { showCents: false })}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-base)', color: 'var(--text-soft)' }}> / {fmt(houseFundGoal.target_amount || 0, { showCents: false })}</span>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {Number(houseFundGoal.monthly_contribution) > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>Contribution</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', color: 'var(--text)' }}>~{fmt(houseFundGoal.monthly_contribution, { showCents: false })}/mo</span>
                </div>
              )}
              {Number(houseFundGoal.monthly_contribution) > 0 && houseFundGoal.target_amount > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>Projected</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', color: 'var(--text)' }}>
                    ~{fmt(Math.min(Number(houseFundGoal.monthly_contribution) * (totalMonths || 15), Number(houseFundGoal.target_amount)), { showCents: false })} by mo {totalMonths || 15}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-soft)', margin: 0, lineHeight: 1.5, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 12px' }}>
          {plan.down_payment_note || 'Combine with existing free reserves at closing. An FHA first-time loan on a ~$200k home needs roughly $7,000 down plus ~$6,000 closing.'}
        </p>
      </div>
    )
  })()

  // ── D: monthly fuel plan ──────────────────────────────────────────
  const featureD = (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-lg)', margin: 0, color: 'var(--text)' }}>Monthly fuel plan</h3>
        {totalFuel > 0 && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', color: 'var(--text)' }}>
            {fmt(totalFuel, { showCents: false })}<span style={{ fontSize: 10, color: 'var(--text-soft)' }}>/mo</span>
          </span>
        )}
      </div>
      {fuelActuals.length === 0
        ? <div className="empty"><p>Fuel lines will appear here after setup.</p></div>
        : (
          <>
            {shoppingCapLine && (
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 15px', display: 'flex', flexDirection: 'column', gap: 9 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-base)', color: 'var(--text)' }}>{shoppingCapLine.label}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', color: shoppingCapLine.over ? 'var(--danger)' : 'var(--ok)' }}>
                    {shoppingCapLine.over ? `over $${Math.abs(shoppingCapLine.remaining).toFixed(0)}` : `$${shoppingCapLine.remaining.toFixed(0)} left`}
                  </span>
                </div>
                <div className="hf-progress h10">
                  <div className="hf-progress-fill" style={{ width: `${shoppingCapLine.pct}%`, background: shoppingCapLine.over ? 'var(--danger)' : 'var(--ok)' }} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-soft)' }}>
                  Spent {fmt(shoppingCapLine.actual, { showCents: false })} of {fmt(shoppingCapLine.target, { showCents: false })} cap this month
                </span>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {otherFuelLines.map(line => (
                <div key={line.id}>
                  {line.over ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-sm)', color: 'var(--text)' }}>
                          {line.label} <IconWarn />
                        </span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--danger)' }}>
                          {fmt(line.actual, { showCents: false })} / {fmt(line.target, { showCents: false })} · over ${Math.abs(line.remaining).toFixed(0)}
                        </span>
                      </div>
                      <div className="hf-progress h7">
                        <div className="hf-progress-fill" style={{ width: '100%', background: 'var(--danger)' }} />
                      </div>
                    </div>
                  ) : line.track_category ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)' }}>{line.label}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-soft)' }}>
                          {fmt(line.actual, { showCents: false })} / {fmt(line.target, { showCents: false })}
                        </span>
                      </div>
                      <div className="hf-progress h7">
                        <div className="hf-progress-fill" style={{ width: `${line.pct}%`, background: 'var(--app-accent)' }} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text)' }}>{line.label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', color: 'var(--text-soft)' }}>{fmt(line.target, { showCents: false })}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
    </div>
  )

  // ── E: phase timeline ─────────────────────────────────────────────
  const featureE = (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-lg)', margin: 0, color: 'var(--text)' }}>Phase timeline</h3>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {sortedPhases.map((p, i) => {
          const isActive = p.status === 'active'
          const isDone   = p.status === 'done'
          return (
            <div key={p.id} style={{ display: 'flex', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span className={isDone ? 'hf-phase-dot-done' : isActive ? 'hf-phase-dot-active' : 'hf-phase-dot-upcoming'} />
                {i < sortedPhases.length - 1 && (
                  <span style={{ flex: 1, width: 2, background: 'var(--border)', margin: '2px 0' }} />
                )}
              </div>
              <div style={{ paddingBottom: i < sortedPhases.length - 1 ? 20 : 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-soft)' }}>{p.range_label}</span>
                  {isActive && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'color-mix(in srgb,var(--accent) 18%,var(--bg-paper))', color: 'var(--accent)', fontSize: 10, fontWeight: 600, borderRadius: 6, padding: '2px 8px' }}>Active</span>}
                  {isDone   && <span style={{ border: '1px solid var(--ok)', color: 'var(--ok)', fontSize: 10, fontWeight: 600, borderRadius: 6, padding: '2px 8px' }}>Done</span>}
                  {!isActive && !isDone && <span style={{ border: '1px solid var(--border)', color: 'var(--text-soft)', fontSize: 10, fontWeight: 600, borderRadius: 6, padding: '2px 8px' }}>Upcoming</span>}
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-base)', color: 'var(--text)' }}>{p.title}</span>
                <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-soft)', lineHeight: 1.5 }}>{p.description}</span>
                {p.milestone_note && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: isActive ? 'var(--text)' : 'var(--text-soft)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', width: 'fit-content' }}>
                    {p.milestone_note}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── F: milestone schedule ─────────────────────────────────────────
  const featureF = (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-lg)', margin: 0, color: 'var(--text)' }}>Milestone schedule</h3>
        <span style={{ fontSize: 11, color: 'var(--text-soft)' }}>Projected balances · fill Actual as you go</span>
      </div>
      {sortedMilestones.length === 0
        ? <div className="empty"><p>No milestones yet.</p></div>
        : isWide ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="ledger" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', fontWeight: 500, paddingBottom: 10, textTransform: 'none', letterSpacing: 0 }}>Checkpoint</th>
                  {MILESTONE_KEYS.map(k => (
                    <th key={k} style={{ textAlign: 'right', fontWeight: 500, paddingBottom: 10, textTransform: 'none', letterSpacing: 0 }}>{MILESTONE_LABELS[k]}</th>
                  ))}
                  <th style={{ textAlign: 'right', fontWeight: 500, paddingBottom: 10, color: 'var(--app-accent)', textTransform: 'none', letterSpacing: 0 }}>Actual</th>
                </tr>
              </thead>
              <tbody>
                {sortedMilestones.map((m, i) => (
                  <tr key={m.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ textAlign: 'left', padding: '9px 0', color: i === 0 ? 'var(--accent)' : 'var(--text)' }}>{m.checkpoint}</td>
                    {MILESTONE_KEYS.map(k => {
                      const val = m.projected?.[k]
                      const isPaid = val === 0 || val === 'paid'
                      return (
                        <td key={k} style={{ textAlign: 'right', padding: '9px 0', color: isPaid ? 'var(--ok)' : val == null ? 'var(--text-soft)' : 'var(--text)' }}>
                          {isPaid ? 'Paid' : val != null ? fmt(val, { showCents: false }) : '—'}
                        </td>
                      )
                    })}
                    <td style={{ textAlign: 'right', padding: '9px 0' }}>
                      <input
                        type="number" step="100" className="input mono"
                        style={{ width: 110, padding: '0.25rem 0.5rem', fontSize: 13, textAlign: 'right' }}
                        value={m.actual?.house_fund ?? ''}
                        placeholder="—"
                        onChange={e => setMilestoneActual(m.id, 'house_fund', parseFloat(e.target.value) || null)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sortedMilestones.slice(0, 3).map((m, i) => (
              <div key={m.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: i === 0 ? 'var(--accent)' : 'var(--text)' }}>{m.checkpoint}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-soft)' }}>
                    Actual {m.actual?.house_fund != null ? fmt(m.actual.house_fund, { showCents: false }) : '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                  {MILESTONE_KEYS.map(k => {
                    const val = m.projected?.[k]
                    if (val == null) return null
                    const isPaid = val === 0 || val === 'paid'
                    return (
                      <span key={k} style={{ color: isPaid ? 'var(--ok)' : k === 'house_fund' ? 'var(--app-accent)' : 'var(--text)' }}>
                        {MILESTONE_LABELS[k]} {isPaid ? 'Paid' : fmt(val, { showCents: false })}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
            {sortedMilestones.length > 3 && (
              <span style={{ fontSize: 10, color: 'var(--text-soft)' }}>Showing 3 of {sortedMilestones.length} checkpoints</span>
            )}
          </div>
        )}
    </div>
  )

  // ── G: checklist ──────────────────────────────────────────────────
  const featureG = (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-lg)', margin: 0, color: 'var(--text)' }}>Payday &amp; monthly checklist</h3>
      {checklistItems.length === 0
        ? <div className="empty"><p>Checklist items will appear here after setup.</p></div>
        : (
          <>
            {paydayItems.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <span className="hf-checklist-label">EVERY PAYDAY</span>
                {paydayItems.map(item => {
                  const checked = isChecked(item)
                  return (
                    <label key={item.id} style={{ display: 'flex', gap: 11, alignItems: 'center', minHeight: 44, cursor: 'pointer' }}
                      onClick={() => toggleChecklistItem(item)}>
                      <span className={checked ? 'hf-checkbox-checked' : 'hf-checkbox-unchecked'}>
                        {checked && <IconCheckbox />}
                      </span>
                      <span style={{ fontSize: 'var(--fs-sm)', color: checked ? 'var(--text-soft)' : 'var(--text)', textDecoration: checked ? 'line-through' : 'none' }}>
                        {item.label}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
            {monthlyItems.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <span className="hf-checklist-label">MONTHLY · 1ST</span>
                {monthlyItems.map(item => {
                  const checked = isChecked(item)
                  return (
                    <label key={item.id} style={{ display: 'flex', gap: 11, alignItems: 'center', minHeight: 44, cursor: 'pointer' }}
                      onClick={() => toggleChecklistItem(item)}>
                      <span className={checked ? 'hf-checkbox-checked' : 'hf-checkbox-unchecked'}>
                        {checked && <IconCheckbox />}
                      </span>
                      <span style={{ fontSize: 'var(--fs-sm)', color: checked ? 'var(--text-soft)' : 'var(--text)', textDecoration: checked ? 'line-through' : 'none' }}>
                        {item.label}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}
            <p style={{ fontSize: 11, color: 'var(--text-soft)', margin: 0 }}>Payday items reset each pay period · monthly items reset on the 1st.</p>
          </>
        )}
    </div>
  )

  // ── H: ground rules ───────────────────────────────────────────────
  const defaultRules = [
    'Always pay every minimum on time. The extra money is on top of minimums.',
    'Never touch the $4,000 bill buffer or the ~$3,000 emergency floor to pay debt.',
    'No new cards, financing, or monthly subscriptions until we have keys.',
    'Look into SONYMA and target-area eligibility with the lender (income is borderline).',
    'Budget for Erie County property taxes, roughly $400–500/mo on top of the mortgage.',
    'Get pre-approved around month 11 for a real number.',
  ]
  const featureH = (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-lg)', margin: 0, color: 'var(--text)' }}>Ground rules</h3>
      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {(plan.ground_rules || defaultRules).map((rule, i) => (
          <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span className="hf-rule-num">{i + 1}</span>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-soft)', lineHeight: 1.45 }}>{rule}</span>
          </li>
        ))}
      </ol>
    </div>
  )

  // ── Layout ────────────────────────────────────────────────────────
  return (
    <div className="ledger-page">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 'var(--sp-5)', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-xl)', color: 'var(--text)', margin: 0, lineHeight: 1.15 }}>The plan to buy</h2>
          <p style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-sm)', margin: '3px 0 0', lineHeight: 1.4 }}>
            Month {planMonthNum}{totalMonths ? ` of ~${totalMonths}` : ''} ·{' '}
            <span style={{ color: 'var(--accent)' }}>{currentMonthLabel}</span>
          </p>
        </div>
        <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
          <IconTransfer />
          Log payday transfer
        </button>
      </div>

      {seedNote && (
        <div className="card" style={{ background: 'var(--warn-soft)', borderColor: 'var(--warn)', marginBottom: 'var(--sp-3)' }}>
          <p style={{ margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--warn)' }}>⚠ {seedNote}</p>
        </div>
      )}

      {featureA}

      {isWide ? (
        <>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', margin: 'var(--sp-4) 0' }}>
            <div style={{ flex: '1.1', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              {featureB}
              {featureE}
              {featureH}
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
              {featureC}
              {featureD}
              {featureG}
            </div>
          </div>
          {featureF}
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)', marginTop: 'var(--sp-4)' }}>
          {featureB}
          {featureC}
          {featureD}
          {featureE}
          {featureF}
          {featureG}
          {featureH}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--sp-3)' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setResetSheetOpen(true)} style={{ color: 'var(--danger)' }}>Reset plan</button>
      </div>

      <Sheet open={resetSheetOpen} onClose={() => setResetSheetOpen(false)} title="Reset this plan?">
        <div style={{ padding: 'var(--sp-4)' }}>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-soft)', marginBottom: 'var(--sp-4)' }}>
            This removes all Home Fund plan records — phases, milestones, fuel lines, checklist, and debt targets.
            It does <strong>not</strong> delete your actual debts, goals, or transactions. The plan can be re-seeded, but your milestone actuals will be lost.
          </p>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setResetSheetOpen(false)}>Keep the plan</button>
            <button className="btn" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleReset}>Delete the plan</button>
          </div>
        </div>
      </Sheet>
    </div>
  )
}
