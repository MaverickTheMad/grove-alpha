import { useMemo } from 'react'
import { useRecords } from '../lib/useRecords'
import { usePeople } from '../lib/people'
import { fmt, daysUntil } from '../lib/format'
import { getPayCycle, formatCycleLabel, resolvePersonAnchor, spendInCycleForPerson } from '../lib/payCycle'
import { useIsDesktop } from '../../../lib/viewport'

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const IconBars = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="20" x2="20" y2="20" />
    <rect x="5" y="11" width="3.2" height="7" rx="1" />
    <rect x="10.4" y="7" width="3.2" height="11" rx="1" />
    <rect x="15.8" y="13" width="3.2" height="5" rx="1" />
  </svg>
)

function fmtDueDate(daysAway) {
  const d = new Date()
  d.setDate(d.getDate() + daysAway)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Overview() {
  const isWide = useIsDesktop(1080)
  const { data: people } = usePeople()
  const { data: paychecks } = useRecords('paycheck')
  const { data: transactions } = useRecords('transaction', { orderBy: 'date', ascending: false })
  const { data: bills } = useRecords('bill', { filter: (b) => b.active !== false })
  const { data: goals } = useRecords('goal', { filter: (g) => !g.archived })

  const personCycles = useMemo(() => {
    return people.map((person) => {
      const anchorISO = resolvePersonAnchor(person, paychecks)
      const rawCycle = anchorISO ? getPayCycle(anchorISO) : null
      const cycle = rawCycle ? { ...rawCycle, label: formatCycleLabel(rawCycle) } : null
      const personPaychecks = paychecks.filter((p) => p.person_id === person.id)
      const income = personPaychecks.reduce((s, p) => {
        const perCycle =
          p.cadence === 'biweekly' ? Number(p.amount) :
          p.cadence === 'weekly' ? Number(p.amount) * 2 :
          p.cadence === 'semimonthly' ? Number(p.amount) * (14 / 15.2) :
          Number(p.amount) * (14 / 30.5)
        return s + perCycle
      }, 0)
      const spent = cycle
        ? spendInCycleForPerson(transactions, cycle.startISO, cycle.endISO, person.id)
        : 0
      return { person, cycle, income, spent, net: income - spent }
    })
  }, [people, paychecks, transactions])

  const upcoming = useMemo(() =>
    [...bills]
      .map((b) => ({ ...b, _days: daysUntil(b.due_day || 1) }))
      .sort((a, b) => a._days - b._days)
      .slice(0, 5),
    [bills]
  )

  const totalBillsMonthly = useMemo(() =>
    bills.reduce((s, b) => s + Number(b.amount || 0), 0),
    [bills]
  )

  const todayLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const householdLabel = people.length > 1
    ? `${people.length} people, one household`
    : 'One household'

  const hasAnyData = transactions.length > 0 || bills.length > 0 || goals.length > 0 || people.length > 0

  if (!hasAnyData) {
    return (
      <div className="ledger-page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
          <div style={{ background: 'var(--bg-paper)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16, maxWidth: 380, width: '100%' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--app-weak)', color: 'var(--app-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconBars />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-lg)', color: 'var(--text)', margin: 0 }}>Nothing logged yet</h3>
              <p style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-sm)', margin: 0, lineHeight: 1.5, maxWidth: '34ch' }}>Add your first transaction and each person's pay-cycle net, your monthly bills, and goal progress fill in here.</p>
            </div>
            <button style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: '#0B0F09', fontWeight: 600, fontSize: 'var(--fs-sm)', border: 'none', borderRadius: 12, padding: '11px 18px', cursor: 'pointer' }}>
              <IconPlus />
              Add a transaction
            </button>
          </div>
        </div>
      </div>
    )
  }

  const personCards = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {personCycles.length === 0 ? (
        <div style={{ background: 'var(--bg-paper)', border: '1px solid var(--border)', borderRadius: 16, padding: isWide ? 20 : 16 }}>
          <p style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-sm)', margin: 0 }}>No members yet — add people in Settings.</p>
        </div>
      ) : personCycles.map(({ person, cycle, income, spent, net }) => {
        const avatarColor = person.color || 'var(--app-accent)'
        const avatarBg = `color-mix(in srgb, ${avatarColor} 24%, var(--bg-elevated))`
        const avatarSz = isWide ? 34 : 28
        const avatarR = isWide ? 10 : 9
        return (
          <div key={person.id} style={{ background: 'var(--bg-paper)', border: '1px solid var(--border)', borderRadius: 16, padding: isWide ? 20 : 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isWide ? 16 : 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: isWide ? 11 : 9 }}>
                <span style={{ width: avatarSz, height: avatarSz, borderRadius: avatarR, background: avatarBg, color: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: isWide ? 'var(--fs-base)' : 'var(--fs-sm)', flexShrink: 0 }}>
                  {person.name?.[0]?.toUpperCase()}
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: isWide ? 'var(--fs-lg)' : 'var(--fs-base)', color: 'var(--text)' }}>
                  {person.name}
                </span>
              </div>
              {cycle && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: isWide ? 'var(--fs-xs)' : '9px', color: 'var(--text-soft)', border: '1px solid var(--border)', borderRadius: 6, padding: isWide ? '4px 8px' : '3px 6px', whiteSpace: 'nowrap' }}>
                  {cycle.label}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: isWide ? 16 : 12 }}>
              <div style={{ display: 'flex', gap: isWide ? 26 : 18 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: isWide ? 5 : 4 }}>
                  <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-soft)' }}>Income</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: isWide ? 'var(--fs-lg)' : 'var(--fs-base)', color: 'var(--text)' }}>
                    {fmt(income, { showCents: false })}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: isWide ? 5 : 4 }}>
                  <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-soft)' }}>Spent</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: isWide ? 'var(--fs-lg)' : 'var(--fs-base)', color: 'var(--text)' }}>
                    {fmt(spent, { showCents: false })}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: isWide ? 2 : 1 }}>
                <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-soft)' }}>Net</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: isWide ? 'var(--fs-3xl)' : 'var(--fs-2xl)', lineHeight: 1, color: 'var(--app-accent)' }}>
                  {net >= 0 ? '+' : ''}{fmt(net, { showCents: false })}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  const billsAndGoals = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Monthly bills */}
      <div style={{ background: 'var(--bg-paper)', border: '1px solid var(--border)', borderRadius: 16, padding: isWide ? 20 : 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 2 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: isWide ? 'var(--fs-lg)' : 'var(--fs-base)', color: 'var(--text)', margin: 0 }}>Monthly bills</h3>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: isWide ? 'var(--fs-base)' : 'var(--fs-sm)', color: 'var(--text)' }}>
            {fmt(totalBillsMonthly, { showCents: false })}
            <span style={{ fontSize: isWide ? 'var(--fs-xs)' : 9, color: 'var(--text-soft)' }}>/mo</span>
          </span>
        </div>
        <p style={{ color: 'var(--text-soft)', fontSize: isWide ? 'var(--fs-sm)' : 12, margin: `0 0 ${isWide ? 12 : 10}px` }}>Next 5 upcoming</p>
        {upcoming.length === 0 ? (
          <p style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-sm)', margin: 0 }}>No bills tracked yet — add recurring bills.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {upcoming.map((b) => {
              const isToday = b._days === 0
              const dateStr = fmtDueDate(b._days)
              return (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: isWide ? 12 : 10, padding: `${isWide ? 10 : 8}px 0`, borderTop: '1px solid var(--border)' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: isWide ? 'var(--fs-xs)' : 9,
                    color: isToday ? '#0B0F09' : 'var(--text-soft)',
                    background: isToday ? 'var(--accent)' : 'transparent',
                    border: isToday ? 'none' : '1px solid var(--border)',
                    borderRadius: 6,
                    padding: isWide ? '4px 7px' : '3px 6px',
                    minWidth: isWide ? 58 : 54,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}>
                    {isToday ? `${dateStr} · today` : dateStr}
                  </span>
                  <span style={{ flex: 1, color: 'var(--text)', fontSize: isWide ? 'var(--fs-sm)' : 12 }}>{b.name}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: isWide ? 'var(--fs-sm)' : 12, color: 'var(--text)' }}>
                    {fmt(b.amount, { showCents: false })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Goals */}
      <div style={{ background: 'var(--bg-paper)', border: '1px solid var(--border)', borderRadius: 16, padding: isWide ? 20 : 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: isWide ? 14 : 12 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: isWide ? 'var(--fs-lg)' : 'var(--fs-base)', color: 'var(--text)', margin: 0 }}>Goals</h3>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: isWide ? 'var(--fs-xs)' : 9, color: 'var(--app-accent)', background: 'var(--app-weak)', borderRadius: 6, padding: isWide ? '4px 8px' : '3px 7px' }}>
            {goals.length} active
          </span>
        </div>
        {goals.length === 0 ? (
          <p style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-sm)', margin: 0 }}>No active goals — add one to track savings targets.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: isWide ? 15 : 12 }}>
            {goals.slice(0, 5).map((g) => {
              const pct = g.target_amount
                ? Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100)
                : 0
              return (
                <div key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: isWide ? 7 : 6 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text)', fontSize: isWide ? 'var(--fs-sm)' : 12 }}>{g.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: isWide ? 'var(--fs-xs)' : 9, color: 'var(--text-soft)' }}>
                      {fmt(g.current_amount, { showCents: false })} / {fmt(g.target_amount || 0, { showCents: false })}
                    </span>
                  </div>
                  <div style={{ height: isWide ? 8 : 7, background: 'var(--bg-sunken)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: 'var(--app-accent)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="ledger-page">
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 'var(--sp-5)', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-2xl)', color: 'var(--text)', margin: 0 }}>This pay cycle</h2>
          <p style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-sm)', margin: '4px 0 0' }}>
            {householdLabel} · <span style={{ color: 'var(--accent)' }}>today</span> is {todayLabel}
          </p>
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: '#0B0F09', fontWeight: 600, fontSize: 'var(--fs-sm)', border: 'none', borderRadius: 12, padding: '11px 16px', cursor: 'pointer' }}>
          <IconPlus />
          Add a transaction
        </button>
      </div>

      {isWide ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1.08fr .92fr', gap: 16, alignItems: 'start' }}>
          {personCards}
          {billsAndGoals}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {personCards}
          {billsAndGoals}
        </div>
      )}
    </div>
  )
}
