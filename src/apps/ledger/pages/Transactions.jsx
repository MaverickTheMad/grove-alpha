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

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="11" cy="11" r="7" stroke="var(--text-soft)" strokeWidth="1.8"/>
    <path d="m20 20-3.5-3.5" stroke="var(--text-soft)" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

const IconFilter = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M3 5h18M6 12h12M10 19h4" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

export default function Transactions() {
  const { data: transactions, insert, update, remove } = useRecords('transaction', { orderBy: 'date', ascending: false })
  const { data: categories } = useRecords('category', { orderBy: 'name' })
  const { data: accounts } = useRecords('account', { orderBy: 'name' })
  const { data: people } = usePeople()
  const toast = useToast()
  const isDesktop = useIsDesktop(1080)
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

  const CategoryChip = ({ catId, small }) => {
    const cat = categories.find(c => c.id === catId)
    if (!cat) return <span style={{ color: 'var(--text-soft)' }}>—</span>
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: 6, padding: small ? '3px 9px' : '4px 9px', fontSize: small ? 'var(--fs-xs)' : '0.76rem' }}>
        <span style={{ width: small ? 8 : 9, height: small ? 8 : 9, borderRadius: 2, background: cat.color, flexShrink: 0 }} />
        {cat.name}
      </span>
    )
  }

  const PersonChip = ({ personId }) => {
    const person = people.find(p => p.id === personId)
    if (!person) return <span style={{ color: 'var(--text-soft)' }}>—</span>
    const color = person.color || 'var(--app-accent)'
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
        <span style={{ width: 16, height: 16, borderRadius: '50%', background: color, color: '#0B0F09', fontSize: '0.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {person.name?.[0]?.toUpperCase()}
        </span>
        {person.name}
      </span>
    )
  }

  const emptyState = transactions.length === 0 ? (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 36px' }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="6" width="18" height="12" rx="2.5" stroke="var(--app-accent)" strokeWidth="1.8"/>
          <circle cx="12" cy="12" r="2.4" fill="var(--app-accent)"/>
        </svg>
      </div>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--fs-xl)', color: 'var(--text)', margin: '0 0 8px' }}>No transactions yet</h3>
      <p style={{ color: 'var(--text-soft)', fontSize: 'var(--fs-base)', lineHeight: 1.6, margin: '0 0 24px', maxWidth: '36ch' }}>Add your first transaction, or import a bank statement to fill this log automatically.</p>
      <button style={{ background: 'var(--accent)', color: '#0B0F09', border: 'none', borderRadius: 12, padding: '13px 22px', fontFamily: 'inherit', fontWeight: 600, fontSize: 'var(--fs-base)', cursor: 'pointer', marginBottom: 12 }} onClick={openNew}>
        Add a transaction
      </button>
    </div>
  ) : (
    <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-soft)', fontSize: 'var(--fs-sm)' }}>
      No transactions match your filters. <button style={{ background: 'none', border: 'none', color: 'var(--app-accent)', cursor: 'pointer', fontWeight: 600 }} onClick={clearFilters}>Clear filters</button>
    </div>
  )

  return (
    <div className="ledger-page" style={{ paddingTop: isDesktop ? 'var(--sp-5)' : undefined }}>

      {/* Filter bar */}
      {isDesktop ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <label style={{ flex: 1, maxWidth: 280, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: 12, padding: '0 12px', height: 40 }}>
            <IconSearch />
            <input
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 'var(--fs-sm)', flex: 1, width: '100%' }}
              placeholder="Search description"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select className="ov-filter-sel" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} aria-label="Category">
            <option value="">Category</option>
            {sortedCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="ov-filter-sel" value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)} aria-label="Account">
            <option value="">Account</option>
            {sortedAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select className="ov-filter-sel" value={filterPerson} onChange={(e) => setFilterPerson(e.target.value)} aria-label="Person">
            <option value="">Person</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            <option value="__untagged">Untagged</option>
          </select>
          <button style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--accent)', color: '#0B0F09', border: 'none', borderRadius: 12, height: 40, padding: '0 16px', fontFamily: 'inherit', fontWeight: 600, fontSize: 'var(--fs-sm)', cursor: 'pointer' }} onClick={openNew}>
            <IconPlus />
            Add a transaction
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: 12, padding: '0 12px', height: 40 }}>
            <IconSearch />
            <input
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 'var(--fs-sm)', flex: 1, width: '100%' }}
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <button onClick={() => setFilterSheetOpen(true)} style={{ width: 44, height: 40, borderRadius: 12, background: 'var(--bg-paper)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <IconFilter />
          </button>
        </div>
      )}

      {/* Desktop table */}
      {isDesktop ? (
        <div style={{ border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', background: 'var(--bg-paper)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 150px 130px 130px 130px 72px', alignItems: 'center', padding: '12px 18px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-soft)' }}>
            <div style={{ color: 'var(--text)' }}>Date</div>
            <div>Description</div>
            <div>Category</div>
            <div>Account</div>
            <div>Person</div>
            <div style={{ textAlign: 'right' }}>Amount</div>
            <div></div>
          </div>
          {sorted.length === 0 ? emptyState : sorted.map(t => {
            const acct = accounts.find(a => a.id === t.account_id)
            const isIncome = Number(t.amount) > 0
            return (
              <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 150px 130px 130px 130px 72px', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--bg-elevated) 60%, transparent)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', color: 'var(--text-soft)' }}>{t.date}</div>
                <div style={{ fontSize: 'var(--fs-base)', minWidth: 0 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>
                  {t.notes && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-soft)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.notes}</div>}
                </div>
                <div><CategoryChip catId={t.category_id} /></div>
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-soft)' }}>{acct?.name || <span style={{ color: 'var(--text-soft)', opacity: .5 }}>—</span>}</div>
                <div><PersonChip personId={t.person_id} /></div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-base)', textAlign: 'right', color: isIncome ? 'var(--ok)' : 'var(--text)' }}>
                  {fmt(t.amount, { signed: true })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                  <button className="icon-btn" aria-label="Edit transaction" onClick={() => openEdit(t)}>&#9998;</button>
                  <button className="icon-btn" aria-label="Delete transaction" onClick={() => handleDelete(t)}>&times;</button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Mobile card list */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative' }}>
          {sorted.length === 0 ? emptyState : sorted.map(t => {
            const isIncome = Number(t.amount) > 0
            return (
              <div key={t.id} style={{ background: 'var(--bg-paper)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-soft)', flexShrink: 0 }}>{t.date}</span>
                    <span style={{ fontSize: 'var(--fs-base)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</span>
                  </div>
                  <CategoryChip catId={t.category_id} small />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', color: isIncome ? 'var(--ok)' : 'var(--text)', flexShrink: 0 }}>
                  {fmt(t.amount, { signed: true })}
                </span>
              </div>
            )
          })}
          {/* Mobile FAB */}
          <button
            onClick={openNew}
            style={{ position: 'fixed', right: 20, bottom: 84, width: 52, height: 52, borderRadius: '50%', background: 'var(--accent)', color: '#0B0F09', border: 'none', fontSize: '1.6rem', lineHeight: 1, boxShadow: '0 8px 20px rgba(0,0,0,.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
            aria-label="Add transaction"
          >
            +
          </button>
        </div>
      )}

      {/* Mobile filter sheet */}
      <Sheet open={filterSheetOpen} onClose={() => setFilterSheetOpen(false)} title="Filter transactions" footer={
        <button className="btn" style={{ width: '100%' }} onClick={() => setFilterSheetOpen(false)}>Show results</button>
      }>
        <div style={{ padding: 'var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <div className="field"><label>Category</label>
            <select className="select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">All categories</option>
              {sortedCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Account</label>
            <select className="select" value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)}>
              <option value="">All accounts</option>
              {sortedAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Person</label>
            <select className="select" value={filterPerson} onChange={(e) => setFilterPerson(e.target.value)}>
              <option value="">Anyone</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              <option value="__untagged">Untagged</option>
            </select>
          </div>
          <div className="field"><label>Sort</label>
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          {hasFilters && <button className="btn btn-ghost btn-sm" onClick={() => { clearFilters(); setFilterSheetOpen(false) }}>Clear all filters</button>}
        </div>
      </Sheet>

      {/* Add/Edit modal */}
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
