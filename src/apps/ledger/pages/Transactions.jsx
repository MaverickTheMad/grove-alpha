import { useState, useMemo } from 'react'
import { useRecords } from '../lib/useRecords'
import { usePeople } from '../lib/people'
import { byName } from '../../../lib/sort'
import { fmt, todayISO } from '../lib/format'
import { useToast } from '../../../components/Toast'
import { useIsDesktop } from '../../../lib/viewport'
import Sheet from '../../../components/Sheet'

const SORTS = [
  { id: 'date_desc', label: 'Newest first' },
  { id: 'date_asc',  label: 'Oldest first' },
  { id: 'category',  label: 'By category' },
  { id: 'amount_desc', label: 'Largest first' },
  { id: 'amount_asc',  label: 'Smallest first' },
]

export default function Transactions() {
  const { data: transactions, insert, update, remove } = useRecords('transaction', { orderBy: 'date', ascending: false })
  const { data: categories } = useRecords('category', { orderBy: 'name' })
  const { data: accounts } = useRecords('account', { orderBy: 'name' })
  const { data: people } = usePeople()
  const toast = useToast()
  const isDesktop = useIsDesktop(720)
  const [pendingTx, setPendingTx] = useState(new Set())

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterAccount, setFilterAccount] = useState('')
  const [filterPerson, setFilterPerson] = useState('')
  const [sort, setSort] = useState('date_desc')
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const sortedCategories = useMemo(() => [...categories].sort(byName), [categories])
  const sortedAccounts = useMemo(() => [...accounts].sort(byName), [accounts])

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (pendingTx.has(t.id)) return false
      if (search && !t.description?.toLowerCase().includes(search.toLowerCase())) return false
      if (filterCategory && t.category_id !== filterCategory) return false
      if (filterAccount && t.account_id !== filterAccount) return false
      if (filterPerson) {
        if (filterPerson === '__untagged') { if (t.person_id != null) return false }
        else if (t.person_id !== filterPerson) return false
      }
      return true
    })
  }, [transactions, pendingTx, search, filterCategory, filterAccount, filterPerson])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    switch (sort) {
      case 'date_asc':    arr.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)); break
      case 'amount_desc': arr.sort((a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount))); break
      case 'amount_asc':  arr.sort((a, b) => Math.abs(Number(a.amount)) - Math.abs(Number(b.amount))); break
      case 'category': {
        const catName = (id) => categories.find(c => c.id === id)?.name || ''
        arr.sort((a, b) => {
          const an = catName(a.category_id), bn = catName(b.category_id)
          if (!an && bn) return 1; if (an && !bn) return -1
          if (an !== bn) return an < bn ? -1 : 1
          return a.date < b.date ? 1 : -1
        })
        break
      }
      default: arr.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    }
    return arr
  }, [filtered, sort, categories])

  const hasFilters = search || filterCategory || filterAccount || filterPerson
  const clearFilters = () => { setSearch(''); setFilterCategory(''); setFilterAccount(''); setFilterPerson('') }

  const openNew = () => { setEditing({ date: todayISO(), description: '', amount: 0, category_id: null, account_id: null, person_id: null, notes: '' }); setModalOpen(true) }
  const openEdit = (t) => { setEditing({ ...t }); setModalOpen(true) }

  const handleSave = async () => {
    const payload = {
      date: editing.date, description: editing.description, amount: editing.amount,
      category_id: editing.category_id || null, account_id: editing.account_id || null,
      person_id: editing.person_id || null, notes: editing.notes, source: 'manual'
    }
    if (editing.id) await update(editing.id, payload)
    else await insert(payload)
    setModalOpen(false); setEditing(null)
  }

  const handleDelete = (t) => {
    const id = t.id
    let timer = setTimeout(async () => {
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
  }

  const FilterControls = ({ inSheet = false }) => (
    <div style={inSheet ? { display: 'flex', flexDirection: 'column', gap: '0.75rem' } : {}}>
      <input className="input" placeholder="Search description…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <select className="select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} aria-label="Category">
        <option value="">All categories</option>
        {sortedCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select className="select" value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)} aria-label="Account">
        <option value="">All accounts</option>
        {sortedAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <select className="select" value={filterPerson} onChange={(e) => setFilterPerson(e.target.value)} aria-label="Person">
        <option value="">All people</option>
        {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        <option value="__untagged">Untagged</option>
      </select>
      <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
        {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
      {hasFilters && <button className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear filters</button>}
    </div>
  )

  const Row = ({ t }) => {
    const cat = categories.find(c => c.id === t.category_id)
    const acct = accounts.find(a => a.id === t.account_id)
    const person = people.find(p => p.id === t.person_id)
    const isExpense = Number(t.amount) < 0
    return (
      <tr>
        <td className="mono col-date">{t.date}</td>
        <td className="col-desc">
          <span className="tx-desc">{t.description}</span>
          {t.notes && <span className="tx-note">{t.notes}</span>}
          {cat && (
            <span className="tx-mobile-cat cat-chip">
              <span className="dot" style={{ background: cat.color }}></span>{cat.name}
            </span>
          )}
        </td>
        <td className="col-cat">
          {cat ? (
            <span className="cat-chip">
              <span className="dot" style={{ background: cat.color }}></span>{cat.name}
            </span>
          ) : <span style={{ color: 'var(--ink-faint)' }}>—</span>}
        </td>
        <td className="col-acct">{acct?.name || <span style={{ color: 'var(--ink-faint)' }}>—</span>}</td>
        <td className="col-person">
          {person ? (
            <span className="cat-chip">
              <span className="dot" style={{ background: person.color }}></span>{person.name}
            </span>
          ) : <span style={{ color: 'var(--ink-faint)' }}>—</span>}
        </td>
        <td className={'num amount col-amt ' + (isExpense ? 'amount-neg' : 'amount-pos')}>
          {fmt(t.amount, { signed: true })}
        </td>
        <td className="col-act">
          <button className="icon-btn" onClick={() => openEdit(t)} title="Edit">&#9998;</button>
          <button className="icon-btn" onClick={() => handleDelete(t)} title="Delete" aria-label="Delete transaction">&times;</button>
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
        </div>
        <button className="btn" onClick={openNew}>Add transaction</button>
      </div>

      {isDesktop ? (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="tx-filters-desktop">
            <FilterControls />
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setFilterSheetOpen(true)} style={{ flex: 1 }}>
            Filters{hasFilters ? ' ·' : ''}{hasFilters ? ` ${[search && 'search', filterCategory && 'category', filterAccount && 'account', filterPerson && 'person'].filter(Boolean).length} active` : ''}
          </button>
          {hasFilters && <button className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear</button>}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-2)', fontSize: 'var(--fs-xs)', color: 'var(--text-soft)' }}>
        <span className="tx-count">{sorted.length} of {transactions.length}</span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="ledger ledger-tight">
          <thead>
            <tr>
              <th className="col-date">Date</th>
              <th className="col-desc">Description</th>
              <th className="col-cat">Category</th>
              <th className="col-acct">Account</th>
              <th className="col-person">Person</th>
              <th className="col-amt" style={{ textAlign: 'right' }}>Amount</th>
              <th className="col-act"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(t => <Row key={t.id} t={t} />)}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="empty">
            <h3>{transactions.length === 0 ? 'No transactions yet' : 'No transactions match'}</h3>
            <p>{transactions.length === 0 ? 'Add your first transaction to start tracking.' : 'Try clearing your filters.'}</p>
          </div>
        )}
      </div>

      <Sheet open={filterSheetOpen} onClose={() => setFilterSheetOpen(false)} title="Filters" footer={
        <button className="btn" style={{ width: '100%' }} onClick={() => setFilterSheetOpen(false)}>Done</button>
      }>
        <div style={{ padding: 'var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <FilterControls inSheet />
        </div>
      </Sheet>

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
                  <label>Amount (– for expense)</label>
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
                    {sortedCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Account</label>
                  <select className="select" value={editing.account_id || ''} onChange={(e) => setEditing({ ...editing, account_id: e.target.value || null })}>
                    <option value="">— None —</option>
                    {sortedAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Person</label>
                <select className="select" value={editing.person_id || ''} onChange={(e) => setEditing({ ...editing, person_id: e.target.value || null })}>
                  <option value="">— Shared —</option>
                  {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
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
