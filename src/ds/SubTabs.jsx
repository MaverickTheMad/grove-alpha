// DS · SubTabs — in-page segmented navigation (lifted from ledger/ui.jsx).
// tabs: [{ id, label }]
export default function SubTabs({ tabs, current, onChange }) {
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
