import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluatePasswordStrength,
  validateClientRegistrationInput,
  validateLoginCredentials,
  validateResetPasswordInput,
  validateAcceptInviteInput,
  validateChangePasswordInput,
  validateAdminAccountForm,
  canViewAdminAccounts,
  canManageAdminAccounts,
  canAccessAdminPath,
  filterAdminNavByRole,
  sanitizeInternalRedirect,
  isValidAdminRole,
  formatAdminAuthError,
  validateAdminForgotPasswordInput,
  formatAdminRecoveryError,
} from './authValidation.js';

test('evaluatePasswordStrength scores empty, weak, fair, good, and strong passwords accurately', () => {
  assert.equal(evaluatePasswordStrength('').score, 0);
  assert.equal(evaluatePasswordStrength('abc').checks.minLength, false);
  assert.equal(evaluatePasswordStrength('abc').isAcceptable, false);

  const fair = evaluatePasswordStrength('abcdefgh');
  assert.equal(fair.checks.minLength, true);
  assert.equal(fair.isAcceptable, false);

  const good = evaluatePasswordStrength('Abcdefg1');
  assert.equal(good.isAcceptable, true);
  assert.ok(good.score >= 3);

  const strong = evaluatePasswordStrength('Kashmir#2026Portal');
  assert.equal(strong.score, 4);
  assert.equal(strong.label, 'Strong');
});

test('validateClientRegistrationInput enforces all required fields, password match, terms, and preserves confirmPassword', () => {
  const invalid = validateClientRegistrationInput({
    fullName: 'A',
    email: 'not-an-email',
    phone: '123',
    password: 'weak',
    confirmPassword: 'different',
    acceptTerms: false,
  });

  assert.equal(invalid.isValid, false);
  assert.ok(invalid.errors.fullName);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.phone);
  assert.ok(invalid.errors.password);
  assert.ok(invalid.errors.confirmPassword);
  assert.ok(invalid.errors.acceptTerms);

  const valid = validateClientRegistrationInput({
    fullName: 'Aamir Bashir',
    email: 'aamir@kashmircrafts.in',
    phone: '+91 94190 12345',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    acceptTerms: true,
  });

  assert.equal(valid.isValid, true);
  assert.equal(valid.data.email, 'aamir@kashmircrafts.in');
  assert.equal(valid.data.confirmPassword, 'Password123!');
});

test('validateLoginCredentials, validateResetPasswordInput, validateAcceptInviteInput, and validateChangePasswordInput validate properly', () => {
  assert.equal(validateLoginCredentials({ email: 'bad', password: '' }).isValid, false);
  assert.equal(
    validateLoginCredentials({ email: 'client@dtks.in', password: 'Secret123!' }).isValid,
    true
  );

  const badReset = validateResetPasswordInput({
    token: '',
    newPassword: 'Password123!',
    confirmPassword: 'Mismatch!',
  });
  assert.equal(badReset.isValid, false);
  assert.ok(badReset.errors.token);
  assert.ok(badReset.errors.confirmPassword);

  const goodReset = validateResetPasswordInput({
    token: 'reset-tok-1',
    newPassword: 'Password123!',
    confirmPassword: 'Password123!',
  });
  assert.equal(goodReset.isValid, true);
  assert.equal(goodReset.data.confirmPassword, 'Password123!');

  const badInvite = validateAcceptInviteInput({
    token: '',
    password: 'weak',
    confirmPassword: 'other',
  });
  assert.equal(badInvite.isValid, false);
  assert.ok(badInvite.errors.token);
  assert.ok(badInvite.errors.password);
  assert.ok(badInvite.errors.confirmPassword);

  const goodInvite = validateAcceptInviteInput({
    token: 'invite-tok-1',
    password: 'Password123!',
    confirmPassword: 'Password123!',
  });
  assert.equal(goodInvite.isValid, true);
  assert.deepEqual(goodInvite.data, {
    token: 'invite-tok-1',
    password: 'Password123!',
    confirmPassword: 'Password123!',
  });

  const sameChange = validateChangePasswordInput({
    currentPassword: 'Password123!',
    newPassword: 'Password123!',
    confirmPassword: 'Password123!',
  });
  assert.equal(sameChange.isValid, false);
  assert.ok(sameChange.errors.newPassword);
});

test('validateAdminAccountForm validates invitation-based create (name, email, role only) vs edit requirements', () => {
  const createInvalid = validateAdminAccountForm({
    name: 'X',
    email: 'bad',
    role: 'invalid',
    isEdit: false,
  });
  assert.equal(createInvalid.isValid, false);
  assert.ok(createInvalid.errors.name);
  assert.ok(createInvalid.errors.email);
  assert.ok(createInvalid.errors.role);
  assert.equal(createInvalid.errors.password, undefined);

  const createValid = validateAdminAccountForm({
    name: 'Tariq Ahmad',
    email: 'tariq@dtks.in',
    role: 'admin',
    isEdit: false,
  });
  assert.equal(createValid.isValid, true);
  assert.deepEqual(createValid.data, {
    name: 'Tariq Ahmad',
    email: 'tariq@dtks.in',
    role: 'admin',
  });

  const editValid = validateAdminAccountForm({
    name: 'Tariq Ahmad',
    role: 'super_admin',
    isEdit: true,
  });
  assert.equal(editValid.isValid, true);
  assert.deepEqual(editValid.data, {
    name: 'Tariq Ahmad',
    role: 'super_admin',
  });
});

test('RBAC visibility helpers restrict admin accounts accurately across super_admin, admin, and editor', () => {
  assert.equal(canViewAdminAccounts('super_admin'), true);
  assert.equal(canManageAdminAccounts('super_admin'), true);

  assert.equal(canViewAdminAccounts('admin'), true);
  assert.equal(canManageAdminAccounts('admin'), false);

  assert.equal(canViewAdminAccounts('editor'), false);
  assert.equal(canManageAdminAccounts('editor'), false);
  assert.equal(canAccessAdminPath('editor', '/admin/accounts'), false);
  assert.equal(canAccessAdminPath('editor', '/admin/orders'), true);

  const nav = [
    { label: 'Overview', to: '/admin' },
    { label: 'Admin Accounts', to: '/admin/accounts', roles: ['super_admin', 'admin'] },
  ];
  assert.equal(filterAdminNavByRole(nav, 'editor').length, 1);
  assert.equal(filterAdminNavByRole(nav, 'admin').length, 2);
  assert.equal(filterAdminNavByRole(nav, 'super_admin').length, 2);
});

test('sanitizeInternalRedirect prevents open redirects and login self-loops', () => {
  assert.equal(sanitizeInternalRedirect('https://evil.example', '/admin', '/admin'), '/admin');
  assert.equal(sanitizeInternalRedirect('//evil.example', '/admin', '/admin'), '/admin');
  assert.equal(sanitizeInternalRedirect('/admin/login', '/admin', '/admin'), '/admin');
  assert.equal(sanitizeInternalRedirect('/account', '/admin', '/admin'), '/admin');
  assert.equal(sanitizeInternalRedirect('/admin/orders?page=2', '/admin', '/admin'), '/admin/orders?page=2');
  assert.equal(sanitizeInternalRedirect('/account/orders', '/account', '/account'), '/account/orders');
});

test('isValidAdminRole and formatAdminAuthError handle roles and all backend error states safely', () => {
  assert.equal(isValidAdminRole('super_admin'), true);
  assert.equal(isValidAdminRole('admin'), true);
  assert.equal(isValidAdminRole('editor'), true);
  assert.equal(isValidAdminRole('client'), false);
  assert.equal(isValidAdminRole(''), false);

  assert.equal(
    formatAdminAuthError({ errorCode: 'INVALID_CREDENTIALS', statusCode: 401 }),
    'Invalid email or password.'
  );
  assert.match(
    formatAdminAuthError({ errorCode: 'INVITE_PENDING', statusCode: 403 }),
    /invitation setup is still pending/i
  );
  assert.match(
    formatAdminAuthError({ errorCode: 'ACCOUNT_DISABLED', statusCode: 403 }),
    /disabled/i
  );
  assert.match(
    formatAdminAuthError({ errorCode: 'RATE_LIMITED', statusCode: 429 }),
    /Too many sign-in attempts/i
  );
  assert.match(
    formatAdminAuthError({ errorCode: 'NETWORK_ERROR' }),
    /connectivity issue/i
  );
  assert.match(
    formatAdminAuthError({ statusCode: 500, message: 'SQLITE_ERROR: stack trace' }),
    /temporarily unavailable/i
  );
  assert.match(
    formatAdminAuthError({ errorCode: 'TOKEN_EXPIRED', statusCode: 401 }),
    /session expired/i
  );
  assert.match(
    formatAdminAuthError({ errorCode: 'INSUFFICIENT_PERMISSIONS', statusCode: 403 }),
    /permissions/i
  );
});

test('validateAdminForgotPasswordInput and formatAdminRecoveryError validate email and map recovery errors safely', () => {
  const invalid = validateAdminForgotPasswordInput({ email: 'not-an-email' });
  assert.equal(invalid.isValid, false);
  assert.ok(invalid.errors.email);

  const valid = validateAdminForgotPasswordInput({ email: '  Admin@DreamTechKashmirSolutions.Studio ' });
  assert.equal(valid.isValid, true);
  assert.equal(valid.data.email, 'admin@dreamtechkashmirsolutions.studio');

  assert.match(
    formatAdminRecoveryError({ errorCode: 'RATE_LIMITED', statusCode: 429 }, 'forgot'),
    /Too many password recovery attempts/i
  );
  assert.match(
    formatAdminRecoveryError({ errorCode: 'EMAIL_PROVIDER_UNAVAILABLE', statusCode: 503 }, 'forgot'),
    /mail delivery issue/i
  );
  assert.match(
    formatAdminRecoveryError({ errorCode: 'MISSING_RESET_TOKEN', statusCode: 400 }, 'reset'),
    /missing a valid token/i
  );
  assert.match(
    formatAdminRecoveryError({ errorCode: 'TOKEN_ALREADY_USED', statusCode: 400 }, 'reset'),
    /already been used/i
  );
  assert.match(
    formatAdminRecoveryError({ errorCode: 'TOKEN_REVOKED', statusCode: 400 }, 'reset'),
    /revoked/i
  );
  assert.match(
    formatAdminRecoveryError({ errorCode: 'TOKEN_EXPIRED', statusCode: 400 }, 'reset'),
    /expired/i
  );
  assert.match(
    formatAdminRecoveryError({ errorCode: 'INVALID_RESET_TOKEN', statusCode: 400 }, 'reset'),
    /invalid or no longer active/i
  );
  assert.match(
    formatAdminRecoveryError({ statusCode: 500, message: 'SQLITE_ERROR: stack trace' }, 'reset'),
    /temporarily unavailable/i
  );
});
