import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, CheckCircle2, MailCheck, ArrowRight } from 'lucide-react';
import { useClientAuth } from '../../context/ClientAuthContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { validateClientRegistrationInput } from '../../utils/authValidation.js';
import { PasswordInput } from '../../components/auth/PasswordStrengthMeter.jsx';
import SEO from '../../components/common/SEO.jsx';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { settings, addToast } = useApp();
  const {
    isClientAuthenticated,
    clientAccessPolicy,
    registerClient,
    resendVerification,
  } = useClientAuth();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredState, setRegisteredState] = useState(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (isClientAuthenticated) {
      navigate('/account', { replace: true });
    }
  }, [isClientAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrors({});
    setServerError('');

    const validation = validateClientRegistrationInput(form);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerClient(validation.data);
      if (!res.success) {
        if (res.details && typeof res.details === 'object') {
          setErrors(res.details);
        }
        setServerError(res.message || 'Unable to create your account right now.');
        return;
      }

      setForm((prev) => ({ ...prev, password: '', confirmPassword: '' }));
      setRegisteredState({
        email: validation.data.email,
        fullName: validation.data.fullName,
        localVerificationToken: res.data?.localVerificationToken || null,
      });
      addToast('Registration submitted. Check your email to verify your account.', 'success');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resending || !registeredState?.email) return;
    setResending(true);
    try {
      const res = await resendVerification({ email: registeredState.email });
      if (!res.success) {
        addToast(res.message || 'Unable to resend verification email.', 'error');
        return;
      }
      if (res.data?.localVerificationToken) {
        setRegisteredState((prev) => ({
          ...prev,
          localVerificationToken: res.data.localVerificationToken,
        }));
      }
      addToast('Verification email instructions sent.', 'info');
    } finally {
      setResending(false);
    }
  };

  return (
    <section className="py-12 sm:py-16 bg-[#F7FAF7] min-h-[75vh] flex items-center">
      <SEO noindex fullTitle="Create Client Account" settings={settings} />

      <div className="max-w-lg w-full mx-auto px-4 sm:px-6">
        {clientAccessPolicy === 'blocked_production_local' ? (
          <div className="rounded-xl border border-[#E3EBE5] bg-white p-8 shadow-xs space-y-4">
            <h1 className="font-display text-2xl font-bold text-[#17231C]">
              Client Registration Coming Soon
            </h1>
            <p className="text-sm text-[#64756B] leading-relaxed">
              Online client accounts will be enabled once the DTKS backend authentication service is connected. You can still submit a project request directly.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/request-quote"
                className="px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors"
              >
                Request a Quote
              </Link>
              <Link
                to="/contact"
                className="px-4 py-2.5 text-sm font-medium rounded-lg border border-[#E3EBE5] text-[#17231C] hover:bg-[#F7FAF7] transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </div>
        ) : registeredState ? (
          <div className="rounded-xl border border-[#E3EBE5] bg-white p-8 shadow-xs space-y-5">
            <div className="w-11 h-11 rounded-lg bg-[#E8F5EC] text-[#16834A] flex items-center justify-center">
              <MailCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[#16834A]">Verification Required</p>
              <h1 className="font-display text-2xl font-bold text-[#17231C]">
                Check Your Email to Verify
              </h1>
              <p className="text-sm text-[#64756B] leading-relaxed">
                We created an account for <span className="font-semibold text-[#17231C]">{registeredState.email}</span>.
                Confirm your email address using the verification link sent to your inbox before signing in.
              </p>
            </div>

            {registeredState.localVerificationToken && (
              <div className="rounded-lg border border-[#16834A]/30 bg-[#E8F5EC]/60 p-4 space-y-2">
                <p className="text-xs font-semibold text-[#116438]">
                  Local Development Mode Verification Link
                </p>
                <p className="text-xs text-[#64756B]">
                  No outbound email server runs in local browser storage mode. Use the verification route directly to complete testing:
                </p>
                <Link
                  to={`/verify-email?token=${encodeURIComponent(registeredState.localVerificationToken)}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16834A] hover:underline"
                >
                  <span>Verify Email Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                to="/verify-email"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Open Verification Page</span>
              </Link>
              <button
                type="button"
                disabled={resending}
                onClick={handleResend}
                className="px-4 py-2.5 text-sm font-medium rounded-lg border border-[#E3EBE5] text-[#17231C] hover:bg-[#F7FAF7] disabled:opacity-50 transition-colors"
              >
                {resending ? 'Sending...' : 'Resend Verification Email'}
              </button>
            </div>

            <div className="pt-3 border-t border-[#E3EBE5] text-xs text-[#64756B]">
              Already verified?{' '}
              <Link to="/login" className="font-semibold text-[#16834A] hover:underline">
                Sign in to your account
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-[#E3EBE5] bg-white p-6 sm:p-8 shadow-xs space-y-6">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[#16834A]">DTKS Client Portal</p>
              <h1 className="font-display text-2xl font-bold text-[#17231C]">
                Create Your Client Account
              </h1>
              <p className="text-sm text-[#64756B]">
                Track your website orders, review quotations, and monitor active project builds.
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
                <label htmlFor="reg-fullname" className="block text-xs font-semibold text-[#17231C] mb-1">
                  Full Name<span className="text-red-600 ml-0.5">*</span>
                </label>
                <input
                  id="reg-fullname"
                  type="text"
                  autoComplete="name"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="Enter your full name"
                  aria-invalid={Boolean(errors.fullName)}
                  className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-[#17231C] focus:outline-none ${
                    errors.fullName
                      ? 'border-red-400 focus:border-red-600'
                      : 'border-[#E3EBE5] focus:border-[#16834A]'
                  }`}
                />
                {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reg-email" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Email Address<span className="text-red-600 ml-0.5">*</span>
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="you@company.com"
                    aria-invalid={Boolean(errors.email)}
                    className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-[#17231C] focus:outline-none ${
                      errors.email
                        ? 'border-red-400 focus:border-red-600'
                        : 'border-[#E3EBE5] focus:border-[#16834A]'
                    }`}
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="reg-phone" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Phone Number<span className="text-red-600 ml-0.5">*</span>
                  </label>
                  <input
                    id="reg-phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    aria-invalid={Boolean(errors.phone)}
                    className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-[#17231C] focus:outline-none ${
                      errors.phone
                        ? 'border-red-400 focus:border-red-600'
                        : 'border-[#E3EBE5] focus:border-[#16834A]'
                    }`}
                  />
                  {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                </div>
              </div>

              <PasswordInput
                id="reg-password"
                label="Password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
                showStrength
                error={errors.password}
              />

              <PasswordInput
                id="reg-confirm-password"
                label="Confirm Password"
                value={form.confirmPassword}
                onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                required
                error={errors.confirmPassword}
              />

              <div className="space-y-1">
                <label className="inline-flex items-start gap-2.5 text-xs text-[#64756B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.acceptTerms}
                    onChange={(e) => setForm((f) => ({ ...f, acceptTerms: e.target.checked }))}
                    className="mt-0.5 accent-[#16834A]"
                  />
                  <span>
                    I agree to the{' '}
                    <Link to="/terms" className="font-semibold text-[#16834A] hover:underline">
                      Terms &amp; Conditions
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy-policy" className="font-semibold text-[#16834A] hover:underline">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
                {errors.acceptTerms && (
                  <p className="text-xs text-red-600">{errors.acceptTerms}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] disabled:opacity-50 text-white transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? 'Creating Account...' : 'Create Account'}</span>
              </button>
            </form>

            <div className="pt-3 border-t border-[#E3EBE5] text-xs text-[#64756B] text-center">
              Already have a client account?{' '}
              <Link to="/login" className="font-semibold text-[#16834A] hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
