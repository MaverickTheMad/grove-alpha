import Sheet from '../components/Sheet'

// DS · Confirm — confirmation sheet (lifted from pets/components/Confirm.jsx).
// The destructive action is de-emphasized; the keep-current path is dominant.
export default function Confirm({
  open,
  onClose,
  onConfirm,
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
