import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock, LogIn } from 'lucide-react';
import {
  getAdminAccessPolicy,
  loginAdmin,
  subscribeAdminAuth,
  verifyAdminSession,
} from '../../services/api/apiClient.js';
import { useApp } from '../../context/AppContext.jsx';
import SEO from '../common/SEO.jsx';
import BrandLogo from '../common/BrandLogo.jsx';

/**
 * Reusable Admin Route Guard
 * - In local development (`allowed_dev`): Allows access to the Admin workspace for development and testing.
 * - In production LocalStorage mode (`blocked_production_local`): Blocks public access to unsecured demo Admin routes
 *   and displays a clean notice: "Secure Admin access will be enabled after backend authentication is configured."
 * - In API mode (`session_required`): Verifies server-authenticated session via `GET /api/v1/auth/me` (`credentials: 'include'`)
 *   and renders an authenticated backend sign-in form if no active session exists.
 */
export default function RequireAdmin({ children }) {
  const { refreshAll } = useApp();
  const policy = getAdminAccessPolicy();
  const [sessionState, setSessionState] = useState(() =>
    policy === 'session_required' ? 'checking' : policy === 'allowed_dev' ? 'authorized' : 'blocked'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    verifyAdminSession()
      .then((res) => {
        if (!active) return;
        if (res && res.authenticated) {
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

    const unsubscribe = subscribeAdminAuth((session) => {
      if (!active) return;
      if (!session && getAdminAccessPolicy() === 'session_required') {
        setSessionState('unauthorized');
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [policy]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setLoginError('Please enter both your administrator email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginAdmin({ email: cleanEmail, password });
      if (!res.success) {
        setLoginError(res.message || 'Invalid email or password.');
        return;
      }
      setPassword('');
      setSessionState('authorized');
      await refreshAll();
    } catch (err) {
      setLoginError(err?.message || 'Unable to sign in right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  if (sessionState === 'unauthorized') {
    return (
      <div className="min-h-screen bg-[#F7FAF7] flex flex-col justify-center items-center p-6">
        <SEO noindex fullTitle="Administrator Sign In | DreamTech Kashmir Solutions (DTKS)" />
        <div className="max-w-md w-full rounded-xl border border-[#E3EBE5] bg-white p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <BrandLogo variant="header" />
            <div className="w-10 h-10 rounded-lg bg-[#E8F5EC] text-[#16834A] flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[#16834A]">
              Protected Administration Route
            </p>
            <h1 className="font-display text-2xl font-bold text-[#17231C]">
              Administrator Sign In
            </h1>
            <p className="text-sm text-[#64756B] leading-relaxed">
              Sign in with your verified DTKS administrator credentials to access the dashboard.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            {loginError && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700"
              >
                {loginError}
              </div>
            )}

            <div>
              <label htmlFor="admin-login-email" className="block text-xs font-semibold text-[#17231C] mb-1">
                Administrator Email
              </label>
              <input
                id="admin-login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@dreamtechkashmirsolutions.studio"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
              />
            </div>

            <div>
              <label htmlFor="admin-login-password" className="block text-xs font-semibold text-[#17231C] mb-1">
                Password
              </label>
              <input
                id="admin-login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] disabled:opacity-50 text-white transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSubmitting ? 'Signing In...' : 'Sign In to Admin'}</span>
            </button>
          </form>

          <div className="pt-2 border-t border-[#E3EBE5] flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64756B] hover:text-[#16834A] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Website</span>
            </Link>
            <Link
              to="/contact"
              className="text-xs font-medium text-[#64756B] hover:text-[#16834A] transition-colors"
            >
              Need Support?
            </Link>
          </div>
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
          For security, the browser-local demonstration Admin workspace is disabled on the public production domain until server-side authentication is active.
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
