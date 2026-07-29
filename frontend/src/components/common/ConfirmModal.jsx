import { FiAlertTriangle, FiX } from 'react-icons/fi';

export default function ConfirmModal({
  open,
  title = 'Xác nhận thao tác',
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  danger = true,
  onConfirm,
  onCancel,
  busy = false,
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop-custom" role="presentation" onMouseDown={() => {
      if (!busy) onCancel();
    }}>
      <div className="confirm-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <button className="icon-button modal-close" disabled={busy} onClick={onCancel} aria-label="Đóng"><FiX /></button>
        <div className={`confirm-icon ${danger ? 'danger' : ''}`}><FiAlertTriangle /></div>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="btn btn-light" disabled={busy} onClick={onCancel}>{cancelText}</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={busy} onClick={onConfirm}>
            {busy ? 'Đang xử lý…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
