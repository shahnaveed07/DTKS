import { AlertTriangle, X } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';

export default function ConfirmDialog() {
  const { confirmState, closeConfirm } = useApp();

  if (!confirmState) return null;

  const { title, message, confirmLabel, variant, onConfirm } = confirmState;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17231C]/45 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl border border-[#E3EBE5] bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="confirm-dialog-title"
                className="text-base font-semibold text-[#17231C]"
              >
                {title}
              </h2>
              <p className="mt-1.5 text-sm text-[#64756B] leading-relaxed">
                {message}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeConfirm}
            aria-label="Close confirmation dialog"
            className="text-[#64756B] hover:text-[#17231C] p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={closeConfirm}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-[#E3EBE5] text-[#17231C] hover:bg-[#F7FAF7] transition-colors whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm?.();
              closeConfirm();
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors whitespace-nowrap ${
              variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-[#16834A] hover:bg-[#116438]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
