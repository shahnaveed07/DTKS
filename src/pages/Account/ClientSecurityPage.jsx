import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, KeyRound, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { useClientAuth } from '../../context/ClientAuthContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { validateChangePasswordInput } from '../../utils/authValidation.js';
import { PasswordInput } from '../../components/auth/PasswordStrengthMeter.jsx';
import SEO from '../../components/common/SEO.jsx';

export default function ClientSecurityPage() {
  const navigate = useNavigate();
  const { changeClientPassword, revokeAllClientSessions } = useClientAuth();
  const { addToast, requestConfirm } = useApp();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const validation = validateChangePasswordInput({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    setErrors(validation.errors);
    setServerError('');
    setSuccessMsg('');
    if (!validation.isValid) return;

    setSubmitting(true);
    const res = await changeClientPassword({ currentPassword, newPassword });
    setSubmitting(false);

    if (!res.success) {
      setServerError(res.message || 'Unable to update your password.');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSuccessMsg(res.message || 'Your password has been updated.');
    addToast('Password changed successfully.', 'success');
  };

  const handleRevokeAll = () => {
    requestConfirm({
      title: 'Sign out of all devices?',
      message:
        'This will invalidate every active client session across all browsers and devices. You will need to sign in again.',
      confirmLabel: 'Revoke All Sessions',
      variant: 'danger',
      onConfirm: async () => {
        const res = await revokeAllClientSessions();
        if (!res.success) {
          addToast(res.message || 'Could not revoke sessions.', 'error');
          return;
        }
        addToast('All client sessions have been signed out.', 'info');
        navigate('/login', { replace: true });
      },
    });
  };

  return (
    <>
      <SEO noindex fullTitle="Security | Client Account | DTKS" />

      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#17231C]">
            Account Security
          </h1>
          <p className="mt-1 text-sm text-[#64756B]">
            Update your password and manage active sign-in sessions across devices.
          </p>
        </div>

        {/* Change Password */}
        <form
          onSubmit={handlePasswordChange}
          noValidate
          className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6 space-y-5"
        >
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#E3EBE5]">
            <KeyRound className="w-4 h-4 text-[#16834A] shrink-0" />
            <h2 className="font-display text-base font-semibold text-[#17231C]">
              Change Password
            </h2>
          </div>

          {serverError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2.5 text-xs text-red-800"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="rounded-lg border border-[#16834A]/30 bg-[#E8F5EC]/70 px-4 py-3 flex items-start gap-2.5 text-xs text-[#116438]"
            >
              <CheckCircle2 className="w-4 h-4 text-[#16834A] shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <PasswordInput
            id="sec-current-password"
            label="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
            error={errors.currentPassword}
          />

          <PasswordInput
            id="sec-new-password"
            label="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
            showStrength
            error={errors.newPassword}
          />

          <PasswordInput
            id="sec-confirm-password"
            label="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            error={errors.confirmPassword}
          />

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] disabled:opacity-60 text-white transition-colors whitespace-nowrap"
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{submitting ? 'Updating Password...' : 'Update Password'}</span>
            </button>
          </div>
        </form>

        {/* Session Management */}
        <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-[#17231C]">
              Active Sessions
            </h2>
            <p className="mt-1 text-xs text-[#64756B]">
              Sign out from every device where your client account is currently authenticated.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRevokeAll}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Sign Out All Devices</span>
          </button>
        </div>
      </div>
    </>
  );
}
