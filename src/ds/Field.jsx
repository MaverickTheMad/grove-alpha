// DS · Field — label + input/select/textarea wrapper.
// Renders a <label> with .field-label above the child .input element.
export default function Field({ label, htmlFor, children, style }) {
  return (
    <div style={style}>
      {label && <label className="field-label" htmlFor={htmlFor}>{label}</label>}
      {children}
    </div>
  )
}

// Convenience: a plain <input> with .input class
export function Input({ className = '', ...props }) {
  return <input className={['input', className].filter(Boolean).join(' ')} {...props} />
}

// Convenience: a <select> with .input class
export function Select({ className = '', children, ...props }) {
  return (
    <select className={['input', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </select>
  )
}

// Convenience: a <textarea> with .input class
export function Textarea({ className = '', ...props }) {
  return <textarea className={['input', className].filter(Boolean).join(' ')} {...props} />
}
