export function generateOrderReference(existingOrders = [], year = new Date().getFullYear()) {
  const prefix = `DKS-${year}-`;
  let maxSeq = 0;

  for (const order of existingOrders) {
    if (order && typeof order.referenceId === 'string' && order.referenceId.startsWith(prefix)) {
      const seqPart = Number.parseInt(order.referenceId.slice(prefix.length), 10);
      if (!Number.isNaN(seqPart) && seqPart > maxSeq) {
        maxSeq = seqPart;
      }
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(4, '0');
  return `${prefix}${nextSeq}`;
}

export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidPhone(phone) {
  if (typeof phone !== 'string') return false;
  const digits = phone.replace(/[^\d]/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export function buildWhatsAppUrl(whatsappNumber = '') {
  if (typeof whatsappNumber !== 'string') return '';
  const digits = whatsappNumber.replace(/[^\d]/g, '');
  if (!digits) return '';
  const normalized = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${normalized}`;
}

export function buildMailtoUrl(email = '') {
  if (typeof email !== 'string') return '';
  const trimmed = email.trim();
  if (!trimmed) return '';
  if (/[\s\u0000-\u001f\u007f?#/\\]/.test(trimmed)) return '';
  if (!isValidEmail(trimmed)) return '';
  return `mailto:${trimmed}`;
}

export function validateOrderStep(step, formData) {
  const errors = {};

  if (step === 1) {
    if (!formData.service || !formData.service.trim()) {
      errors.service = 'Please select a website category to continue.';
    }
  }

  if (step === 2) {
    if (!formData.packageId || !formData.packageId.trim()) {
      errors.packageId = 'Please choose a website package or select Custom Quote.';
    }
  }

  if (step === 3) {
    if (!formData.projectName || formData.projectName.trim().length < 2) {
      errors.projectName = 'Please enter a website project title (at least 2 characters).';
    }
    if (!formData.businessName || formData.businessName.trim().length < 2) {
      errors.businessName = 'Please enter your business, brand, or personal name.';
    }
    if (!formData.projectDescription || formData.projectDescription.trim().length < 15) {
      errors.projectDescription = 'Please describe your website purpose and goals (at least 15 characters).';
    }
  }

  if (step === 4) {
    if (!formData.domainPreference) {
      errors.domainPreference = 'Please select a domain preference.';
    }
    if (!formData.hostingPreference) {
      errors.hostingPreference = 'Please select a hosting preference.';
    }
    if (!formData.maintenanceInterest) {
      errors.maintenanceInterest = 'Please indicate your website maintenance preference.';
    }
  }

  if (step === 5) {
    if (!formData.estimatedBudget) {
      errors.estimatedBudget = 'Please select an estimated budget range.';
    }
    if (!formData.expectedDeliveryDate && !formData.expectedTimeline) {
      errors.expectedDeliveryDate = 'Please select an expected delivery date.';
    }
  }

  if (step === 6) {
    if (!formData.customerName || formData.customerName.trim().length < 2) {
      errors.customerName = 'Please enter your full name.';
    }
    if (!isValidEmail(formData.customerEmail)) {
      errors.customerEmail = 'Please enter a valid email address.';
    }
    if (!isValidPhone(formData.customerPhone)) {
      errors.customerPhone = 'Please enter a valid phone or WhatsApp number (7–15 digits).';
    }
    if (!formData.customerCity || formData.customerCity.trim().length < 2) {
      errors.customerCity = 'Please enter your city or location.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateContactForm(data) {
  const errors = {};
  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Full name is required.';
  }
  if (!isValidEmail(data.email)) {
    errors.email = 'Please enter a valid email address.';
  }
  if (data.phone && data.phone.trim() && !isValidPhone(data.phone)) {
    errors.phone = 'Please enter a valid phone number.';
  }
  if (!data.subject || data.subject.trim().length < 3) {
    errors.subject = 'Please enter a brief subject.';
  }
  if (!data.message || data.message.trim().length < 10) {
    errors.message = 'Message must be at least 10 characters.';
  }
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function formatCurrency(amount, currency = 'INR') {
  if (amount === null || amount === undefined || amount === '') {
    return 'Request a Quote';
  }
  const numeric = Number(amount);
  if (Number.isNaN(numeric)) {
    return 'Request a Quote';
  }
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(numeric);
  } catch {
    return `${currency} ${numeric.toLocaleString()}`;
  }
}

export function filterOrders(orders = [], { query = '', status = 'All', service = 'All' } = {}) {
  const normalizedQuery = query.trim().toLowerCase();

  return orders.filter((order) => {
    if (status !== 'All' && order.status !== status) return false;
    if (service !== 'All' && order.service !== service) return false;

    if (!normalizedQuery) return true;

    const searchable = [
      order.referenceId,
      order.projectName,
      order.customerName,
      order.customerEmail,
      order.businessName,
      order.service,
      order.hostingPreference,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchable.includes(normalizedQuery);
  });
}

export function findTrackedOrder(orders = [], referenceId = '', email = '') {
  const ref = referenceId.trim().toLowerCase();
  const mail = email.trim().toLowerCase();
  if (!ref || !mail) return null;

  return (
    orders.find(
      (order) =>
        (order.referenceId || '').trim().toLowerCase() === ref &&
        (order.customerEmail || '').trim().toLowerCase() === mail
    ) || null
  );
}

export function sanitizeSafeExternalUrl(rawUrl = '') {
  if (typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch {
    return '';
  }
  return '';
}

export function sanitizeSafeMediaUrl(
  rawUrl = '',
  { allowBlob = true, allowDataImage = false } = {}
) {
  if (typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (/[\u0000-\u001f\u007f\\]/.test(trimmed)) return '';

  if (/^idb:\/\/[a-z0-9._-]+$/i.test(trimmed)) {
    return trimmed;
  }

  if (/^blob:/i.test(trimmed)) {
    if (!allowBlob) return '';
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === 'blob:' ? trimmed : '';
    } catch {
      return '';
    }
  }

  if (/^data:/i.test(trimmed)) {
    if (!allowDataImage) return '';
    return /^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(trimmed)
      ? trimmed
      : '';
  }

  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//') || /%2f|%5c/i.test(trimmed)) return '';
    try {
      const parsed = new URL(trimmed, 'https://dtks.local');
      if (parsed.origin !== 'https://dtks.local' || parsed.pathname.startsWith('//')) {
        return '';
      }
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return '';
    }
  }

  return sanitizeSafeExternalUrl(trimmed);
}

/**
 * Strips customer PII and internal admin fields from public order-tracking payloads.
 */
export function sanitizeTrackedOrder(order) {
  if (!order || typeof order !== 'object' || Array.isArray(order)) return null;
  const rawHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
  const statusHistory = rawHistory
    .filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry))
    .map((entry) => ({
      id: entry.id ?? null,
      previousStatus: entry.previousStatus ?? entry.previous_status ?? '',
      newStatus: entry.newStatus ?? entry.new_status ?? '',
      notes: entry.notes ?? '',
      createdAt: entry.createdAt ?? entry.created_at ?? null,
    }))
    .filter((entry) => entry.newStatus || entry.notes || entry.createdAt);

  const safeFields = {
    id: order.id ?? null,
    referenceId: order.referenceId ?? '',
    projectName: order.projectName ?? '',
    service: order.service ?? '',
    packageId: order.packageId ?? '',
    packageTitle: order.packageTitle ?? '',
    status: order.status ?? '',
    urgency: order.urgency ?? '',
    quotationAmount: order.quotationAmount ?? null,
    quotationCurrency: order.quotationCurrency ?? 'INR',
    quotationNotes: order.quotationNotes ?? '',
    customerUpdate: order.customerUpdate ?? '',
    expectedDeliveryDate: order.expectedDeliveryDate ?? '',
    expectedTimeline: order.expectedTimeline ?? '',
    domainPreference: order.domainPreference ?? '',
    hostingPreference: order.hostingPreference ?? '',
    maintenanceInterest: order.maintenanceInterest ?? '',
    maintenancePlanSelected: order.maintenancePlanSelected ?? '',
    estimatedBudget: order.estimatedBudget ?? '',
    statusHistory,
    createdAt: order.createdAt ?? null,
    updatedAt: order.updatedAt ?? null,
  };
  return safeFields;
}

export const SOCIAL_PLATFORM_META = [
  { key: 'github', label: 'GitHub', ariaLabel: 'Visit our GitHub profile' },
  { key: 'linkedin', label: 'LinkedIn', ariaLabel: 'Visit our LinkedIn profile' },
  { key: 'instagram', label: 'Instagram', ariaLabel: 'Visit our Instagram profile' },
  { key: 'facebook', label: 'Facebook', ariaLabel: 'Visit our Facebook profile' },
  { key: 'x', label: 'X', ariaLabel: 'Visit our X profile' },
  { key: 'other', label: 'Other Profile', ariaLabel: 'Visit our external profile' },
];

export function getValidSocialLinks(socialLinks = {}) {
  if (!socialLinks || typeof socialLinks !== 'object' || Array.isArray(socialLinks)) {
    return [];
  }
  return SOCIAL_PLATFORM_META.reduce((acc, meta) => {
    const safeUrl = sanitizeSafeExternalUrl(socialLinks[meta.key]);
    if (safeUrl) {
      acc.push({
        platform: meta.key,
        label: meta.label,
        ariaLabel: meta.ariaLabel,
        url: safeUrl,
      });
    }
    return acc;
  }, []);
}

export function computeDashboardStats({ orders = [], inquiries = [], portfolio = [], team = [] }) {
  const activeStatuses = new Set([
    'Confirmed',
    'Approved',
    'In Progress',
    'InProgress',
    'Ready for Review',
    'Under Testing',
  ]);
  const reviewStatuses = new Set([
    'Pending',
    'Reviewed',
    'In Review',
    'New Request',
    'Under Review',
    'Requirements Clarification',
  ]);
  const pendingQuoteStatuses = new Set([
    'Pending',
    'Reviewed',
    'In Review',
    'New Request',
    'Under Review',
    'Requirements Clarification',
    'Quotation Sent',
    'Awaiting Confirmation',
    'Awaiting Customer Approval',
  ]);

  return {
    totalOrders: orders.length,
    newInquiries: inquiries.filter((i) => i.status === 'New').length,
    ordersUnderReview: orders.filter((o) => reviewStatuses.has(o.status)).length,
    activeProjects: orders.filter((o) => activeStatuses.has(o.status)).length,
    completedProjects: orders.filter((o) => o.status === 'Completed').length,
    pendingQuotations: orders.filter((o) => pendingQuoteStatuses.has(o.status)).length,
    managedHostingOrders: orders.filter((o) => o.hostingPreference === 'DreamTech-managed').length,
    maintenanceInterestedOrders: orders.filter((o) => o.maintenanceInterest === 'Interested').length,
    portfolioProjects: portfolio.filter((p) => p.published).length,
    teamMembers: team.filter((t) => t.visible).length,
  };
}

export function slugify(text = '') {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
