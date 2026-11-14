import { API_ENDPOINTS } from '../models/backendModels.js';
import {
  apiRequest,
  clearAdminAuthSession,
  createServiceError,
  createServiceResponse,
  getAdminAccessPolicy,
  getAdminAuthSession,
  getDataAdapterMode,
  loginAdmin,
  logoutAdmin,
  refreshAdminSession,
  setAdminAuthSession,
  subscribeAdminAuth,
  verifyAdminSession,
} from './apiClient.js';
import { readStorage, writeStorageDetailed } from '../storage/localStorageAdapter.js';

const LOCAL_ADMIN_ACCOUNTS_KEY = 'dks_v2_local_admin_accounts';
const LOCAL_ADMIN_INVITES_KEY = 'dks_v2_local_admin_invites';

function getInitialLocalAdmins() {
  const now = new Date().toISOString();
  return [
    {
      id: 'adm-local-super',
      name: 'Local Super Admin',
      email: 'support@dreamtechkashmirsolutions.studio',
      role: 'super_admin',
      isActive: true,
      invitePending: false,
      invitedByAdminId: null,
      inviteAcceptedAt: now,
      deactivatedAt: null,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      activeSessions: 1,
    },
    {
      id: 'adm-local-ops',
      name: 'Operations Manager (Demo)',
      email: 'ops.demo@dreamtechkashmirsolutions.studio',
      role: 'admin',
      isActive: true,
      invitePending: false,
      invitedByAdminId: 'adm-local-super',
      inviteAcceptedAt: now,
      deactivatedAt: null,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
      activeSessions: 0,
    },
    {
      id: 'adm-local-editor',
      name: 'Content Editor (Demo)',
      email: 'editor.demo@dreamtechkashmirsolutions.studio',
      role: 'editor',
      isActive: false,
      invitePending: true,
      invitedByAdminId: 'adm-local-super',
      inviteAcceptedAt: null,
      deactivatedAt: null,
      inviteExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
      activeSessions: 0,
    },
  ];
}

function readLocalAdmins() {
  const existing = readStorage(LOCAL_ADMIN_ACCOUNTS_KEY, null, 'array');
  if (Array.isArray(existing) && existing.length > 0) {
    return existing;
  }
  const seeded = getInitialLocalAdmins();
  writeStorageDetailed(LOCAL_ADMIN_ACCOUNTS_KEY, seeded);
  return seeded;
}

function isEnvelopeWrapper(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return true;
  if (('account' in obj || 'accounts' in obj || 'admins' in obj) && !obj.email && !obj.id) {
    return true;
  }
  return false;
}

export function normalizeAdminRow(row) {
  if (isEnvelopeWrapper(row)) return null;
  if (!row.id && !row.email) return null;

  const invitePending =
    row.invitePending !== undefined
      ? Boolean(row.invitePending)
      : row.invite_pending !== undefined
      ? Boolean(row.invite_pending)
      : false;

  const inviteExpiresAt =
    row.inviteExpiresAt ??
    row.invite_expires_at ??
    row.invitationExpiresAt ??
    row.invitation_expires_at ??
    null;

  const explicitExpired =
    row.inviteExpired ??
    row.invite_expired ??
    row.invitationExpired ??
    row.invitation_expired;

  const computedExpired = Boolean(
    invitePending &&
      inviteExpiresAt &&
      !Number.isNaN(new Date(inviteExpiresAt).getTime()) &&
      new Date(inviteExpiresAt).getTime() <= Date.now()
  );

  return {
    id: row.id,
    name: row.name || '',
    email: row.email || '',
    role: row.role || 'editor',
    isActive:
      row.isActive !== undefined
        ? Boolean(row.isActive)
        : row.is_active !== undefined
        ? Boolean(row.is_active)
        : false,
    invitePending,
    inviteExpired: explicitExpired !== undefined ? Boolean(explicitExpired) : computedExpired,
    inviteExpiresAt,
    invitedByAdminId: row.invitedByAdminId ?? row.invited_by_admin_id ?? null,
    inviteAcceptedAt: row.inviteAcceptedAt ?? row.invite_accepted_at ?? null,
    deactivatedAt: row.deactivatedAt ?? row.deactivated_at ?? null,
    createdAt: row.createdAt || row.created_at || null,
    updatedAt: row.updatedAt || row.updated_at || null,
    lastLoginAt: row.lastLoginAt ?? row.last_login_at ?? null,
    activeSessions: row.activeSessions ?? row.active_sessions ?? null,
  };
}

function filterAndPaginateLocalAdmins(
  list,
  { search = '', role = 'all', status = 'all', page = 1, limit = 10 } = {}
) {
  const q = String(search || '').trim().toLowerCase();
  const filtered = list.filter((item) => {
    if (role && role !== 'all' && item.role !== role) return false;
    if (status === 'active' && (item.invitePending || !item.isActive)) return false;
    if (status === 'inactive' && (item.invitePending || item.isActive)) return false;
    if (status === 'pending' && !item.invitePending) return false;
    if (status === 'expired' && !(item.invitePending && item.inviteExpired)) return false;
    if (q) {
      const hay = `${item.name} ${item.email} ${item.role}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const safeLimit = Math.max(1, Number(limit) || 10);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const start = (safePage - 1) * safeLimit;
  const accounts = filtered.slice(start, start + safeLimit);

  return {
    accounts,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
    },
  };
}

export const authService = {
  getSession: getAdminAuthSession,
  setSession: setAdminAuthSession,
  clearSession: clearAdminAuthSession,
  subscribe: subscribeAdminAuth,
  login: loginAdmin,
  logout: logoutAdmin,
  refresh: refreshAdminSession,
  verifySession: verifyAdminSession,

  async getMe() {
    if (getDataAdapterMode() !== 'api') {
      return verifyAdminSession();
    }
    const res = await apiRequest(API_ENDPOINTS.authMe, { method: 'GET' });
    if (!res.success) return res;
    const admin = normalizeAdminRow(res.data?.admin);
    if (!admin) {
      return createServiceError('Invalid administrator profile payload received from server.', null, {
        errorCode: 'INVALID_RESPONSE',
      });
    }
    const current = getAdminAuthSession();
    if (current) {
      setAdminAuthSession({ ...current, admin });
    }
    return createServiceResponse(admin, res.message || 'Authenticated administrator profile.');
  },

  async updateProfile({ name } = {}) {
    const res = await apiRequest(API_ENDPOINTS.authProfile, {
      method: 'PATCH',
      body: { name },
    });
    if (!res.success) return res;
    const admin = normalizeAdminRow(res.data?.admin);
    if (admin) {
      const current = getAdminAuthSession();
      if (current) {
        setAdminAuthSession({ ...current, admin });
      }
    }
    return createServiceResponse(admin, res.message || 'Admin profile updated.');
  },

  async changePassword({ currentPassword, newPassword } = {}) {
    const res = await apiRequest(API_ENDPOINTS.authChangePassword, {
      method: 'POST',
      body: { currentPassword, newPassword },
    });
    if (!res.success) return res;
    return createServiceResponse(
      res.data || { updated: true },
      res.message || 'Password changed successfully.'
    );
  },

  async listAdminUsers(params = {}) {
    if (getDataAdapterMode() === 'api') {
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.set('search', String(params.search).trim());
      if (params.role && params.role !== 'all') searchParams.set('role', params.role);
      if (params.status && params.status !== 'all') searchParams.set('status', params.status);
      if (params.page) searchParams.set('page', String(params.page));
      if (params.limit) searchParams.set('limit', String(params.limit));
      const qs = searchParams.toString();
      const endpoint = qs
        ? `${API_ENDPOINTS.adminAccounts}?${qs}`
        : API_ENDPOINTS.adminAccounts;
      const res = await apiRequest(endpoint, { method: 'GET' });
      if (!res.success) return res;

      const rawList = Array.isArray(res.data?.accounts)
        ? res.data.accounts
        : Array.isArray(res.data)
        ? res.data
        : [];
      const accounts = rawList.map(normalizeAdminRow).filter(Boolean);
      const pagination = res.data?.pagination || res.pagination || null;
      return createServiceResponse(
        { accounts, pagination },
        res.message || 'Administrator accounts fetched.'
      );
    }

    if (getAdminAccessPolicy() === 'blocked_production_local') {
      return createServiceError(
        'Secure Admin access will be enabled after backend authentication is configured.',
        null,
        { errorCode: 'FORBIDDEN', statusCode: 403 }
      );
    }

    const list = readLocalAdmins().map(normalizeAdminRow).filter(Boolean);
    return createServiceResponse(
      filterAndPaginateLocalAdmins(list, params),
      'Local development administrator accounts loaded.'
    );
  },

  async getAdminUser(id) {
    if (getDataAdapterMode() === 'api') {
      const res = await apiRequest(`${API_ENDPOINTS.adminAccounts}/${encodeURIComponent(id)}`, {
        method: 'GET',
      });
      if (!res.success) return res;
      const account = normalizeAdminRow(res.data?.account);
      if (!account) {
        return createServiceError(
          'Invalid administrator account payload received from server.',
          null,
          { errorCode: 'INVALID_RESPONSE' }
        );
      }
      return createServiceResponse({ account }, res.message || 'Administrator details loaded.');
    }

    if (getAdminAccessPolicy() === 'blocked_production_local') {
      return createServiceError('Access forbidden.', null, {
        errorCode: 'FORBIDDEN',
        statusCode: 403,
      });
    }
    const found = readLocalAdmins().find((item) => item.id === id);
    if (!found) {
      return createServiceError('Administrator account not found.', null, {
        errorType: 'NotFoundError',
        errorCode: 'NOT_FOUND',
        statusCode: 404,
      });
    }
    return createServiceResponse(
      { account: normalizeAdminRow(found) },
      'Administrator details loaded.'
    );
  },

  async createAdminUser({ name, email, role = 'editor' } = {}) {
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (getDataAdapterMode() === 'api') {
      const res = await apiRequest(API_ENDPOINTS.adminAccounts, {
        method: 'POST',
        body: { name: cleanName, email: cleanEmail, role },
      });

      if (!res.success) {
        const rawPartialAccount = res.details?.account || res.data?.account || null;
        const partialAccount = rawPartialAccount ? normalizeAdminRow(rawPartialAccount) : null;
        const accountCreated = Boolean(
          partialAccount ||
            res.details?.accountCreated ||
            res.data?.accountCreated ||
            res.details?.invitePending ||
            res.data?.invitePending ||
            res.details?.emailDeliveryFailed ||
            res.errorCode === 'INVITE_EMAIL_FAILED' ||
            res.errorCode === 'EMAIL_DELIVERY_FAILED'
        );
        return {
          ...res,
          accountCreated,
          partialAccount,
        };
      }

      const account = normalizeAdminRow(res.data?.account);
      const inviteEmailSent =
        res.data?.inviteEmailSent !== undefined
          ? Boolean(res.data.inviteEmailSent)
          : res.data?.emailSent !== undefined
          ? Boolean(res.data.emailSent)
          : true;

      return createServiceResponse(
        {
          account,
          inviteEmailSent,
          deliveryStatus: res.data?.deliveryStatus || (inviteEmailSent ? 'sent' : 'failed'),
        },
        res.message || 'Administrator invitation created.'
      );
    }

    if (getAdminAccessPolicy() === 'blocked_production_local') {
      return createServiceError('Access forbidden.', null, {
        errorCode: 'FORBIDDEN',
        statusCode: 403,
      });
    }

    const list = readLocalAdmins();
    if (list.some((item) => String(item.email || '').toLowerCase() === cleanEmail)) {
      return createServiceError(
        'An administrator account with this email already exists.',
        null,
        {
          errorCode: 'DUPLICATE_RECORD',
          statusCode: 409,
          details: { email: 'Email is already registered.' },
        }
      );
    }

    const now = new Date().toISOString();
    const id = `adm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const inviteToken = `adm-inv-${Math.random().toString(36).slice(2, 12)}`;
    const inviteExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    const created = {
      id,
      name: cleanName,
      email: cleanEmail,
      role,
      isActive: false,
      invitePending: true,
      invitedByAdminId: 'adm-local-super',
      inviteAcceptedAt: null,
      deactivatedAt: null,
      inviteExpiresAt,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
      activeSessions: 0,
    };

    const writeRes = writeStorageDetailed(LOCAL_ADMIN_ACCOUNTS_KEY, [...list, created], {
      verify: true,
    });
    if (!writeRes.ok) {
      return createServiceError(writeRes.message, null, { errorType: writeRes.errorType });
    }

    const invites = readStorage(LOCAL_ADMIN_INVITES_KEY, [], 'array');
    writeStorageDetailed(LOCAL_ADMIN_INVITES_KEY, [
      ...invites.filter((inv) => inv.adminId !== id),
      { token: inviteToken, adminId: id, email: cleanEmail, expiresAt: inviteExpiresAt },
    ]);

    return createServiceResponse(
      {
        account: normalizeAdminRow(created),
        inviteEmailSent: true,
        localInviteToken: inviteToken,
      },
      'Administrator invitation created in local dev storage.'
    );
  },

  async updateAdminUser(id, { name, role } = {}) {
    const payload = {
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(role !== undefined ? { role } : {}),
    };

    if (getDataAdapterMode() === 'api') {
      const res = await apiRequest(`${API_ENDPOINTS.adminAccounts}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: payload,
      });
      if (!res.success) return res;
      const account = normalizeAdminRow(res.data?.account);
      return createServiceResponse(
        { account },
        res.message || 'Administrator account updated.'
      );
    }

    if (getAdminAccessPolicy() === 'blocked_production_local') {
      return createServiceError('Access forbidden.', null, {
        errorCode: 'FORBIDDEN',
        statusCode: 403,
      });
    }

    const list = readLocalAdmins();
    const target = list.find((item) => item.id === id);
    if (!target) {
      return createServiceError('Administrator account not found.', null, {
        errorType: 'NotFoundError',
        errorCode: 'NOT_FOUND',
        statusCode: 404,
      });
    }

    const nextRole = payload.role !== undefined ? payload.role : target.role;
    if (id === 'adm-local-super' && nextRole !== 'super_admin') {
      return createServiceError(
        'You cannot demote your own super_admin account.',
        null,
        { errorCode: 'SELF_MODIFICATION_FORBIDDEN', statusCode: 400 }
      );
    }

    const updated = {
      ...target,
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.role !== undefined ? { role: payload.role } : {}),
      updatedAt: new Date().toISOString(),
    };
    const nextList = list.map((item) => (item.id === id ? updated : item));
    const writeRes = writeStorageDetailed(LOCAL_ADMIN_ACCOUNTS_KEY, nextList, { verify: true });
    if (!writeRes.ok) {
      return createServiceError(writeRes.message, null, { errorType: writeRes.errorType });
    }
    return createServiceResponse(
      { account: normalizeAdminRow(updated) },
      'Administrator account updated.'
    );
  },

  async updateAdminUserStatus(id, isActive) {
    const nextActive = Boolean(isActive);

    if (getDataAdapterMode() === 'api') {
      const res = await apiRequest(
        `${API_ENDPOINTS.adminAccounts}/${encodeURIComponent(id)}/status`,
        {
          method: 'PATCH',
          body: { isActive: nextActive },
        }
      );
      if (!res.success) return res;
      const account = normalizeAdminRow(res.data?.account);
      return createServiceResponse(
        { account },
        res.message ||
          (nextActive ? 'Administrator account activated.' : 'Administrator account deactivated.')
      );
    }

    if (getAdminAccessPolicy() === 'blocked_production_local') {
      return createServiceError('Access forbidden.', null, {
        errorCode: 'FORBIDDEN',
        statusCode: 403,
      });
    }

    const list = readLocalAdmins();
    const target = list.find((item) => item.id === id);
    if (!target) {
      return createServiceError('Administrator account not found.', null, {
        errorType: 'NotFoundError',
        errorCode: 'NOT_FOUND',
        statusCode: 404,
      });
    }

    if (id === 'adm-local-super' && !nextActive) {
      return createServiceError(
        'You cannot deactivate your own super_admin account.',
        null,
        { errorCode: 'SELF_MODIFICATION_FORBIDDEN', statusCode: 400 }
      );
    }

    const now = new Date().toISOString();
    const updated = {
      ...target,
      isActive: nextActive,
      deactivatedAt: nextActive ? null : now,
      updatedAt: now,
      ...(nextActive ? {} : { activeSessions: 0 }),
    };
    const nextList = list.map((item) => (item.id === id ? updated : item));
    const writeRes = writeStorageDetailed(LOCAL_ADMIN_ACCOUNTS_KEY, nextList, { verify: true });
    if (!writeRes.ok) {
      return createServiceError(writeRes.message, null, { errorType: writeRes.errorType });
    }
    return createServiceResponse(
      { account: normalizeAdminRow(updated) },
      nextActive ? 'Administrator account activated.' : 'Administrator account deactivated.'
    );
  },

  async resendAdminInvite(id) {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(
        `${API_ENDPOINTS.adminAccounts}/${encodeURIComponent(id)}/resend-invite`,
        {
          method: 'POST',
          body: {},
        }
      );
    }

    if (getAdminAccessPolicy() === 'blocked_production_local') {
      return createServiceError('Access forbidden.', null, {
        errorCode: 'FORBIDDEN',
        statusCode: 403,
      });
    }

    const list = readLocalAdmins();
    const target = list.find((item) => item.id === id);
    if (!target) {
      return createServiceError('Administrator account not found.', null, {
        errorType: 'NotFoundError',
        errorCode: 'NOT_FOUND',
        statusCode: 404,
      });
    }
    if (!target.invitePending) {
      return createServiceError('This administrator has already accepted their invitation.', null, {
        errorCode: 'INVITE_ALREADY_ACCEPTED',
        statusCode: 400,
      });
    }

    const inviteToken = `adm-inv-${Math.random().toString(36).slice(2, 12)}`;
    const inviteExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const nextList = list.map((item) =>
      item.id === id ? { ...item, inviteExpiresAt, updatedAt: new Date().toISOString() } : item
    );
    writeStorageDetailed(LOCAL_ADMIN_ACCOUNTS_KEY, nextList);

    const invites = readStorage(LOCAL_ADMIN_INVITES_KEY, [], 'array');
    writeStorageDetailed(LOCAL_ADMIN_INVITES_KEY, [
      ...invites.filter((inv) => inv.adminId !== id),
      { token: inviteToken, adminId: id, email: target.email, expiresAt: inviteExpiresAt },
    ]);

    return createServiceResponse(
      { sent: true, localInviteToken: inviteToken },
      `Invitation resent to ${target.email}.`
    );
  },

  async revokeAdminSessions(id) {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(`${API_ENDPOINTS.adminAccounts}/${encodeURIComponent(id)}/sessions`, {
        method: 'DELETE',
      });
    }

    if (getAdminAccessPolicy() === 'blocked_production_local') {
      return createServiceError('Access forbidden.', null, {
        errorCode: 'FORBIDDEN',
        statusCode: 403,
      });
    }
    const list = readLocalAdmins();
    const target = list.find((item) => item.id === id);
    if (!target) {
      return createServiceError('Administrator account not found.', null, {
        errorType: 'NotFoundError',
        errorCode: 'NOT_FOUND',
        statusCode: 404,
      });
    }
    const nextList = list.map((item) =>
      item.id === id ? { ...item, activeSessions: 0, updatedAt: new Date().toISOString() } : item
    );
    writeStorageDetailed(LOCAL_ADMIN_ACCOUNTS_KEY, nextList);
    return createServiceResponse({ revoked: true, id }, 'Active sessions revoked.');
  },

  async acceptAdminInvite({ token, password, confirmPassword } = {}) {
    const cleanToken = String(token || '').trim();
    const rawPassword = String(password || '');
    const rawConfirmPassword = String(confirmPassword || '');

    if (!cleanToken || !rawPassword) {
      return createServiceError('Invitation token and password are required.', null, {
        errorCode: 'VALIDATION_ERROR',
        statusCode: 400,
      });
    }

    if (getDataAdapterMode() === 'api') {
      const res = await apiRequest(API_ENDPOINTS.authAcceptInvite, {
        method: 'POST',
        body: {
          token: cleanToken,
          password: rawPassword,
          confirmPassword: rawConfirmPassword,
        },
        skipAuthRefresh: true,
      });
      if (res.success) {
        clearAdminAuthSession();
      }
      return res;
    }

    if (getAdminAccessPolicy() === 'blocked_production_local') {
      return createServiceError('Backend not configured.', null, { statusCode: 503 });
    }

    const invites = readStorage(LOCAL_ADMIN_INVITES_KEY, [], 'array');
    const match = invites.find((inv) => inv.token === cleanToken);
    if (!match) {
      return createServiceError(
        'This administrator invitation link is invalid or has already been used.',
        null,
        { errorCode: 'INVALID_INVITE_TOKEN', statusCode: 400 }
      );
    }
    if (new Date(match.expiresAt).getTime() <= Date.now()) {
      return createServiceError(
        'This administrator invitation has expired. Ask a Super Admin to resend the invitation.',
        null,
        { errorCode: 'INVITE_EXPIRED', statusCode: 400 }
      );
    }

    const now = new Date().toISOString();
    const nextAdmins = readLocalAdmins().map((item) =>
      item.id === match.adminId
        ? {
            ...item,
            invitePending: false,
            isActive: true,
            inviteAcceptedAt: now,
            updatedAt: now,
          }
        : item
    );
    writeStorageDetailed(LOCAL_ADMIN_ACCOUNTS_KEY, nextAdmins);
    writeStorageDetailed(
      LOCAL_ADMIN_INVITES_KEY,
      invites.filter((inv) => inv.token !== cleanToken)
    );
    clearAdminAuthSession();

    return createServiceResponse(
      { accepted: true, email: match.email },
      'Administrator account activated. Please sign in with your new password.'
    );
  },
};
