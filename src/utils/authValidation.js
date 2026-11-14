/**
 * Pure authentication, password strength, form validation, and role-permission helpers.
 * Shared across Admin Login, Admin Accounts Management, Client Auth, and Client Dashboard.
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ADMIN_ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  editor: 'Editor',
};

export function formatAdminRole(role) {
  return ADMIN_ROLE_LABELS[role] || String(role || 'Unknown');
}

export function isValidEmailAddress(value) {
  return EMAIL_REGEX.test(String(value || '').trim());
}

export function isValidPhoneNumber(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Evaluates password strength across 5 criteria (0-4 clamped scale for UI meter).
 */
export function evaluatePasswordStrength(password = '') {
  const raw = String(password || '');
  const checks = {
    minLength: raw.length >= 8,
    hasLower: /[a-z]/.test(raw),
    hasUpper: /[A-Z]/.test(raw),
    hasNumber: /\d/.test(raw),
    hasSymbol: /[^A-Za-z0-9]/.test(raw),
  };

  let metCount = 0;
  if (checks.minLength) metCount += 1;
  if (checks.hasLower && checks.hasUpper) metCount += 1;
  if (checks.hasNumber) metCount += 1;
  if (checks.hasSymbol || raw.length >= 12) metCount += 1;

  let label = 'Too short';
  let tone = 'weak';
  if (!raw) {
    label = 'Enter a password';
    tone = 'empty';
  } else if (!checks.minLength) {
    label = 'Weak — minimum 8 characters';
    tone = 'weak';
  } else if (metCount <= 2) {
    label = 'Fair — add uppercase, numbers, or symbols';
    tone = 'fair';
  } else if (metCount === 3) {
    label = 'Good';
    tone = 'good';
  } else {
    label = 'Strong';
    tone = 'strong';
  }

  return {
    score: raw ? metCount : 0,
    label,
    tone,
    checks,
    isAcceptable: checks.minLength && checks.hasLower && (checks.hasUpper || checks.hasNumber),
  };
}

export function validateClientRegistrationInput({
  fullName = '',
  email = '',
  phone = '',
  password = '',
  confirmPassword = '',
  acceptTerms = false,
} = {}) {
  const errors = {};
  const cleanName = String(fullName || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPhone = String(phone || '').trim();

  if (cleanName.length < 2) {
    errors.fullName = 'Please enter your full name (at least 2 characters).';
  }
  if (!isValidEmailAddress(cleanEmail)) {
    errors.email = 'Please enter a valid email address.';
  }
  if (!isValidPhoneNumber(cleanPhone)) {
    errors.phone = 'Please enter a valid phone number (7 to 15 digits).';
  }

  const strength = evaluatePasswordStrength(password);
  if (!password) {
    errors.password = 'Password is required.';
  } else if (!strength.checks.minLength) {
    errors.password = 'Password must be at least 8 characters long.';
  } else if (!strength.isAcceptable) {
    errors.password = 'Include lowercase letters with at least one uppercase letter or number.';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (!acceptTerms) {
    errors.acceptTerms = 'You must accept the Terms and Conditions and Privacy Policy.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: {
      fullName: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      password: String(password || ''),
      acceptTerms: Boolean(acceptTerms),
    },
  };
}

export function validateLoginCredentials({ email = '', password = '' } = {}) {
  const errors = {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const rawPassword = String(password || '');

  if (!isValidEmailAddress(cleanEmail)) {
    errors.email = 'Please enter a valid email address.';
  }
  if (!rawPassword) {
    errors.password = 'Password is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: { email: cleanEmail, password: rawPassword },
  };
}

export function validateResetPasswordInput({
  token = '',
  newPassword = '',
  confirmPassword = '',
} = {}) {
  const errors = {};
  const cleanToken = String(token || '').trim();

  if (!cleanToken) {
    errors.token = 'A valid password reset token is required.';
  }

  const strength = evaluatePasswordStrength(newPassword);
  if (!newPassword) {
    errors.newPassword = 'New password is required.';
  } else if (!strength.checks.minLength) {
    errors.newPassword = 'New password must be at least 8 characters long.';
  } else if (!strength.isAcceptable) {
    errors.newPassword = 'Include lowercase letters with at least one uppercase letter or number.';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your new password.';
  } else if (newPassword !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: {
      token: cleanToken,
      newPassword: String(newPassword || ''),
    },
  };
}

export function validateChangePasswordInput({
  currentPassword = '',
  newPassword = '',
  confirmPassword = '',
} = {}) {
  const errors = {};
  if (!currentPassword) {
    errors.currentPassword = 'Current password is required.';
  }
  const strength = evaluatePasswordStrength(newPassword);
  if (!newPassword) {
    errors.newPassword = 'New password is required.';
  } else if (!strength.checks.minLength) {
    errors.newPassword = 'New password must be at least 8 characters long.';
  } else if (!strength.isAcceptable) {
    errors.newPassword = 'Include lowercase letters with at least one uppercase letter or number.';
  } else if (currentPassword && newPassword === currentPassword) {
    errors.newPassword = 'New password must be different from your current password.';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your new password.';
  } else if (newPassword !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateAdminAccountForm({
  name = '',
  email = '',
  password = '',
  role = 'editor',
  isEdit = false,
} = {}) {
  const errors = {};
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (cleanName.length < 2) {
    errors.name = 'Administrator name must be at least 2 characters.';
  }
  if (!isEdit && !isValidEmailAddress(cleanEmail)) {
    errors.email = 'Please enter a valid administrator email address.';
  }
  if (!isEdit) {
    const strength = evaluatePasswordStrength(password);
    if (!password) {
      errors.password = 'Initial password is required.';
    } else if (!strength.checks.minLength) {
      errors.password = 'Password must be at least 8 characters long.';
    }
  }
  if (!['super_admin', 'admin', 'editor'].includes(role)) {
    errors.role = 'Please select a valid administrator role.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    data: {
      name: cleanName,
      email: cleanEmail,
      password: String(password || ''),
      role,
    },
  };
}

/**
 * UI-level RBAC visibility helpers (backend remains authoritative).
 */
export function canViewAdminAccounts(role) {
  return role === 'super_admin' || role === 'admin';
}

export function canManageAdminAccounts(role) {
  return role === 'super_admin';
}

export function canAccessAdminPath(role, pathname = '/admin') {
  if (pathname.startsWith('/admin/accounts')) {
    return canViewAdminAccounts(role);
  }
  return ['super_admin', 'admin', 'editor'].includes(role);
}

export function filterAdminNavByRole(navItems = [], role = '') {
  if (!Array.isArray(navItems)) return [];
  return navItems.filter((item) => {
    if (!Array.isArray(item.roles) || item.roles.length === 0) return true;
    return item.roles.includes(role);
  });
}

/**
 * Prevents open redirects when restoring a previously requested route after sign-in.
 */
export function sanitizeInternalRedirect(candidate, fallback = '/', requiredPrefix = '/') {
  if (typeof candidate !== 'string') return fallback;
  const trimmed = candidate.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return fallback;
  if (requiredPrefix && !trimmed.startsWith(requiredPrefix)) return fallback;
  if (trimmed === '/admin/login' || trimmed === '/login') return fallback;
  return trimmed;
}
