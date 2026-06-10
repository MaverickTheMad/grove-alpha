// Snowball schedule projection — extracted VERBATIM from the budget app's
// Snowball page (was an in-file function). Pure; must not mutate input.
// - Each debt pays its `snowball_payment` until paid off
// - When a debt clears, its full payment cascades to the next debt by payoff_order

export function projectSnowball(debts) {
  const active = [...debts]
    .filter(d => !d.paid_off && Number(d.current_balance) > 0)
    .sort((a, b) => (Number(a.payoff_order) || 99) - (Number(b.payoff_order) || 99))

  const state = active.map(d => ({
    id: d.id,
    name: d.name,
    apr: Number(d.apr) || 0,
    payment: Number(d.snowball_payment) || Number(d.min_payment) || 0,
    balance: Number(d.current_balance) || 0,
    wasZero: false
  }))

  const months = []
  let freed = 0
  const startDate = new Date()

  for (let i = 0; i < 240 && state.some(d => d.balance > 0); i++) {
    const monthDate = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1)
    const row = { date: monthDate, debts: {}, totalBalance: 0, totalPaid: 0 }
    let extra = freed

    for (const d of state) {
      if (d.balance <= 0) {
        row.debts[d.id] = { balance: 0, payment: 0, interest: 0, principal: 0, cleared: true }
        continue
      }
      const interest = (d.balance * d.apr) / 12
      let payment = d.payment + extra
      extra = 0
      if (payment > d.balance + interest) {
        extra = payment - (d.balance + interest)
        payment = d.balance + interest
      }
      const principal = payment - interest
      d.balance = Math.max(0, d.balance + interest - payment)
      row.debts[d.id] = { balance: d.balance, payment, interest, principal, cleared: d.balance === 0 }
      row.totalPaid += payment
      if (d.balance === 0 && !d.wasZero) {
        d.wasZero = true
        freed += d.payment
      }
    }
    row.totalBalance = state.reduce((s, d) => s + d.balance, 0)
    months.push(row)
  }
  return { months, debts: state }
}
