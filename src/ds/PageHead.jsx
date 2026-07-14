// DS · PageHead — .page-head block: display-font h1 + optional subtitle.
export default function PageHead({ title, sub, children }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      {sub && <p className="sub">{sub}</p>}
      {children}
    </div>
  )
}
