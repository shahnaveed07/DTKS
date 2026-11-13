import { Link } from 'react-router-dom';
import { Check, ArrowRight, Server, ShieldCheck, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import SEO from '../../components/common/SEO.jsx';
import { buildPackagesOfferCatalogSchema } from '../../seo/structuredData.js';
import { formatCurrency } from '../../utils/orderUtils.js';

export default function PackagesPage() {
  const { packages, addons, maintenancePlans, settings } = useApp();
  const activePackages = packages.filter((p) => p.active);

  return (
    <>
      <SEO
        settings={settings}
        extraSchemas={[buildPackagesOfferCatalogSchema(packages)]}
      />

      {/* Header */}
      <section className="border-b border-[#E3EBE5] bg-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold text-[#16834A]">
                DTKS Website Packages &amp; Hybrid Pricing
              </p>
              <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#17231C]">
                Website Development Packages &amp; Pricing
              </h1>
              <p className="mt-4 text-base text-[#64756B] leading-relaxed">
                Explore transparent starting pricing across Starter, Business, Professional, E-Commerce, and Custom website packages from DreamTech Kashmir Solutions (DTKS). Final project pricing is confirmed after reviewing your required pages, functionality, and hosting setup.
              </p>
            </div>
            <Link
              to="/request-quote?package=custom"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white shadow-xs transition-colors whitespace-nowrap shrink-0"
            >
              <span>Request Custom Website Quote</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Package Cards */}
      <section className="py-14 bg-[#F7FAF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {activePackages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activePackages.map((pkg) => {
                const formattedPrice = formatCurrency(pkg.startingPrice, pkg.currency);
                const hasFixedPrice =
                  pkg.startingPrice !== null &&
                  pkg.startingPrice !== undefined &&
                  pkg.startingPrice !== '';

                return (
                  <article
                    key={pkg.id}
                    className={`flex flex-col justify-between rounded-xl border bg-white overflow-hidden transition-shadow ${
                      pkg.featured
                        ? 'border-[#16834A] ring-1 ring-[#16834A]/25 shadow-md'
                        : 'border-[#E3EBE5] shadow-xs hover:shadow-sm'
                    }`}
                  >
                    <div>
                      {pkg.featured && (
                        <div className="bg-[#116438] text-white px-6 py-2.5 flex items-center justify-between text-xs">
                          <span className="font-semibold tracking-wide">Recommended Package</span>
                          <span className="text-[#E8F5EC]">{pkg.category}</span>
                        </div>
                      )}

                      <div className="p-6 sm:p-7">
                        {!pkg.featured && (
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-[#16834A]">
                              {pkg.category}
                            </span>
                          </div>
                        )}

                        <h2
                          className={`${
                            pkg.featured ? '' : 'mt-2'
                          } font-display text-xl font-bold text-[#17231C]`}
                        >
                          {pkg.title}
                        </h2>
                        <p className="mt-2 text-sm text-[#64756B] leading-relaxed">
                          {pkg.description}
                        </p>

                        <div className="mt-5 pb-5 border-b border-[#E3EBE5]">
                          <p className="text-xs text-[#64756B]">
                            {hasFixedPrice ? 'Starting Estimate' : 'Pricing'}
                          </p>
                          <p className="mt-1 font-display text-2xl font-bold text-[#116438] tabular-nums">
                            {formattedPrice}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#64756B]">
                            <span>{pkg.pagesCount}</span>
                            <span aria-hidden="true">·</span>
                            <span>{pkg.deliveryEstimate}</span>
                          </div>
                        </div>

                        <ul className="mt-5 space-y-2.5">
                          {(pkg.features || []).map((feat) => (
                            <li key={feat} className="flex items-start gap-2.5 text-sm text-[#17231C]">
                              <Check className="w-4 h-4 text-[#16834A] shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>

                        <dl className="mt-6 pt-4 border-t border-[#E3EBE5] space-y-2 text-xs">
                          <div className="flex justify-between gap-4">
                            <dt className="text-[#64756B]">Revisions</dt>
                            <dd className="font-medium text-[#17231C] text-right">{pkg.revisions}</dd>
                          </div>
                          <div className="flex justify-between gap-4">
                            <dt className="text-[#64756B]">Support</dt>
                            <dd className="font-medium text-[#17231C] text-right">{pkg.supportDuration}</dd>
                          </div>
                          <div className="flex justify-between gap-4">
                            <dt className="text-[#64756B]">Hosting</dt>
                            <dd className="font-medium text-[#17231C] text-right">{pkg.hostingOption}</dd>
                          </div>
                          <div className="flex justify-between gap-4">
                            <dt className="text-[#64756B]">Maintenance</dt>
                            <dd className="font-medium text-[#17231C] text-right">{pkg.maintenanceOption || 'Optional Maintenance Plan'}</dd>
                          </div>
                        </dl>
                      </div>
                    </div>

                    <div className="px-6 sm:px-7 pb-6 sm:pb-7">
                      <Link
                        to={`/request-quote?service=${encodeURIComponent(pkg.category)}&package=${encodeURIComponent(pkg.id)}`}
                        className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                          pkg.featured
                            ? 'bg-[#16834A] hover:bg-[#116438] text-white'
                            : 'bg-white border border-[#16834A] text-[#16834A] hover:bg-[#E8F5EC]'
                        }`}
                      >
                        <span>{hasFixedPrice ? 'Select Package' : 'Request Custom Quote'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-[#E3EBE5] bg-white p-10 text-center">
              <p className="text-sm text-[#64756B]">
                No packages are currently active. You can still submit a custom project quotation request.
              </p>
            </div>
          )}

          {/* Package Comparison Table */}
          {activePackages.length > 0 && (
            <div className="mt-16">
              <h2 className="font-display text-2xl font-bold text-[#17231C] mb-6">
                Package Comparison
              </h2>
              <div className="overflow-x-auto rounded-xl border border-[#E3EBE5] bg-white shadow-xs">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#E3EBE5] bg-[#E8F5EC]/60">
                      <th className="py-3.5 px-4 font-semibold text-[#116438]">Package</th>
                      <th className="py-3.5 px-4 font-semibold text-[#116438]">Starting Price</th>
                      <th className="py-3.5 px-4 font-semibold text-[#116438]">Scope / Pages</th>
                      <th className="py-3.5 px-4 font-semibold text-[#116438]">Revisions</th>
                      <th className="py-3.5 px-4 font-semibold text-[#116438]">Estimated Delivery</th>
                      <th className="py-3.5 px-4 font-semibold text-[#116438]">Post-Launch Support</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3EBE5]">
                    {activePackages.map((pkg) => (
                      <tr key={pkg.id} className="hover:bg-[#F7FAF7] transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-[#17231C] whitespace-nowrap">
                          {pkg.title}
                        </td>
                        <td className="py-3.5 px-4 font-mono-tabular font-semibold text-[#16834A] whitespace-nowrap">
                          {formatCurrency(pkg.startingPrice, pkg.currency)}
                        </td>
                        <td className="py-3.5 px-4 text-[#64756B]">{pkg.pagesCount}</td>
                        <td className="py-3.5 px-4 text-[#64756B]">{pkg.revisions}</td>
                        <td className="py-3.5 px-4 text-[#64756B] whitespace-nowrap">{pkg.deliveryEstimate}</td>
                        <td className="py-3.5 px-4 text-[#64756B]">{pkg.supportDuration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Add-on Services */}
          <div className="mt-16">
            <h2 className="font-display text-2xl font-bold text-[#17231C] mb-2">
              Optional Add-On Services
            </h2>
            <p className="text-sm text-[#64756B] mb-6">
              Add-on capabilities can be included in any custom quote or added later as your requirements grow.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {addons.map((addon) => (
                <div
                  key={addon.id}
                  className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-4 flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-[#17231C]">
                      {addon.name}
                    </h3>
                    <p className="mt-1.5 text-xs text-[#64756B] leading-relaxed">
                      {addon.description}
                    </p>
                  </div>
                  <p className="mt-3 pt-2 border-t border-[#E3EBE5] text-xs font-semibold text-[#16834A]">
                    {addon.pricingNote || 'Request Pricing'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Hosting Options */}
          <div className="mt-16">
            <h2 className="font-display text-2xl font-bold text-[#17231C] mb-2">
              Hosting &amp; Domain Ownership Options
            </h2>
            <p className="text-sm text-[#64756B] mb-6">
              We support full transparency around who holds your domain, hosting infrastructure, and renewal responsibilities.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-[#E8F5EC] text-[#16834A] flex items-center justify-center">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#16834A]">Option A</p>
                    <h3 className="font-display text-lg font-bold text-[#17231C]">
                      Customer-Managed Hosting
                    </h3>
                  </div>
                </div>
                <ul className="space-y-2.5 text-sm text-[#64756B]">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16834A] shrink-0 mt-0.5" />
                    <span>Customer purchases domain and hosting under their own account.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16834A] shrink-0 mt-0.5" />
                    <span>DreamTech Kashmir Solutions assists with deployment and DNS setup.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16834A] shrink-0 mt-0.5" />
                    <span>Customer retains direct hosting ownership and billing responsibility.</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-[#E8F5EC] text-[#16834A] flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#16834A]">Option B</p>
                    <h3 className="font-display text-lg font-bold text-[#17231C]">
                      DreamTech-Managed Hosting
                    </h3>
                  </div>
                </div>
                <ul className="space-y-2.5 text-sm text-[#64756B]">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16834A] shrink-0 mt-0.5" />
                    <span>DreamTech manages hosting infrastructure and server configuration.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16834A] shrink-0 mt-0.5" />
                    <span>Hosting charges are quoted separately from one-time development fees.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#16834A] shrink-0 mt-0.5" />
                    <span>Domain and hosting renewal dates are tracked with clear ownership records.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Optional Maintenance Plans */}
          <div className="mt-16">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <h2 className="font-display text-2xl font-bold text-[#17231C]">
                  Optional Maintenance Plans
                </h2>
                <p className="mt-1 text-sm text-[#64756B]">
                  Maintenance is strictly optional and never bundled silently into development packages.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {maintenancePlans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-lg font-bold text-[#17231C]">
                        {plan.name}
                      </h3>
                      <span className="text-xs text-[#64756B]">
                        {plan.billingCycle}
                      </span>
                    </div>
                    <p className="mt-3 font-display text-xl font-bold text-[#16834A] tabular-nums">
                      {formatCurrency(plan.price, plan.currency)}
                    </p>

                    <dl className="mt-5 space-y-2.5 text-xs">
                      <div>
                        <dt className="text-[#64756B]">Backups</dt>
                        <dd className="font-medium text-[#17231C]">{plan.backupFrequency}</dd>
                      </div>
                      <div>
                        <dt className="text-[#64756B]">Security Checks</dt>
                        <dd className="font-medium text-[#17231C]">{plan.securityChecks}</dd>
                      </div>
                      <div>
                        <dt className="text-[#64756B]">Bug-Fix Support</dt>
                        <dd className="font-medium text-[#17231C]">{plan.bugFixSupport}</dd>
                      </div>
                      <div>
                        <dt className="text-[#64756B]">Content Updates</dt>
                        <dd className="font-medium text-[#17231C]">{plan.contentUpdateAllowance}</dd>
                      </div>
                      <div>
                        <dt className="text-[#64756B]">Performance Monitoring</dt>
                        <dd className="font-medium text-[#17231C]">{plan.performanceMonitoring}</dd>
                      </div>
                      <div>
                        <dt className="text-[#64756B]">Response Time</dt>
                        <dd className="font-medium text-[#17231C]">{plan.responseTime}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-[#E3EBE5] bg-[#E8F5EC]/60 p-5 flex items-start gap-3">
              <Info className="w-5 h-5 text-[#16834A] shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-[#17231C]/80 leading-relaxed">
                <strong className="text-[#116438]">Maintenance Scope Policy:</strong>{' '}
                Ongoing maintenance covers backups, security checks, minor content updates, and bug resolution within the agreed plan. Major new features, complete redesigns, third-party SaaS/API subscriptions, and new development modules require separate quotations and customer approval.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
