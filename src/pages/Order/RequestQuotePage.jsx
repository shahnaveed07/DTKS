import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Edit3,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import PageHead from '../../components/common/PageHead.jsx';
import { validateOrderStep, formatCurrency } from '../../utils/orderUtils.js';

const SERVICE_OPTIONS = [
  'Website Development',
  'Web Application',
  'Android Application',
  'Custom Software',
  'E-Commerce',
  'Game Development',
  'UI/UX Design',
  'Other',
];

const STEPS = [
  { number: 1, title: 'Service' },
  { number: 2, title: 'Package' },
  { number: 3, title: 'Requirements' },
  { number: 4, title: 'Hosting' },
  { number: 5, title: 'Budget' },
  { number: 6, title: 'Contact' },
  { number: 7, title: 'Review' },
];

const INITIAL_FORM = {
  service: '',
  packageId: '',
  packageTitle: '',
  projectName: '',
  businessName: '',
  projectDescription: '',
  requiredPages: '',
  requiredFunctionality: '',
  referenceWebsites: '',
  preferredDesignStyle: '',
  requiredIntegrations: '',
  additionalInstructions: '',
  hostingPreference: 'Need advice',
  maintenanceInterest: 'Need more information',
  estimatedBudget: '',
  expectedTimeline: '',
  urgency: 'Standard',
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  customerCity: '',
};

export default function RequestQuotePage() {
  const [searchParams] = useSearchParams();
  const { packages, settings, submitOrder, addToast } = useApp();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(() => {
    const paramService = searchParams.get('service') || '';
    const paramPkg = searchParams.get('package') || '';
    const matchedService = SERVICE_OPTIONS.find(
      (s) => s.toLowerCase() === paramService.toLowerCase()
    );
    return {
      ...INITIAL_FORM,
      service: matchedService || '',
      packageId: paramPkg || '',
    };
  });
  const [errors, setErrors] = useState({});
  const [submittedOrder, setSubmittedOrder] = useState(null);
  const [copied, setCopied] = useState(false);

  const activePackages = useMemo(
    () => packages.filter((p) => p.active),
    [packages]
  );

  // Sync package title when packageId is preselected via URL
  useEffect(() => {
    if (formData.packageId && !formData.packageTitle) {
      if (formData.packageId === 'custom') {
        setFormData((prev) => ({ ...prev, packageTitle: 'Custom Quote / No Fixed Package' }));
      } else {
        const found = activePackages.find((p) => p.id === formData.packageId);
        if (found) {
          setFormData((prev) => ({
            ...prev,
            packageTitle: found.title,
            service: prev.service || found.category,
          }));
        }
      }
    }
  }, [formData.packageId, formData.packageTitle, activePackages]);

  const relevantPackages = useMemo(() => {
    if (!formData.service) return activePackages;
    const matched = activePackages.filter(
      (p) => p.category.toLowerCase() === formData.service.toLowerCase()
    );
    return matched.length > 0 ? matched : activePackages;
  }, [activePackages, formData.service]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleNext = () => {
    const result = validateOrderStep(step, formData);
    if (!result.isValid) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setStep((prev) => Math.min(7, prev + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setErrors({});
    setStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitOrder = () => {
    for (const s of [1, 2, 3, 4, 5, 6]) {
      const check = validateOrderStep(s, formData);
      if (!check.isValid) {
        setErrors(check.errors);
        setStep(s);
        return;
      }
    }
    const created = submitOrder(formData);
    setSubmittedOrder(created);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyRef = async () => {
    if (!submittedOrder?.referenceId) return;
    try {
      await navigator.clipboard.writeText(submittedOrder.referenceId);
      setCopied(true);
      addToast(`Copied ${submittedOrder.referenceId} to clipboard.`, 'info');
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      addToast('Copy failed. Please select and copy the reference ID manually.', 'error');
    }
  };

  if (submittedOrder) {
    return (
      <>
        <PageHead title="Order Request Submitted" />
        <section className="py-16 bg-[#F7FAF7]">
          <div className="max-w-2xl mx-auto px-4 sm:px-6">
            <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-8">
              <div className="w-12 h-12 rounded-xl bg-[#E8F5EC] text-[#16A34A] flex items-center justify-center mb-5">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#17231C]">
                Order Request Saved Locally
              </h1>
              <p className="mt-2 text-sm text-[#64756B] leading-relaxed">
                Your development request has been persisted in your browser&apos;s LocalStorage for this frontend prototype. Use the reference ID below to inspect or update it in Order Tracking and Admin Orders.
              </p>

              <div className="mt-6 rounded-xl border border-[#E3EBE5] bg-[#E8F5EC]/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-[#64756B]">Order Reference ID</p>
                  <p className="mt-1 font-mono-tabular text-2xl font-bold text-[#116438]">
                    {submittedOrder.referenceId}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyRef}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-[#16834A] text-[#16834A] hover:bg-[#E8F5EC] transition-colors whitespace-nowrap"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied' : 'Copy Reference ID'}</span>
                </button>
              </div>

              <div className="mt-6 space-y-2 text-sm text-[#17231C]">
                <h2 className="font-display text-sm font-semibold text-[#17231C]">
                  Next Steps
                </h2>
                <ol className="list-decimal list-inside space-y-1.5 text-xs sm:text-sm text-[#64756B]">
                  <li>Requirements enter <strong className="text-[#17231C]">New Request</strong> status.</li>
                  <li>Our team reviews your scope, hosting choice, and timeline to prepare a formal quotation.</li>
                  <li>You can inspect progress anytime on the Track Order page using your Reference ID and email ({submittedOrder.customerEmail}).</li>
                </ol>
              </div>

              <div className="mt-8 pt-6 border-t border-[#E3EBE5] flex flex-wrap gap-3">
                <Link
                  to={`/track-order?ref=${encodeURIComponent(submittedOrder.referenceId)}&email=${encodeURIComponent(submittedOrder.customerEmail)}`}
                  className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors whitespace-nowrap"
                >
                  Track This Request
                </Link>
                <Link
                  to="/admin/orders"
                  className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-white border border-[#16834A] text-[#16834A] hover:bg-[#E8F5EC] transition-colors whitespace-nowrap"
                >
                  Manage in Admin Prototype
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedOrder(null);
                    setFormData(INITIAL_FORM);
                    setStep(1);
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-[#64756B] hover:text-[#17231C]"
                >
                  Submit Another Request
                </button>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHead
        title="Start Your Project / Request a Quote"
        description="Submit your website, web app, Android app, or custom software requirements through our 7-step project request wizard."
      />

      <section className="border-b border-[#E3EBE5] bg-white py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold text-[#16834A]">
            Project Order &amp; Quotation Builder
          </p>
          <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#17231C]">
            Request a Development Quote
          </h1>
          <p className="mt-2 text-sm text-[#64756B]">
            No account required. Complete the seven steps below to generate your project request reference.
          </p>

          {/* Stepper */}
          <nav aria-label="Order progress" className="mt-7 overflow-x-auto pb-1">
            <ol className="flex items-center justify-between min-w-[540px] gap-2">
              {STEPS.map((item) => {
                const isCurrent = item.number === step;
                const isDone = item.number < step;
                return (
                  <li key={item.number} className="flex items-center gap-2 flex-1 last:flex-none">
                    <button
                      type="button"
                      disabled={item.number > step}
                      onClick={() => item.number < step && setStep(item.number)}
                      className={`flex items-center gap-2 text-xs font-medium whitespace-nowrap ${
                        isCurrent
                          ? 'text-[#16834A] font-semibold'
                          : isDone
                          ? 'text-[#17231C] hover:underline'
                          : 'text-[#64756B]/60 cursor-not-allowed'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full font-mono-tabular text-xs flex items-center justify-center shrink-0 ${
                          isCurrent
                            ? 'bg-[#16834A] text-white'
                            : isDone
                            ? 'bg-[#116438] text-white'
                            : 'border border-[#E3EBE5] text-[#64756B]'
                        }`}
                      >
                        {isDone ? <Check className="w-3.5 h-3.5" /> : item.number}
                      </span>
                      <span>{item.title}</span>
                    </button>
                    {item.number < 7 && (
                      <div className="h-px bg-[#E3EBE5] flex-1" />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </section>

      <section className="py-10 bg-[#F7FAF7]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6 sm:p-8">
            {/* Step 1: Select Service */}
            {step === 1 && (
              <div>
                <h2 className="font-display text-xl font-bold text-[#17231C]">
                  Step 1: Select Service Category
                </h2>
                <p className="mt-1 text-sm text-[#64756B]">
                  Choose the primary type of solution you want to build.
                </p>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SERVICE_OPTIONS.map((option) => {
                    const selected = formData.service === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => updateField('service', option)}
                        className={`text-left px-4 py-3.5 rounded-lg border transition-colors flex items-center justify-between ${
                          selected
                            ? 'border-[#16834A] bg-[#E8F5EC] text-[#116438]'
                            : 'border-[#E3EBE5] hover:border-[#16834A]/60 text-[#17231C]'
                        }`}
                      >
                        <span className="text-sm font-medium">{option}</span>
                        {selected && <Check className="w-4 h-4 text-[#16834A]" />}
                      </button>
                    );
                  })}
                </div>
                {errors.service && <p className="mt-3 text-xs text-red-600">{errors.service}</p>}
              </div>
            )}

            {/* Step 2: Select Package */}
            {step === 2 && (
              <div>
                <h2 className="font-display text-xl font-bold text-[#17231C]">
                  Step 2: Select Package or Custom Quote
                </h2>
                <p className="mt-1 text-sm text-[#64756B]">
                  Pick a starting package for reference or select Custom Quote for tailored scoping.
                </p>

                <div className="mt-6 space-y-3">
                  {relevantPackages.map((pkg) => {
                    const selected = formData.packageId === pkg.id;
                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => {
                          updateField('packageId', pkg.id);
                          updateField('packageTitle', pkg.title);
                        }}
                        className={`w-full text-left p-4 rounded-lg border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          selected
                            ? 'border-[#16834A] bg-[#E8F5EC]'
                            : 'border-[#E3EBE5] hover:border-[#16834A]/60'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[#17231C]">
                              {pkg.title}
                            </span>
                            <span className="text-xs text-[#64756B]">
                              · {pkg.pagesCount}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[#64756B]">
                            {pkg.description}
                          </p>
                        </div>
                        <span className="font-mono-tabular text-sm font-bold text-[#16834A] whitespace-nowrap">
                          {formatCurrency(pkg.startingPrice, pkg.currency)}
                        </span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      updateField('packageId', 'custom');
                      updateField('packageTitle', 'Custom Quote / No Fixed Package');
                    }}
                    className={`w-full text-left p-4 rounded-lg border transition-colors flex items-center justify-between gap-3 ${
                      formData.packageId === 'custom'
                        ? 'border-[#16834A] bg-[#E8F5EC]'
                        : 'border-[#E3EBE5] hover:border-[#16834A]/60'
                    }`}
                  >
                    <div>
                      <span className="text-sm font-semibold text-[#17231C]">
                        No Package / Request Custom Quotation
                      </span>
                      <p className="mt-1 text-xs text-[#64756B]">
                        Scope and pricing calculated directly from your requirements in Step 3.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#16834A] whitespace-nowrap">
                      Custom Scope
                    </span>
                  </button>
                </div>
                {errors.packageId && <p className="mt-3 text-xs text-red-600">{errors.packageId}</p>}
              </div>
            )}

            {/* Step 3: Project Requirements */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#17231C]">
                    Step 3: Project Requirements
                  </h2>
                  <p className="mt-1 text-sm text-[#64756B]">
                    Describe what you need built so we can prepare an accurate estimate.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="req-project-name" className="block text-xs font-semibold text-[#17231C] mb-1.5">
                      Project Name *
                    </label>
                    <input
                      id="req-project-name"
                      type="text"
                      value={formData.projectName}
                      onChange={(e) => updateField('projectName', e.target.value)}
                      placeholder="e.g., Company Portal & Booking System"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                    />
                    {errors.projectName && <p className="mt-1 text-xs text-red-600">{errors.projectName}</p>}
                  </div>

                  <div>
                    <label htmlFor="req-business-name" className="block text-xs font-semibold text-[#17231C] mb-1.5">
                      Business / Organization Name
                    </label>
                    <input
                      id="req-business-name"
                      type="text"
                      value={formData.businessName}
                      onChange={(e) => updateField('businessName', e.target.value)}
                      placeholder="Optional business or brand name"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="req-description" className="block text-xs font-semibold text-[#17231C] mb-1.5">
                    Project Description *
                  </label>
                  <textarea
                    id="req-description"
                    rows={4}
                    value={formData.projectDescription}
                    onChange={(e) => updateField('projectDescription', e.target.value)}
                    placeholder="Explain the goal of your website, app, or software and who will use it..."
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  />
                  {errors.projectDescription && (
                    <p className="mt-1 text-xs text-red-600">{errors.projectDescription}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="req-pages" className="block text-xs font-semibold text-[#17231C] mb-1.5">
                      Required Pages / Screens
                    </label>
                    <input
                      id="req-pages"
                      type="text"
                      value={formData.requiredPages}
                      onChange={(e) => updateField('requiredPages', e.target.value)}
                      placeholder="e.g., Home, Catalog, Cart, Admin Panel"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                    />
                  </div>
                  <div>
                    <label htmlFor="req-functionality" className="block text-xs font-semibold text-[#17231C] mb-1.5">
                      Required Functionality
                    </label>
                    <input
                      id="req-functionality"
                      type="text"
                      value={formData.requiredFunctionality}
                      onChange={(e) => updateField('requiredFunctionality', e.target.value)}
                      placeholder="e.g., Login, search filters, PDF invoices"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="req-references" className="block text-xs font-semibold text-[#17231C] mb-1.5">
                      Reference Websites / Apps
                    </label>
                    <input
                      id="req-references"
                      type="text"
                      value={formData.referenceWebsites}
                      onChange={(e) => updateField('referenceWebsites', e.target.value)}
                      placeholder="URLs or names of styles you admire"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                    />
                  </div>
                  <div>
                    <label htmlFor="req-style" className="block text-xs font-semibold text-[#17231C] mb-1.5">
                      Preferred Design Style
                    </label>
                    <input
                      id="req-style"
                      type="text"
                      value={formData.preferredDesignStyle}
                      onChange={(e) => updateField('preferredDesignStyle', e.target.value)}
                      placeholder="e.g., Clean corporate, modern light, minimal"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="req-integrations" className="block text-xs font-semibold text-[#17231C] mb-1.5">
                      Required Integrations
                    </label>
                    <input
                      id="req-integrations"
                      type="text"
                      value={formData.requiredIntegrations}
                      onChange={(e) => updateField('requiredIntegrations', e.target.value)}
                      placeholder="e.g., Payment gateway, WhatsApp link, Maps"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                    />
                  </div>
                  <div>
                    <label htmlFor="req-notes" className="block text-xs font-semibold text-[#17231C] mb-1.5">
                      Additional Instructions
                    </label>
                    <input
                      id="req-notes"
                      type="text"
                      value={formData.additionalInstructions}
                      onChange={(e) => updateField('additionalInstructions', e.target.value)}
                      placeholder="Any special constraints or notes"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Hosting & Maintenance */}
            {step === 4 && (
              <div className="space-y-8">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#17231C]">
                    Step 4: Hosting &amp; Maintenance Preferences
                  </h2>
                  <p className="mt-1 text-sm text-[#64756B]">
                    Clarify how you prefer to manage domain, hosting, and optional ongoing maintenance.
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#64756B] mb-3">
                    Hosting Preference *
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      {
                        value: 'Customer-managed',
                        desc: 'You purchase domain/hosting directly and retain billing ownership.',
                      },
                      {
                        value: 'DreamTech-managed',
                        desc: 'DreamTech arranges hosting and tracks renewals (quoted separately).',
                      },
                      {
                        value: 'Need advice',
                        desc: 'Help me choose the right setup during our requirement discussion.',
                      },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateField('hostingPreference', opt.value)}
                        className={`text-left p-4 rounded-lg border transition-colors ${
                          formData.hostingPreference === opt.value
                            ? 'border-[#16834A] bg-[#E8F5EC]'
                            : 'border-[#E3EBE5] hover:border-[#16834A]/60'
                        }`}
                      >
                        <p className="text-sm font-semibold text-[#17231C]">{opt.value}</p>
                        <p className="mt-1 text-xs text-[#64756B]">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                  {errors.hostingPreference && (
                    <p className="mt-2 text-xs text-red-600">{errors.hostingPreference}</p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#64756B] mb-3">
                    Optional Maintenance Plan Interest *
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { value: 'Interested', desc: 'Include optional Basic/Standard/Premium maintenance details in quote.' },
                      { value: 'Not interested', desc: 'Development and handover only without a recurring plan.' },
                      { value: 'Need more information', desc: 'Share maintenance options separately after project launch.' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => updateField('maintenanceInterest', opt.value)}
                        className={`text-left p-4 rounded-lg border transition-colors ${
                          formData.maintenanceInterest === opt.value
                            ? 'border-[#16834A] bg-[#E8F5EC]'
                            : 'border-[#E3EBE5] hover:border-[#16834A]/60'
                        }`}
                      >
                        <p className="text-sm font-semibold text-[#17231C]">{opt.value}</p>
                        <p className="mt-1 text-xs text-[#64756B]">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                  {errors.maintenanceInterest && (
                    <p className="mt-2 text-xs text-red-600">{errors.maintenanceInterest}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Budget & Timeline */}
            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#17231C]">
                    Step 5: Estimated Budget &amp; Timeline
                  </h2>
                  <p className="mt-1 text-sm text-[#64756B]">
                    Select your target budget range and expected delivery timeframe.
                  </p>
                </div>

                <div>
                  <label htmlFor="ord-budget" className="block text-xs font-semibold text-[#17231C] mb-2">
                    Estimated Budget Range *
                  </label>
                  <select
                    id="ord-budget"
                    value={formData.estimatedBudget}
                    onChange={(e) => updateField('estimatedBudget', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                  >
                    <option value="">Select budget range...</option>
                    {(settings.budgetOptions || []).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  {errors.estimatedBudget && <p className="mt-1 text-xs text-red-600">{errors.estimatedBudget}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="ord-timeline" className="block text-xs font-semibold text-[#17231C] mb-2">
                      Expected Delivery Timeline *
                    </label>
                    <select
                      id="ord-timeline"
                      value={formData.expectedTimeline}
                      onChange={(e) => updateField('expectedTimeline', e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                    >
                      <option value="">Select timeline...</option>
                      {(settings.timelineOptions || []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {errors.expectedTimeline && <p className="mt-1 text-xs text-red-600">{errors.expectedTimeline}</p>}
                  </div>

                  <div>
                    <label htmlFor="ord-urgency" className="block text-xs font-semibold text-[#17231C] mb-2">
                      Project Urgency
                    </label>
                    <select
                      id="ord-urgency"
                      value={formData.urgency}
                      onChange={(e) => updateField('urgency', e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                    >
                      {(settings.urgencyOptions || ['Standard', 'Priority', 'Urgent', 'Flexible']).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Customer Information */}
            {step === 6 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#17231C]">
                    Step 6: Your Contact Information
                  </h2>
                  <p className="mt-1 text-sm text-[#64756B]">
                    Your email is also used alongside your order reference ID on the Order Tracking page.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="cust-name" className="block text-xs font-semibold text-[#17231C] mb-1.5">
                      Full Name *
                    </label>
                    <input
                      id="cust-name"
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => updateField('customerName', e.target.value)}
                      placeholder="Your full name"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                    />
                    {errors.customerName && <p className="mt-1 text-xs text-red-600">{errors.customerName}</p>}
                  </div>

                  <div>
                    <label htmlFor="cust-email" className="block text-xs font-semibold text-[#17231C] mb-1.5">
                      Email Address *
                    </label>
                    <input
                      id="cust-email"
                      type="email"
                      value={formData.customerEmail}
                      onChange={(e) => updateField('customerEmail', e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                    />
                    {errors.customerEmail && <p className="mt-1 text-xs text-red-600">{errors.customerEmail}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="cust-phone" className="block text-xs font-semibold text-[#17231C] mb-1.5">
                      Phone / WhatsApp *
                    </label>
                    <input
                      id="cust-phone"
                      type="tel"
                      value={formData.customerPhone}
                      onChange={(e) => updateField('customerPhone', e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                    />
                    {errors.customerPhone && <p className="mt-1 text-xs text-red-600">{errors.customerPhone}</p>}
                  </div>

                  <div>
                    <label htmlFor="cust-city" className="block text-xs font-semibold text-[#17231C] mb-1.5">
                      City / Location *
                    </label>
                    <input
                      id="cust-city"
                      type="text"
                      value={formData.customerCity}
                      onChange={(e) => updateField('customerCity', e.target.value)}
                      placeholder="e.g., Srinagar, Jammu, Delhi"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] focus:outline-none focus:border-[#16834A]"
                    />
                    {errors.customerCity && <p className="mt-1 text-xs text-red-600">{errors.customerCity}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 7: Review & Submit */}
            {step === 7 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#17231C]">
                    Step 7: Review &amp; Submit Request
                  </h2>
                  <p className="mt-1 text-sm text-[#64756B]">
                    Review all entered details carefully. Use the edit links to update any section before submitting.
                  </p>
                </div>

                <div className="divide-y divide-[#E3EBE5] rounded-xl border border-[#E3EBE5] bg-[#F7FAF7]">
                  <div className="p-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-[#64756B]">Service &amp; Package</p>
                      <p className="text-sm font-semibold text-[#17231C] mt-0.5">
                        {formData.service} · {formData.packageTitle || formData.packageId}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#16834A] hover:text-[#116438] hover:underline"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="p-4 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-[#64756B]">Project Requirements</p>
                      <p className="text-sm font-semibold text-[#17231C]">
                        {formData.projectName}
                        {formData.businessName ? ` (${formData.businessName})` : ''}
                      </p>
                      <p className="text-xs text-[#64756B]">
                        {formData.projectDescription}
                      </p>
                      {formData.requiredPages && (
                        <p className="text-xs text-[#64756B]">
                          Pages/Screens: {formData.requiredPages}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#16834A] hover:text-[#116438] hover:underline shrink-0"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="p-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-[#64756B]">Hosting &amp; Maintenance</p>
                      <p className="text-sm font-medium text-[#17231C] mt-0.5">
                        Hosting: {formData.hostingPreference} · Maintenance: {formData.maintenanceInterest}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(4)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#16834A] hover:text-[#116438] hover:underline"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="p-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-[#64756B]">Budget &amp; Timeline</p>
                      <p className="text-sm font-medium text-[#17231C] mt-0.5">
                        {formData.estimatedBudget} · {formData.expectedTimeline} ({formData.urgency})
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(5)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#16834A] hover:text-[#116438] hover:underline"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="p-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs text-[#64756B]">Customer Details</p>
                      <p className="text-sm font-medium text-[#17231C] mt-0.5">
                        {formData.customerName} · {formData.customerEmail} · {formData.customerPhone} · {formData.customerCity}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(6)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#16834A] hover:text-[#116438] hover:underline"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Wizard Navigation Controls */}
            <div className="mt-8 pt-6 border-t border-[#E3EBE5] flex items-center justify-between gap-4">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-[#E3EBE5] text-[#17231C] hover:bg-[#F7FAF7] transition-colors whitespace-nowrap"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
              ) : (
                <div />
              )}

              {step < 7 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors whitespace-nowrap"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors whitespace-nowrap"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Order Request</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
