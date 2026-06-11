import { useEffect } from 'react'

// Auto-dismissing toast with an Undo button. Polish §4: prefer undo for high-frequency
// deletes; modal for the rare/bulk stuff.
export default function Toast({ toast, onUndo, onDismiss, ms = 5000 }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onDismiss, ms)
    return () => clearTimeout(t)
  }, [toast, onDismiss, ms])

  if (!toast) return null

  return (
    <div className="toast-stack">
      <div className="toast" role="status">
        <span className="grow">{toast.message}</span>
        {toast.undo && (
          <button className="toast-undo" onClick={() => { onUndo(); onDismiss() }}>
            Undo
          </button>
        )}
      </div>
    </div>
  )
}
