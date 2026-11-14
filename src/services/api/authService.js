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

function getInitialLocalAdmins() {
  const now = new Date().toISOString();
  return [
    {
      id: 'adm-local-super',
      name: 'Local Super Admin',
      email: 'support@dreamtechkashmirsolutions.studio',
      role: 'super_admin',
      isActive: true,
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
      isActive: true,
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

function normalizeAdminRow(row) {
  if (!row || typeof row !== 'object') return null;
  return {
    id: row.id,
    name: row.name || '',
    email: row.email || '',
    role: row.role || 'editor',
    isActive: row.isActive !== undefined ? Boolean(row.isActive) : Boolean(row.is_active),
    createdAt: row.createdAt || row.created_at || null,
    updatedAt: row.updatedAt || row.updated_at || null,
    lastLoginAt: row.lastLoginAt ?? row.last_login_at ?? null,
    activeSessions: row.activeSessions ?? row.active_sessions ?? null,
  };
}

function filterAndPaginateLocalAdmins(list, { search = '', role = 'all', status = 'all', page = 1, limit = 10 } = {}) {
  const q = String(search || '').trim().toLowerCase();
  const filtered = list.filter((item) => {
    if (role && role !== 'all' && item.role !== role) return false;
    if (status === 'active' && !item.isActive) return false;
    if (status === 'inactive' && item.isActive) return false;
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
  const items = filtered.slice(start, start + safeLimit);

  return {
    admins: items,
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
    const admin = res.data?.admin || res.data || null;
    if (admin) {
      const current = getAdminAuthSession();
      if (current) {
        setAdminAuthSession({ ...current, admin });
      }
    }
    return createServiceResponse(admin, res.message || 'Authenticated administrator profile.');
  },

  async updateProfile({ name } = {}) {
    const res = await apiRequest(API_ENDPOINTS.authProfile, {
      method: 'PATCH',
      body: { name },
    });
    if (!res.success) return res;
    const admin = res.data?.admin || res.data || null;
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
      const endpoint = qs ? `${API_ENDPOINTS.adminUsers}?${qs}` : API_ENDPOINTS.adminUsers;
      const res = await apiRequest(endpoint, { method: 'GET' });
      if (!res.success) return res;

      const rawList = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.admins)
        ? res.data.admins
        : Array.isArray(res.data?.users)
        ? res.data.users
        : [];
      const admins = rawList.map(normalizeAdminRow).filter(Boolean);
      const pagination = res.data?.pagination || res.pagination || null;
      return createServiceResponse({ admins, pagination }, res.message || 'Administrator accounts fetched.');
    }

    if (getAdminAccessPolicy() === 'blocked_production_local') {
      return createServiceError(
        'Secure Admin access will be enabled after backend authentication is configured.',
        null,
        { errorCode: 'FORBIDDEN', statusCode: 403 }
      );
    }

    const list = readLocalAdmins().map(normalizeAdminRow);
    return createServiceResponse(
      filterAndPaginateLocalAdmins(list, params),
      'Local development administrator accounts loaded.'
    );
  },

  async getAdminUser(id) {
    if (getDataAdapterMode() === 'api') {
      const res = await apiRequest(`${API_ENDPOINTS.adminUsers}/${encodeURIComponent(id)}`, {
        method: 'GET',
      });
      if (!res.success) return res;
      const admin = normalizeAdminRow(res.data?.admin || res.data?.user || res.data);
      return createServiceResponse({ admin }, res.message || 'Administrator details loaded.');
    }

    if (getAdminAccessPolicy() === 'blocked_production_local') {
      return createServiceError('Access forbidden.', null, { errorCode: 'FORBIDDEN', statusCode: 403 });
    }
    const found = readLocalAdmins().find((item) => item.id === id);
    if (!found) {
      return createServiceError('Administrator account not found.', null, {
        errorType: 'NotFoundError',
        errorCode: 'NOT_FOUND',
        statusCode: 404,
      });
    }
    return createServiceResponse({ admin: normalizeAdminRow(found) }, 'Administrator details loaded.');
  },

  async createAdminUser({ name, email, password, role = 'editor', isActive = true } = {}) {
    if (getDataAdapterMode() === 'api') {
      const res = await apiRequest(API_ENDPOINTS.adminUsers, {
        method: 'POST',
        body: { name, email, password, role, isActive },
      });
      if (!res.success) return res;
      const admin = normalizeAdminRow(res.data?.admin || res.data?.user || res.data);
      return createServiceResponse({ admin }, res.message || 'Administrator account created.');
    }

    if (getAdminAccessPolicy() === 'blocked_production_local') {
      return createServiceError('Access forbidden.', null, { errorCode: 'FORBIDDEN', statusCode: 403 });
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    const list = readLocalAdmins();
    if (list.some((item) => String(item.email || '').toLowerCase() === cleanEmail)) {
      return createServiceError(
        'An administrator account with this email already exists.',
        null,
        { errorCode: 'DUPLICATE_RECORD', statusCode: 409, details: { email: 'Email is already registered.' } }
      );
    }

    const now = new Date().toISOString();
    const created = {
      id: `adm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: String(name || '').trim(),
      email: cleanEmail,
      role,
      isActive: Boolean(isActive),
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
      activeSessions: 0,
    };
    const writeRes = writeStorageDetailed(LOCAL_ADMIN_ACCOUNTS_KEY, [...list, created], { verify: true });
    if (!writeRes.ok) {
      return createServiceError(writeRes.message, null, { errorType: writeRes.errorType });
    }
    return createServiceResponse({ admin: created }, 'Administrator account created in local dev storage.');
  },

  async updateAdminUser(id, patch = {}) {
    if (getDataAdapterMode() === 'api') {
      const res = await apiRequest(`${API_ENDPOINTS.adminUsers}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: patch,
      });
      if (!res.success) return res;
      const admin = normalizeAdminRow(res.data?.admin || res.data?.user || res.data);
      return createServiceResponse({ admin }, res.message || 'Administrator account updated.');
    }

    if (getAdminAccessPolicy() === 'blocked_production_local') {
      return createServiceError('Access forbidden.', null, { errorCode: 'FORBIDDEN', statusCode: 403 });
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

    const nextActive = patch.isActive !== undefined ? Boolean(patch.isActive) : target.isActive;
    const nextRole = patch.role !== undefined ? patch.role : target.role;
    if (id === 'adm-local-super' && (!nextActive || nextRole !== 'super_admin')) {
      return createServiceError(
        'You cannot deactivate or demote your own super_admin account.',
        null,
        { errorCode: 'SELF_MODIFICATION_FORBIDDEN', statusCode: 400 }
      );
    }

    const updated = {
      ...target,
      ...(patch.name !== undefined ? { name: String(patch.name).trim() } : {}),
      ...(patch.role !== undefined ? { role: patch.role } : {}),
      ...(patch.isActive !== undefined ? { isActive: Boolean(patch.isActive) } : {}),
      updatedAt: new Date().toISOString(),
      ...(patch.isActive === false ? { activeSessions: 0 } : {}),
    };
    const nextList = list.map((item) => (item.id === id ? updated : item));
    const writeRes = writeStorageDetailed(LOCAL_ADMIN_ACCOUNTS_KEY, nextList, { verify: true });
    if (!writeRes.ok) {
      return createServiceError(writeRes.message, null, { errorType: writeRes.errorType });
    }
    return createServiceResponse({ admin: normalizeAdminRow(updated) }, 'Administrator account updated.');
  },

  async revokeAdminSessions(id) {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(
        `${API_ENDPOINTS.adminUsers}/${encodeURIComponent(id)}/revoke-sessions`,
        { method: 'POST', body: {} }
      );
    }

    if (getAdminAccessPolicy() === 'blocked_production_local') {
      return createServiceError('Access forbidden.', null, { errorCode: 'FORBIDDEN', statusCode: 403 });
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

  async deleteAdminUser(id) {
    if (getDataAdapterMode() === 'api') {
      return apiRequest(`${API_ENDPOINTS.adminUsers}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    }

    if (getAdminAccessPolicy() === 'blocked_production_local') {
      return createServiceError('Access forbidden.', null, { errorCode: 'FORBIDDEN', statusCode: 403 });
    }
    if (id === 'adm-local-super') {
      return createServiceError('You cannot delete your own administrator account.', null, {
        errorCode: 'SELF_DELETE_FORBIDDEN',
        statusCode: 400,
      });
    }
    const list = readLocalAdmins();
    if (!list.some((item) => item.id === id)) {
      return createServiceError('Administrator account not found.', null, {
        errorType: 'NotFoundError',
        errorCode: 'NOT_FOUND',
        statusCode: 404,
      });
    }
    const nextList = list.filter((item) => item.id !== id);
    writeStorageDetailed(LOCAL_ADMIN_ACCOUNTS_KEY, nextList);
    return createServiceResponse({ deletedId: id }, 'Administrator account deleted.');
  },
};
