import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, MailCheck } from 'lucide-react';
import { useClientAuth } from '../../context/ClientAuthContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import {
  sanitizeInternalRedirect,
  validateLoginCredentials,
} from '../../utils/authValidation.js';
import { PasswordInput } from '../../components/auth/PasswordStrengthMeter.jsx';
import SEO from '../../components/common/SEO.jsx';

export default function ClientLoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings, addToast } = useApp();
  const {
    isClientAuthenticated,
    clientAccessPolicy,
    loginClient,
    resendVerification,
  } = useClientAuth();

  const redirectTo = sanitizeInternalRedirect(
    location.state?.from,
    '/account',
    '/account'
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loginError, setLoginError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isClientAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isClientAuthenticated, navigate, redirectTo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFieldErrors({});
    setLoginError('');
    setNeedsVerification(false);

    const validation = validateLoginCredentials({ email, password });
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginClient(validation.data);
      if (!res.success) {
        if (res.errorCode === 'EMAIL_NOT_VERIFIED' || res.statusCode === 403) {
          setNeedsVerification(true);
        }
        setLoginError(res.message || 'Invalid email address or password.');
        return;
      }
      setPassword('');
      addToast('Signed in to your client account.', 'success');
      navigate(redirectTo, { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (resending || !email.trim()) return;
    setResending(true);
    try {
      const res = await resendVerification({ email: email.trim().toLowerCase() });
      if (res.success) {
        addToast('Verification instructions sent to your email.', 'info');
      } else {
        addToast(res.message || 'Could not resend verification email.', 'error');
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <section className="py-12 sm:py-16 bg-[#F7FAF7] min-h-[75vh] flex items-center">
      <SEO noindex fullTitle="Client Login" settings={settings} />

      <div className="max-w-md w-full mx-auto px-4 sm:px-6">
        {clientAccessPolicy === 'blocked_production_local' ? (
          <div className="rounded-xl border border-[#E3EBE5] bg-white p-8 shadow-xs space-y-4">
            <h1 className="font-display text-2xl font-bold text-[#17231C]">
              Client Portal Unavailable
            </h1>
            <p className="text-sm text-[#64756B]">
              Client login will become active once backend authentication is enabled. You can check project progress with your reference ID instead.
            </p>
            <Link
              to="/track-order"
              className="inline-flex items-center px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors"
            >
              Track Order
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-[#E3EBE5] bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[#16834A]">DTKS Client Portal</p>
              <h1 className="font-display text-2xl font-bold text-[#17231C]">
                Sign In to Your Account
              </h1>
              <p className="text-sm text-[#64756B]">
                Access your submitted website orders, quotations, and project updates.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {loginError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 space-y-2"
                >
                  <p>{loginError}</p>
                  {needsVerification && (
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="button"
                        disabled={resending}
                        onClick={handleResendVerification}
                        className="inline-flex items-center gap-1.5 font-semibold text-[#116438] hover:underline"
                      >
                        <MailCheck className="w-3.5 h-3.5" />
                        <span>{resending ? 'Sending...' : 'Resend verification email'}</span>
                      </button>
                      <Link
                        to="/verify-email"
                        className="font-semibold text-[#16834A] hover:underline"
                      >
                        Open verification page
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="client-login-email" className="block text-xs font-semibold text-[#17231C] mb-1">
                  Email Address<span className="text-red-600 ml-0.5">*</span>
                </label>
                <input
                  id="client-login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
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

              <div className="space-y-1">
                <PasswordInput
                  id="client-login-password"
                  label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  error={fieldErrors.password}
                />
                <div className="flex justify-end pt-1">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-[#16834A] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] disabled:opacity-50 text-white transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span>{isSubmitting ? 'Signing In...' : 'Sign In'}</span>
              </button>
            </form>

            <div className="pt-3 border-t border-[#E3EBE5] text-xs text-[#64756B] text-center">
              New to DTKS?{' '}
              <Link to="/register" className="font-semibold text-[#16834A] hover:underline">
                Create a client account
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
