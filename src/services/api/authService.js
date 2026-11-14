import { API_ENDPOINTS } from '../models/backendModels.js';
import {
  apiRequest,
  clearAdminAuthSession,
  createServiceResponse,
  getAdminAuthSession,
  loginAdmin,
  logoutAdmin,
  refreshAdminSession,
  setAdminAuthSession,
  subscribeAdminAuth,
  verifyAdminSession,
} from './apiClient.js';

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
};
