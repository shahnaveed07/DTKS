import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { getAdminAccessPolicy, resetAdminPassword } from '../../services/api/apiClient.js';
import { useApp } from '../../context/AppContext.jsx';
import {
  formatAdminRecoveryError,
  validateResetPasswordInput,
} from '../../utils/authValidation.js';
import { PasswordInput } from '../../components/auth/PasswordStrengthMeter.jsx';
import BrandLogo from '../../components/common/BrandLogo.jsx';
import SEO from '../../components/common/SEO.jsx';

export default function AdminResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useApp();
  const policy = getAdminAccessPolicy();

  const token = String(searchParams.get('token') || '').trim();
  const hasToken = Boolean(token);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const inFlightRef = useRef(false);
  const redirectTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || inFlightRef.current || !hasToken) return;
    setErrors({});
    setServerError('');

    const validation = validateResetPasswordInput({
      token,
      newPassword,
      confirmPassword,
    });
    if (!validation.isValid) {
      setErrors({
        ...(validation.errors.newPassword ? { newPassword: validation.errors.newPassword } : {}),
        ...(validation.errors.confirmPassword
          ? { confirmPassword: validation.errors.confirmPassword }
          : {}),
      });
      if (validation.errors.token) {
        setServerError('This password reset link is missing a valid token. Please request a new reset link.');
      }
      return;
    }

    inFlightRef.current = true;
    setSubmitting(true);
    try {
      const res = await resetAdminPassword(validation.data);
      if (!res.success) {
        if (res.details && typeof res.details === 'object') {
          const nextFieldErrors = {};
          if (typeof res.details.newPassword === 'string') {
            nextFieldErrors.newPassword = res.details.newPassword;
          }
          if (typeof res.details.confirmPassword === 'string') {
            nextFieldErrors.confirmPassword = res.details.confirmPassword;
          }
          if (Object.keys(nextFieldErrors).length > 0) {
            setErrors(nextFieldErrors);
          }
        }
        setServerError(formatAdminRecoveryError(res, 'reset'));
        return;
      }

      setNewPassword('');
      setConfirmPassword('');
      setResetComplete(true);
      addToast('Administrator password updated. Please sign in with your new password.', 'success');
      redirectTimerRef.current = setTimeout(() => {
        navigate('/admin/login', { replace: true, state: { passwordReset: true } });
      }, 1800);
    } catch (err) {
      setServerError(formatAdminRecoveryError(err, 'reset'));
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  };

  if (policy === 'blocked_production_local') {
    return (
      <div className="min-h-screen bg-[#F7FAF7] flex flex-col justify-center items-center p-6">
        <SEO noindex fullTitle="Reset Administrator Password | DreamTech Kashmir Solutions (DTKS)" />
        <div className="max-w-lg w-full rounded-xl border border-[#E3EBE5] bg-white p-8 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <BrandLogo variant="header" />
            <div className="w-10 h-10 rounded-lg bg-[#E8F5EC] text-[#16834A] flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#16834A]">DTKS Operations Console</p>
            <h1 className="font-display text-2xl font-bold text-[#17231C]">
              Password Reset Unavailable
            </h1>
            <p className="text-sm text-[#64756B] leading-relaxed">
              Administrator password reset requires an active backend authentication connection.
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

  return (
    <div className="min-h-screen bg-[#F7FAF7] flex flex-col justify-center items-center p-6">
      <SEO noindex fullTitle="Reset Administrator Password | DreamTech Kashmir Solutions (DTKS)" />

      <div className="max-w-md w-full rounded-xl border border-[#E3EBE5] bg-white p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <BrandLogo variant="header" />
          <div className="w-10 h-10 rounded-lg bg-[#E8F5EC] text-[#16834A] flex items-center justify-center">
            {resetComplete ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : !hasToken ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
          </div>
        </div>

        {resetComplete ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[#16834A]">Password Updated</p>
              <h1 className="font-display text-2xl font-bold text-[#17231C]">
                Administrator Password Reset Complete
              </h1>
              <p role="status" className="text-sm text-[#64756B] leading-relaxed">
                Your administrator password has been updated. Redirecting you to Administrator Sign In so you can sign in with your new password...
              </p>
            </div>

            <Link
              to="/admin/login"
              state={{ passwordReset: true }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16834A]/40 focus-visible:ring-offset-2"
            >
              <span>Continue to Admin Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : !hasToken ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[#16834A]">DTKS Operations Console</p>
              <h1 className="font-display text-2xl font-bold text-[#17231C]">
                Reset Administrator Password
              </h1>
            </div>

            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-700 leading-relaxed space-y-1"
            >
              <p className="font-semibold">Invalid or Missing Recovery Link</p>
              <p>
                No valid password reset token was found in this URL. Please request a fresh administrator password reset link from the recovery page.
              </p>
            </div>

            <Link
              to="/admin/forgot-password"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16834A]/40 focus-visible:ring-offset-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>Request a New Reset Link</span>
            </Link>

            <div className="pt-3 border-t border-[#E3EBE5] flex items-center justify-between gap-3 text-xs">
              <Link
                to="/admin/login"
                className="inline-flex items-center gap-1.5 font-medium text-[#64756B] hover:text-[#16834A] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Admin Sign In</span>
              </Link>
              <Link
                to="/"
                className="font-medium text-[#64756B] hover:text-[#16834A] transition-colors"
              >
                Return to Website
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[#16834A]">DTKS Operations Console</p>
              <h1 className="font-display text-2xl font-bold text-[#17231C]">
                Reset Administrator Password
              </h1>
              <p className="text-sm text-[#64756B] leading-relaxed">
                Choose a strong new password for your DTKS administrator account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {serverError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 space-y-1.5"
                >
                  <p>{serverError}</p>
                  <Link
                    to="/admin/forgot-password"
                    className="inline-block font-semibold text-red-800 underline hover:text-red-900"
                  >
                    Request a new reset link
                  </Link>
                </div>
              )}

              <PasswordInput
                id="admin-reset-new-password"
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                required
                showStrength
                error={errors.newPassword}
              />

              <PasswordInput
                id="admin-reset-confirm-password"
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                required
                error={errors.confirmPassword}
              />

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] disabled:opacity-50 text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16834A]/40 focus-visible:ring-offset-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>{submitting ? 'Updating Password...' : 'Reset Password'}</span>
              </button>
            </form>

            <div className="pt-3 border-t border-[#E3EBE5] flex items-center justify-between gap-3 text-xs">
              <Link
                to="/admin/login"
                className="inline-flex items-center gap-1.5 font-medium text-[#64756B] hover:text-[#16834A] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Admin Sign In</span>
              </Link>
              <Link
                to="/admin/forgot-password"
                className="font-medium text-[#16834A] hover:underline transition-colors"
              >
                Request New Link
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
