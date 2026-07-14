import Icon from '../components/Icon'

// DS · EmptyState — wraps .empty pattern.
// icon: Icon name string OR an emoji string
// title: optional display-font heading
// message: body text
// action: optional CTA node
export default function EmptyState({ icon, title, message, action, card, children }) {
  const cls = card ? 'card empty' : 'empty'
  return (
    <div className={cls}>
      {icon && (
        <span className="big">
          {typeof icon === 'string' && icon.length <= 2
            ? icon
            : <Icon name={icon} size={34} />}
        </span>
      )}
      {title && <h2 className="empty-title">{title}</h2>}
      {message && <p className="line">{message}</p>}
      {action}
      {children}
    </div>
  )
}
