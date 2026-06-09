import Icon from './Icon'

// A port-ready placeholder. The shell, nav, accent, and data layer are real;
// this marks exactly what real-source logic drops in here (§9 port plan, §13 #5).
// Each scaffold tab still demonstrates the live data.js path via an optional demo.
export default function ScaffoldTab({ title, sub, emoji, portsHere = [], children }) {
  return (
    <main className="screen">
      <div className="page-head">
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>

      <div className="empty">
        <span className="big">{emoji}</span>
        <p className="line">Ready for its real screen</p>
      </div>

      {portsHere.length > 0 && (
        <div className="scaffold-note">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
            <Icon name="info" size={16} /> <strong>Ports here from the real repo</strong>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.1em' }}>
            {portsHere.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </div>
      )}

      {children}
    </main>
  )
}
