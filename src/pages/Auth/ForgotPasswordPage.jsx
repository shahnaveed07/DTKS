import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, ArrowRight } from 'lucide-react';
import { useClientAuth } from '../../context/ClientAuthContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { isValidEmailAddress } from '../../utils/authValidation.js';
import SEO from '../../components/common/SEO.jsx';

export default function ForgotPasswordPage() {
  const { settings } = useApp();
  const { forgotPassword } = useClientAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sentState, setSentState] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    if (!isValidEmailAddress(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await forgotPassword({ email: cleanEmail });
      if (!res.success) {
        setError(res.message || 'Unable to process password reset request right now.');
        return;
      }
      setSentState({
        email: cleanEmail,
        message:
          res.message ||
          'If an account matches this email address, password reset instructions have been sent.',
        localResetToken: res.data?.localResetToken || null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-12 sm:py-16 bg-[#F7FAF7] min-h-[75vh] flex items-center">
      <SEO noindex fullTitle="Forgot Password" settings={settings} />

      <div className="max-w-md w-full mx-auto px-4 sm:px-6">
        <div className="rounded-xl border border-[#E3EBE5] bg-white p-6 sm:p-8 shadow-xs space-y-6">
          {sentState ? (
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-[#E8F5EC] text-[#16834A] flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <h1 className="font-display text-2xl font-bold text-[#17231C]">
                Check Your Email
              </h1>
              <p className="text-sm text-[#64756B] leading-relaxed">{sentState.message}</p>

              {sentState.localResetToken && (
                <div className="rounded-lg border border-[#16834A]/30 bg-[#E8F5EC]/60 p-4 space-y-2">
                  <p className="text-xs font-semibold text-[#116438]">
                    Local Development Reset Link
                  </p>
                  <Link
                    to={`/reset-password?token=${encodeURIComponent(sentState.localResetToken)}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16834A] hover:underline"
                  >
                    <span>Reset Password Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16834A] hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Client Login</span>
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-[#16834A]">Account Recovery</p>
                <h1 className="font-display text-2xl font-bold text-[#17231C]">
                  Forgot Your Password?
                </h1>
                <p className="text-sm text-[#64756B]">
                  Enter your registered email address and we will send you a password reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700"
                  >
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="forgot-email" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Registered Email Address<span className="text-red-600 ml-0.5">*</span>
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] disabled:opacity-50 text-white transition-colors"
                >
                  {submitting ? 'Sending Reset Link...' : 'Send Reset Instructions'}
                </button>
              </form>

              <div className="pt-3 border-t border-[#E3EBE5] text-xs">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 font-medium text-[#64756B] hover:text-[#16834A] transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Client Login</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
