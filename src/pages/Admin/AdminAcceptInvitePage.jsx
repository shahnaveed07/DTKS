import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { authService } from '../../services/api/authService.js';
import { getAdminAccessPolicy } from '../../services/api/apiClient.js';
import {
  buildSanitizedTokenUrl,
  extractTokenDetailsFromUrl,
  validateAcceptInviteInput,
} from '../../utils/authValidation.js';
import { PasswordInput } from '../../components/auth/PasswordStrengthMeter.jsx';
import BrandLogo from '../../components/common/BrandLogo.jsx';
import SEO from '../../components/common/SEO.jsx';

export default function AdminAcceptInvitePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const policy = getAdminAccessPolicy();

  const [token, setToken] = useState(
    () =>
      extractTokenDetailsFromUrl({
        hash: location.hash,
        search: location.search,
        allowQueryFallback: false,
      }).token
  );
  const [hasTokenFromUrl, setHasTokenFromUrl] = useState(() =>
    Boolean(
      extractTokenDetailsFromUrl({
        hash: location.hash,
        search: location.search,
        allowQueryFallback: false,
      }).token
    )
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const inFlightRef = useRef(false);
  const redirectTimerRef = useRef(null);

  useEffect(() => {
    const { token: incomingToken } = extractTokenDetailsFromUrl({
      hash: location.hash,
      search: location.search,
      allowQueryFallback: false,
    });
    if (incomingToken) {
      setToken(incomingToken);
      setHasTokenFromUrl(true);
    }

    if (typeof window !== 'undefined' && window.history?.replaceState) {
      const { nextUrl, hadTokenInUrl } = buildSanitizedTokenUrl({
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        paramNames: ['token'],
      });
      if (hadTokenInUrl) {
        window.history.replaceState(window.history.state, document.title, nextUrl);
      }
    }
  }, [location.hash, location.search]);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || inFlightRef.current) return;
    setErrors({});
    setServerError('');

    const validation = validateAcceptInviteInput({ token, password, confirmPassword });
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    inFlightRef.current = true;
    setSubmitting(true);
    try {
      const res = await authService.acceptAdminInvite(validation.data);
      if (!res.success) {
        if (res.details && typeof res.details === 'object') {
          setErrors(res.details);
        }
        setServerError(
          res.message ||
            'This administrator invitation link is invalid, expired, or has already been used.'
        );
        return;
      }

      setToken('');
      setPassword('');
      setConfirmPassword('');
      setAccepted(true);
      redirectTimerRef.current = setTimeout(() => {
        navigate('/admin/login', { replace: true, state: { inviteAccepted: true } });
      }, 1800);
    } finally {
      inFlightRef.current = false;
      setSubmitting(false);
    }
  };

  if (policy === 'blocked_production_local') {
    return (
      <div className="min-h-screen bg-[#F7FAF7] flex flex-col justify-center items-center p-6">
        <SEO noindex referrerPolicy="no-referrer" fullTitle="Administrator Invitation | DTKS" />
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
              Administrator Activation Unavailable
            </h1>
            <p className="text-sm text-[#64756B] leading-relaxed">
              Administrator invitations require an active backend API connection.
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
      <SEO noindex referrerPolicy="no-referrer" fullTitle="Accept Administrator Invitation | DTKS" />

      <div className="max-w-md w-full rounded-xl border border-[#E3EBE5] bg-white p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <BrandLogo variant="header" />
          <div className="w-10 h-10 rounded-lg bg-[#E8F5EC] text-[#16834A] flex items-center justify-center">
            {accepted ? <CheckCircle2 className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </div>
        </div>

        {accepted ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[#16834A]">Invitation Accepted</p>
              <h1 className="font-display text-2xl font-bold text-[#17231C]">
                Administrator Account Activated
              </h1>
              <p className="text-sm text-[#64756B] leading-relaxed">
                Your password has been saved and your administrator account is now active. Redirecting you to Administrator Sign In...
              </p>
            </div>
            <Link
              to="/admin/login"
              state={{ inviteAccepted: true }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors"
            >
              <span>Continue to Admin Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-[#16834A]">DTKS Operations Console</p>
              <h1 className="font-display text-2xl font-bold text-[#17231C]">
                Set Up Your Administrator Account
              </h1>
              <p className="text-sm text-[#64756B] leading-relaxed">
                Create a strong password to activate your invited DTKS administrator account.
              </p>
            </div>

            {!hasTokenFromUrl && !serverError && (
              <div
                role="status"
                className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800"
              >
                No invitation token was found in the link. Paste the invitation token from your email or request a new invitation from a Super Admin.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {serverError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700"
                >
                  {serverError}
                </div>
              )}

              {!hasTokenFromUrl && (
                <div>
                  <label htmlFor="invite-token" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Invitation Token<span className="text-red-600 ml-0.5">*</span>
                  </label>
                  <input
                    id="invite-token"
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste invitation token"
                    aria-invalid={Boolean(errors.token)}
                    className={`w-full px-3.5 py-2.5 text-sm font-mono-tabular rounded-lg border bg-white text-[#17231C] focus:outline-none ${
                      errors.token
                        ? 'border-red-400 focus:border-red-600'
                        : 'border-[#E3EBE5] focus:border-[#16834A]'
                    }`}
                  />
                  {errors.token && <p className="mt-1 text-xs text-red-600">{errors.token}</p>}
                </div>
              )}

              <PasswordInput
                id="invite-password"
                label="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 12 characters"
                autoComplete="new-password"
                required
                showStrength
                error={errors.password}
              />

              <PasswordInput
                id="invite-confirm-password"
                label="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                required
                error={errors.confirmPassword}
              />

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] disabled:opacity-50 text-white transition-colors"
              >
                <KeyRound className="w-4 h-4" />
                <span>{submitting ? 'Activating Account...' : 'Activate Administrator Account'}</span>
              </button>
            </form>

            <div className="pt-3 border-t border-[#E3EBE5] flex items-center justify-between gap-3 text-xs">
              <Link
                to="/admin/login"
                className="inline-flex items-center gap-1.5 font-medium text-[#64756B] hover:text-[#16834A] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Admin Sign In</span>
              </Link>
              <Link
                to="/"
                className="font-medium text-[#64756B] hover:text-[#16834A] transition-colors"
              >
                Public Website
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
