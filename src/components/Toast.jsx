import { useEffect, useState, useCallback, createContext, useContext } from 'react'

// Grove's calm undo pattern (UI-POLISH §4): high-frequency deletes get a
// 5s "Deleted · Undo" toast instead of a modal on every tap.
const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const show = useCallback((message, { actionLabel, onAction, duration = 5000 } = {}) => {
    setToast({ message, actionLabel, onAction, id: Date.now() })
    if (duration) {
      const t = setTimeout(() => setToast((cur) => (cur && cur.message === message ? null : cur)), duration)
      return () => clearTimeout(t)
    }
  }, [])

  const dismiss = useCallback(() => setToast(null), [])

  return (
    <ToastCtx.Provider value={{ show, dismiss }}>
      {children}
      {toast && (
        <div className="toast" role="status">
          <span className="grow">{toast.message}</span>
          {toast.actionLabel && (
            <button
              className="toast-action"
              onClick={() => {
                toast.onAction?.()
                dismiss()
              }}
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
      )}
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
