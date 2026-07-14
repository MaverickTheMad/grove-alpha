// DS · SectionLabel — uppercase section header with optional count badge (lifted from pantry/ui.jsx).
export default function SectionLabel({ name, count }) {
  return (
    <div className="p-seclabel">
      <span>{name}</span>
      {count != null && <span className="count">{count}</span>}
    </div>
  )
}
