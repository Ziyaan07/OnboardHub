import React, { useEffect } from "react";
import Spinner from "./Spinner";

export function Modal({ isOpen, onClose, title, children, confirmLabel, confirmVariant = "primary", onConfirm, isBusy = false }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen && !isBusy) {
        onClose();
      }
    }
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isBusy, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={!isBusy ? onClose : undefined}>
      <div
        className="modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 id="modal-title" className="modal-title">{title}</h3>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={isBusy}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {children}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isBusy}
          >
            Cancel
          </button>
          {onConfirm && (
            <button
              type="button"
              className={`btn btn-${confirmVariant}`}
              onClick={onConfirm}
              disabled={isBusy}
            >
              {isBusy && <Spinner size={14} className="btn-spinner-spacing" />}
              {confirmLabel || "Confirm"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Modal;
