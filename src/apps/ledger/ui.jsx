// Re-export from the DS so existing imports keep working without changes.
export { default as SubTabs } from '../../ds/SubTabs'

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
