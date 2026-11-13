import { Inbox } from 'lucide-react';

export default function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 rounded-xl border border-dashed border-[#E3EBE5] bg-[#F7FAF7]">
      <div className="w-11 h-11 rounded-lg bg-[#E8F5EC] flex items-center justify-center text-[#16834A] mb-4">
        <Inbox className="w-5 h-5" />
      </div>
      <h3 className="text-base font-semibold text-[#17231C]">{title}</h3>
      <p className="mt-1.5 text-sm text-[#64756B] max-w-md">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 px-4 py-2 text-sm font-medium rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors whitespace-nowrap"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
