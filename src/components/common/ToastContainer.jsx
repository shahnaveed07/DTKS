import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';

export default function ToastContainer() {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
    >
      {toasts.map((toast) => {
        const Icon =
          toast.type === 'error' ? AlertCircle : toast.type === 'info' ? Info : CheckCircle2;
        const accentClass =
          toast.type === 'error'
            ? 'border-red-200 text-red-600'
            : toast.type === 'info'
            ? 'border-[#E3EBE5] text-[#116438]'
            : 'border-[#16834A]/30 text-[#16A34A]';

        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex items-start gap-3 rounded-lg border border-[#E3EBE5] bg-white px-4 py-3 shadow-lg transition-all duration-200"
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${accentClass}`} />
            <p className="text-sm text-[#17231C] flex-1 leading-snug">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
              className="text-[#64756B] hover:text-[#17231C] p-0.5 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
