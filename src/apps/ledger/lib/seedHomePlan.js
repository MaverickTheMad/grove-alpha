// Idempotent seed for the Home Fund plan. If a home_plan record already exists
// this is a no-op. Matches home_debt_target records to live debts by APR +
// starting_balance proximity; unmatched debts are skipped with a note.
import * as db from '../../../lib/data'
import { APP, TYPES } from '../constants'

export async function seedHomePlan() {
  const existing = await db.list({ app: APP, type: TYPES.homePlan })
  if (existing.length > 0) return { alreadySeeded: true, skipped: [] }

  await db.create({ app: APP, type: TYPES.homePlan, data: {
    home_price_target: 425000,
    buy_by_date: '2026-06-01',
    monthly_fuel_target: 2800,
    emergency_floor: 10000,
    bill_buffer: 500,
    strategy: 'avalanche',
  }})

  const phases = [
    { order: 1, title: 'Sprint', range_label: 'Now → Month 4', description: 'Pay down the highest-APR card below $5k while keeping grocery and subscription spend under the cap.', chip: 'Active', status: 'active' },
    { order: 2, title: 'Build', range_label: 'Month 5 → 10', description: 'Card debt clear; redirect card snowball payment to the house fund every month.', chip: 'Month 5', status: 'upcoming' },
    { order: 3, title: 'Buy', range_label: 'Month 11 → ~15', description: 'Fund fully built; start pre-approval process, pause other extras.', chip: 'Month 11', status: 'upcoming' },
  ]
  for (const p of phases) {
    await db.create({ app: APP, type: TYPES.homePhase, data: p })
  }

  const fuelLines = [
    { label: 'Groceries & shopping', monthly_target: 500, track_category: null },
    { label: 'Dining out', monthly_target: 300, track_category: null },
    { label: 'Subscriptions', monthly_target: 165, track_category: null },
    { label: 'Transport', monthly_target: 250, track_category: null },
    { label: 'Personal / misc', monthly_target: 200, track_category: null },
  ]
  for (const f of fuelLines) {
    await db.create({ app: APP, type: TYPES.homeFuelLine, data: f })
  }

  const milestones = [
    { order: 1, checkpoint: 'Today', projected: { house_fund: 3200 }, actual: {} },
    { order: 2, checkpoint: 'Month 2', projected: { house_fund: 5000 }, actual: {} },
    { order: 3, checkpoint: 'Month 4', projected: { house_fund: 7000 }, actual: {} },
    { order: 4, checkpoint: 'Month 6', projected: { house_fund: 10000 }, actual: {} },
    { order: 5, checkpoint: 'Month 8', projected: { house_fund: 13000 }, actual: {} },
    { order: 6, checkpoint: 'Month 10', projected: { house_fund: 16000 }, actual: {} },
    { order: 7, checkpoint: 'Month 12 (target)', projected: { house_fund: 20000 }, actual: {} },
  ]
  for (const m of milestones) {
    await db.create({ app: APP, type: TYPES.homeMilestone, data: m })
  }

  const checklistItems = [
    { group: 'payday', order: 1, label: 'Transfer snowball payment to high-APR card' },
    { group: 'payday', order: 2, label: 'Log any new transactions' },
    { group: 'payday', order: 3, label: 'Check grocery & dining spend vs cap' },
    { group: 'monthly', order: 1, label: 'Review monthly fuel plan actuals' },
    { group: 'monthly', order: 2, label: 'Update milestone actuals if needed' },
    { group: 'monthly', order: 3, label: 'Pay all bills by due date' },
    { group: 'monthly', order: 4, label: 'Contribute to house fund goal' },
  ]
  for (const c of checklistItems) {
    await db.create({ app: APP, type: TYPES.homeChecklistItem, data: c })
  }

  await db.create({ app: APP, type: TYPES.homeChecklistState, data: { payday: {}, monthly: {} } })

  // Match debt targets by APR + starting_balance proximity
  const debts = await db.list({ app: APP, type: TYPES.debt })
  const debtTargetSeeds = [
    { starting_balance: 8400, apr_approx: 0.2699, priority: 1, strategy: 'target' },
    { starting_balance: 3200, apr_approx: 0.1999, priority: 2, strategy: 'target' },
    { starting_balance: 15000, apr_approx: 0.0599, priority: 3, strategy: 'minimums_only' },
  ]
  const skipped = []
  for (const seed of debtTargetSeeds) {
    const match = debts.find(d =>
      Math.abs(Number(d.starting_balance) - seed.starting_balance) < 800 &&
      Math.abs(Number(d.apr) - seed.apr_approx) < 0.04
    )
    if (match) {
      await db.create({ app: APP, type: TYPES.homeDebtTarget, data: {
        debt_id: match.id,
        priority: seed.priority,
        strategy: seed.strategy,
      }})
    } else {
      skipped.push(seed)
    }
  }

  return { seeded: true, skipped }
}

export async function resetHomePlan() {
  const types = [
    TYPES.homePlan, TYPES.homeDebtTarget, TYPES.homeFuelLine,
    TYPES.homePhase, TYPES.homeMilestone, TYPES.homeChecklistItem, TYPES.homeChecklistState,
  ]
  const allRecords = []
  for (const type of types) {
    const recs = await db.list({ app: APP, type })
    allRecords.push(...recs)
  }
  for (const r of allRecords) {
    await db.remove(r.id)
  }
  return { removed: allRecords.map(r => r.id) }
}
