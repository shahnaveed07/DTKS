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

test('formatCurrency returns Request Pricing when price is null or unconfigured', () => {
  assert.equal(formatCurrency(null), 'Request Pricing');
  assert.equal(formatCurrency(undefined), 'Request Pricing');
  assert.match(formatCurrency(15000, 'INR'), /15,000/);
});

test('filterOrders and findTrackedOrder work accurately for website orders', () => {
  const orders = [
    {
      referenceId: 'DKS-2026-0001',
      customerEmail: 'demo@example.com',
      customerName: 'Demo',
      projectName: 'Alpha Business Website',
      service: 'Business & Corporate Websites',
      status: 'Quotation Sent',
    },
    {
      referenceId: 'DKS-2026-0002',
      customerEmail: 'ops@example.com',
      customerName: 'Ops',
      projectName: 'Beta E-Commerce Store',
      service: 'E-Commerce Websites',
      status: 'Under Review',
    },
  ];

  assert.equal(filterOrders(orders, { status: 'Quotation Sent' }).length, 1);
  assert.equal(filterOrders(orders, { query: 'Beta' }).length, 1);
  assert.equal(findTrackedOrder(orders, 'dks-2026-0001', 'DEMO@EXAMPLE.COM')?.projectName, 'Alpha Business Website');
  assert.equal(findTrackedOrder(orders, 'DKS-2026-0001', 'wrong@example.com'), null);
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
