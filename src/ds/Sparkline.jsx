// DS · Sparkline — mini bar chart (lifted from profile/index.jsx).
// bars: number[]  colorVar: CSS var string e.g. 'var(--col-fitness)'
export default function Sparkline({ bars, colorVar, height = 36 }) {
  if (!bars || !bars.length) return null
  const max = Math.max(...bars, 1)
  return (
    <div className="profile-sparkline" style={{ height }}>
      {bars.map((v, i) => (
        <div
          key={i}
          className="profile-spark-bar"
          style={{ height: `${Math.max(4, Math.round((v / max) * 100))}%`, background: colorVar }}
        />
      ))}
    </div>
  )
}
