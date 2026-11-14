import { useState, useEffect } from 'react';
import { Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { useClientAuth } from '../../context/ClientAuthContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { isValidPhoneNumber } from '../../utils/authValidation.js';
import SEO from '../../components/common/SEO.jsx';

export default function ClientProfilePage() {
  const { client, updateClientProfile } = useClientAuth();
  const { addToast } = useApp();

  const [fullName, setFullName] = useState(client?.fullName || '');
  const [phone, setPhone] = useState(client?.phone || '');
  const [city, setCity] = useState(client?.city || '');
  const [businessName, setBusinessName] = useState(client?.businessName || '');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [savedNotice, setSavedNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setFullName(client.fullName || '');
      setPhone(client.phone || '');
      setCity(client.city || '');
      setBusinessName(client.businessName || '');
    }
  }, [client]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    const nextErrors = {};
    if (fullName.trim().length < 2) {
      nextErrors.fullName = 'Full name must be at least 2 characters.';
    }
    if (!isValidPhoneNumber(phone)) {
      nextErrors.phone = 'Please enter a valid phone number (7 to 15 digits).';
    }

    setErrors(nextErrors);
    setServerError('');
    setSavedNotice('');
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    const res = await updateClientProfile({
      fullName: fullName.trim(),
      phone: phone.trim(),
      city: city.trim(),
      businessName: businessName.trim(),
    });
    setSaving(false);

    if (!res.success) {
      setServerError(res.message || 'Unable to update your profile.');
      if (res.details && typeof res.details === 'object') {
        setErrors(res.details);
      }
      return;
    }

    setSavedNotice(res.message || 'Your profile has been updated.');
    addToast('Client profile updated.', 'success');
  };

  return (
    <>
      <SEO noindex fullTitle="Profile | Client Account | DTKS" />

      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#17231C]">
            Profile Details
          </h1>
          <p className="mt-1 text-sm text-[#64756B]">
            Keep your contact information and business details up to date for project communications.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6 space-y-5"
        >
          {serverError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2.5 text-xs text-red-800"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {savedNotice && (
            <div
              role="status"
              className="rounded-lg border border-[#16834A]/30 bg-[#E8F5EC]/70 px-4 py-3 flex items-start gap-2.5 text-xs text-[#116438]"
            >
              <CheckCircle2 className="w-4 h-4 text-[#16834A] shrink-0 mt-0.5" />
              <span>{savedNotice}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="profile-email" className="block text-xs font-semibold text-[#17231C]">
              Registered Email Address
            </label>
            <input
              id="profile-email"
              type="email"
              value={client?.email || ''}
              disabled
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-[#F7FAF7] text-[#64756B] cursor-not-allowed"
            />
            <p className="text-xs text-[#64756B]">
              Email addresses are tied to project tracking and cannot be changed directly.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="profile-full-name" className="block text-xs font-semibold text-[#17231C]">
                Full Name <span className="text-red-600">*</span>
              </label>
              <input
                id="profile-full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                aria-invalid={Boolean(errors.fullName)}
                className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-[#17231C] focus:outline-none transition-colors ${
                  errors.fullName ? 'border-red-400 focus:border-red-600' : 'border-[#E3EBE5] focus:border-[#16834A]'
                }`}
              />
              {errors.fullName && <p className="text-xs text-red-600">{errors.fullName}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="profile-phone" className="block text-xs font-semibold text-[#17231C]">
                Phone Number <span className="text-red-600">*</span>
              </label>
              <input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                aria-invalid={Boolean(errors.phone)}
                className={`w-full px-3.5 py-2.5 text-sm rounded-lg border bg-white text-[#17231C] focus:outline-none transition-colors ${
                  errors.phone ? 'border-red-400 focus:border-red-600' : 'border-[#E3EBE5] focus:border-[#16834A]'
                }`}
              />
              {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="profile-business" className="block text-xs font-semibold text-[#17231C]">
                Business or Organization
              </label>
              <input
                id="profile-business"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Optional company or brand name"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="profile-city" className="block text-xs font-semibold text-[#17231C]">
                City / Location
              </label>
              <input
                id="profile-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Srinagar, Jammu & Kashmir"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] disabled:opacity-60 text-white transition-colors whitespace-nowrap"
            >
              <Save className="w-4 h-4 shrink-0" />
              <span>{saving ? 'Saving Changes...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
