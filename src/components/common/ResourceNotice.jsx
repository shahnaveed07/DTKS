import { AlertCircle, RefreshCw } from 'lucide-react';

export function ResourceLoadingNotice({ label = 'Loading live content...' }) {
  return (
    <div
      role="status"
      className="rounded-xl border border-[#E3EBE5] bg-white px-5 py-6 text-sm text-[#64756B] flex items-center gap-3"
    >
      <RefreshCw className="w-4 h-4 text-[#16834A] animate-spin shrink-0" />
      <span>{label}</span>
    </div>
  );
}

export function ResourceErrorNotice({
  title = 'Unable to load latest data',
  message,
  onRetry,
  retryLabel = 'Retry',
  retrying = false,
}) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div className="flex items-start gap-2.5 text-sm text-red-800">
        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-900">{title}</p>
          <p className="text-xs text-red-700 mt-0.5">{message}</p>
        </div>
      </div>
      {typeof onRetry === 'function' && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-red-300 bg-white text-red-700 hover:bg-red-100/60 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
          <span>{retrying ? 'Retrying...' : retryLabel}</span>
        </button>
      )}
    </div>
  );
}
