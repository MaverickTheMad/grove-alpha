// DS · AppCard — dot-labeled metric card (lifted from profile/index.jsx).
export default function AppCard({ dotColor, label, children, wide = false }) {
  return (
    <div className={'profile-b-card' + (wide ? ' profile-b-card--wide' : '')}>
      <div className="profile-b-head">
        <div className="profile-b-dot" style={{ background: dotColor }} />
        <span className="profile-b-label">{label}</span>
      </div>
      {children}
    </div>
  )
}
