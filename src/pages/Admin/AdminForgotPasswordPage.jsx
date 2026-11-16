import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound, Mail, ShieldAlert } from 'lucide-react';
import { getAdminAccessPolicy, requestAdminPasswordReset } from '../../services/api/apiClient.js';
import {
  formatAdminRecoveryError,
  validateAdminForgotPasswordInput,
} from '../../utils/authValidation.js';
import BrandLogo from '../../components/common/BrandLogo.jsx';
import SEO from '../../components/common/SEO.jsx';

const NEUTRAL_CONFIRMATION_MESSAGE =
  'If an eligible administrator account exists for this email address, a secure password recovery link has been sent. Please check your inbox and spam folder.';

export default function AdminForgotPasswordPage() {
  const policy = getAdminAccessPolicy();
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const inFlightRef = useRef(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || inFlightRef.current) return;
    setFieldErrors({});
    setServerError('');

    const validation = validateAdminForgotPasswordInput({ email });
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      return;
    }

    inFlightRef.current = true;
    setSubmitting(true);
    try {
      const res = await requestAdminPasswordReset({ email: validation.data.email });
      if (!res.success) {
        if (res.details?.email && typeof res.details.email === 'string') {
          setFieldErrors({ email: res.details.email });
        }
        setServerError(formatAdminRecoveryError(res, 'forgot'));
        return;
      }

      setEmail('');
      setSent(true);
    } catch (err) {
      setServerError(formatAdminRecoveryError(err, 'forgot'));
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  };

  if (policy === 'blocked_production_local') {
    return (
      <div className="min-h-screen bg-[#F7FAF7] flex flex-col justify-center items-center p-6">
        <SEO noindex fullTitle="Forgot Admin Password | DreamTech Kashmir Solutions (DTKS)" />
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
              Password Recovery Unavailable
            </h1>
            <p className="text-sm text-[#64756B] leading-relaxed">
              Administrator password recovery requires an active backend authentication connection.
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
      <SEO noindex fullTitle="Forgot Admin Password | DreamTech Kashmir Solutions (DTKS)" />

      <div className="max-w-md w-full rounded-xl border border-[#E3EBE5] bg-white p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <BrandLogo variant="header" />
          <div className="w-10 h-10 rounded-lg bg-[#E8F5EC] text-[#16834A] flex items-center justify-center">
            {sent ? <Mail className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
          </div>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[#16834A]">Recovery Request Received</p>
              <h1 className="font-display text-2xl font-bold text-[#17231C]">
                Check Your Email
              </h1>
              <p role="status" className="text-sm text-[#64756B] leading-relaxed">
                {NEUTRAL_CONFIRMATION_MESSAGE}
              </p>
            </div>

            <div className="rounded-lg border border-[#16834A]/25 bg-[#E8F5EC]/60 px-3.5 py-3 text-xs text-[#116438] leading-relaxed">
              For security reasons, we do not confirm whether a specific email address belongs to an active administrator account.
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              <Link
                to="/admin/login"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16834A]/40 focus-visible:ring-offset-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Admin Sign In</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setServerError('');
                  setFieldErrors({});
                }}
                className="w-full px-4 py-2 text-xs font-semibold rounded-lg border border-[#E3EBE5] text-[#64756B] hover:text-[#17231C] hover:bg-[#F7FAF7] transition-colors"
              >
                Try another email address
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[#16834A]">DTKS Operations Console</p>
              <h1 className="font-display text-2xl font-bold text-[#17231C]">
                Forgot Admin Password?
              </h1>
              <p className="text-sm text-[#64756B] leading-relaxed">
                Enter your registered administrator email address. We will send you a secure password recovery link if an eligible account exists.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {serverError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700"
                >
                  {serverError}
                </div>
              )}

              <div>
                <label
                  htmlFor="admin-forgot-email"
                  className="block text-xs font-semibold text-[#17231C] mb-1"
                >
                  Administrator Email<span className="text-red-600 ml-0.5">*</span>
                </label>
                <input
                  id="admin-forgot-email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={submitting}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@dreamtechkashmirsolutions.studio"
                  aria-invalid={Boolean(fieldErrors.email)}
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-[#17231C] focus:outline-none disabled:bg-[#F7FAF7] ${
                    fieldErrors.email
                      ? 'border-red-400 focus:border-red-600'
                      : 'border-[#E3EBE5] focus:border-[#16834A]'
                  }`}
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] disabled:opacity-50 text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16834A]/40 focus-visible:ring-offset-2"
              >
                <Mail className="w-4 h-4" />
                <span>{submitting ? 'Sending Reset Link...' : 'Send Reset Link'}</span>
              </button>
            </form>

            <div className="pt-3 border-t border-[#E3EBE5] flex items-center justify-between gap-3 text-xs">
              <Link
                to="/admin/login"
                className="inline-flex items-center gap-1.5 font-medium text-[#64756B] hover:text-[#16834A] transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16834A]/40"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Admin Sign In</span>
              </Link>
              <Link
                to="/"
                className="font-medium text-[#64756B] hover:text-[#16834A] transition-colors rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#16834A]/40"
              >
                Return to Website
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
