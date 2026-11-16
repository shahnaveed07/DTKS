import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateOrderReference,
  validateOrderStep,
  validateContactForm,
  formatCurrency,
  filterOrders,
  findTrackedOrder,
  computeDashboardStats,
  buildWhatsAppUrl,
  buildMailtoUrl,
  getValidSocialLinks,
  sanitizeSafeExternalUrl,
  sanitizeSafeMediaUrl,
  sanitizeTrackedOrder,
} from './orderUtils.js';
import { sanitizeLegacyDataset } from '../services/storage/localStorageAdapter.js';
import {
  createServiceResponse,
  createServiceError,
  getDataAdapterMode,
} from '../services/api/apiClient.js';
import {
  INITIAL_ORDERS,
  INITIAL_INQUIRIES,
  INITIAL_PORTFOLIO,
  INITIAL_TEAM,
  INITIAL_PACKAGES,
  INITIAL_SERVICES,
  INITIAL_SETTINGS,
} from '../data/seedData.js';

test('seedData defaults contain zero demo orders, inquiries, sample portfolio, or placeholder team and verified official contact defaults', () => {
  assert.deepEqual(INITIAL_ORDERS, []);
  assert.deepEqual(INITIAL_INQUIRIES, []);
  assert.deepEqual(INITIAL_PORTFOLIO, []);
  assert.deepEqual(INITIAL_TEAM, []);
  assert.equal(INITIAL_SETTINGS.contactEmail, 'support@dreamtechkashmirsolutions.studio');
  assert.equal(INITIAL_SETTINGS.contactPhone, '');
  assert.equal(INITIAL_SETTINGS.whatsappNumber, '+91 9796854163');
  assert.equal(INITIAL_SETTINGS.businessLocation, '');
  assert.equal(buildMailtoUrl(INITIAL_SETTINGS.contactEmail), 'mailto:support@dreamtechkashmirsolutions.studio');
  assert.equal(buildWhatsAppUrl(INITIAL_SETTINGS.whatsappNumber), 'https://wa.me/919796854163');
  for (const pkg of INITIAL_PACKAGES) {
    assert.equal(pkg.startingPrice, null);
    assert.equal(formatCurrency(pkg.startingPrice, pkg.currency), 'Request a Quote');
  }
  for (const svc of INITIAL_SERVICES) {
    assert.equal(svc.startingPrice, null);
    assert.equal(formatCurrency(svc.startingPrice, svc.currency), 'Request a Quote');
  }
});

test('sanitizeLegacyDataset strips only known demo records and preserves real user records', () => {
  const legacyDataset = {
    orders: [
      {
        id: 'ord-demo-1',
        referenceId: 'DKS-2026-0001',
        customerName: 'Demo Customer',
        customerEmail: 'demo.customer@example.com',
      },
      {
        id: 'ord-real-99',
        referenceId: 'DKS-2026-0005',
        customerName: 'Aamir Shah',
        customerEmail: 'aamir@kashmirhandicrafts.in',
        projectName: 'Kashmir Handicrafts Store',
      },
    ],
    inquiries: [
      {
        id: 'inq-demo-1',
        name: 'Sample Prospective Client',
        email: 'inquiry.demo@example.com',
      },
      {
        id: 'inq-real-88',
        name: 'Sana Mir',
        email: 'sana@srinagarclinic.org',
        subject: 'Clinic Website Inquiry',
      },
    ],
    portfolio: [
      {
        id: 'proj-sample-1',
        slug: 'kashmir-enterprise-corporate-website-sample',
        title: 'Sample Corporate Site',
        isSample: true,
        published: true,
      },
      {
        id: 'proj-real-77',
        slug: 'valley-orchards-export-portal',
        title: 'Valley Orchards Export Portal',
        isSample: false,
        published: true,
      },
    ],
    team: [
      {
        id: 'team-1',
        fullName: 'Founder / Project Lead (Profile Pending)',
        isPlaceholder: true,
        visible: true,
      },
      {
        id: 'team-real-55',
        fullName: 'Shah Naveed',
        role: 'Founder / Project Lead',
        isPlaceholder: false,
        visible: true,
      },
    ],
    packages: [
      {
        id: 'pkg-starter',
        title: 'Starter Website Package',
        startingPrice: 15000,
      },
      {
        id: 'pkg-custom-confirmed',
        title: 'Confirmed Business Package',
        startingPrice: 35000,
        priceConfirmed: true,
      },
    ],
    settings: {
      companyName: 'DreamTech Kashmir Solutions',
      contactEmail: 'contact@dreamtechkashmir.example',
      contactPhone: '+91 (000) 000-0000 (Placeholder)',
      whatsappNumber: '+91 99061 23456',
      businessLocation: 'Srinagar, Jammu & Kashmir (Office Address Configurable)',
      highlights: [
        { id: 'hl-1', label: 'Website Categories', value: '10', verified: true },
        { id: 'hl-custom', label: 'Launched Sites', value: '18+', verified: true, adminConfirmed: true },
      ],
    },
  };

  const sanitized = sanitizeLegacyDataset(legacyDataset);

  assert.equal(sanitized.orders.length, 1);
  assert.equal(sanitized.orders[0].id, 'ord-real-99');

  assert.equal(sanitized.inquiries.length, 1);
  assert.equal(sanitized.inquiries[0].id, 'inq-real-88');

  assert.equal(sanitized.portfolio.length, 1);
  assert.equal(sanitized.portfolio[0].id, 'proj-real-77');

  assert.equal(sanitized.team.length, 1);
  assert.equal(sanitized.team[0].fullName, 'Shah Naveed');

  assert.equal(sanitized.packages[0].startingPrice, null);
  assert.equal(sanitized.packages[1].startingPrice, 35000);

  assert.equal(sanitized.settings.contactEmail, 'support@dreamtechkashmirsolutions.studio');
  assert.equal(sanitized.settings.contactPhone, '');
  assert.equal(sanitized.settings.whatsappNumber, '+91 99061 23456');
  assert.equal(sanitized.settings.businessLocation, '');
  assert.equal(sanitized.settings.highlights[0].verified, false);
  assert.equal(sanitized.settings.highlights[1].verified, true);
  assert.equal(sanitized.settings.highlights[1].value, '18+');
});

test('apiClient response helpers return standardized { success, data, message } envelope', () => {
  assert.equal(getDataAdapterMode(), 'local');
  const ok = createServiceResponse({ id: 1 }, 'Created record');
  assert.equal(ok.success, true);
  assert.deepEqual(ok.data, { id: 1 });
  assert.equal(ok.message, 'Created record');

  const fail = createServiceError('Validation failed');
  assert.equal(fail.success, false);
  assert.equal(fail.data, null);
  assert.equal(fail.message, 'Validation failed');
});

test('generateOrderReference creates sequential DKS-YYYY-XXXX IDs without duplicates', () => {
  assert.equal(generateOrderReference([], 2026), 'DKS-2026-0001');
  const existing = [
    { referenceId: 'DKS-2026-0001' },
    { referenceId: 'DKS-2026-0004' },
    { referenceId: 'DKS-2025-0010' },
  ];
  assert.equal(generateOrderReference(existing, 2026), 'DKS-2026-0005');
});

test('validateOrderStep enforces required website fields at each step', () => {
  assert.equal(validateOrderStep(1, { service: '' }).isValid, false);
  assert.equal(validateOrderStep(1, { service: 'Business & Corporate Websites' }).isValid, true);

  assert.equal(validateOrderStep(2, { packageId: '' }).isValid, false);
  assert.equal(validateOrderStep(2, { packageId: 'pkg-business' }).isValid, true);

  const step3Fail = validateOrderStep(3, {
    projectName: 'A',
    businessName: '',
    projectDescription: 'Too short',
  });
  assert.equal(step3Fail.isValid, false);
  assert.ok(step3Fail.errors.projectName);
  assert.ok(step3Fail.errors.businessName);
  assert.ok(step3Fail.errors.projectDescription);

  const step3Pass = validateOrderStep(3, {
    projectName: 'Corporate Showcase Site',
    businessName: 'Kashmir Crafts Co.',
    projectDescription: 'Showcase artisan products and allow wholesale buyers to submit quotation requests.',
  });
  assert.equal(step3Pass.isValid, true);

  const step4Fail = validateOrderStep(4, {
    domainPreference: '',
    hostingPreference: '',
    maintenanceInterest: '',
  });
  assert.equal(step4Fail.isValid, false);
  assert.ok(step4Fail.errors.domainPreference);
  assert.ok(step4Fail.errors.hostingPreference);
  assert.ok(step4Fail.errors.maintenanceInterest);

  const step5Fail = validateOrderStep(5, {
    estimatedBudget: '',
    expectedDeliveryDate: '',
  });
  assert.equal(step5Fail.isValid, false);
  assert.ok(step5Fail.errors.estimatedBudget);
  assert.ok(step5Fail.errors.expectedDeliveryDate);

  const step5Pass = validateOrderStep(5, {
    estimatedBudget: 'INR 20,000 – 45,000',
    expectedDeliveryDate: '2026-12-20',
  });
  assert.equal(step5Pass.isValid, true);

  const step6Fail = validateOrderStep(6, {
    customerName: 'A',
    customerEmail: 'bad-email',
    customerPhone: '123',
    customerCity: '',
  });
  assert.equal(step6Fail.isValid, false);
  assert.ok(step6Fail.errors.customerEmail);
  assert.ok(step6Fail.errors.customerPhone);

  const step6Pass = validateOrderStep(6, {
    customerName: 'Tariq Ahmad',
    customerEmail: 'tariq@example.com',
    customerPhone: '+91 9876543210',
    customerCity: 'Srinagar',
  });
  assert.equal(step6Pass.isValid, true);
});

test('validateContactForm catches invalid email and short message', () => {
  const invalid = validateContactForm({
    name: 'Zoya',
    email: 'invalid',
    subject: 'Hi',
    message: 'Short',
  });
  assert.equal(invalid.isValid, false);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.subject);
  assert.ok(invalid.errors.message);

  const valid = validateContactForm({
    name: 'Zoya Khan',
    email: 'zoya@example.com',
    phone: '+91 9900112233',
    subject: 'Business website inquiry',
    message: 'We need a corporate website with a service catalog and contact form.',
  });
  assert.equal(valid.isValid, true);
});

test('formatCurrency returns Request a Quote when price is null or unconfigured', () => {
  assert.equal(formatCurrency(null), 'Request a Quote');
  assert.equal(formatCurrency(undefined), 'Request a Quote');
  assert.equal(formatCurrency(''), 'Request a Quote');
  assert.match(formatCurrency(15000, 'INR'), /15,000/);
});

test('filterOrders and findTrackedOrder work accurately for website orders', () => {
  const orders = [
    {
      referenceId: 'DKS-2026-0001',
      customerEmail: 'client1@company.in',
      customerName: 'Client One',
      projectName: 'Alpha Business Website',
      service: 'Business & Corporate Websites',
      status: 'Quotation Sent',
    },
    {
      referenceId: 'DKS-2026-0002',
      customerEmail: 'ops@company.in',
      customerName: 'Ops',
      projectName: 'Beta E-Commerce Store',
      service: 'E-Commerce Websites',
      status: 'Under Review',
    },
  ];

  assert.equal(filterOrders(orders, { status: 'Quotation Sent' }).length, 1);
  assert.equal(filterOrders(orders, { query: 'Beta' }).length, 1);
  assert.equal(
    findTrackedOrder(orders, 'dks-2026-0001', 'CLIENT1@COMPANY.IN')?.projectName,
    'Alpha Business Website'
  );
  assert.equal(findTrackedOrder(orders, 'DKS-2026-0001', 'wrong@company.in'), null);
});

test('computeDashboardStats computes accurate counts including hosting & maintenance', () => {
  const stats = computeDashboardStats({
    orders: [
      { status: 'New Request', hostingPreference: 'Customer-managed', maintenanceInterest: 'Not interested' },
      { status: 'In Progress', hostingPreference: 'DreamTech-managed', maintenanceInterest: 'Interested' },
      { status: 'Completed', hostingPreference: 'DreamTech-managed', maintenanceInterest: 'Interested' },
    ],
    inquiries: [{ status: 'New' }, { status: 'Replied' }],
    portfolio: [{ published: true }, { published: false }],
    team: [{ visible: true }, { visible: true }, { visible: false }],
  });

  assert.deepEqual(stats, {
    totalOrders: 3,
    newInquiries: 1,
    ordersUnderReview: 1,
    activeProjects: 1,
    completedProjects: 1,
    pendingQuotations: 1,
    managedHostingOrders: 2,
    maintenanceInterestedOrders: 2,
    portfolioProjects: 1,
    teamMembers: 2,
  });
});

test('getValidSocialLinks returns only valid http/https social URLs in canonical platform order', () => {
  assert.deepEqual(getValidSocialLinks(null), []);
  assert.deepEqual(getValidSocialLinks({}), []);
  assert.deepEqual(
    getValidSocialLinks({
      github: '',
      linkedin: '   ',
      instagram: 'javascript:alert(1)',
      facebook: 'ftp://facebook.com/dtks',
      x: 'not-a-valid-url',
      other: 'data:text/html,hi',
    }),
    []
  );

  const valid = getValidSocialLinks({
    other: 'https://dtks.example.org/profile',
    x: 'https://x.com/dtks_kashmir',
    facebook: 'http://facebook.com/dtks',
    instagram: 'https://instagram.com/dtks',
    linkedin: 'https://linkedin.com/company/dtks',
    github: 'https://github.com/shahnaveed07/DTKS',
  });

  assert.deepEqual(
    valid.map((item) => item.platform),
    ['github', 'linkedin', 'instagram', 'facebook', 'x', 'other']
  );
  assert.equal(valid[0].url, 'https://github.com/shahnaveed07/DTKS');
  assert.equal(valid[4].label, 'X');
  assert.equal(valid[5].label, 'Other Profile');
});

test('buildMailtoUrl and sanitizeSafeExternalUrl block header injection and unsafe schemes/control chars', () => {
  assert.equal(buildMailtoUrl('support@dreamtechkashmirsolutions.studio?subject=hack'), '');
  assert.equal(buildMailtoUrl('user@example.com\r\nBcc:evil@example.com'), '');
  assert.equal(buildMailtoUrl('user@example.com/path'), '');
  assert.equal(sanitizeSafeExternalUrl('https://example.com/\nfoo'), '');
  assert.equal(sanitizeSafeExternalUrl('javascript:alert(1)'), '');
  assert.equal(sanitizeSafeExternalUrl('https://github.com/shahnaveed07/DTKS'), 'https://github.com/shahnaveed07/DTKS');
});

test('sanitizeSafeMediaUrl allows safe assets/idb/blob and rejects SVG, HTML, and script schemes', () => {
  assert.equal(sanitizeSafeMediaUrl('idb://media-123'), 'idb://media-123');
  assert.equal(sanitizeSafeMediaUrl('blob:https://dreamtechkashmirsolutions.studio/abc'), 'blob:https://dreamtechkashmirsolutions.studio/abc');
  assert.equal(sanitizeSafeMediaUrl('blob:https://dreamtechkashmirsolutions.studio/abc', { allowBlob: false }), '');
  assert.equal(sanitizeSafeMediaUrl('/assets/images/logo.webp'), '/assets/images/logo.webp');
  assert.equal(sanitizeSafeMediaUrl('https://api.dreamtechkashmirsolutions.studio/api/v1/uploads/a.webp'), 'https://api.dreamtechkashmirsolutions.studio/api/v1/uploads/a.webp');

  assert.equal(sanitizeSafeMediaUrl('data:image/svg+xml,<svg onload=alert(1)>', { allowDataImage: true }), '');
  assert.equal(sanitizeSafeMediaUrl('data:image/png;base64,iVBORw0KGgo=', { allowDataImage: false }), '');
  assert.equal(sanitizeSafeMediaUrl('data:image/png;base64,iVBORw0KGgo=', { allowDataImage: true }), 'data:image/png;base64,iVBORw0KGgo=');
  assert.equal(sanitizeSafeMediaUrl('javascript:alert(1)'), '');
  assert.equal(sanitizeSafeMediaUrl('//evil.example/a.png'), '');
  assert.equal(sanitizeSafeMediaUrl('/%2fevil.example/a.png'), '');
});

test('sanitizeTrackedOrder strips customer PII and internal notes while retaining safe status fields and history', () => {
  const sanitized = sanitizeTrackedOrder({
    id: 'ord-1',
    referenceId: 'DKS-2026-0001',
    projectName: 'Tourism Portal',
    service: 'Tourism & Travel Websites',
    packageId: 'pkg-business',
    packageTitle: 'Business Growth Website',
    status: 'Quotation Sent',
    urgency: 'Priority',
    quotationAmount: 35000,
    quotationCurrency: 'INR',
    quotationNotes: 'Includes booking inquiry module',
    customerUpdate: 'Quotation sent via email',
    expectedDeliveryDate: '2026-12-15',
    domainPreference: 'Need new domain',
    hostingPreference: 'DreamTech-managed',
    maintenanceInterest: 'Interested',
    maintenancePlanSelected: 'Essential',
    estimatedBudget: 'INR 20,000 – 45,000',
    statusHistory: [
      {
        id: 'hist-1',
        previousStatus: 'New Request',
        newStatus: 'Quotation Sent',
        notes: 'Quotation prepared and emailed',
        createdAt: '2026-10-02T10:00:00Z',
        adminEmail: 'internal-admin@dtks.in',
        actorId: 'adm-99',
      },
    ],
    createdAt: '2026-10-01T00:00:00Z',
    customerName: 'Sensitive Name',
    customerEmail: 'sensitive@example.com',
    customerPhone: '+91 9999999999',
    customerCity: 'Srinagar',
    adminNotes: 'Internal pricing margin note',
    internalNotes: 'Private staff note',
    hostingNotes: 'Internal infra detail',
    clientId: 'cli-secret-1',
    trackingToken: 'raw-256-bit-tracking-token',
  });

  assert.equal(sanitized.referenceId, 'DKS-2026-0001');
  assert.equal(sanitized.quotationAmount, 35000);
  assert.equal(sanitized.urgency, 'Priority');
  assert.equal(sanitized.statusHistory.length, 1);
  assert.equal(sanitized.statusHistory[0].newStatus, 'Quotation Sent');
  assert.equal(sanitized.statusHistory[0].notes, 'Quotation prepared and emailed');
  assert.equal('adminEmail' in sanitized.statusHistory[0], false);
  assert.equal('actorId' in sanitized.statusHistory[0], false);
  assert.equal('customerName' in sanitized, false);
  assert.equal('customerEmail' in sanitized, false);
  assert.equal('customerPhone' in sanitized, false);
  assert.equal('customerCity' in sanitized, false);
  assert.equal('adminNotes' in sanitized, false);
  assert.equal('internalNotes' in sanitized, false);
  assert.equal('hostingNotes' in sanitized, false);
  assert.equal('clientId' in sanitized, false);
  assert.equal('trackingToken' in sanitized, false);
  assert.equal(sanitizeTrackedOrder(null), null);
});

