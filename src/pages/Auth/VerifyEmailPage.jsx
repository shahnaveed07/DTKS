import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, MailCheck, ArrowRight, RefreshCw } from 'lucide-react';
import { useClientAuth } from '../../context/ClientAuthContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { isValidEmailAddress } from '../../utils/authValidation.js';
import SEO from '../../components/common/SEO.jsx';

// Deduplicates automatic ?token= verification across React StrictMode double-mounts
// so single-use backend/local verification tokens are never consumed twice on mount.
const autoVerifyPromiseCache = new Map();

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const initialToken = searchParams.get('token') || '';
  const { settings, addToast } = useApp();
  const { verifyClientEmail, resendVerification } = useClientAuth();

  const [tokenInput, setTokenInput] = useState(initialToken);
  const [status, setStatus] = useState(initialToken ? 'verifying' : 'idle');
  const [statusMessage, setStatusMessage] = useState('');

  const [resendEmail, setResendEmail] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');
  const [resending, setResending] = useState(false);

  const runVerification = useCallback(
    async (tok, { deduplicate = false } = {}) => {
      const clean = String(tok || '').trim();
      if (!clean) {
        setStatus('error');
        setStatusMessage('Enter or open the verification token from your email.');
        return;
      }
      setStatus('verifying');
      setStatusMessage('');

      let res;
      if (deduplicate) {
        if (!autoVerifyPromiseCache.has(clean)) {
          autoVerifyPromiseCache.set(clean, verifyClientEmail({ token: clean }));
        }
        res = await autoVerifyPromiseCache.get(clean);
      } else {
        autoVerifyPromiseCache.delete(clean);
        res = await verifyClientEmail({ token: clean });
      }

      if (res.success) {
        setStatus('verified');
        setStatusMessage(
          res.message || 'Your email has been verified. You can now sign in to your account.'
        );
      } else {
        setStatus('error');
        setStatusMessage(
          res.message || 'This verification link is invalid or has expired.'
        );
      }
    },
    [verifyClientEmail]
  );

  useEffect(() => {
    if (initialToken) {
      runVerification(initialToken, { deduplicate: true });
    }
  }, [initialToken, runVerification]);

  const handleManualVerify = async (e) => {
    e.preventDefault();
    await runVerification(tokenInput);
  };

  const handleResend = async (e) => {
    e.preventDefault();
    if (resending) return;
    setResendError('');
    setResendMessage('');
    if (!isValidEmailAddress(resendEmail)) {
      setResendError('Please enter a valid email address.');
      return;
    }

    setResending(true);
    try {
      const res = await resendVerification({ email: resendEmail.trim().toLowerCase() });
      if (!res.success) {
        setResendError(res.message || 'Unable to resend verification email right now.');
        return;
      }
      setResendMessage(
        res.message ||
          'If an unverified account matches this email, a new verification link has been sent.'
      );
      if (res.data?.localVerificationToken) {
        setTokenInput(res.data.localVerificationToken);
      }
      addToast('Verification email request processed.', 'info');
    } finally {
      setResending(false);
    }
  };

  return (
    <section className="py-12 sm:py-16 bg-[#F7FAF7] min-h-[75vh] flex items-center">
      <SEO noindex fullTitle="Verify Email" settings={settings} />

      <div className="max-w-lg w-full mx-auto px-4 sm:px-6 space-y-6">
        <div className="rounded-xl border border-[#E3EBE5] bg-white p-6 sm:p-8 shadow-xs space-y-5">
          {status === 'verifying' && (
            <div className="text-center space-y-3 py-4">
              <RefreshCw className="w-8 h-8 text-[#16834A] animate-spin mx-auto" />
              <h1 className="font-display text-xl font-bold text-[#17231C]">
                Verifying Your Email Address
              </h1>
              <p className="text-sm text-[#64756B]">
                Confirming your verification token with the server...
              </p>
            </div>
          )}

          {status === 'verified' && (
            <div className="space-y-4">
              <div className="w-11 h-11 rounded-lg bg-[#E8F5EC] text-[#16834A] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h1 className="font-display text-2xl font-bold text-[#17231C]">
                Email Address Verified
              </h1>
              <p className="text-sm text-[#64756B] leading-relaxed">{statusMessage}</p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors"
              >
                <span>Continue to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {(status === 'idle' || status === 'error') && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    status === 'error'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-[#E8F5EC] text-[#16834A]'
                  }`}
                >
                  {status === 'error' ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : (
                    <MailCheck className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h1 className="font-display text-xl font-bold text-[#17231C]">
                    Verify Your Email
                  </h1>
                  <p className="text-xs text-[#64756B]">
                    Confirm your email address to activate client sign-in.
                  </p>
                </div>
              </div>

              {status === 'error' && statusMessage && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700"
                >
                  {statusMessage}
                </div>
              )}

              <form onSubmit={handleManualVerify} className="space-y-3">
                <div>
                  <label htmlFor="verify-token" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Verification Token
                  </label>
                  <input
                    id="verify-token"
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Paste verification token from your email"
                    className="w-full px-3.5 py-2.5 text-sm font-mono-tabular rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors"
                >
                  Verify Email
                </button>
              </form>
            </div>
          )}
        </div>

        {status !== 'verified' && (
          <div className="rounded-xl border border-[#E3EBE5] bg-white p-6 shadow-xs space-y-4">
            <h2 className="font-display text-base font-bold text-[#17231C]">
              Resend Verification Email
            </h2>
            <form onSubmit={handleResend} className="space-y-3" noValidate>
              {resendError && (
                <p role="alert" className="text-xs text-red-600">{resendError}</p>
              )}
              {resendMessage && (
                <p role="status" className="text-xs text-[#116438] bg-[#E8F5EC] px-3 py-2 rounded-lg">
                  {resendMessage}
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  aria-label="Registered email address"
                  placeholder="Enter your registered email"
                  className="flex-1 px-3.5 py-2 text-sm rounded-lg border border-[#E3EBE5] text-[#17231C] focus:outline-none focus:border-[#16834A]"
                />
                <button
                  type="submit"
                  disabled={resending}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-[#16834A] text-[#16834A] hover:bg-[#E8F5EC] disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {resending ? 'Sending...' : 'Resend Link'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
