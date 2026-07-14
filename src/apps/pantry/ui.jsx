// Re-export everything from the DS so existing pantry imports keep working.
export { default as Checkbox } from '../../ds/Checkbox'
export { default as SectionHeader } from '../../ds/SectionHeader'
export { default as SectionLabel } from '../../ds/SectionLabel'

// PageHeader stays local — it has Pantry-specific eyebrow copy not worth generalising.
export function PageHeader({ title, action }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: '10.5px', color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Pantry</div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.95rem', fontWeight: 600, color: 'var(--text)', margin: 0, lineHeight: 1.1 }}>{title}</h1>
        {action && <div style={{ flexShrink: 0, marginTop: 2 }}>{action}</div>}
      </div>
    </div>
  )
}

// Empty re-exported from DS (icon-based variant).
export { default as Empty } from '../../ds/EmptyState'
