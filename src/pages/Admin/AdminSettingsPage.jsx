import { useState } from 'react';
import { Save } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import SEO from '../../components/common/SEO.jsx';

export default function AdminSettingsPage() {
  const { settings, updateSettings } = useApp();
  const [form, setForm] = useState(settings);

  const handleHighlightChange = (id, field, value) => {
    setForm((prev) => ({
      ...prev,
      highlights: (prev.highlights || []).map((h) =>
        h.id === id ? { ...h, [field]: value } : h
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
    updateSettings(form);
  };

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
              Configure hero copy, verified company highlights, contact details, and social links.
            </p>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white whitespace-nowrap shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>

        {/* Hero & Brand */}
        <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-[#17231C]">
            Brand &amp; Hero Messaging
          </h2>
          <div>
            <label htmlFor="set-tagline" className="block text-xs font-semibold text-[#17231C] mb-1">
              Hero Headline
            </label>
            <input
              id="set-tagline"
              type="text"
              value={form.tagline}
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
              value={form.heroSupportText}
              onChange={(e) => setForm((f) => ({ ...f, heroSupportText: e.target.value }))}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
            />
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

        {/* Contact & Social */}
        <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-[#17231C]">
            Contact Details &amp; Social Links
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="set-email" className="block text-xs font-semibold text-[#17231C] mb-1">
                Contact Email
              </label>
              <input
                id="set-email"
                type="text"
                value={form.contactEmail}
                onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
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
                value={form.contactPhone}
                onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
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
                value={form.whatsappNumber}
                onChange={(e) => setForm((f) => ({ ...f, whatsappNumber: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
              />
            </div>
            <div>
              <label htmlFor="set-location" className="block text-xs font-semibold text-[#17231C] mb-1">
                Business Location
              </label>
              <input
                id="set-location"
                type="text"
                value={form.businessLocation}
                onChange={(e) => setForm((f) => ({ ...f, businessLocation: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {['github', 'linkedin', 'instagram', 'x'].map((net) => (
              <div key={net}>
                <label
                  htmlFor={`set-soc-${net}`}
                  className="block text-xs font-semibold capitalize text-[#17231C] mb-1"
                >
                  {net} URL (Leave empty if unverified)
                </label>
                <input
                  id={`set-soc-${net}`}
                  type="url"
                  value={form.socialLinks?.[net] || ''}
                  onChange={(e) => handleSocialChange(net, e.target.value)}
                  placeholder={`https://${net}.com/...`}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                />
              </div>
            ))}
          </div>
        </div>
      </form>
    </>
  );
}
