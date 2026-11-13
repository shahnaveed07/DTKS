import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Code2, ShieldCheck, Layers } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import SEO from '../../components/common/SEO.jsx';
import Breadcrumbs from '../../components/common/Breadcrumbs.jsx';
import { ROUTE_SEO } from '../../seo/seoConfig.js';
import ImageWithFallback from '../../components/common/ImageWithFallback.jsx';

const PRINCIPLES = [
  {
    icon: Code2,
    title: 'Clean, Maintainable Engineering',
    description: 'We avoid bloated codebases and short-lived hacks. Every system is organized into modular components and clean data layers so future features can be added without a full rewrite.',
  },
  {
    icon: ShieldCheck,
    title: 'Honest Scoping & Asset Ownership',
    description: 'Clients retain complete clarity on pricing, domain ownership, hosting bills, and maintenance boundaries—no hidden lock-in or surprise fees.',
  },
  {
    icon: Layers,
    title: 'Built for Web Performance & Operations',
    description: 'From business websites to e-commerce storefronts and appointment portals, we focus on clear workflows that earn visitor trust and convert inquiries.',
  },
];

export default function AboutPage() {
  const { settings } = useApp();

  return (
    <>
      <SEO settings={settings} />

      <section className="border-b border-[#E3EBE5] bg-white py-14 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={ROUTE_SEO['/about'].breadcrumbs} />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-center">
              <p className="text-xs font-semibold text-[#16834A]">
                About {settings.companyName} (DTKS)
              </p>
              <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#17231C]">
                Practical Website Engineering Rooted in Clarity and Trust
              </h1>
              <p className="mt-5 text-base text-[#64756B] leading-relaxed">
                {settings.companyName} (DTKS)—often searched as DreamTech Kashmir, DreamTechKashmir, or DTKS Kashmir—is a dedicated website design and development company serving businesses, institutions, hospitality brands, and professionals in Srinagar, Kashmir, Jammu &amp; Kashmir, and beyond.
              </p>
              <p className="mt-4 text-base text-[#64756B] leading-relaxed">
                Whether an organization needs a corporate website, personal portfolio, campaign landing page, e-commerce storefront, website redesign, or ongoing maintenance, we build each site with responsive UI/UX, transparent pricing, and clear asset ownership. Explore our{' '}
                <Link to="/services" className="text-[#16834A] hover:text-[#116438] font-medium hover:underline">
                  website development services
                </Link>
                ,{' '}
                <Link to="/packages" className="text-[#16834A] hover:text-[#116438] font-medium hover:underline">
                  packages &amp; pricing
                </Link>
                ,{' '}
                <Link to="/portfolio" className="text-[#16834A] hover:text-[#116438] font-medium hover:underline">
                  website portfolio
                </Link>
                , or{' '}
                <Link to="/team" className="text-[#16834A] hover:text-[#116438] font-medium hover:underline">
                  meet our team
                </Link>.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/request-quote"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white shadow-xs transition-colors whitespace-nowrap"
                >
                  <span>Start Your Project</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-white border border-[#16834A] text-[#16834A] hover:bg-[#E8F5EC] transition-colors whitespace-nowrap"
                >
                  <span>Contact DTKS</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 flex">
              <div className="w-full rounded-xl overflow-hidden border border-[#E3EBE5] bg-[#F7FAF7] shadow-sm aspect-4/3 lg:aspect-auto">
                <ImageWithFallback
                  src="/assets/images/dreamtech-kashmir-website-studio.jpg"
                  alt="DreamTech Kashmir Solutions (DTKS) website design and engineering workspace"
                  fallbackTitle="DreamTech Studio"
                  width={1376}
                  height={768}
                  loading="eager"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 bg-[#F7FAF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold text-[#17231C] mb-8">
            How We Approach Every Engagement
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRINCIPLES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#E8F5EC] text-[#16834A] flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-[#17231C]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-[#64756B] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-12 rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold text-[#17231C] mb-4">
              Commitments We Stand By
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-[#64756B]">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#16834A] shrink-0 mt-0.5" />
                <span>Clear separation between development fees, hosting costs, and optional maintenance plans.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#16834A] shrink-0 mt-0.5" />
                <span>Responsive, accessible interfaces verified across mobile, tablet, and desktop screens.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#16834A] shrink-0 mt-0.5" />
                <span>Structured milestone reviews and transparent quotation documentation prior to build kickoff.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#16834A] shrink-0 mt-0.5" />
                <span>Clean, API-ready frontend architectures built for straightforward future scaling.</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
