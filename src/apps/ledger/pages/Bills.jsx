import { useState, useMemo } from 'react'
import { useRecords } from '../lib/useRecords'
import { fmt, ordinal, currentMonth, monthName } from '../lib/format'

export default function Bills() {
  const { year, month } = currentMonth()
  const { data: bills, insert, update, remove } = useRecords('bill', { orderBy: 'due_day' })
  const { data: categories } = useRecords('category', { orderBy: 'sort_order' })
  const { data: payments, insert: insertPayment, update: updatePayment, refetch: refetchPayments } = useRecords('bill_payment')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`

  const billsWithStatus = useMemo(() =>
    bills.map(b => {
      const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(b.due_day || 1).padStart(2, '0')}`
      const payment = payments.find(p => p.bill_id === b.id && p.due_date === dueDate)
      return { ...b, _payment: payment, _dueDate: dueDate, _paid: payment?.paid || false }
    }),
    [bills, payments, year, month]
  )

  const totals = useMemo(() => {
    const total = billsWithStatus.reduce((s, b) => s + Number(b.amount), 0)
    const paid = billsWithStatus.filter(b => b._paid).reduce((s, b) => s + Number(b.amount), 0)
    return { total, paid, remaining: total - paid }
  }, [billsWithStatus])

  const togglePaid = async (bill) => {
    if (bill._payment) {
      await updatePayment(bill._payment.id, { paid: !bill._payment.paid, paid_date: !bill._payment.paid ? new Date().toISOString().slice(0, 10) : null })
    } else {
      await insertPayment({ bill_id: bill.id, due_date: bill._dueDate, amount: bill.amount, paid: true, paid_date: new Date().toISOString().slice(0, 10) })
    }
    refetchPayments()
  }

  const openNew = () => { setEditing({ name: '', amount: 0, due_day: 1, category_id: null, autopay: false }); setModalOpen(true) }
  const openEdit = (b) => { setEditing(b); setModalOpen(true) }
  const handleSave = async () => {
    if (editing.id) await update(editing.id, { name: editing.name, amount: editing.amount, due_day: editing.due_day, category_id: editing.category_id, autopay: editing.autopay, notes: editing.notes })
    else await insert({ name: editing.name, amount: editing.amount, due_day: editing.due_day, category_id: editing.category_id, autopay: editing.autopay })
    setModalOpen(false); setEditing(null)
  }

  return (
    <div className="ledger-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">{monthName(month)} {year}</p>
          <h1>Bills</h1>
          <p>The recurring ones — checked off as you pay.</p>
        </div>
        <button className="btn" onClick={openNew}>+ Add bill</button>
      </div>

      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total this month</div>
          <div className="stat-value">{fmt(totals.total, { showCents: false })}</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-label">Paid</div>
          <div className="stat-value">{fmt(totals.paid, { showCents: false })}</div>
        </div>
        <div className="stat-card warm">
          <div className="stat-label">Remaining</div>
          <div className="stat-value">{fmt(totals.remaining, { showCents: false })}</div>
        </div>
      </div>

      <div className="card">
        <table className="ledger">
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>Bill</th>
              <th>Due</th>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {billsWithStatus.map(b => {
              const cat = categories.find(c => c.id === b.category_id)
              return (
                <tr key={b.id} style={{ opacity: b._paid ? 0.55 : 1 }}>
                  <td>
                    <input
                      type="checkbox"
                      checked={b._paid}
                      onChange={() => togglePaid(b)}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, textDecoration: b._paid ? 'line-through' : 'none' }}>{b.name}</div>
                    {b.autopay && <span className="pill pill-auto" style={{ marginTop: 4 }}>Autopay</span>}
                  </td>
                  <td>{ordinal(b.due_day || 1)}</td>
                  <td>
                    {cat ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                        <span className="dot" style={{ background: cat.color }}></span>
                        {cat.name}
                      </span>
                    ) : <span style={{ color: 'var(--ink-faint)' }}>—</span>}
                  </td>
                  <td className="num">{fmt(b.amount, { showCents: false })}</td>
                  <td style={{ width: 90 }}>
                    <button className="icon-btn" onClick={() => openEdit(b)} title="Edit">✎</button>
                    <button className="icon-btn" onClick={() => { if (confirm(`Delete ${b.name}?`)) remove(b.id) }} title="Delete">×</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {bills.length === 0 && (
          <div className="empty">
            <h3>No bills yet</h3>
            <p>Add your first recurring bill to start tracking.</p>
          </div>
        )}
      </div>

      {modalOpen && editing && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <h2>{editing.id ? 'Edit bill' : 'New bill'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div className="field">
                <label>Name</label>
                <input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Rent, Electric, etc." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Amount</label>
                  <input className="input mono" type="number" step="0.01" value={editing.amount} onChange={(e) => setEditing({ ...editing, amount: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="field">
                  <label>Due day</label>
                  <input className="input mono" type="number" min="1" max="31" value={editing.due_day || 1} onChange={(e) => setEditing({ ...editing, due_day: parseInt(e.target.value) || 1 })} />
                </div>
              </div>
              <div className="field">
                <label>Category</label>
                <select className="select" value={editing.category_id || ''} onChange={(e) => setEditing({ ...editing, category_id: e.target.value || null })}>
                  <option value="">— None —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <input type="checkbox" checked={editing.autopay || false} onChange={(e) => setEditing({ ...editing, autopay: e.target.checked })} />
                Autopay
              </label>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
