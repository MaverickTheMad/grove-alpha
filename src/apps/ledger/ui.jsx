// Grove SubTabs — in-page segmented nav (Money = Transactions/Imports/Rules,
// Plan = Budgets/Bills/Goals/Snowball). Local state instead of the router.
export function SubTabs({ tabs, current, onChange }) {
  return (
    <div className="subtabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={current === t.id}
          className={'subtab' + (current === t.id ? ' active' : '')}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

// Placeholder for pages not yet ported in this pass.
export function Stub({ title }) {
  return (
    <div className="ledger-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Ledger</p>
          <h1>{title}</h1>
          <p>Coming in the next pass.</p>
        </div>
      </div>
      <div className="card"><div className="empty"><p>This section is being ported to Grove.</p></div></div>
    </div>
  )
}
