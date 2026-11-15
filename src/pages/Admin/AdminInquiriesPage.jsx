import { useState } from 'react';
import { Trash2, Save, RotateCcw } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { INQUIRY_STATUSES } from '../../data/seedData.js';
import SEO from '../../components/common/SEO.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import {
  ResourceErrorNotice,
  ResourceLoadingNotice,
} from '../../components/common/ResourceNotice.jsx';
import {
  clearNoteDraft,
  executeInquiryNoteSave,
  getNoteDraftValue,
  isNoteDraftDirty,
  setNoteDraft,
} from '../../utils/inquiryNotesState.js';

export default function AdminInquiriesPage() {
  const {
    inquiries,
    updateInquiry,
    deleteInquiry,
    requestConfirm,
    dataAdapterMode,
    isLoading,
    resourceStatus,
    resourceErrors,
    refreshAll,
  } = useApp();
  const isApiMode = dataAdapterMode === 'api';
  const [statusFilter, setStatusFilter] = useState('All');
  const [notesDrafts, setNotesDrafts] = useState({});
  const [savingNoteIds, setSavingNoteIds] = useState({});
  const [savingStatusIds, setSavingStatusIds] = useState({});
  const [noteFeedback, setNoteFeedback] = useState({});

  const filtered = inquiries.filter(
    (inq) => statusFilter === 'All' || inq.status === statusFilter
  );

  const handleNotesChange = (inquiryId, value) => {
    setNotesDrafts((prev) => setNoteDraft(prev, inquiryId, value));
    setNoteFeedback((prev) => {
      if (!prev[inquiryId]) return prev;
      const next = { ...prev };
      delete next[inquiryId];
      return next;
    });
  };

  const handleCancelNotes = (inquiryId) => {
    setNotesDrafts((prev) => clearNoteDraft(prev, inquiryId));
    setNoteFeedback((prev) => {
      if (!prev[inquiryId]) return prev;
      const next = { ...prev };
      delete next[inquiryId];
      return next;
    });
  };

  const handleSaveNotes = async (inq) => {
    if (!inq?.id || savingNoteIds[inq.id]) return;
    setSavingNoteIds((prev) => ({ ...prev, [inq.id]: true }));
    setNoteFeedback((prev) => {
      if (!prev[inq.id]) return prev;
      const next = { ...prev };
      delete next[inq.id];
      return next;
    });

    try {
      const outcome = await executeInquiryNoteSave({
        inquiry: inq,
        drafts: notesDrafts,
        savingIds: savingNoteIds,
        updateInquiry,
      });

      if (outcome.saved) {
        setNotesDrafts((prev) => clearNoteDraft(prev, inq.id));
        setNoteFeedback((prev) => ({
          ...prev,
          [inq.id]: { type: 'success', message: 'Notes saved.' },
        }));
      } else if (!outcome.skipped) {
        // Keep unsaved draft preserved on failure
        setNoteFeedback((prev) => ({
          ...prev,
          [inq.id]: {
            type: 'error',
            message: outcome.message || 'Failed saving notes. Your unsaved draft is preserved.',
          },
        }));
      }
    } finally {
      setSavingNoteIds((prev) => {
        const next = { ...prev };
        delete next[inq.id];
        return next;
      });
    }
  };

  const handleStatusChange = async (inq, nextStatus) => {
    if (!inq?.id || savingStatusIds[inq.id] || inq.status === nextStatus) return;
    setSavingStatusIds((prev) => ({ ...prev, [inq.id]: true }));
    try {
      // Only send status; never auto-submit unsaved adminNotes draft
      await updateInquiry(inq.id, { status: nextStatus });
    } finally {
      setSavingStatusIds((prev) => {
        const next = { ...prev };
        delete next[inq.id];
        return next;
      });
    }
  };

  const handleDelete = (inq) => {
    requestConfirm({
      title: `Delete inquiry from ${inq.name}?`,
      message: isApiMode
        ? 'This permanently deletes the contact inquiry from the backend database.'
        : 'This permanently deletes the contact inquiry from local storage.',
      confirmLabel: 'Delete Inquiry',
      variant: 'danger',
      onConfirm: () => deleteInquiry(inq.id),
    });
  };

  const inquiriesLoading =
    isApiMode && (isLoading || resourceStatus?.inquiries === 'loading') && inquiries.length === 0;
  const inquiriesError = isApiMode ? resourceErrors?.inquiries : null;

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
              Review messages submitted via the Contact page, update status, and save internal admin follow-up notes.
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
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <ResourceErrorNotice
          title="Failed to load customer inquiries"
          message={inquiriesError}
          onRetry={() => refreshAll({ includeAdmin: true })}
          retrying={isLoading}
        />

        {inquiriesLoading ? (
          <ResourceLoadingNotice label="Loading customer inquiries from backend..." />
        ) : filtered.length > 0 ? (
          <div className="space-y-4">
            {filtered.map((inq) => {
              const draftValue = getNoteDraftValue(notesDrafts, inq);
              const dirty = isNoteDraftDirty(notesDrafts, inq);
              const isSavingNotes = Boolean(savingNoteIds[inq.id]);
              const isSavingStatus = Boolean(savingStatusIds[inq.id]);
              const feedback = noteFeedback[inq.id];

              return (
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
                        disabled={isSavingStatus}
                        onChange={(e) => handleStatusChange(inq, e.target.value)}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A] disabled:opacity-50"
                      >
                        {INQUIRY_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
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

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label
                        htmlFor={`inq-notes-${inq.id}`}
                        className="block text-xs font-semibold text-[#17231C]"
                      >
                        Admin Follow-Up Notes
                      </label>
                      {dirty && (
                        <span className="text-[11px] font-semibold text-amber-700">
                          Unsaved changes
                        </span>
                      )}
                    </div>

                    <textarea
                      id={`inq-notes-${inq.id}`}
                      rows={2}
                      value={draftValue}
                      disabled={isSavingNotes}
                      onChange={(e) => handleNotesChange(inq.id, e.target.value)}
                      placeholder="Add internal notes or reply summary..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A] disabled:opacity-60"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs min-h-[1rem]">
                        {feedback?.type === 'error' && (
                          <span role="alert" className="text-red-600 font-medium">
                            {feedback.message}
                          </span>
                        )}
                        {feedback?.type === 'success' && !dirty && (
                          <span role="status" className="text-[#16834A] font-medium">
                            {feedback.message}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={!dirty || isSavingNotes}
                          onClick={() => handleCancelNotes(inq.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E3EBE5] text-[#64756B] hover:text-[#17231C] hover:bg-[#F7FAF7] disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Cancel</span>
                        </button>
                        <button
                          type="button"
                          disabled={!dirty || isSavingNotes}
                          onClick={() => handleSaveNotes(inq)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{isSavingNotes ? 'Saving Notes...' : 'Save Notes'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : !inquiriesError ? (
          <EmptyState
            title={statusFilter === 'All' ? 'No customer inquiries yet.' : 'No inquiries with this status.'}
            description={
              statusFilter === 'All'
                ? 'Customer messages submitted on the Contact page will appear here.'
                : 'Select another status filter or view all customer inquiries.'
            }
            actionLabel={statusFilter !== 'All' ? 'Show All Statuses' : undefined}
            onAction={statusFilter !== 'All' ? () => setStatusFilter('All') : undefined}
          />
        ) : null}
      </div>
    </>
  );
}
