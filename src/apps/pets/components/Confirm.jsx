import Sheet from './Sheet.jsx'

// Confirm sheet with consequence copy. The destructive button is small/ghost-danger
// (de-emphasized), the keep-current path is the visually dominant default.
export default function Confirm({
  open, onClose, onConfirm,
  title = 'Are you sure?',
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Keep',
  destructive = true,
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="sheet-foot row-btns">
          <button
            className={destructive ? 'btn ghost danger' : 'btn ghost'}
            onClick={() => { onConfirm(); onClose() }}
          >
            {confirmLabel}
          </button>
          <button className="btn primary" onClick={onClose}>{cancelLabel}</button>
        </div>
      }
    >
      <div className="confirm-body">{body}</div>
    </Sheet>
  )
}
