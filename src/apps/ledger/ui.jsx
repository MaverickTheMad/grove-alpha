<<<<<<< HEAD
// Grove SubTabs — in-page segmented nav (Money = Transactions/Imports/Rules,
// Plan = Budgets/Bills/Goals/Snowball). Local state instead of the router.
export function SubTabs({ tabs, current, onChange, name }) {
  return (
    <div className="subtabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          id={name ? `${name}-tab-${t.id}` : undefined}
          aria-selected={current === t.id}
          aria-controls={name ? `${name}-panel-${t.id}` : undefined}
          className={'subtab' + (current === t.id ? ' active' : '')}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
=======
// Re-export from the DS so existing imports keep working without changes.
export { default as SubTabs } from '../../ds/SubTabs'
>>>>>>> ca3770d455fcfc019218e512eafbdf0b3fb407fc

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
