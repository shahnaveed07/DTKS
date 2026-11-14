import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { apiRequest, getAdminAccessPolicy } from '../../services/api/apiClient.js';
import SEO from '../common/SEO.jsx';
import BrandLogo from '../common/BrandLogo.jsx';

/**
 * Reusable Admin Route Guard (Phase 4)
 * - In local development (`allowed_dev`): Allows access to the Admin workspace for development and testing.
 * - In production LocalStorage mode (`blocked_production_local`): Blocks public access to unsecured demo Admin routes
 *   and displays a clean notice: "Secure Admin access will be enabled after backend authentication is configured."
 * - In API mode (`session_required`): Verifies server-authenticated session via `/api/admin/session` (`credentials: 'include'`).
 * - Strictly avoids fake frontend password prompts or LocalStorage password checks.
 */
export default function RequireAdmin({ children }) {
  const policy = getAdminAccessPolicy();
  const [sessionState, setSessionState] = useState(() =>
    policy === 'session_required' ? 'checking' : policy === 'allowed_dev' ? 'authorized' : 'blocked'
  );

  useEffect(() => {
    const currentPolicy = getAdminAccessPolicy();
    if (currentPolicy === 'allowed_dev') {
      setSessionState('authorized');
      return;
    }
    if (currentPolicy === 'blocked_production_local') {
      setSessionState('blocked');
      return;
    }

    let active = true;
    setSessionState('checking');
    apiRequest('/admin/session', { method: 'GET', credentials: 'include' })
      .then((res) => {
        if (!active) return;
        if (res && res.success && res.data?.authenticated !== false) {
          setSessionState('authorized');
        } else {
          setSessionState('unauthorized');
        }
      })
      .catch(() => {
        if (active) {
          setSessionState('unauthorized');
        }
      });

    return () => {
      active = false;
    };
  }, [policy]);

  if (sessionState === 'authorized') {
    return children;
  }

  if (sessionState === 'checking') {
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
            Checking server-side authentication status...
          </p>
        </div>
      </div>
    );
  }

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

        <div className="rounded-lg border border-[#E3EBE5] bg-[#F7FAF7] p-4 text-xs text-[#64756B] leading-relaxed">
          {sessionState === 'unauthorized'
            ? 'No active server-authenticated administrator session was found for this browser.'
            : 'For security, the browser-local demonstration Admin workspace is disabled on the public production domain until server-side authentication is active.'}
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
