// DS · SubTabs — in-page segmented navigation (lifted from ledger/ui.jsx).
// tabs: [{ id, label }]  name: optional namespace prefix for ARIA tab/panel IDs
export default function SubTabs({ tabs, current, onChange, name }) {
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
