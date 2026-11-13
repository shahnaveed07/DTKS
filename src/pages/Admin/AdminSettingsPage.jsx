import { useState } from 'react';
import { Save, Download } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import SEO from '../../components/common/SEO.jsx';

export default function AdminSettingsPage() {
  const { settings, updateSettings, exportLocalData } = useApp();
  const [form, setForm] = useState(settings);

  const handleHighlightChange = (id, field, value) => {
    setForm((prev) => ({
      ...prev,
      highlights: (prev.highlights || []).map((h) =>
        h.id === id ? { ...h, [field]: value, adminConfirmed: true } : h
      ),
    }));
  };

  const handleSocialChange = (key, value) => {
    setForm((prev) => ({
      ...prev,
      socialLinks: {
        ...(prev.socialLinks || {}),
        [key]: value,
      },
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateSettings({
      ...form,
      workingHoursConfirmed: Boolean(form.workingHours && form.workingHours.trim()),
    });
  };

  const socialFields = [
    { key: 'github', label: 'GitHub URL' },
    { key: 'linkedin', label: 'LinkedIn URL' },
    { key: 'instagram', label: 'Instagram URL' },
    { key: 'facebook', label: 'Facebook URL' },
    { key: 'x', label: 'X / Twitter URL' },
    { key: 'other', label: 'Other Verified Profile URL' },
  ];

  return (
    <>
      <SEO noindex fullTitle="Website Settings | Admin | DTKS" />

      <form onSubmit={handleSave} className="space-y-8 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#17231C]">
              Website Settings
            </h1>
            <p className="mt-1 text-sm text-[#64756B]">
              Configure official business identity, verified contact details, social links, and company highlights.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={exportLocalData}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg border border-[#E3EBE5] bg-white hover:bg-[#F7FAF7] text-[#17231C] transition-colors whitespace-nowrap"
            >
              <Download className="w-4 h-4 text-[#16834A]" />
              <span>Export Local Data Backup</span>
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white whitespace-nowrap"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>

        {/* Business Identity */}
        <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-[#17231C]">
            Business Identity
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="set-company" className="block text-xs font-semibold text-[#17231C] mb-1">
                Official Company Name
              </label>
              <input
                id="set-company"
                type="text"
                value={form.companyName || ''}
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
              />
            </div>
            <div>
              <label htmlFor="set-abbr" className="block text-xs font-semibold text-[#17231C] mb-1">
                Brand Abbreviation
              </label>
              <input
                id="set-abbr"
                type="text"
                value={form.brandAbbreviation || 'DTKS'}
                onChange={(e) => setForm((f) => ({ ...f, brandAbbreviation: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
              />
            </div>
            <div>
              <label htmlFor="set-domain" className="block text-xs font-semibold text-[#17231C] mb-1">
                Official Production Domain
              </label>
              <input
                id="set-domain"
                type="url"
                value={form.officialDomain || 'https://dreamtechkashmirsolutions.studio/'}
                onChange={(e) => setForm((f) => ({ ...f, officialDomain: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="set-tagline" className="block text-xs font-semibold text-[#17231C] mb-1">
              Hero Headline
            </label>
            <input
              id="set-tagline"
              type="text"
              value={form.tagline || ''}
              onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
            />
          </div>
          <div>
            <label htmlFor="set-hero-desc" className="block text-xs font-semibold text-[#17231C] mb-1">
              Hero Supporting Text
            </label>
            <textarea
              id="set-hero-desc"
              rows={2}
              value={form.heroSupportText || ''}
              onChange={(e) => setForm((f) => ({ ...f, heroSupportText: e.target.value }))}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
            />
          </div>
        </div>

        {/* Contact Information */}
        <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6 space-y-4">
          <div>
            <h2 className="font-display text-base font-bold text-[#17231C]">
              Contact Information
            </h2>
            <p className="mt-1 text-xs text-[#64756B]">
              Optional fields remain hidden on the public website until a verified value is entered here.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="set-email" className="block text-xs font-semibold text-[#17231C] mb-1">
                Business Email
              </label>
              <input
                id="set-email"
                type="email"
                value={form.contactEmail || ''}
                onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                placeholder="Enter verified business email"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
              />
            </div>
            <div>
              <label htmlFor="set-phone" className="block text-xs font-semibold text-[#17231C] mb-1">
                Phone Number
              </label>
              <input
                id="set-phone"
                type="text"
                value={form.contactPhone || ''}
                onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                placeholder="Enter verified business phone number"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
              />
            </div>
            <div>
              <label htmlFor="set-whatsapp" className="block text-xs font-semibold text-[#17231C] mb-1">
                WhatsApp Number
              </label>
              <input
                id="set-whatsapp"
                type="text"
                value={form.whatsappNumber || ''}
                onChange={(e) => setForm((f) => ({ ...f, whatsappNumber: e.target.value }))}
                placeholder="Enter verified WhatsApp number"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
              />
            </div>
            <div>
              <label htmlFor="set-location" className="block text-xs font-semibold text-[#17231C] mb-1">
                Business Address
              </label>
              <input
                id="set-location"
                type="text"
                value={form.businessLocation || ''}
                onChange={(e) => setForm((f) => ({ ...f, businessLocation: e.target.value }))}
                placeholder="Enter verified office address"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
              />
            </div>
            <div>
              <label htmlFor="set-service-area" className="block text-xs font-semibold text-[#17231C] mb-1">
                Service Area
              </label>
              <input
                id="set-service-area"
                type="text"
                value={form.serviceArea || 'Srinagar, Kashmir, Jammu & Kashmir, India'}
                onChange={(e) => setForm((f) => ({ ...f, serviceArea: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
              />
            </div>
            <div>
              <label htmlFor="set-hours" className="block text-xs font-semibold text-[#17231C] mb-1">
                Working Hours
              </label>
              <input
                id="set-hours"
                type="text"
                value={form.workingHours || ''}
                onChange={(e) => setForm((f) => ({ ...f, workingHours: e.target.value }))}
                placeholder="e.g., Monday – Saturday · 10:00 AM – 6:30 PM IST"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
              />
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6 space-y-4">
          <div>
            <h2 className="font-display text-base font-bold text-[#17231C]">
              Social Media Profiles
            </h2>
            <p className="mt-1 text-xs text-[#64756B]">
              Leave any unverified profile blank to keep it hidden from the public website and structured data.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {socialFields.map(({ key, label }) => (
              <div key={key}>
                <label
                  htmlFor={`set-soc-${key}`}
                  className="block text-xs font-semibold text-[#17231C] mb-1"
                >
                  {label}
                </label>
                <input
                  id={`set-soc-${key}`}
                  type="url"
                  value={form.socialLinks?.[key] || ''}
                  onChange={(e) => handleSocialChange(key, e.target.value)}
                  placeholder="Enter verified profile URL."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Verified Highlights */}
        <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6 space-y-4">
          <div>
            <h2 className="font-display text-base font-bold text-[#17231C]">
              Company Highlights (Home Page)
            </h2>
            <p className="mt-1 text-xs text-[#64756B]">
              Only metrics marked as Verified with a non-empty value are displayed on the Home Page.
            </p>
          </div>
          <div className="space-y-3">
            {(form.highlights || []).map((hl) => (
              <div
                key={hl.id}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center rounded-lg border border-[#E3EBE5] p-3 bg-[#F7FAF7]"
              >
                <div className="sm:col-span-5">
                  <input
                    type="text"
                    aria-label={`Highlight label for ${hl.label}`}
                    value={hl.label}
                    onChange={(e) => handleHighlightChange(hl.id, 'label', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-md border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    aria-label={`Highlight value for ${hl.label}`}
                    value={hl.value}
                    onChange={(e) => handleHighlightChange(hl.id, 'value', e.target.value)}
                    placeholder="Enter verified value"
                    className="w-full px-3 py-1.5 text-sm font-mono-tabular rounded-md border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-[#17231C]">
                    <input
                      type="checkbox"
                      checked={Boolean(hl.verified)}
                      onChange={(e) => handleHighlightChange(hl.id, 'verified', e.target.checked)}
                      className="accent-[#16834A]"
                    />
                    <span>Verified &amp; Show</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>
    </>
  );
}
