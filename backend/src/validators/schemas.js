import {
  VALID_ORDER_STATUSES,
  VALID_CONTACT_STATUSES,
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
} from '../config/constants.js';
import { sanitizeText } from '../utils/response.js';

export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

export function isValidPhone(phone) {
  if (typeof phone !== 'string') return false;
  const digits = phone.replace(/[^\d]/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export function slugifyText(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function validateLoginInput(body = {}) {
  const errors = {};
  const email = sanitizeText(body.email, 254).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';

  if (!isValidEmail(email)) {
    errors.email = 'A valid administrator email address is required.';
  }
  if (!password || password.length < 6 || password.length > 256) {
    errors.password = 'A valid password is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: { email, password },
  };
}

export function validateChangePasswordInput(body = {}) {
  const errors = {};
  const currentPassword =
    typeof (body.currentPassword ?? body.current_password) === 'string'
      ? body.currentPassword ?? body.current_password
      : '';
  const newPassword =
    typeof (body.newPassword ?? body.new_password) === 'string'
      ? body.newPassword ?? body.new_password
      : '';

  if (!currentPassword) {
    errors.currentPassword = 'Current password is required.';
  }
  if (!newPassword || newPassword.length < 8) {
    errors.newPassword = 'New password must be at least 8 characters long.';
  } else if (newPassword.length > 128) {
    errors.newPassword = 'New password cannot exceed 128 characters.';
  } else if (currentPassword === newPassword) {
    errors.newPassword = 'New password must be different from your current password.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: { currentPassword, newPassword },
  };
}

export function validateServiceInput(body = {}, isUpdate = false) {
  const errors = {};
  const title = sanitizeText(body.title, 180);
  const slug = slugifyText(body.slug || title);
  const orderCategory = sanitizeText(body.orderCategory ?? body.order_category ?? title, 180);
  const shortDescription = sanitizeText(
    body.shortDescription ?? body.short_description ?? body.description,
    400
  );
  const description = sanitizeText(
    body.description ?? body.shortDescription ?? body.short_description,
    3000
  );

  if (!isUpdate || body.title !== undefined) {
    if (!title || title.length < 3) {
      errors.title = 'Service title must be at least 3 characters.';
    }
  }
  if (!isUpdate || body.description !== undefined) {
    if (!description || description.length < 10) {
      errors.description = 'Service description must be at least 10 characters.';
    }
  }
  if (!slug) {
    errors.slug = 'A valid URL slug is required.';
  }

  const rawPrice = body.price !== undefined ? body.price : body.startingPrice;
  let price = null;
  if (rawPrice !== null && rawPrice !== undefined && rawPrice !== '') {
    const num = Number(rawPrice);
    if (Number.isNaN(num) || num < 0) {
      errors.price = 'Price must be a non-negative number or null.';
    } else {
      price = num;
    }
  }

  const features = Array.isArray(body.features)
    ? body.features.map((f) => sanitizeText(f, 300)).filter(Boolean)
    : [];
  const technologies = Array.isArray(body.technologies)
    ? body.technologies.map((t) => sanitizeText(t, 120)).filter(Boolean)
    : [];
  const suitableForRaw = body.suitableFor ?? body.suitable_for;
  const suitableFor = Array.isArray(suitableForRaw)
    ? suitableForRaw.map((s) => sanitizeText(s, 120)).filter(Boolean)
    : [];

  const isActiveRaw = body.isActive !== undefined ? body.isActive : body.is_active;
  const displayOrderRaw = body.displayOrder !== undefined ? body.displayOrder : body.display_order;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: {
      title,
      slug,
      orderCategory,
      shortDescription: shortDescription || description.slice(0, 200),
      description,
      features,
      technologies,
      suitableFor,
      image: sanitizeText(body.image || '', 1000),
      iconName: sanitizeText(body.iconName ?? body.icon_name ?? 'Globe', 60),
      price,
      currency: sanitizeText(body.currency || 'INR', 10),
      isActive: isActiveRaw !== undefined ? Boolean(isActiveRaw) : true,
      displayOrder: Number.isFinite(Number(displayOrderRaw)) ? Number(displayOrderRaw) : 0,
    },
  };
}

export function validatePackageInput(body = {}, isUpdate = false) {
  const errors = {};
  const name = sanitizeText(body.name || body.title, 180);
  const category = sanitizeText(body.category || 'Business & Corporate Websites', 180);
  const description = sanitizeText(body.description, 2000);

  if (!isUpdate || body.name !== undefined || body.title !== undefined) {
    if (!name || name.length < 2) {
      errors.name = 'Package name is required (at least 2 characters).';
    }
  }
  if (!isUpdate || body.description !== undefined) {
    if (!description || description.length < 5) {
      errors.description = 'Package description is required (at least 5 characters).';
    }
  }

  const rawPrice = body.price !== undefined ? body.price : body.startingPrice;
  let price = null;
  if (rawPrice !== null && rawPrice !== undefined && rawPrice !== '') {
    const num = Number(rawPrice);
    if (Number.isNaN(num) || num < 0) {
      errors.price = 'Package price must be a non-negative number or null.';
    } else {
      price = num;
    }
  }

  const features = Array.isArray(body.features)
    ? body.features.map((f) => sanitizeText(f, 300)).filter(Boolean)
    : [];
  const rawAddons = body.addOns ?? body.add_ons;
  const addOns = Array.isArray(rawAddons)
    ? rawAddons.map((a) => sanitizeText(a, 200)).filter(Boolean)
    : [];

  const isActive =
    body.isActive !== undefined
      ? Boolean(body.isActive)
      : body.is_active !== undefined
      ? Boolean(body.is_active)
      : body.active !== undefined
      ? Boolean(body.active)
      : true;
  const isFeatured =
    body.isFeatured !== undefined
      ? Boolean(body.isFeatured)
      : body.is_featured !== undefined
      ? Boolean(body.is_featured)
      : body.featured !== undefined
      ? Boolean(body.featured)
      : false;

  const serviceIdRaw = body.serviceId ?? body.service_id;
  const displayOrderRaw = body.displayOrder !== undefined ? body.displayOrder : body.display_order;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: {
      name,
      category,
      description,
      price,
      currency: sanitizeText(body.currency || 'INR', 10),
      pagesCount: sanitizeText(body.pagesCount ?? body.pages_count ?? '', 120),
      features,
      revisions: sanitizeText(body.revisions || '2 Design Revision Rounds', 120),
      deliveryEstimate: sanitizeText(body.deliveryEstimate ?? body.delivery_estimate ?? '2–3 Weeks', 120),
      supportDuration: sanitizeText(
        body.supportDuration ?? body.support_duration ?? '30 Days Post-Launch Bug Support',
        120
      ),
      hostingOption: sanitizeText(
        body.hostingOption ?? body.hosting_option ?? 'Customer-Managed or Quoted Separately',
        180
      ),
      maintenanceOption: sanitizeText(
        body.maintenanceOption ?? body.maintenance_option ?? 'Optional Maintenance Plan',
        180
      ),
      addOns,
      serviceId: serviceIdRaw ? sanitizeText(serviceIdRaw, 100) : null,
      isActive,
      isFeatured,
      displayOrder: Number.isFinite(Number(displayOrderRaw)) ? Number(displayOrderRaw) : 0,
    },
  };
}

export function validatePortfolioInput(body = {}, isUpdate = false) {
  const errors = {};
  const projectTitle = sanitizeText(body.projectTitle ?? body.project_title ?? body.title, 200);
  const slug = slugifyText(body.slug || projectTitle);
  const shortOverview = sanitizeText(body.shortOverview ?? body.short_overview ?? body.description, 600);
  const description = sanitizeText(body.description ?? body.shortOverview ?? body.short_overview, 4000);
  const category = sanitizeText(body.category || 'Business Websites', 120);
  const thumbnail = sanitizeText(
    body.thumbnail || body.coverImage || '/assets/images/dtks-corporate-website-showcase.jpg',
    2000
  );

  if (
    !isUpdate ||
    body.projectTitle !== undefined ||
    body.project_title !== undefined ||
    body.title !== undefined
  ) {
    if (!projectTitle || projectTitle.length < 3) {
      errors.projectTitle = 'Project title must be at least 3 characters.';
    }
  }
  if (
    !isUpdate ||
    body.description !== undefined ||
    body.shortOverview !== undefined ||
    body.short_overview !== undefined
  ) {
    if (!description || description.length < 5) {
      errors.description = 'Project description is required.';
    }
  }

  // Reject oversized inline base64 images stored directly in D1 (must use R2 upload)
  if (thumbnail.startsWith('data:image/') && thumbnail.length > 250000) {
    errors.thumbnail =
      'Large image files must be uploaded through the R2 storage endpoint rather than stored inline in D1.';
  }

  const rawImages = Array.isArray(body.images)
    ? body.images
    : Array.isArray(body.gallery)
    ? body.gallery
    : [thumbnail].filter(Boolean);
  const images = rawImages.map((img) => sanitizeText(img, 2000)).filter(Boolean);

  const rawKeyFeatures = body.keyFeatures ?? body.key_features;
  const keyFeatures = Array.isArray(rawKeyFeatures)
    ? rawKeyFeatures.map((f) => sanitizeText(f, 300)).filter(Boolean)
    : [];
  const technologies = Array.isArray(body.technologies)
    ? body.technologies.map((t) => sanitizeText(t, 120)).filter(Boolean)
    : [];

  const isPublished =
    body.isPublished !== undefined
      ? Boolean(body.isPublished)
      : body.is_published !== undefined
      ? Boolean(body.is_published)
      : body.published !== undefined
      ? Boolean(body.published)
      : true;
  const isFeatured =
    body.isFeatured !== undefined
      ? Boolean(body.isFeatured)
      : body.is_featured !== undefined
      ? Boolean(body.is_featured)
      : body.featured !== undefined
      ? Boolean(body.featured)
      : false;
  const displayOrderRaw = body.displayOrder !== undefined ? body.displayOrder : body.display_order;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: {
      projectTitle,
      slug,
      shortOverview: shortOverview || description.slice(0, 220),
      description,
      problemAddressed: sanitizeText(body.problemAddressed ?? body.problem_addressed ?? '', 2000),
      solutionImplemented: sanitizeText(body.solutionImplemented ?? body.solution_implemented ?? '', 2000),
      category,
      thumbnail,
      images,
      keyFeatures,
      technologies,
      projectUrl: sanitizeText(body.projectUrl ?? body.project_url ?? body.liveUrl ?? '', 500),
      githubUrl: sanitizeText(body.githubUrl ?? body.github_url ?? '', 500),
      demoVideoUrl: sanitizeText(body.demoVideoUrl ?? body.demo_video_url ?? '', 500),
      status: sanitizeText(body.status || 'Completed', 80),
      completionDate: sanitizeText(body.completionDate ?? body.completion_date ?? '', 80),
      isSample: Boolean(body.isSample ?? body.is_sample),
      isPublished,
      isFeatured,
      displayOrder: Number.isFinite(Number(displayOrderRaw)) ? Number(displayOrderRaw) : 0,
    },
  };
}

export function validateOrderSubmission(body = {}) {
  const errors = {};
  const customerName = sanitizeText(body.customerName ?? body.customer_name, 160);
  const customerEmail = sanitizeText(body.customerEmail ?? body.customer_email, 254).toLowerCase();
  const customerPhone = sanitizeText(body.customerPhone ?? body.customer_phone, 40);
  const customerCity = sanitizeText(body.customerCity ?? body.customer_city ?? '', 120);
  const projectName = sanitizeText(
    body.projectName ?? body.project_name ?? body.service ?? 'Website Project Request',
    200
  );
  const businessName = sanitizeText(body.businessName ?? body.business_name ?? customerName, 200);
  const projectDescription = sanitizeText(body.projectDescription ?? body.project_description, 5000);
  const budget = sanitizeText(body.budget ?? body.estimatedBudget ?? body.estimated_budget, 160);
  const serviceName = sanitizeText(
    body.service ?? body.serviceName ?? body.service_name ?? 'Business & Corporate Websites',
    180
  );
  const rawServiceId = body.serviceId ?? body.service_id;
  const serviceId = rawServiceId ? sanitizeText(rawServiceId, 100) : null;
  const rawPackageId = body.packageId ?? body.package_id;
  const packageId = rawPackageId ? sanitizeText(rawPackageId, 100) : null;
  const packageTitle = sanitizeText(body.packageTitle ?? body.package_title ?? '', 180);

  if (!customerName || customerName.length < 2) {
    errors.customerName = 'Customer full name is required (at least 2 characters).';
  }
  if (!isValidEmail(customerEmail)) {
    errors.customerEmail = 'A valid customer email address is required.';
  }
  if (!isValidPhone(customerPhone)) {
    errors.customerPhone = 'A valid customer phone number (7–15 digits) is required.';
  }
  if (!projectDescription || projectDescription.length < 10) {
    errors.projectDescription = 'Project description must be at least 10 characters.';
  }
  if (!budget) {
    errors.budget = 'Estimated project budget is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: {
      customerName,
      customerEmail,
      customerPhone,
      customerCity,
      projectName,
      businessName,
      projectDescription,
      budget,
      serviceName,
      serviceId,
      packageId: packageId === 'custom' ? null : packageId,
      packageTitle: packageId === 'custom' && !packageTitle ? 'Custom Website Quote' : packageTitle,
      requiredPages: sanitizeText(body.requiredPages ?? body.required_pages ?? '', 1000),
      requiredFunctionality: sanitizeText(
        body.requiredFunctionality ?? body.required_functionality ?? '',
        1000
      ),
      referenceWebsites: sanitizeText(body.referenceWebsites ?? body.reference_websites ?? '', 1000),
      preferredDesignStyle: sanitizeText(
        body.preferredDesignStyle ?? body.preferred_design_style ?? '',
        1000
      ),
      requiredIntegrations: sanitizeText(
        body.requiredIntegrations ?? body.required_integrations ?? '',
        1000
      ),
      additionalInstructions: sanitizeText(
        body.additionalInstructions ?? body.additional_instructions ?? '',
        2000
      ),
      domainPreference: sanitizeText(
        body.domainPreference ?? body.domain_preference ?? 'Need domain advice',
        120
      ),
      hostingPreference: sanitizeText(
        body.hostingPreference ?? body.hosting_preference ?? 'Need advice',
        120
      ),
      maintenanceInterest: sanitizeText(
        body.maintenanceInterest ?? body.maintenance_interest ?? 'Need more information',
        120
      ),
      maintenancePlanSelected: sanitizeText(
        body.maintenancePlanSelected ?? body.maintenance_plan_selected ?? 'Undecided',
        120
      ),
      expectedDeliveryDate: sanitizeText(body.expectedDeliveryDate ?? body.expected_delivery_date ?? '', 60),
      expectedTimeline: sanitizeText(body.expectedTimeline ?? body.expected_timeline ?? '', 120),
      urgency: sanitizeText(body.urgency || 'Standard', 60),
    },
  };
}

export function validateOrderStatus(status) {
  const clean = sanitizeText(status, 80);
  if (!VALID_ORDER_STATUSES.includes(clean)) {
    return {
      isValid: false,
      error: `Invalid order status "${clean}". Allowed values: ${VALID_ORDER_STATUSES.join(', ')}`,
    };
  }
  return { isValid: true, status: clean };
}

export function validateContactSubmission(body = {}) {
  const errors = {};
  // Honeypot anti-spam field check
  if (body.website_url_honeypot || body._gotcha) {
    return {
      isValid: false,
      isSpam: true,
      errors: { spam: 'Automated spam submission rejected.' },
    };
  }

  const name = sanitizeText(body.name, 160);
  const email = sanitizeText(body.email, 254).toLowerCase();
  const phone = sanitizeText(body.phone || '', 40);
  const subject = sanitizeText(body.subject || 'Website Consultation Inquiry', 240);
  const message = sanitizeText(body.message, 5000);

  if (!name || name.length < 2) {
    errors.name = 'Full name is required (at least 2 characters).';
  }
  if (!isValidEmail(email)) {
    errors.email = 'Please provide a valid email address.';
  }
  if (phone && !isValidPhone(phone)) {
    errors.phone = 'Please provide a valid phone number (7–15 digits).';
  }
  if (!subject || subject.length < 3) {
    errors.subject = 'Subject must be at least 3 characters.';
  }
  if (!message || message.length < 10) {
    errors.message = 'Message must be at least 10 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: { name, email, phone, subject, message },
  };
}

export function validateContactUpdate(body = {}) {
  const errors = {};
  const updates = {};

  if (body.status !== undefined) {
    const cleanStatus = sanitizeText(body.status, 60);
    if (!VALID_CONTACT_STATUSES.includes(cleanStatus)) {
      errors.status = `Invalid contact status "${cleanStatus}".`;
    } else {
      updates.status = cleanStatus;
    }
  }

  const rawNotes = body.adminNotes !== undefined ? body.adminNotes : body.admin_notes;
  if (rawNotes !== undefined) {
    updates.adminNotes = sanitizeText(rawNotes, 3000);
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: updates,
  };
}

export function validateImageUpload({ mimeType, sizeBytes, bytes }) {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType)) {
    return {
      isValid: false,
      error: `Unsupported image type "${mimeType}". Only JPEG, PNG, and WebP images are permitted.`,
    };
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return {
      isValid: false,
      error: 'Uploaded image file is empty.',
    };
  }
  if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `Image file exceeds maximum allowed size of ${Math.round(MAX_IMAGE_SIZE_BYTES / (1024 * 1024))}MB.`,
    };
  }

  // Magic byte header verification when raw bytes are provided
  if (bytes instanceof Uint8Array && bytes.length >= 4) {
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng =
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const isWebp =
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50;

    if (!isJpeg && !isPng && !isWebp) {
      return {
        isValid: false,
        error: 'File binary signature does not match a valid JPEG, PNG, or WebP image.',
      };
    }
  }

  return { isValid: true };
}
