// DS · SectionHeader — eyebrow + h2 + subtitle (lifted from pantry/ui.jsx).
export default function SectionHeader({ eyebrow, title, subtitle }) {
  return (
    <div style={{ marginBottom: 'var(--sp-5)' }}>
      <div className="p-eyebrow">{eyebrow}</div>
      <h2 className="p-h2">{title}</h2>
      {subtitle && <p className="p-sub">{subtitle}</p>}
    </div>
  )
}
