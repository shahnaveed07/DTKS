import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { INQUIRY_STATUSES } from '../../data/seedData.js';
import SEO from '../../components/common/SEO.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

export default function AdminInquiriesPage() {
  const { inquiries, updateInquiry, deleteInquiry, requestConfirm } = useApp();
  const [statusFilter, setStatusFilter] = useState('All');

  const filtered = inquiries.filter(
    (inq) => statusFilter === 'All' || inq.status === statusFilter
  );

  const handleDelete = (inq) => {
    requestConfirm({
      title: `Delete inquiry from ${inq.name}?`,
      message: 'This permanently deletes the contact inquiry from local storage.',
      confirmLabel: 'Delete Inquiry',
      variant: 'danger',
      onConfirm: () => deleteInquiry(inq.id),
    });
  };

  return (
    <>
      <SEO noindex fullTitle="Manage Inquiries | Admin | DTKS" />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#17231C]">
              Customer Inquiries
            </h1>
            <p className="mt-1 text-sm text-[#64756B]">
              Review messages submitted via the Contact page, update status, and record admin follow-up notes.
            </p>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter inquiries by status"
            className="px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
          >
            <option value="All">All Statuses</option>
            {INQUIRY_STATUSES.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

        {filtered.length > 0 ? (
          <div className="space-y-4">
            {filtered.map((inq) => (
              <div
                key={inq.id}
                className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-display text-base font-bold text-[#17231C]">
                        {inq.subject}
                      </h2>
                      <StatusBadge status={inq.status} />
                    </div>
                    <p className="mt-1 text-xs text-[#64756B]">
                      From <strong className="text-[#17231C]">{inq.name}</strong> ({inq.email}
                      {inq.phone ? ` · ${inq.phone}` : ''}) · Received{' '}
                      {new Date(inq.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      aria-label={`Status for inquiry from ${inq.name}`}
                      value={inq.status}
                      onChange={(e) => updateInquiry(inq.id, { status: e.target.value })}
                      className="px-2.5 py-1.5 text-xs rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                    >
                      {INQUIRY_STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleDelete(inq)}
                      aria-label={`Delete inquiry from ${inq.name}`}
                      className="p-1.5 rounded-lg border border-[#E3EBE5] text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-[#17231C] leading-relaxed bg-[#F7FAF7] rounded-lg p-4 border border-[#E3EBE5]">
                  {inq.message}
                </p>

                <div>
                  <label
                    htmlFor={`inq-notes-${inq.id}`}
                    className="block text-xs font-semibold text-[#17231C] mb-1"
                  >
                    Admin Follow-Up Notes
                  </label>
                  <input
                    id={`inq-notes-${inq.id}`}
                    type="text"
                    value={inq.adminNotes || ''}
                    onChange={(e) => updateInquiry(inq.id, { adminNotes: e.target.value })}
                    placeholder="Add internal notes or reply summary..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No customer inquiries yet."
            description="Customer messages submitted on the Contact page will appear here."
          />
        )}
      </div>
    </>
  );
}
