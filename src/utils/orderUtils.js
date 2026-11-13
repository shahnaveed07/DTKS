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

export function validateOrderStep(step, formData) {
  const errors = {};

  if (step === 1) {
    if (!formData.service || !formData.service.trim()) {
      errors.service = 'Please select a service category to continue.';
    }
  }

  if (step === 2) {
    if (!formData.packageId || !formData.packageId.trim()) {
      errors.packageId = 'Please choose a package or select Custom Quote.';
    }
  }

  if (step === 3) {
    if (!formData.projectName || formData.projectName.trim().length < 2) {
      errors.projectName = 'Please enter a project name (at least 2 characters).';
    }
    if (!formData.projectDescription || formData.projectDescription.trim().length < 15) {
      errors.projectDescription = 'Please describe your project goals (at least 15 characters).';
    }
  }

  if (step === 4) {
    if (!formData.hostingPreference) {
      errors.hostingPreference = 'Please select a hosting preference.';
    }
    if (!formData.maintenanceInterest) {
      errors.maintenanceInterest = 'Please indicate your maintenance preference.';
    }
  }

  if (step === 5) {
    if (!formData.estimatedBudget) {
      errors.estimatedBudget = 'Please select an estimated budget range.';
    }
    if (!formData.expectedTimeline) {
      errors.expectedTimeline = 'Please select an expected delivery timeline.';
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
    return 'Request Pricing';
  }
  const numeric = Number(amount);
  if (Number.isNaN(numeric)) {
    return 'Request Pricing';
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

export function computeDashboardStats({ orders = [], inquiries = [], portfolio = [], team = [] }) {
  const activeStatuses = new Set(['Approved', 'In Progress', 'Under Testing']);
  const reviewStatuses = new Set(['New Request', 'Under Review', 'Requirements Clarification']);
  const pendingQuoteStatuses = new Set([
    'New Request',
    'Under Review',
    'Requirements Clarification',
    'Quotation Sent',
    'Awaiting Customer Approval',
  ]);

  return {
    totalOrders: orders.length,
    newInquiries: inquiries.filter((i) => i.status === 'New').length,
    ordersUnderReview: orders.filter((o) => reviewStatuses.has(o.status)).length,
    activeProjects: orders.filter((o) => activeStatuses.has(o.status)).length,
    completedProjects: orders.filter((o) => o.status === 'Completed').length,
    pendingQuotations: orders.filter((o) => pendingQuoteStatuses.has(o.status)).length,
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
