import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Lock, LogIn, ShieldAlert, AlertCircle } from 'lucide-react';
import {
  getAdminAccessPolicy,
  loginAdmin,
  verifyAdminSession,
} from '../../services/api/apiClient.js';
import { useApp } from '../../context/AppContext.jsx';
import { sanitizeInternalRedirect, validateLoginCredentials } from '../../utils/authValidation.js';
import { PasswordInput } from '../../components/auth/PasswordStrengthMeter.jsx';
import SEO from '../../components/common/SEO.jsx';
import BrandLogo from '../../components/common/BrandLogo.jsx';

export default function AdminLoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshAll, addToast } = useApp();
  const policy = getAdminAccessPolicy();

  const redirectTo = sanitizeInternalRedirect(
    location.state?.from || searchParams.get('redirect'),
    '/admin',
    '/admin'
  );
  const wasExpired = Boolean(location.state?.expired || searchParams.get('reason') === 'expired');

  const [checkingSession, setCheckingSession] = useState(policy === 'session_required');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    if (policy === 'allowed_dev' || policy === 'blocked_production_local') {
      setCheckingSession(false);
      return undefined;
    }

    verifyAdminSession()
      .then((res) => {
        if (!active) return;
        if (res?.authenticated) {
          navigate(redirectTo, { replace: true });
        } else {
          setCheckingSession(false);
        }
      })
      .catch(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, [policy, navigate, redirectTo]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setLoginError('');
    setFieldErrors({});

    const validation = validateLoginCredentials({ email, password });
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginAdmin(validation.data);
      if (!res.success) {
        setLoginError(res.message || 'Invalid administrator email or password.');
        return;
      }
      setPassword('');
      await refreshAll({ includeAdmin: true });
      addToast('Signed in to DTKS Administration.', 'success');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setLoginError(err?.message || 'Unable to sign in right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (policy === 'blocked_production_local') {
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
            <p className="text-xs font-semibold text-[#16834A]">Protected Administration Route</p>
            <h1 className="font-display text-2xl font-bold text-[#17231C]">
              Admin Sign In Unavailable in Public Mode
            </h1>
            <p className="text-sm text-[#64756B] leading-relaxed">
              Secure Admin access will be enabled after backend authentication is configured.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Website</span>
          </Link>
        </div>
      </div>
    );
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#F7FAF7] flex items-center justify-center p-6">
        <SEO noindex fullTitle="Verifying Admin Session | DTKS" />
        <div className="max-w-md w-full rounded-xl border border-[#E3EBE5] bg-white p-8 shadow-xs text-center space-y-3">
          <div className="w-10 h-10 rounded-lg bg-[#E8F5EC] text-[#16834A] flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="font-display text-lg font-bold text-[#17231C]">
            Checking Administrator Session
          </h1>
          <p className="text-xs text-[#64756B]">
            Verifying your authentication status...
          </p>
        </div>
      </div>
    );
  }

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
            DTKS Operations Console
          </p>
          <h1 className="font-display text-2xl font-bold text-[#17231C]">
            Administrator Sign In
          </h1>
          <p className="text-sm text-[#64756B] leading-relaxed">
            Sign in with your verified administrator account to access the DTKS dashboard.
          </p>
        </div>

        {policy === 'allowed_dev' && (
          <div className="rounded-lg border border-[#16834A]/30 bg-[#E8F5EC]/60 px-3.5 py-3 text-xs text-[#116438] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>
              Local dev adapter is active. Admin routes are accessible without a backend server.
            </span>
            <Link
              to={redirectTo}
              className="font-semibold text-[#16834A] hover:text-[#116438] underline whitespace-nowrap shrink-0"
            >
              Open Admin Console
            </Link>
          </div>
        )}

        {wasExpired && !loginError && (
          <div
            role="status"
            className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Your administrator session expired or was signed out. Please sign in again.</span>
          </div>
        )}

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
              Administrator Email<span className="text-red-600 ml-0.5">*</span>
            </label>
            <input
              id="admin-login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@dreamtechkashmirsolutions.studio"
              aria-invalid={Boolean(fieldErrors.email)}
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-[#17231C] focus:outline-none ${
                fieldErrors.email
                  ? 'border-red-400 focus:border-red-600'
                  : 'border-[#E3EBE5] focus:border-[#16834A]'
              }`}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          <PasswordInput
            id="admin-login-password"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            error={fieldErrors.password}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] disabled:opacity-50 text-white transition-colors"
          >
            <LogIn className="w-4 h-4" />
            <span>{isSubmitting ? 'Signing In...' : 'Sign In to Admin'}</span>
          </button>
        </form>

        <div className="pt-3 border-t border-[#E3EBE5] flex items-center justify-between gap-3 text-xs">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 font-medium text-[#64756B] hover:text-[#16834A] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Website</span>
          </Link>
          <Link
            to="/login"
            className="font-medium text-[#64756B] hover:text-[#16834A] transition-colors"
          >
            Client Login
          </Link>
        </div>
      </div>
    </div>
  );
}
