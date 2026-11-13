import { Link } from 'react-router-dom';
import {
  Globe,
  Briefcase,
  UserSquare2,
  LayoutTemplate,
  ShoppingBag,
  UtensilsCrossed,
  GraduationCap,
  Building2,
  Newspaper,
  CalendarCheck,
  Code2,
  Palette,
  RefreshCw,
  Server,
  ShieldCheck,
  Search,
  Gauge,
  Check,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { SUPPORTING_SERVICES } from '../../data/seedData.js';
import SEO from '../../components/common/SEO.jsx';
import Breadcrumbs from '../../components/common/Breadcrumbs.jsx';
import { ROUTE_SEO } from '../../seo/seoConfig.js';
import { buildServiceCatalogSchema } from '../../seo/structuredData.js';
import { formatCurrency } from '../../utils/orderUtils.js';

const ICON_MAP = {
  Globe,
  Briefcase,
  UserSquare2,
  LayoutTemplate,
  ShoppingBag,
  UtensilsCrossed,
  GraduationCap,
  Building2,
  Newspaper,
  CalendarCheck,
  Code2,
  Palette,
  RefreshCw,
  Server,
  ShieldCheck,
  Search,
  Gauge,
};

export default function ServicesPage() {
  const { services, settings } = useApp();

  return (
    <>
      <SEO
        settings={settings}
        extraSchemas={[buildServiceCatalogSchema(services)]}
      />

      <section className="border-b border-[#E3EBE5] bg-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={ROUTE_SEO['/services'].breadcrumbs} />
          <div className="max-w-3xl">
            <p className="text-xs font-semibold text-[#16834A]">
              Website Design &amp; Development · DTKS Kashmir
            </p>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#17231C]">
              Website Design &amp; Development Services
            </h1>
            <p className="mt-4 text-base text-[#64756B] leading-relaxed">
              DreamTech Kashmir Solutions (DTKS) focuses exclusively on designing, developing, redesigning, and maintaining responsive websites across Srinagar, Kashmir, and Jammu &amp; Kashmir. Browse our website categories below,{' '}
              <Link to="/packages" className="text-[#16834A] font-medium hover:underline">
                view website packages &amp; pricing
              </Link>
              , explore{' '}
              <Link to="/portfolio" className="text-[#16834A] font-medium hover:underline">
                our website portfolio
              </Link>
              , or{' '}
              <Link to="/contact" className="text-[#16834A] font-medium hover:underline">
                contact DTKS
              </Link>{' '}
              for a consultation.
            </p>
          </div>
        </div>
      </section>

      <section className="py-14 bg-[#F7FAF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {services.map((service, idx) => {
            const Icon = ICON_MAP[service.iconName] || Globe;
            const priceText = formatCurrency(service.startingPrice, service.currency || 'INR');

            return (
              <article
                key={service.id}
                id={service.slug}
                className="scroll-mt-24 rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6 sm:p-8"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  <div className="lg:col-span-7">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-[#E8F5EC] text-[#16834A] flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-mono-tabular text-xs text-[#64756B]">
                          Service {String(idx + 1).padStart(2, '0')}
                        </span>
                        <h2 className="font-display text-xl sm:text-2xl font-bold text-[#17231C]">
                          {service.title}
                        </h2>
                      </div>
                    </div>

                    <p className="text-sm sm:text-base text-[#64756B] leading-relaxed">
                      {service.description}
                    </p>

                    <div className="mt-6">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64756B] mb-3">
                        Features &amp; Deliverables
                      </h3>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {(service.features || []).map((feat) => (
                          <li key={feat} className="flex items-start gap-2 text-sm text-[#17231C]">
                            <Check className="w-4 h-4 text-[#16834A] shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="lg:col-span-5 lg:border-l lg:border-[#E3EBE5] lg:pl-8 space-y-5">
                    <div>
                      <p className="text-xs text-[#64756B]">Pricing Model</p>
                      <p className="mt-1 font-display text-xl font-bold text-[#116438] tabular-nums">
                        {service.startingPrice ? `Starting from ${priceText}` : 'Request a Quote'}
                      </p>
                      <p className="mt-1 text-xs text-[#64756B]">
                        Final quote confirmed after reviewing pages, design needs, and integrations.
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#64756B] mb-1.5">Technologies Used</p>
                      <p className="text-sm font-medium text-[#17231C]">
                        {(service.technologies || []).join(' · ')}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-[#64756B] mb-1.5">Suitable For</p>
                      <p className="text-sm text-[#17231C]">
                        {(service.suitableFor || []).join(' · ')}
                      </p>
                    </div>

                    <div className="pt-2">
                      <Link
                        to={`/request-quote?service=${encodeURIComponent(service.orderCategory)}`}
                        className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors whitespace-nowrap"
                      >
                        <span>Order {service.orderCategory}</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Supporting Website Services */}
      <section id="supporting-services" className="scroll-mt-20 py-14 border-t border-[#E3EBE5] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <p className="text-xs font-semibold text-[#16834A]">
              End-to-End Site Care
            </p>
            <h2 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold text-[#17231C] tracking-tight">
              Supporting Website Services
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#64756B]">
              Include any of these supporting services with a new website build or request them for an existing website.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {SUPPORTING_SERVICES.map((sup) => {
              const Icon = ICON_MAP[sup.iconName] || Globe;
              return (
                <div
                  key={sup.id}
                  className="rounded-xl border border-[#E3EBE5] bg-[#F7FAF7] p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="w-9 h-9 rounded-lg bg-[#E8F5EC] text-[#16834A] flex items-center justify-center mb-3">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-display text-base font-bold text-[#17231C]">
                      {sup.title}
                    </h3>
                    <p className="mt-1.5 text-xs text-[#64756B] leading-relaxed">
                      {sup.description}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#E3EBE5]">
                    <Link
                      to="/request-quote?service=Custom%20Website%20Development"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#16834A] hover:text-[#116438] hover:underline"
                    >
                      <span>Include in Quote</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
