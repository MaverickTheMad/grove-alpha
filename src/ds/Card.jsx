// DS · Card — wraps .card. Use `as="button"` for clickable cards.
export default function Card({ as: Tag = 'div', className = '', children, onClick, style, ...rest }) {
  const cls = ['card', className].filter(Boolean).join(' ')
  return (
    <Tag className={cls} onClick={onClick} style={style} {...rest}>
      {children}
    </Tag>
  )
}
