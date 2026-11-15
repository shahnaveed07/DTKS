export function getNoteDraftValue(drafts = {}, inquiry = {}) {
  if (!inquiry || !inquiry.id) return '';
  if (Object.prototype.hasOwnProperty.call(drafts, inquiry.id)) {
    return drafts[inquiry.id] ?? '';
  }
  return inquiry.adminNotes ?? '';
}

export function isNoteDraftDirty(drafts = {}, inquiry = {}) {
  if (!inquiry || !inquiry.id) return false;
  if (!Object.prototype.hasOwnProperty.call(drafts, inquiry.id)) {
    return false;
  }
  return (drafts[inquiry.id] ?? '') !== (inquiry.adminNotes ?? '');
}

export function setNoteDraft(drafts = {}, inquiryId, nextValue) {
  if (!inquiryId) return drafts;
  return {
    ...drafts,
    [inquiryId]: String(nextValue ?? ''),
  };
}

export function clearNoteDraft(drafts = {}, inquiryId) {
  if (!inquiryId || !Object.prototype.hasOwnProperty.call(drafts, inquiryId)) {
    return drafts;
  }
  const next = { ...drafts };
  delete next[inquiryId];
  return next;
}

export async function executeInquiryNoteSave({
  inquiry,
  drafts = {},
  savingIds = {},
  updateInquiry,
}) {
  if (!inquiry?.id) {
    return { saved: false, skipped: true, message: 'Invalid inquiry record.' };
  }
  if (savingIds[inquiry.id]) {
    return { saved: false, skipped: true, message: 'Save already in progress.' };
  }
  if (!isNoteDraftDirty(drafts, inquiry)) {
    return { saved: false, skipped: true, message: 'No unsaved note changes.' };
  }

  const draftValue = getNoteDraftValue(drafts, inquiry);
  const res = await updateInquiry(inquiry.id, { adminNotes: draftValue });
  if (!res || res.success === false) {
    return {
      saved: false,
      skipped: false,
      preservedDraft: draftValue,
      message: res?.message || 'Failed saving notes. Your unsaved draft has been preserved.',
    };
  }

  return {
    saved: true,
    skipped: false,
    updated: res.data || res,
    message: res.message || 'Follow-up notes saved.',
  };
}
