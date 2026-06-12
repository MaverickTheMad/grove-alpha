import { useEffect, useRef } from 'react'

// One Sheet for the whole suite (build-spec §9 — copied, never forked).
// Mobile: slides up from the bottom (thumb zone, UI-POLISH §9).
// Desktop ≥720px: renders as a centered dialog (App.css media query).
// Close button, body-scroll lock, focus trap + restore are all built in.
//
// Class names: outputs BOTH canonical (sheet-scrim, sheet-footer) AND legacy
// fork names (sheet-backdrop, sheet-foot) so per-app CSS rules keep working
// without touching each app's stylesheet.
export default function Sheet({ open, onClose, title, children, footer }) {
  const sheetRef = useRef(null)
  const triggerRef = useRef(null)

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Save trigger, move focus in
  useEffect(() => {
    if (!open) return
    triggerRef.current = document.activeElement
    const t = setTimeout(() => {
      const focusable = sheetRef.current?.querySelectorAll(
        'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )
      focusable?.[0]?.focus()
    }, 50)
    return () => clearTimeout(t)
  }, [open])

  // Restore focus on close
  useEffect(() => {
    if (open) return
    triggerRef.current?.focus()
  }, [open])

  // Escape + Tab trap
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose?.(); return }
      if (e.key === 'Tab' && sheetRef.current) {
        const els = Array.from(sheetRef.current.querySelectorAll(
          'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
        ))
        if (!els.length) return
        const first = els[0], last = els[els.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    /* sheet-backdrop kept alongside sheet-scrim for per-app CSS compat */
    <div className="sheet-scrim sheet-backdrop" onClick={onClose}>
      <div
        ref={sheetRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-grip" aria-hidden />
        {title && (
          <div className="sheet-head">
            <h2 className="sheet-title">{title}</h2>
            <button className="sheet-x" onClick={onClose} aria-label="Close">✕</button>
          </div>
        )}
        <div className="sheet-body">{children}</div>
        {/* sheet-foot kept alongside sheet-footer for per-app CSS compat */}
        {footer && <div className="sheet-foot sheet-footer">{footer}</div>}
      </div>
    </div>
  )
}
