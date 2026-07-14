import { useState, useMemo } from 'react'
import { useRecords } from '../lib/useRecords'
import { fmt, ordinal, currentMonth, monthName } from '../lib/format'
import { Button } from '../../../ds'

export default function Bills() {
  const { year, month } = currentMonth()
  const { data: bills, insert, update, remove } = useRecords('bill', { orderBy: 'due_day' })
  const { data: categories } = useRecords('category', { orderBy: 'name' })
  const { data: payments, insert: insertPayment, update: updatePayment, refetch: refetchPayments } = useRecords('bill_payment')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

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
      await updatePayment(bill._payment.id, {
        paid: !bill._payment.paid,
        paid_date: !bill._payment.paid ? new Date().toISOString().slice(0, 10) : null
      })
    } else {
      await insertPayment({
        bill_id: bill.id,
        due_date: bill._dueDate,
        amount: bill.amount,
        paid: true,
        paid_date: new Date().toISOString().slice(0, 10)
      })
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
    <div className="ledger-page" style={{ paddingTop: 'var(--sp-5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-xl)', color: 'var(--text)', margin: 0 }}>Bills</h2>
          <p style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-sm)', margin: '4px 0 0' }}>{monthName(month)} {year}</p>
        </div>
        <button style={{ background: 'var(--accent)', color: '#0B0F09', border: 'none', borderRadius: 12, padding: '10px 18px', fontFamily: 'inherit', fontWeight: 700, fontSize: 'var(--fs-sm)', cursor: 'pointer' }} onClick={openNew}>Add bill</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
        {[{ label: 'Total this month', value: totals.total, color: 'var(--text)' }, { label: 'Paid', value: totals.paid, color: 'var(--ok)' }, { label: 'Remaining', value: totals.remaining, color: 'var(--app-accent)' }].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'var(--bg-paper)', border: '1px solid var(--border)', borderRadius: 16, padding: '15px 17px' }}>
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-soft)', marginBottom: 6 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xl)', fontWeight: 500, color }}>{fmt(value, { showCents: false })}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--bg-paper)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        {bills.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ width: 60, height: 60, borderRadius: 'var(--r-md)', background: 'color-mix(in srgb, var(--app-accent) 10%, var(--bg-elevated))', border: '1px solid color-mix(in srgb, var(--app-accent) 22%, var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="3" stroke="var(--app-accent)" strokeWidth="1.7"/><path d="M8 12h8M8 8h4" stroke="var(--app-accent)" strokeWidth="1.7" strokeLinecap="round"/></svg>
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-xl)', color: 'var(--text)', margin: '0 0 8px' }}>No bills yet</h3>
            <p style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-base)', lineHeight: 1.6, margin: '0 0 24px', maxWidth: '36ch' }}>Add your first recurring bill to start tracking payments.</p>
            <button style={{ background: 'var(--accent)', color: '#0B0F09', border: 'none', borderRadius: 12, padding: '13px 22px', fontFamily: 'inherit', fontWeight: 600, fontSize: 'var(--fs-base)', cursor: 'pointer' }} onClick={openNew}>Add a bill</button>
          </div>
        ) : (
          <div>
            {billsWithStatus.map((b, idx) => {
              const cat = categories.find(c => c.id === b.category_id)
              const isToday = new Date().getDate() === b.due_day
              return (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: idx < billsWithStatus.length - 1 ? '1px solid var(--border)' : 'none', opacity: b._paid ? 0.6 : 1 }}>
                  <label style={{ cursor: 'pointer', flexShrink: 0 }}>
                    <input type="checkbox" checked={b._paid} onChange={() => togglePaid(b)} style={{ width: 16, height: 16 }} />
                  </label>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', padding: '3px 8px', borderRadius: 6, border: isToday ? 'none' : '1px solid var(--border)', background: isToday ? 'var(--accent)' : 'transparent', color: isToday ? '#0B0F09' : 'var(--text-soft)', flexShrink: 0 }}>{ordinal(b.due_day || 1)}</span>
                  <span style={{ flex: 1, fontSize: 'var(--fs-base)', fontWeight: 500, textDecoration: b._paid ? 'line-through' : 'none', color: b._paid ? 'var(--text-soft)' : 'var(--text)' }}>{b.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {cat && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 'var(--fs-xs)', color: 'var(--text-soft)' }}><span style={{ width: 7, height: 7, borderRadius: 2, background: cat.color }} />{cat.name}</span>}
                    {b.autopay && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--text-soft)' }}>auto</span>}
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-base)', textDecoration: b._paid ? 'line-through' : 'none', color: b._paid ? 'var(--text-soft)' : 'var(--text)', flexShrink: 0 }}>{fmt(b.amount, { showCents: false })}</span>
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button className="icon-btn" aria-label="Edit bill" onClick={() => openEdit(b)}>&#9998;</button>
                    <button className="icon-btn" aria-label={`Delete ${b.name}`} onClick={() => { if (confirm(`Delete ${b.name}?`)) remove(b.id) }}>&times;</button>
                  </div>
                </div>
              )
            })}
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
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, minHeight: 44 }}>
                <input type="checkbox" checked={editing.autopay || false} onChange={(e) => setEditing({ ...editing, autopay: e.target.checked })} />
                Autopay
              </label>
            </div>
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
