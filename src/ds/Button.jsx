// DS · Button — wraps .btn CSS classes with typed variant/size props.
// variant: 'default' | 'primary' | 'ghost' | 'danger'
// size: 'md' (default) | 'sm'
export default function Button({
  variant = 'default',
  size,
  block,
  disabled,
  onClick,
  type = 'button',
  children,
  style,
  className = '',
  ...rest
}) {
  const cls = [
    'btn',
    variant !== 'default' ? variant : '',
    size === 'sm' ? 'sm' : '',
    block ? 'block' : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <button type={type} className={cls} disabled={disabled} onClick={onClick} style={style} {...rest}>
      {children}
    </button>
  )
}
