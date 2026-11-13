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

test('seedData defaults contain zero demo orders, inquiries, sample portfolio, or placeholder team', () => {
  assert.deepEqual(INITIAL_ORDERS, []);
  assert.deepEqual(INITIAL_INQUIRIES, []);
  assert.deepEqual(INITIAL_PORTFOLIO, []);
  assert.deepEqual(INITIAL_TEAM, []);
  assert.equal(INITIAL_SETTINGS.contactEmail, '');
  assert.equal(INITIAL_SETTINGS.contactPhone, '');
  assert.equal(INITIAL_SETTINGS.whatsappNumber, '');
  assert.equal(INITIAL_SETTINGS.businessLocation, '');
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

  assert.equal(sanitized.settings.contactEmail, '');
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
