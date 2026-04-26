import Modal from './Modal.jsx';
import Button from './Button.jsx';

export default function Confirm({ open, onClose, onConfirm, title = 'Are you sure?', description, confirmText = 'Confirm', danger }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm?.(); onClose?.(); }}>{confirmText}</Button>
        </>
      }
    >
      {description && <p className="text-sm text-slate-600">{description}</p>}
    </Modal>
  );
}
