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

test('validateOrderStep enforces required fields at each step', () => {
  assert.equal(validateOrderStep(1, { service: '' }).isValid, false);
  assert.equal(validateOrderStep(1, { service: 'Website Development' }).isValid, true);

  const step3Fail = validateOrderStep(3, { projectName: 'A', projectDescription: 'Too short' });
  assert.equal(step3Fail.isValid, false);
  assert.ok(step3Fail.errors.projectName);
  assert.ok(step3Fail.errors.projectDescription);

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
    subject: 'Custom software inquiry',
    message: 'We need a web portal for managing regional inventory.',
  });
  assert.equal(valid.isValid, true);
});

test('formatCurrency returns Request Pricing when price is null or unconfigured', () => {
  assert.equal(formatCurrency(null), 'Request Pricing');
  assert.equal(formatCurrency(undefined), 'Request Pricing');
  assert.match(formatCurrency(15000, 'INR'), /15,000/);
});

test('filterOrders and findTrackedOrder work accurately', () => {
  const orders = [
    {
      referenceId: 'DKS-2026-0001',
      customerEmail: 'demo@example.com',
      customerName: 'Demo',
      projectName: 'Alpha Portal',
      service: 'Website Development',
      status: 'Quotation Sent',
    },
    {
      referenceId: 'DKS-2026-0002',
      customerEmail: 'ops@example.com',
      customerName: 'Ops',
      projectName: 'Beta App',
      service: 'Web Application',
      status: 'Under Review',
    },
  ];

  assert.equal(filterOrders(orders, { status: 'Quotation Sent' }).length, 1);
  assert.equal(filterOrders(orders, { query: 'Beta' }).length, 1);
  assert.equal(findTrackedOrder(orders, 'dks-2026-0001', 'DEMO@EXAMPLE.COM')?.projectName, 'Alpha Portal');
  assert.equal(findTrackedOrder(orders, 'DKS-2026-0001', 'wrong@example.com'), null);
});

test('computeDashboardStats computes accurate counts', () => {
  const stats = computeDashboardStats({
    orders: [
      { status: 'New Request' },
      { status: 'In Progress' },
      { status: 'Completed' },
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
    portfolioProjects: 1,
    teamMembers: 2,
  });
});
