import { useState, useEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import {
  getAdminAccessPolicy,
  subscribeAdminAuth,
  verifyAdminSession,
} from '../../services/api/apiClient.js';
import { canAccessAdminPath } from '../../utils/authValidation.js';
import SEO from '../common/SEO.jsx';
import BrandLogo from '../common/BrandLogo.jsx';

/**
 * Reusable Admin Route Guard
 * - In local development (`allowed_dev`): Allows access with dev admin profile.
 * - In production LocalStorage mode (`blocked_production_local`): Blocks access with restricted notice.
 * - In API mode (`session_required`): Verifies server-side session via `GET /api/v1/auth/me`
 *   and redirects unauthenticated requests to `/admin/login` while preserving the destination route.
 *   Never exposes admin UI while verification is pending or when role lacks permission.
 */
export default function RequireAdmin({ children, allowedRoles = null }) {
  const location = useLocation();
  const policy = getAdminAccessPolicy();

  const [authState, setAuthState] = useState(() => {
    if (policy === 'allowed_dev') {
      return {
        status: 'authorized',
        admin: {
          id: 'adm-local-super',
          name: 'Local Development Admin',
          email: 'support@dreamtechkashmirsolutions.studio',
          role: 'super_admin',
        },
        expired: false,
      };
    }
    if (policy === 'blocked_production_local') {
      return { status: 'blocked', admin: null, expired: false };
    }
    return { status: 'checking', admin: null, expired: false };
  });

  useEffect(() => {
    const currentPolicy = getAdminAccessPolicy();
    if (currentPolicy === 'allowed_dev') {
      setAuthState({
        status: 'authorized',
        admin: {
          id: 'adm-local-super',
          name: 'Local Development Admin',
          email: 'support@dreamtechkashmirsolutions.studio',
          role: 'super_admin',
        },
        expired: false,
      });
      return;
    }
    if (currentPolicy === 'blocked_production_local') {
      setAuthState({ status: 'blocked', admin: null, expired: false });
      return;
    }

    let active = true;
    setAuthState((prev) => ({ ...prev, status: 'checking' }));

    verifyAdminSession()
      .then((res) => {
        if (!active) return;
        if (res && res.authenticated && res.admin) {
          setAuthState({ status: 'authorized', admin: res.admin, expired: false });
        } else {
          const isExpired =
            res?.errorCode === 'TOKEN_EXPIRED' ||
            res?.errorCode === 'REFRESH_TOKEN_EXPIRED' ||
            res?.errorCode === 'SESSION_REVOKED';
          setAuthState({ status: 'unauthorized', admin: null, expired: isExpired });
        }
      })
      .catch(() => {
        if (active) {
          setAuthState({ status: 'unauthorized', admin: null, expired: false });
        }
      });

    const unsubscribe = subscribeAdminAuth((session) => {
      if (!active) return;
      if (!session && getAdminAccessPolicy() === 'session_required') {
        setAuthState({ status: 'unauthorized', admin: null, expired: true });
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [policy, location.pathname]);

  if (authState.status === 'checking') {
    return (
      <div className="min-h-screen bg-[#F7FAF7] flex items-center justify-center p-6">
        <SEO noindex fullTitle="Verifying Admin Session | DTKS" />
        <div className="max-w-md w-full rounded-xl border border-[#E3EBE5] bg-white p-8 shadow-xs text-center space-y-3">
          <div className="w-10 h-10 rounded-lg bg-[#E8F5EC] text-[#16834A] flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="font-display text-lg font-bold text-[#17231C]">
            Verifying Admin Session
          </h1>
          <p className="text-xs text-[#64756B]">
            Checking server-side authentication and role permissions...
          </p>
        </div>
      </div>
    );
  }

  if (authState.status === 'unauthorized') {
    const requestedPath = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: requestedPath, expired: authState.expired }}
      />
    );
  }

  if (authState.status === 'blocked') {
    return (
      <div className="min-h-screen bg-[#F7FAF7] flex flex-col justify-center items-center p-6">
        <SEO noindex fullTitle="Admin Access Restricted | DreamTech Kashmir Solutions (DTKS)" />
        <div className="max-w-lg w-full rounded-xl border border-[#E3EBE5] bg-white p-8 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <BrandLogo variant="header" />
            <div className="w-10 h-10 rounded-lg bg-[#E8F5EC] text-[#16834A] flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#16834A]">
              Protected Administration Route
            </p>
            <h1 className="font-display text-2xl font-bold text-[#17231C]">
              Admin Panel Unavailable in Public Mode
            </h1>
            <p className="text-sm text-[#64756B] leading-relaxed">
              Secure Admin access will be enabled after backend authentication is configured.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Website</span>
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-[#E3EBE5] text-[#17231C] hover:bg-[#F7FAF7] transition-colors"
            >
              <span>Contact DTKS</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Server-verified role check (plus path check)
  const adminRole = authState.admin?.role || '';
  const hasRoleAccess =
    (!Array.isArray(allowedRoles) || allowedRoles.includes(adminRole)) &&
    canAccessAdminPath(adminRole, location.pathname);

  if (!hasRoleAccess) {
    return (
      <div className="min-h-screen bg-[#F7FAF7] flex flex-col justify-center items-center p-6">
        <SEO noindex fullTitle="403 Access Forbidden | Admin | DTKS" />
        <div className="max-w-lg w-full rounded-xl border border-[#E3EBE5] bg-white p-8 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <BrandLogo variant="header" />
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-red-600">
              403 · Insufficient Role Permissions
            </p>
            <h1 className="font-display text-2xl font-bold text-[#17231C]">
              Access Denied for This Section
            </h1>
            <p className="text-sm text-[#64756B] leading-relaxed">
              Your administrator account does not have permission to view or manage this section.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Admin Overview</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
