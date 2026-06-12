import { useEffect, useRef } from 'react'

// One Sheet for the whole suite (build-spec §9 — copied, never forked).
// Mobile: slides up from the bottom (thumb zone, UI-POLISH §9).
// Desktop ≥720px: renders as a centered dialog (App.css media query handles the visual switch).
// Focus is trapped inside while open and restored to the trigger on close (Phase 1 a11y).
export default function Sheet({ open, onClose, title, children, footer }) {
  const sheetRef = useRef(null)
  const triggerRef = useRef(null)

  // On open: save current focus so we can restore it, then move focus into sheet
  useEffect(() => {
    if (!open) return
    triggerRef.current = document.activeElement
    const t = setTimeout(() => {
      const focusable = sheetRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      focusable?.[0]?.focus()
    }, 50) // after animation frame
    return () => clearTimeout(t)
  }, [open])

  // On close: restore focus to the element that triggered the sheet
  useEffect(() => {
    if (open) return
    triggerRef.current?.focus()
  }, [open])

  // Keyboard: Escape closes; Tab is trapped within the sheet
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose?.(); return }
      if (e.key === 'Tab' && sheetRef.current) {
        const focusable = Array.from(
          sheetRef.current.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        )
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div
        ref={sheetRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grip" aria-hidden />
        {title && <h2 className="sheet-title">{title}</h2>}
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-footer">{footer}</div>}
      </div>
    </div>
  )
}
