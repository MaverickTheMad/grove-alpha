import { useState, useMemo } from 'react'
import { useRecords } from '../lib/useRecords'
import { fmt, todayISO } from '../lib/format'
import { useToast } from '../../../components/Toast'

// Sort options. Category sort groups rows by category name; within a category
// the newest transactions come first.
const SORTS = [
  { id: 'date_desc', label: 'Newest first' },
  { id: 'date_asc',  label: 'Oldest first' },
  { id: 'category',  label: 'By category' },
  { id: 'amount_desc', label: 'Largest first' },
  { id: 'amount_asc',  label: 'Smallest first' },
]

export default function Transactions() {
  const { data: transactions, insert, update, remove } = useRecords('transaction', { orderBy: 'date', ascending: false })
  const { data: categories } = useRecords('category', { orderBy: 'sort_order' })
  const { data: accounts } = useRecords('account')
  const toast = useToast()
  const [pendingTx, setPendingTx] = useState(new Set()) // ids optimistically hidden

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterAccount, setFilterAccount] = useState('')
  const [startDate, setStartDate] = useState('')   // '' = no lower bound
  const [endDate, setEndDate] = useState('')        // '' = no upper bound
  const [sort, setSort] = useState('date_desc')
  const [groupByCategory, setGroupByCategory] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  // The span actually present in the data — used to bound the date inputs so
  // you can't pick a range with no possible results.
  const dateExtent = useMemo(() => {
    if (transactions.length === 0) return { min: '', max: '' }
    let min = transactions[0].date, max = transactions[0].date
    for (const t of transactions) {
      if (t.date < min) min = t.date
      if (t.date > max) max = t.date
    }
    return { min, max }
  }, [transactions])

  // Range is invalid if start is after end (both set) — surface a gentle hint.
  const rangeInvalid = startDate && endDate && startDate > endDate

  const catName = (id) => categories.find(c => c.id === id)?.name || ''

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (pendingTx.has(t.id)) return false   // optimistically hidden
      if (search && !t.description?.toLowerCase().includes(search.toLowerCase())) return false
      if (filterCategory && t.category_id !== filterCategory) return false
      if (filterAccount && t.account_id !== filterAccount) return false
      if (startDate && t.date < startDate) return false
      if (endDate && t.date > endDate) return false
      return true
    })
  }, [transactions, pendingTx, search, filterCategory, filterAccount, startDate, endDate])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    switch (sort) {
      case 'date_asc':  arr.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)); break
      case 'amount_desc': arr.sort((a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount))); break
      case 'amount_asc':  arr.sort((a, b) => Math.abs(Number(a.amount)) - Math.abs(Number(b.amount))); break
      case 'category':
        arr.sort((a, b) => {
          const an = catName(a.category_id), bn = catName(b.category_id)
          // Uncategorized sinks to the bottom
          if (!an && bn) return 1
          if (an && !bn) return -1
          if (an !== bn) return an < bn ? -1 : 1
          return a.date < b.date ? 1 : -1   // newest first within a category
        })
        break
      default: arr.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    }
    return arr
  }, [filtered, sort, categories])

  // When grouping is on, build [{ category, rows:[] }] sections in display order.
  const grouped = useMemo(() => {
    if (!groupByCategory) return null
    const map = new Map()
    for (const t of sorted) {
      const key = t.category_id || '__none'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(t)
    }
    const sections = [...map.entries()].map(([key, rows]) => {
      const cat = categories.find(c => c.id === key)
      return {
        key,
        name: cat?.name || 'Uncategorized',
        color: cat?.color || 'var(--ink-faint)',
        rows,
        total: rows.reduce((s, t) => s + Number(t.amount), 0),
      }
    })
    // Sections sorted by name, Uncategorized last
    sections.sort((a, b) => {
      if (a.key === '__none') return 1
      if (b.key === '__none') return -1
      return a.name < b.name ? -1 : 1
    })
    return sections
  }, [groupByCategory, sorted, categories])

  const totals = useMemo(() => {
    const income = filtered.filter(t => Number(t.amount) > 0).reduce((s, t) => s + Number(t.amount), 0)
    const expense = filtered.filter(t => Number(t.amount) < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0)
    return { income, expense, net: income - expense }
  }, [filtered])

  const clearFilters = () => {
    setSearch(''); setFilterCategory(''); setFilterAccount(''); setStartDate(''); setEndDate('')
  }
  const hasFilters = search || filterCategory || filterAccount || startDate || endDate

  // Short label for the active date range, shown on the income/expense cards.
  const fmtShort = (iso) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  const rangeLabel =
    startDate && endDate ? `${fmtShort(startDate)} – ${fmtShort(endDate)}`
    : startDate ? `from ${fmtShort(startDate)}`
    : endDate ? `through ${fmtShort(endDate)}`
    : ''

  const openNew = () => {
    setEditing({ date: todayISO(), description: '', amount: 0, category_id: null, account_id: null, notes: '' })
    setModalOpen(true)
  }
  const openEdit = (t) => { setEditing({ ...t }); setModalOpen(true) }
  const handleSave = async () => {
    const payload = {
      date: editing.date,
      description: editing.description,
      amount: editing.amount,
      category_id: editing.category_id || null,
      account_id: editing.account_id || null,
      notes: editing.notes,
      source: 'manual'
    }
    if (editing.id) await update(editing.id, payload)
    else await insert(payload)
    setModalOpen(false); setEditing(null)
  }

  // A single ledger row, shared by flat + grouped renders.
  const Row = ({ t }) => {
    const cat = categories.find(c => c.id === t.category_id)
    const acct = accounts.find(a => a.id === t.account_id)
    const isExpense = Number(t.amount) < 0
    return (
      <tr>
        <td className="mono col-date">{t.date}</td>
        <td className="col-desc">
          <span className="tx-desc">{t.description}</span>
          {t.notes && <span className="tx-note">{t.notes}</span>}
        </td>
        {!groupByCategory && (
          <td className="col-cat">
            {cat ? (
              <span className="cat-chip">
                <span className="dot" style={{ background: cat.color }}></span>{cat.name}
              </span>
            ) : <span style={{ color: 'var(--ink-faint)' }}>—</span>}
          </td>
        )}
        <td className="col-acct">{acct?.name || <span style={{ color: 'var(--ink-faint)' }}>—</span>}</td>
        <td className={'num amount col-amt ' + (isExpense ? 'amount-neg' : 'amount-pos')}>
          {fmt(t.amount, { signed: true })}
        </td>
        <td className="col-act">
          <button className="icon-btn" onClick={() => openEdit(t)} title="Edit">&#9998;</button>
          <button className="icon-btn" onClick={() => {
            const id = t.id
            const timer = setTimeout(async () => {
              setPendingTx(p => { const s = new Set(p); s.delete(id); return s })
              await remove(id)
            }, 5000)
            setPendingTx(p => new Set([...p, id]))
            toast.show('Transaction deleted.', {
              actionLabel: 'Undo',
              onAction: () => {
                clearTimeout(timer)
                setPendingTx(p => { const s = new Set(p); s.delete(id); return s })
              },
            })
          }} title="Delete" aria-label="Delete transaction">&times;</button>
        </td>
      </tr>
    )
  }

  return (
    <div className="ledger-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Ledger</p>
          <h1>Transactions</h1>
          <p>Every line. Filter by date range, sort by category, edit in place.</p>
        </div>
        <button className="btn" onClick={openNew}>+ Add transaction</button>
      </div>

      <div className="grid-3" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-card accent">
          <div className="stat-label">Income {rangeLabel ? '· ' + rangeLabel : '(filtered)'}</div>
          <div className="stat-value">{fmt(totals.income, { showCents: false })}</div>
        </div>
        <div className="stat-card warm">
          <div className="stat-label">Expense {rangeLabel ? '· ' + rangeLabel : '(filtered)'}</div>
          <div className="stat-value">{fmt(totals.expense, { showCents: false })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Net</div>
          <div className="stat-value" style={{ color: totals.net >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
            {fmt(totals.net, { showCents: false, signed: true })}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="tx-filters">
          <input className="input" placeholder="Search description..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="select" value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)} aria-label="Account">
            <option value="">All accounts</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div className="tx-daterange">
          <div className="field tx-date-field">
            <label htmlFor="tx-start">From</label>
            <input
              id="tx-start"
              className="input mono"
              type="date"
              value={startDate}
              min={dateExtent.min || undefined}
              max={dateExtent.max || undefined}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="field tx-date-field">
            <label htmlFor="tx-end">To</label>
            <input
              id="tx-end"
              className="input mono"
              type="date"
              value={endDate}
              min={dateExtent.min || undefined}
              max={dateExtent.max || undefined}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          {(startDate || endDate) && (
            <button className="btn btn-ghost btn-sm tx-date-clear" onClick={() => { setStartDate(''); setEndDate('') }}>
              Clear dates
            </button>
          )}
          {rangeInvalid && <span className="tx-range-warn">Start date is after end date</span>}
        </div>
        <div className="tx-filters-row2">
          <label className="check-inline">
            <input type="checkbox" checked={groupByCategory} onChange={(e) => setGroupByCategory(e.target.checked)} />
            Group by category
          </label>
          <span className="tx-count">{sorted.length} of {transactions.length}</span>
          {hasFilters && <button className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear filters</button>}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="ledger ledger-tight">
          <thead>
            <tr>
              <th className="col-date">Date</th>
              <th className="col-desc">Description</th>
              {!groupByCategory && <th className="col-cat">Category</th>}
              <th className="col-acct">Account</th>
              <th className="col-amt" style={{ textAlign: 'right' }}>Amount</th>
              <th className="col-act"></th>
            </tr>
          </thead>
          {grouped ? (
            grouped.map(section => (
              <tbody key={section.key} className="tx-group">
                <tr className="tx-group-head">
                  <td colSpan={5}>
                    <span className="cat-chip">
                      <span className="dot" style={{ background: section.color }}></span>
                      <strong>{section.name}</strong>
                      <span className="tx-group-count">{section.rows.length}</span>
                    </span>
                  </td>
                  <td className="num" style={{ textAlign: 'right', color: section.total < 0 ? 'var(--negative)' : 'var(--positive)' }}>
                    {fmt(section.total, { showCents: false, signed: true })}
                  </td>
                </tr>
                {section.rows.map(t => <Row key={t.id} t={t} />)}
              </tbody>
            ))
          ) : (
            <tbody>
              {sorted.map(t => <Row key={t.id} t={t} />)}
            </tbody>
          )}
        </table>
        {sorted.length === 0 && (
          <div className="empty">
            <h3>No transactions match</h3>
            <p>Try clearing your filters, or add your first transaction.</p>
          </div>
        )}
      </div>

      {modalOpen && editing && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <h2>{editing.id ? 'Edit transaction' : 'New transaction'}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Date</label>
                  <input className="input" type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} />
                </div>
                <div className="field">
                  <label>Amount (- for expense)</label>
                  <input className="input mono" type="number" step="0.01" value={editing.amount} onChange={(e) => setEditing({ ...editing, amount: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="field">
                <label>Description</label>
                <input className="input" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Wegmans, paycheck, etc." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="field">
                  <label>Category</label>
                  <select className="select" value={editing.category_id || ''} onChange={(e) => setEditing({ ...editing, category_id: e.target.value || null })}>
                    <option value="">— None —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Account</label>
                  <select className="select" value={editing.account_id || ''} onChange={(e) => setEditing({ ...editing, account_id: e.target.value || null })}>
                    <option value="">— None —</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Notes</label>
                <input className="input" value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>
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
