import { useState } from 'react';
import { Plus, Edit3, Trash2, X, Star } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { WEBSITE_CATEGORIES } from '../../data/seedData.js';
import SEO from '../../components/common/SEO.jsx';
import { formatCurrency } from '../../utils/orderUtils.js';

const EMPTY_PACKAGE = {
  title: '',
  category: 'Business & Corporate Websites',
  description: '',
  startingPrice: '',
  currency: 'INR',
  pagesCount: '',
  featuresText: '',
  revisions: '2 Design Revision Rounds',
  deliveryEstimate: '2–3 Weeks',
  supportDuration: '30 Days Post-Launch Bug Support',
  hostingOption: 'Customer-Managed or DreamTech-Managed Hosting',
  maintenanceOption: 'Optional Monthly or Yearly Maintenance',
  extraServices: '',
  active: true,
  featured: false,
};

export default function AdminPackagesPage() {
  const {
    packages,
    createPackage,
    updatePackage,
    deletePackage,
    maintenancePlans,
    saveMaintenancePlans,
    addons,
    saveAddons,
    requestConfirm,
  } = useApp();

  const [tab, setTab] = useState('packages');
  const [editingPkg, setEditingPkg] = useState(null);
  const [pkgForm, setPkgForm] = useState(EMPTY_PACKAGE);
  const [modalOpen, setModalOpen] = useState(false);

  const openCreate = () => {
    setEditingPkg(null);
    setPkgForm(EMPTY_PACKAGE);
    setModalOpen(true);
  };

  const openEdit = (pkg) => {
    setEditingPkg(pkg);
    setPkgForm({
      ...EMPTY_PACKAGE,
      ...pkg,
      startingPrice: pkg.startingPrice ?? '',
      extraServices: pkg.extraServices || '',
      featuresText: (pkg.features || []).join('\n'),
    });
    setModalOpen(true);
  };

  const handleSavePackage = async (e) => {
    e.preventDefault();
    const numericPrice =
      pkgForm.startingPrice === '' || pkgForm.startingPrice === null
        ? null
        : Number(pkgForm.startingPrice);

    const payload = {
      title: pkgForm.title.trim(),
      category: pkgForm.category,
      description: pkgForm.description.trim(),
      startingPrice: Number.isNaN(numericPrice) ? null : numericPrice,
      currency: pkgForm.currency || 'INR',
      pagesCount: pkgForm.pagesCount.trim(),
      features: pkgForm.featuresText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      revisions: pkgForm.revisions.trim(),
      deliveryEstimate: pkgForm.deliveryEstimate.trim(),
      supportDuration: pkgForm.supportDuration.trim(),
      hostingOption: pkgForm.hostingOption.trim(),
      maintenanceOption: pkgForm.maintenanceOption.trim(),
      extraServices: pkgForm.extraServices.trim(),
      active: Boolean(pkgForm.active),
      featured: Boolean(pkgForm.featured),
    };

    const res = editingPkg
      ? await updatePackage(editingPkg.id, payload)
      : await createPackage(payload);
    if (res?.success !== false) {
      setModalOpen(false);
    }
  };

  const handleDeletePackage = (pkg) => {
    requestConfirm({
      title: `Delete package "${pkg.title}"?`,
      message: 'This removes the package from both Admin and the public Packages page.',
      confirmLabel: 'Delete Package',
      variant: 'danger',
      onConfirm: () => deletePackage(pkg.id),
    });
  };

  const handleMaintenancePriceChange = (id, value) => {
    const next = maintenancePlans.map((p) => {
      if (p.id !== id) return p;
      const num = value === '' ? null : Number(value);
      return { ...p, price: Number.isNaN(num) ? null : num };
    });
    saveMaintenancePlans(next);
  };

  const handleAddonNoteChange = (id, value) => {
    const next = addons.map((a) => (a.id === id ? { ...a, pricingNote: value } : a));
    saveAddons(next);
  };

  return (
    <>
      <SEO noindex fullTitle="Manage Packages | Admin | DTKS" />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-[#17231C]">
              Packages, Add-Ons &amp; Maintenance
            </h1>
            <p className="mt-1 text-sm text-[#64756B]">
              Configure confirmed starting prices (or leave blank to display &ldquo;Request a Quote&rdquo;), included deliverables, and optional maintenance plans.
            </p>
          </div>

          {tab === 'packages' && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Package</span>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="inline-flex p-1 rounded-lg bg-white border border-[#E3EBE5] shadow-xs">
          {[
            { id: 'packages', label: 'Development Packages' },
            { id: 'maintenance', label: 'Maintenance Plans' },
            { id: 'addons', label: 'Optional Add-Ons' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                tab === item.id
                  ? 'bg-[#16834A] text-white'
                  : 'text-[#64756B] hover:text-[#17231C] hover:bg-[#F7FAF7]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Packages List */}
        {tab === 'packages' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-[#16834A]">
                        {pkg.category} · {pkg.active ? 'Active' : 'Archived'}
                      </p>
                      <h2 className="mt-1 font-display text-lg font-bold text-[#17231C]">
                        {pkg.title}
                      </h2>
                    </div>
                    <span className="font-mono-tabular text-base font-bold text-[#116438] whitespace-nowrap">
                      {formatCurrency(pkg.startingPrice, pkg.currency)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-[#64756B]">{pkg.description}</p>
                  <p className="mt-3 text-xs text-[#64756B]">
                    {pkg.pagesCount} · {pkg.deliveryEstimate} · {pkg.revisions}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-[#E3EBE5] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updatePackage(pkg.id, { active: !pkg.active })}
                      className="px-2.5 py-1 text-xs font-medium rounded-md border border-[#E3EBE5] text-[#17231C] hover:bg-[#F7FAF7]"
                    >
                      {pkg.active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePackage(pkg.id, { featured: !pkg.featured })}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border ${
                        pkg.featured
                          ? 'border-[#16834A] bg-[#E8F5EC] text-[#116438]'
                          : 'border-[#E3EBE5] text-[#64756B]'
                      }`}
                    >
                      <Star className="w-3 h-3" />
                      <span>{pkg.featured ? 'Featured' : 'Feature'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(pkg)}
                      aria-label={`Edit ${pkg.title}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border border-[#E3EBE5] text-[#17231C] hover:border-[#16834A] hover:text-[#16834A]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePackage(pkg)}
                      aria-label={`Delete ${pkg.title}`}
                      className="p-1.5 rounded-md border border-[#E3EBE5] text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Maintenance Plans Config */}
        {tab === 'maintenance' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {maintenancePlans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-[#17231C]">
                    {plan.name} Maintenance
                  </h2>
                  <span className="text-xs text-[#64756B]">{plan.billingCycle}</span>
                </div>
                <div>
                  <label
                    htmlFor={`maint-price-${plan.id}`}
                    className="block text-xs font-semibold text-[#17231C] mb-1"
                  >
                    Confirmed Price (INR — leave empty for &ldquo;Request a Quote&rdquo;)
                  </label>
                  <input
                    id={`maint-price-${plan.id}`}
                    type="number"
                    min="0"
                    value={plan.price ?? ''}
                    onChange={(e) => handleMaintenancePriceChange(plan.id, e.target.value)}
                    placeholder="Request a Quote"
                    className="w-full px-3 py-2 text-sm font-mono-tabular rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
                <p className="text-xs text-[#64756B]">
                  {plan.backupFrequency} · {plan.securityChecks} · {plan.responseTime}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Addons Config */}
        {tab === 'addons' && (
          <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs divide-y divide-[#E3EBE5]">
            {addons.map((addon) => (
              <div key={addon.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#17231C]">{addon.name}</h3>
                  <p className="text-xs text-[#64756B]">{addon.description}</p>
                </div>
                <input
                  type="text"
                  aria-label={`Pricing note for ${addon.name}`}
                  value={addon.pricingNote}
                  onChange={(e) => handleAddonNoteChange(addon.id, e.target.value)}
                  className="sm:w-52 px-3 py-1.5 text-xs rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Package Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#17231C]/40 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pkg-modal-title"
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-[#E3EBE5] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#E3EBE5]">
              <h2 id="pkg-modal-title" className="font-display text-lg font-bold text-[#17231C]">
                {editingPkg ? `Edit ${editingPkg.title}` : 'Create Development Package'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close package modal"
                className="p-1 text-[#64756B] hover:text-[#17231C]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pkg-title" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Package Title *
                  </label>
                  <input
                    id="pkg-title"
                    type="text"
                    required
                    value={pkgForm.title}
                    onChange={(e) => setPkgForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
                <div>
                  <label htmlFor="pkg-category" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Website Category
                  </label>
                  <select
                    id="pkg-category"
                    value={pkgForm.category}
                    onChange={(e) => setPkgForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  >
                    {WEBSITE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="pkg-desc" className="block text-xs font-semibold text-[#17231C] mb-1">
                  Description *
                </label>
                <textarea
                  id="pkg-desc"
                  rows={2}
                  required
                  value={pkgForm.description}
                  onChange={(e) => setPkgForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="pkg-price" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Starting Price (Blank = Request a Quote)
                  </label>
                  <input
                    id="pkg-price"
                    type="number"
                    min="0"
                    value={pkgForm.startingPrice}
                    onChange={(e) => setPkgForm((f) => ({ ...f, startingPrice: e.target.value }))}
                    placeholder="Request a Quote"
                    className="w-full px-3 py-2 text-sm font-mono-tabular rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
                <div>
                  <label htmlFor="pkg-currency" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Currency
                  </label>
                  <select
                    id="pkg-currency"
                    value={pkgForm.currency || 'INR'}
                    onChange={(e) => setPkgForm((f) => ({ ...f, currency: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="pkg-pages" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Included Pages
                  </label>
                  <input
                    id="pkg-pages"
                    type="text"
                    value={pkgForm.pagesCount}
                    onChange={(e) => setPkgForm((f) => ({ ...f, pagesCount: e.target.value }))}
                    placeholder="e.g., Up to 8 Pages"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="pkg-delivery" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Delivery Estimate
                  </label>
                  <input
                    id="pkg-delivery"
                    type="text"
                    value={pkgForm.deliveryEstimate}
                    onChange={(e) => setPkgForm((f) => ({ ...f, deliveryEstimate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
                <div>
                  <label htmlFor="pkg-revisions" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Number of Revisions
                  </label>
                  <input
                    id="pkg-revisions"
                    type="text"
                    value={pkgForm.revisions}
                    onChange={(e) => setPkgForm((f) => ({ ...f, revisions: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
                <div>
                  <label htmlFor="pkg-support" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Bug-Support Period
                  </label>
                  <input
                    id="pkg-support"
                    type="text"
                    value={pkgForm.supportDuration}
                    onChange={(e) => setPkgForm((f) => ({ ...f, supportDuration: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="pkg-hosting" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Hosting Options
                  </label>
                  <input
                    id="pkg-hosting"
                    type="text"
                    value={pkgForm.hostingOption}
                    onChange={(e) => setPkgForm((f) => ({ ...f, hostingOption: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
                <div>
                  <label htmlFor="pkg-maint" className="block text-xs font-semibold text-[#17231C] mb-1">
                    Maintenance Options
                  </label>
                  <input
                    id="pkg-maint"
                    type="text"
                    value={pkgForm.maintenanceOption}
                    onChange={(e) => setPkgForm((f) => ({ ...f, maintenanceOption: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="pkg-extra" className="block text-xs font-semibold text-[#17231C] mb-1">
                  Extra Services Note
                </label>
                <input
                  id="pkg-extra"
                  type="text"
                  value={pkgForm.extraServices}
                  onChange={(e) => setPkgForm((f) => ({ ...f, extraServices: e.target.value }))}
                  placeholder="e.g., Additional pages, custom integrations, or SEO setup available on request"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                />
              </div>

              <div>
                <label htmlFor="pkg-features" className="block text-xs font-semibold text-[#17231C] mb-1">
                  Included Features (One per line)
                </label>
                <textarea
                  id="pkg-features"
                  rows={4}
                  value={pkgForm.featuresText}
                  onChange={(e) => setPkgForm((f) => ({ ...f, featuresText: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                />
              </div>

              <div className="flex items-center gap-6 text-sm">
                <label className="inline-flex items-center gap-2 text-[#17231C]">
                  <input
                    type="checkbox"
                    checked={pkgForm.active}
                    onChange={(e) => setPkgForm((f) => ({ ...f, active: e.target.checked }))}
                    className="accent-[#16834A]"
                  />
                  <span>Active on Public Website</span>
                </label>
                <label className="inline-flex items-center gap-2 text-[#17231C]">
                  <input
                    type="checkbox"
                    checked={pkgForm.featured}
                    onChange={(e) => setPkgForm((f) => ({ ...f, featured: e.target.checked }))}
                    className="accent-[#16834A]"
                  />
                  <span>Featured Package</span>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-[#E3EBE5] text-[#17231C] hover:bg-[#F7FAF7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white"
                >
                  {editingPkg ? 'Save Package' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
