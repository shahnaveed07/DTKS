import { API_ENDPOINTS } from '../models/backendModels.js';
import {
  createServiceError,
  createServiceResponse,
  getDataAdapterMode,
} from './apiClient.js';
import {
  clearClientAuthSession,
  clientApiRequest,
  getClientAccessPolicy,
  getClientAccessToken,
  getClientAuthSession,
  getClientRefreshToken,
  setClientAuthSession,
  subscribeClientAuth,
} from './clientApiClient.js';
import { readStorage, writeStorageDetailed } from '../storage/localStorageAdapter.js';

const LOCAL_CLIENT_ACCOUNTS_KEY = 'dks_v2_local_client_accounts';
const LOCAL_CLIENT_VERIFICATION_KEY = 'dks_v2_local_client_verifications';
const LOCAL_CLIENT_RESETS_KEY = 'dks_v2_local_client_resets';

async function hashLocalSecret(raw = '') {
  const input = String(raw || '');
  try {
    if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
      const encoded = new TextEncoder().encode(`dtks-local-client:${input}`);
      const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fallback hash if WebCrypto is unavailable in test runner
  }
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fnv1a_${(h >>> 0).toString(16)}`;
}

function sanitizeClientProfile(row) {
  if (!row || typeof row !== 'object') return null;
  return {
    id: row.id,
    fullName: row.fullName || row.full_name || row.name || '',
    email: row.email || '',
    phone: row.phone || '',
    city: row.city || '',
    businessName: row.businessName || row.business_name || '',
    emailVerified:
      row.emailVerified !== undefined
        ? Boolean(row.emailVerified)
        : row.email_verified !== undefined
        ? Boolean(row.email_verified)
        : false,
    createdAt: row.createdAt || row.created_at || null,
    updatedAt: row.updatedAt || row.updated_at || null,
  };
}

function readLocalClients() {
  return readStorage(LOCAL_CLIENT_ACCOUNTS_KEY, [], 'array');
}

function writeLocalClients(list) {
  return writeStorageDetailed(LOCAL_CLIENT_ACCOUNTS_KEY, list, { verify: true });
}

export const clientAuthService = {
  getSession: getClientAuthSession,
  clearSession: clearClientAuthSession,
  subscribe: subscribeClientAuth,
  getAccessPolicy: getClientAccessPolicy,

  async verifySession() {
    const policy = getClientAccessPolicy();
    if (policy === 'blocked_production_local') {
      return {
        authenticated: false,
        client: null,
        policy,
        message: 'Client portal accounts will be available once backend authentication is connected.',
      };
    }

    if (policy === 'local_demo') {
      const session = getClientAuthSession();
      if (!session?.client?.id) {
        return { authenticated: false, client: null, policy, message: 'No active client session.' };
      }
      const clients = readLocalClients();
      const matched = clients.find((c) => c.id === session.client.id);
      if (!matched) {
        clearClientAuthSession();
        return { authenticated: false, client: null, policy, message: 'Session expired.' };
      }
      const profile = sanitizeClientProfile(matched);
      return { authenticated: true, client: profile, policy, message: 'Local demo client session active.' };
    }

    // API mode -> verify strictly via backend
    const res = await clientApiRequest(API_ENDPOINTS.clientAuthMe, { method: 'GET' });
    const rawClient =
      res.data?.client ||
      res.data?.customer ||
      res.data?.user ||
      (res.data && typeof res.data === 'object' && res.data.email ? res.data : null);

    const authenticated = Boolean(res.success && rawClient);
    if (authenticated) {
      const profile = sanitizeClientProfile(rawClient);
      const existing = getClientAuthSession();
      if (existing) {
        setClientAuthSession({ ...existing, client: profile });
      }
      return {
        authenticated: true,
        client: profile,
        policy,
        statusCode: res.statusCode ?? 200,
        message: 'Authenticated client session.',
      };
    }

    if (res.statusCode === 401 || res.statusCode === 403) {
      clearClientAuthSession();
    }

    return {
      authenticated: false,
      client: null,
      policy,
      statusCode: res.statusCode ?? null,
      errorCode: res.errorCode ?? null,
      message: res.message || 'Please sign in to access your client account.',
    };
  },

  async register({ fullName, email, phone, password, acceptTerms } = {}) {
    if (getDataAdapterMode() === 'api') {
      return clientApiRequest(API_ENDPOINTS.clientAuthRegister, {
        method: 'POST',
        body: { fullName, email, phone, password, acceptTerms: Boolean(acceptTerms) },
        skipAuthRefresh: true,
      });
    }

    if (getClientAccessPolicy() === 'blocked_production_local') {
      return createServiceError(
        'Client registration will be available once backend authentication is configured.',
        null,
        { errorCode: 'BACKEND_NOT_CONFIGURED', statusCode: 503 }
      );
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    const clients = readLocalClients();
    if (clients.some((c) => String(c.email || '').toLowerCase() === cleanEmail)) {
      return createServiceError(
        'An account with this email address already exists.',
        null,
        {
          errorCode: 'DUPLICATE_EMAIL',
          statusCode: 409,
          details: { email: 'This email address is already registered.' },
        }
      );
    }

    const now = new Date().toISOString();
    const passwordDigest = await hashLocalSecret(password);
    const id = `cli-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const verificationToken = `verify-${Math.random().toString(36).slice(2, 10)}`;

    const record = {
      id,
      fullName: String(fullName || '').trim(),
      email: cleanEmail,
      phone: String(phone || '').trim(),
      city: '',
      businessName: '',
      passwordDigest,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    };

    const writeRes = writeLocalClients([...clients, record]);
    if (!writeRes.ok) {
      return createServiceError(writeRes.message, null, { errorType: writeRes.errorType });
    }

    const tokens = readStorage(LOCAL_CLIENT_VERIFICATION_KEY, [], 'array');
    writeStorageDetailed(LOCAL_CLIENT_VERIFICATION_KEY, [
      ...tokens.filter((t) => t.email !== cleanEmail),
      {
        token: verificationToken,
        email: cleanEmail,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    ]);

    return createServiceResponse(
      {
        client: sanitizeClientProfile(record),
        requiresVerification: true,
        localVerificationToken: verificationToken,
      },
      'Account created. Please verify your email address to sign in.'
    );
  },

  async verifyEmail({ token } = {}) {
    const cleanToken = String(token || '').trim();
    if (!cleanToken) {
      return createServiceError('Verification token is required.', null, {
        errorCode: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    }

    if (getDataAdapterMode() === 'api') {
      return clientApiRequest(API_ENDPOINTS.clientAuthVerifyEmail, {
        method: 'POST',
        body: { token: cleanToken },
        skipAuthRefresh: true,
      });
    }

    if (getClientAccessPolicy() === 'blocked_production_local') {
      return createServiceError('Backend not configured.', null, { statusCode: 503 });
    }

    const tokens = readStorage(LOCAL_CLIENT_VERIFICATION_KEY, [], 'array');
    const match = tokens.find((t) => t.token === cleanToken);
    if (!match) {
      return createServiceError(
        'This email verification link is invalid or has already been used.',
        null,
        { errorCode: 'INVALID_VERIFICATION_TOKEN', statusCode: 400 }
      );
    }
    if (new Date(match.expiresAt).getTime() <= Date.now()) {
      return createServiceError(
        'This verification token has expired. Request a new verification email.',
        null,
        { errorCode: 'TOKEN_EXPIRED', statusCode: 400 }
      );
    }

    const clients = readLocalClients();
    const now = new Date().toISOString();
    const updatedClients = clients.map((c) =>
      c.email === match.email ? { ...c, emailVerified: true, updatedAt: now } : c
    );
    writeLocalClients(updatedClients);
    writeStorageDetailed(
      LOCAL_CLIENT_VERIFICATION_KEY,
      tokens.filter((t) => t.token !== cleanToken)
    );

    return createServiceResponse(
      { verified: true, email: match.email },
      'Email verified successfully. You can now sign in to your client account.'
    );
  },

  async resendVerification({ email } = {}) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return createServiceError('Please enter your registered email address.', null, {
        errorCode: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    }

    if (getDataAdapterMode() === 'api') {
      return clientApiRequest(API_ENDPOINTS.clientAuthResendVerification, {
        method: 'POST',
        body: { email: cleanEmail },
        skipAuthRefresh: true,
      });
    }

    if (getClientAccessPolicy() === 'blocked_production_local') {
      return createServiceError('Backend not configured.', null, { statusCode: 503 });
    }

    const clients = readLocalClients();
    const existing = clients.find((c) => c.email === cleanEmail);
    const verificationToken = existing && !existing.emailVerified
      ? `verify-${Math.random().toString(36).slice(2, 10)}`
      : null;

    if (verificationToken) {
      const tokens = readStorage(LOCAL_CLIENT_VERIFICATION_KEY, [], 'array');
      writeStorageDetailed(LOCAL_CLIENT_VERIFICATION_KEY, [
        ...tokens.filter((t) => t.email !== cleanEmail),
        {
          token: verificationToken,
          email: cleanEmail,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);
    }

    return createServiceResponse(
      { sent: true, ...(verificationToken ? { localVerificationToken: verificationToken } : {}) },
      'If an unverified account exists for this email, a fresh verification link has been issued.'
    );
  },

  async login({ email, password } = {}) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const rawPassword = String(password || '');

    if (!cleanEmail || !rawPassword) {
      return createServiceError('Please enter both your email address and password.', null, {
        errorCode: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    }

    if (getDataAdapterMode() === 'api') {
      const res = await clientApiRequest(API_ENDPOINTS.clientAuthLogin, {
        method: 'POST',
        body: { email: cleanEmail, password: rawPassword },
        skipAuthRefresh: true,
      });
      if (!res.success) return res;

      const payloadData = res.data || {};
      const client = sanitizeClientProfile(
        payloadData.client || payloadData.customer || payloadData.user || null
      );
      const session = setClientAuthSession({
        accessToken: payloadData.accessToken || payloadData.access_token || '',
        refreshToken: payloadData.refreshToken || payloadData.refresh_token || '',
        csrfToken: payloadData.csrfToken || payloadData.csrf_token || '',
        expiresIn: Number(payloadData.expiresIn ?? payloadData.expires_in ?? 900),
        client,
      });
      return createServiceResponse(
        { client: session.client, accessToken: session.accessToken, expiresIn: session.expiresIn },
        res.message || 'Signed in successfully.'
      );
    }

    if (getClientAccessPolicy() === 'blocked_production_local') {
      return createServiceError(
        'Client login will be available once backend authentication is configured.',
        null,
        { errorCode: 'BACKEND_NOT_CONFIGURED', statusCode: 503 }
      );
    }

    const clients = readLocalClients();
    const found = clients.find((c) => String(c.email || '').toLowerCase() === cleanEmail);
    const inputDigest = await hashLocalSecret(rawPassword);

    if (!found || found.passwordDigest !== inputDigest) {
      return createServiceError('Invalid email address or password.', null, {
        errorCode: 'INVALID_CREDENTIALS',
        statusCode: 401,
      });
    }

    if (!found.emailVerified) {
      return createServiceError(
        'Please verify your email address before signing in.',
        { email: found.email },
        {
          errorCode: 'EMAIL_NOT_VERIFIED',
          statusCode: 403,
        }
      );
    }

    const profile = sanitizeClientProfile(found);
    const session = setClientAuthSession({
      accessToken: `local-client-${Date.now()}`,
      csrfToken: `local-client-csrf-${Date.now()}`,
      expiresIn: 3600,
      client: profile,
    });
    return createServiceResponse({ client: session.client }, 'Signed in to local client portal.');
  },

  async logout({ allDevices = false } = {}) {
    const accessToken = getClientAccessToken();
    const refreshToken = getClientRefreshToken();

    try {
      if (getDataAdapterMode() === 'api' && (accessToken || refreshToken || getClientAuthSession())) {
        await clientApiRequest(API_ENDPOINTS.clientAuthLogout, {
          method: 'POST',
          body: {
            ...(refreshToken ? { refreshToken } : {}),
            ...(allDevices ? { allDevices: true } : {}),
          },
          skipAuthRefresh: true,
        });
      }
    } finally {
      clearClientAuthSession();
    }

    return createServiceResponse({ loggedOut: true }, 'Signed out from your client account.');
  },

  async forgotPassword({ email } = {}) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return createServiceError('Please enter your email address.', null, {
        errorCode: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    }

    if (getDataAdapterMode() === 'api') {
      return clientApiRequest(API_ENDPOINTS.clientAuthForgotPassword, {
        method: 'POST',
        body: { email: cleanEmail },
        skipAuthRefresh: true,
      });
    }

    if (getClientAccessPolicy() === 'blocked_production_local') {
      return createServiceError('Backend not configured.', null, { statusCode: 503 });
    }

    const clients = readLocalClients();
    const found = clients.find((c) => c.email === cleanEmail);
    const resetToken = found ? `reset-${Math.random().toString(36).slice(2, 10)}` : null;

    if (resetToken) {
      const resets = readStorage(LOCAL_CLIENT_RESETS_KEY, [], 'array');
      writeStorageDetailed(LOCAL_CLIENT_RESETS_KEY, [
        ...resets.filter((r) => r.email !== cleanEmail),
        {
          token: resetToken,
          email: cleanEmail,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        },
      ]);
    }

    return createServiceResponse(
      { requested: true, ...(resetToken ? { localResetToken: resetToken } : {}) },
      'If an account matches this email address, password reset instructions have been sent.'
    );
  },

  async resetPassword({ token, newPassword } = {}) {
    const cleanToken = String(token || '').trim();
    const rawPassword = String(newPassword || '');
    if (!cleanToken || !rawPassword) {
      return createServiceError('Reset token and new password are required.', null, {
        errorCode: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    }

    if (getDataAdapterMode() === 'api') {
      return clientApiRequest(API_ENDPOINTS.clientAuthResetPassword, {
        method: 'POST',
        body: { token: cleanToken, newPassword: rawPassword },
        skipAuthRefresh: true,
      });
    }

    if (getClientAccessPolicy() === 'blocked_production_local') {
      return createServiceError('Backend not configured.', null, { statusCode: 503 });
    }

    const resets = readStorage(LOCAL_CLIENT_RESETS_KEY, [], 'array');
    const match = resets.find((r) => r.token === cleanToken);
    if (!match) {
      return createServiceError('Invalid or already used password reset token.', null, {
        errorCode: 'INVALID_RESET_TOKEN',
        statusCode: 400,
      });
    }
    if (new Date(match.expiresAt).getTime() <= Date.now()) {
      return createServiceError('This password reset link has expired. Please request a new one.', null, {
        errorCode: 'TOKEN_EXPIRED',
        statusCode: 400,
      });
    }

    const newDigest = await hashLocalSecret(rawPassword);
    const now = new Date().toISOString();
    const clients = readLocalClients().map((c) =>
      c.email === match.email ? { ...c, passwordDigest: newDigest, updatedAt: now } : c
    );
    writeLocalClients(clients);
    writeStorageDetailed(
      LOCAL_CLIENT_RESETS_KEY,
      resets.filter((r) => r.token !== cleanToken)
    );

    return createServiceResponse(
      { reset: true },
      'Your password has been reset. You can now sign in with your new password.'
    );
  },

  async updateProfile({ fullName, phone, city = '', businessName = '' } = {}) {
    if (getDataAdapterMode() === 'api') {
      const res = await clientApiRequest(API_ENDPOINTS.clientAccountProfile, {
        method: 'PATCH',
        body: { fullName, phone, city, businessName },
      });
      if (!res.success) return res;
      const client = sanitizeClientProfile(res.data?.client || res.data?.customer || res.data);
      const current = getClientAuthSession();
      if (current && client) {
        setClientAuthSession({ ...current, client });
      }
      return createServiceResponse({ client }, res.message || 'Profile updated successfully.');
    }

    if (getClientAccessPolicy() === 'blocked_production_local') {
      return createServiceError('Backend not configured.', null, { statusCode: 503 });
    }

    const currentSession = getClientAuthSession();
    if (!currentSession?.client?.id) {
      return createServiceError('Authentication required.', null, { statusCode: 401 });
    }

    const now = new Date().toISOString();
    let updatedProfile = null;
    const nextClients = readLocalClients().map((c) => {
      if (c.id !== currentSession.client.id) return c;
      const updated = {
        ...c,
        fullName: String(fullName || c.fullName).trim(),
        phone: String(phone || c.phone).trim(),
        city: String(city || '').trim(),
        businessName: String(businessName || '').trim(),
        updatedAt: now,
      };
      updatedProfile = sanitizeClientProfile(updated);
      return updated;
    });

    writeLocalClients(nextClients);
    if (updatedProfile) {
      setClientAuthSession({ ...currentSession, client: updatedProfile });
    }
    return createServiceResponse({ client: updatedProfile }, 'Profile updated successfully.');
  },

  async changePassword({ currentPassword, newPassword } = {}) {
    if (getDataAdapterMode() === 'api') {
      return clientApiRequest(API_ENDPOINTS.clientAccountChangePassword, {
        method: 'POST',
        body: { currentPassword, newPassword },
      });
    }

    if (getClientAccessPolicy() === 'blocked_production_local') {
      return createServiceError('Backend not configured.', null, { statusCode: 503 });
    }

    const currentSession = getClientAuthSession();
    if (!currentSession?.client?.id) {
      return createServiceError('Authentication required.', null, { statusCode: 401 });
    }

    const clients = readLocalClients();
    const target = clients.find((c) => c.id === currentSession.client.id);
    if (!target) {
      return createServiceError('Account not found.', null, { statusCode: 404 });
    }

    const currentDigest = await hashLocalSecret(currentPassword);
    if (target.passwordDigest !== currentDigest) {
      return createServiceError('Current password is incorrect.', null, {
        errorCode: 'INVALID_CURRENT_PASSWORD',
        statusCode: 401,
      });
    }

    const nextDigest = await hashLocalSecret(newPassword);
    const now = new Date().toISOString();
    writeLocalClients(
      clients.map((c) => (c.id === target.id ? { ...c, passwordDigest: nextDigest, updatedAt: now } : c))
    );
    return createServiceResponse({ updated: true }, 'Password changed successfully.');
  },

  async revokeAllSessions() {
    if (getDataAdapterMode() === 'api') {
      const res = await clientApiRequest(API_ENDPOINTS.clientAccountRevokeSessions, {
        method: 'POST',
        body: {},
      });
      if (res.success) {
        clearClientAuthSession();
      }
      return res;
    }
    clearClientAuthSession();
    return createServiceResponse({ revoked: true }, 'All client sessions revoked.');
  },
};
