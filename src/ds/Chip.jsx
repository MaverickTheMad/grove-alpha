// DS · Chip — filter pill. `active` applies .chip.on.
export default function Chip({ active, onClick, children, className = '', ...rest }) {
  const cls = ['chip', active ? 'on' : '', className].filter(Boolean).join(' ')
  return (
    <button type="button" className={cls} onClick={onClick} {...rest}>
      {children}
    </button>
  )
}
