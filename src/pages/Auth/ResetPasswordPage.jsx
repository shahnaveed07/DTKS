import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, CheckCircle2, ArrowRight } from 'lucide-react';
import { useClientAuth } from '../../context/ClientAuthContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { validateResetPasswordInput } from '../../utils/authValidation.js';
import { PasswordInput } from '../../components/auth/PasswordStrengthMeter.jsx';
import SEO from '../../components/common/SEO.jsx';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { settings, addToast } = useApp();
  const { resetPassword } = useClientAuth();

  const initialToken = searchParams.get('token') || '';
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setErrors({});
    setServerError('');

    const validation = validateResetPasswordInput({ token, newPassword, confirmPassword });
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await resetPassword(validation.data);
      if (!res.success) {
        setServerError(res.message || 'This reset token is invalid or has expired.');
        return;
      }
      setNewPassword('');
      setConfirmPassword('');
      setResetComplete(true);
      addToast('Password updated. You can now sign in.', 'success');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-12 sm:py-16 bg-[#F7FAF7] min-h-[75vh] flex items-center">
      <SEO noindex fullTitle="Reset Password" settings={settings} />

      <div className="max-w-md w-full mx-auto px-4 sm:px-6">
        <div className="rounded-xl border border-[#E3EBE5] bg-white p-6 sm:p-8 shadow-xs space-y-6">
          {resetComplete ? (
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-[#E8F5EC] text-[#16834A] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h1 className="font-display text-2xl font-bold text-[#17231C]">
                Password Reset Complete
              </h1>
              <p className="text-sm text-[#64756B]">
                Your password has been updated successfully. Redirecting you to Client Login...
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors"
              >
                <span>Go to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-[#16834A]">Account Security</p>
                <h1 className="font-display text-2xl font-bold text-[#17231C]">
                  Set a New Password
                </h1>
                <p className="text-sm text-[#64756B]">
                  Choose a strong new password for your DTKS client account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {serverError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700"
                  >
                    {serverError}{' '}
                    <Link to="/forgot-password" className="font-semibold underline">
                      Request a new reset link
                    </Link>
                  </div>
                )}

                {!initialToken && (
                  <div>
                    <label htmlFor="reset-token" className="block text-xs font-semibold text-[#17231C] mb-1">
                      Reset Token<span className="text-red-600 ml-0.5">*</span>
                    </label>
                    <input
                      id="reset-token"
                      type="text"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Paste reset token"
                      className="w-full px-3.5 py-2.5 text-sm font-mono-tabular rounded-lg border border-[#E3EBE5] text-[#17231C] focus:outline-none focus:border-[#16834A]"
                    />
                    {errors.token && <p className="mt-1 text-xs text-red-600">{errors.token}</p>}
                  </div>
                )}

                <PasswordInput
                  id="reset-new-password"
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
                  id="reset-confirm-password"
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
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
                  <span>{submitting ? 'Updating Password...' : 'Reset Password'}</span>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
