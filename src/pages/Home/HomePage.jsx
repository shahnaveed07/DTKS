import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Layers, Shield, Sliders, Headphones, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import SEO from '../../components/common/SEO.jsx';
import { ROUTE_SEO } from '../../seo/seoConfig.js';
import ImageWithFallback from '../../components/common/ImageWithFallback.jsx';
import ServiceCard from '../../components/cards/ServiceCard.jsx';
import ProjectCard from '../../components/cards/ProjectCard.jsx';

const PROCESS_STEPS = [
  { step: '01', title: 'Discuss Requirements', summary: 'Clarify business objectives, user journeys, and technical scope.' },
  { step: '02', title: 'Planning & Quotation', summary: 'Receive a structured scope breakdown, timeline, and transparent quote.' },
  { step: '03', title: 'UI/UX & Design', summary: 'Define interface architecture, responsive layouts, and design feedback.' },
  { step: '04', title: 'Development', summary: 'Build modular, accessible, and maintainable frontend and backend code.' },
  { step: '05', title: 'Testing & Review', summary: 'Validate workflows, responsiveness, edge cases, and browser reliability.' },
  { step: '06', title: 'Deployment & Handover', summary: 'Launch on customer-managed or DreamTech-managed hosting with documentation.' },
  { step: '07', title: 'Optional Maintenance', summary: 'Select an optional ongoing backup, monitoring, and update plan.' },
];

const WHY_CHOOSE_US = [
  {
    icon: Sliders,
    title: 'Tailored Website Architecture',
    description: 'Every website is structured around your actual business goals and audience journey rather than rigid generic templates.',
  },
  {
    icon: Layers,
    title: 'Responsive Web Design',
    description: 'Consistent usability across desktops, laptops, tablets, and mobile phones with clean layouts and touch-ready controls.',
  },
  {
    icon: CheckCircle2,
    title: 'Transparent Pricing',
    description: 'Clear starting website packages combined with itemized custom quotations so you know what is included before work begins.',
  },
  {
    icon: Shield,
    title: 'Clean, Scalable Code',
    description: 'Modular frontend architecture, SEO-ready markup, and fast asset delivery designed for long-term site growth.',
  },
  {
    icon: Headphones,
    title: 'Hosting & Maintenance Clarity',
    description: 'Dedicated post-launch bug coverage, transparent domain/hosting ownership, and optional ongoing maintenance plans.',
  },
  {
    icon: Users,
    title: 'Customer-Focused Approach',
    description: 'Direct communication from initial discovery through launch handover, with complete ownership of your domain and site assets.',
  },
];

export default function HomePage() {
  const { settings, services, portfolio } = useApp();

  const verifiedHighlights = (settings.highlights || []).filter(
    (item) => item.verified && String(item.value || '').trim().length > 0
  );

  const featuredProjects = portfolio
    .filter((p) => p.published && p.featured)
    .slice(0, 3);

  const hasSampleFeatured = featuredProjects.some((p) => p.isSample);

  return (
    <>
      <SEO
        fullTitle={ROUTE_SEO['/'].title}
        description={ROUTE_SEO['/'].description}
        settings={settings}
      />

      {/* Section 2: Hero Section */}
      <section className="relative border-b border-[#E3EBE5] bg-gradient-to-br from-[#FFFFFF] via-[#FFFFFF] to-[#E8F5EC]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-semibold tracking-wide text-[#16834A] mb-3">
                DreamTech Kashmir Solutions (DTKS) · Website Development in Kashmir
              </p>
              <h1
                className="font-display font-bold tracking-tight text-[#17231C] leading-[1.12] max-w-2xl"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', textWrap: 'balance' }}
              >
                {settings.tagline || 'Modern Websites Built for Growth and Trust.'}
              </h1>
              <p className="mt-5 text-base sm:text-lg text-[#64756B] leading-relaxed max-w-xl">
                {settings.heroSupportText}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/request-quote"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white shadow-xs transition-colors whitespace-nowrap"
                >
                  <span>Order a Website</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/portfolio"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg bg-white border border-[#16834A] text-[#16834A] hover:bg-[#E8F5EC] transition-colors whitespace-nowrap"
                >
                  <span>Explore Website Work</span>
                </Link>
              </div>

              <div className="mt-8 pt-6 border-t border-[#E3EBE5] flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[#64756B]">
                <span>Business &amp; Portfolio Websites</span>
                <span aria-hidden="true">·</span>
                <span>E-Commerce &amp; Booking Websites</span>
                <span aria-hidden="true">·</span>
                <Link to="/track-order" className="text-[#16834A] hover:text-[#116438] hover:underline font-medium whitespace-nowrap">
                  Track an Existing Request
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6 flex">
              <div className="w-full rounded-xl overflow-hidden border border-[#E3EBE5] bg-[#F7FAF7] shadow-sm aspect-16/9 lg:aspect-auto lg:min-h-[380px]">
                <ImageWithFallback
                  src="/assets/images/dreamtech-kashmir-website-studio.jpg"
                  alt="DreamTech Kashmir Solutions (DTKS) website design and development studio"
                  fallbackTitle="DTKS Website Studio"
                  width={1376}
                  height={768}
                  loading="eager"
                  fetchPriority="high"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Company Highlights (only verified configured metrics) */}
          {verifiedHighlights.length > 0 && (
            <div className="mt-12 pt-8 border-t border-[#E3EBE5]">
              <div
                className={`grid gap-6 ${
                  verifiedHighlights.length === 1
                    ? 'grid-cols-1'
                    : verifiedHighlights.length === 2
                    ? 'grid-cols-2 max-w-md'
                    : verifiedHighlights.length === 3
                    ? 'grid-cols-1 sm:grid-cols-3'
                    : 'grid-cols-2 sm:grid-cols-4'
                }`}
              >
                {verifiedHighlights.map((metric) => (
                  <div key={metric.id} className="space-y-1">
                    <p className="font-display text-2xl sm:text-3xl font-bold text-[#116438] tabular-nums">
                      {metric.value}
                    </p>
                    <p className="text-xs sm:text-sm text-[#64756B]">
                      {metric.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section 4: Services Overview */}
      <section className="py-16 lg:py-20 bg-[#F7FAF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17231C] tracking-tight">
                Website Design &amp; Development Services
              </h2>
              <p className="mt-2 text-sm sm:text-base text-[#64756B] max-w-2xl">
                Dedicated website solutions across 10 specialized categories—from corporate sites and landing pages to e-commerce and booking portals.
              </p>
            </div>
            <Link
              to="/services"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#16834A] hover:text-[#116438] hover:underline whitespace-nowrap shrink-0"
            >
              <span>View All Services</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {services.map((service, idx) => (
              <ServiceCard key={service.id} service={service} index={idx} />
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-[#E3EBE5] bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs sm:text-sm text-[#64756B]">
              <span className="font-semibold text-[#17231C]">Supporting Website Services:</span>{' '}
              Website UI/UX Design · Website Redesign · Website Hosting Setup · Domain Registration Assistance · Website Maintenance · SEO Setup · Speed Optimization
            </div>
            <Link
              to="/services#supporting-services"
              className="text-xs font-semibold text-[#16834A] hover:text-[#116438] hover:underline whitespace-nowrap shrink-0"
            >
              Explore Supporting Services
            </Link>
          </div>
        </div>
      </section>

      {/* Section 5: Featured Projects */}
      <section className="py-16 lg:py-20 border-t border-[#E3EBE5] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17231C] tracking-tight">
                Featured Websites &amp; Showcases
              </h2>
              <p className="mt-2 text-sm sm:text-base text-[#64756B] max-w-2xl">
                {hasSampleFeatured
                  ? 'Showing editable sample website showcases. Verified client websites added in Admin appear here automatically.'
                  : 'Selected business, portfolio, e-commerce, and educational websites crafted by our team.'}
              </p>
            </div>
            <Link
              to="/portfolio"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-white border border-[#16834A] text-[#16834A] hover:bg-[#E8F5EC] transition-colors whitespace-nowrap shrink-0"
            >
              <span>View All Projects</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {featuredProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[#E3EBE5] bg-[#F7FAF7] p-10 text-center">
              <p className="text-sm text-[#64756B]">
                No featured projects are currently published. Add or feature projects from the Admin Portfolio panel.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Section 6: How We Work */}
      <section className="py-16 lg:py-20 border-t border-[#E3EBE5] bg-[#F7FAF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17231C] tracking-tight">
              How We Work
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#64756B]">
              A transparent, seven-stage delivery workflow from initial requirement discovery to deployment and optional care.
            </p>
          </div>

          {/* Horizontal Timeline on Desktop / Vertical Timeline on Mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 lg:gap-4 relative">
            {PROCESS_STEPS.map((item, idx) => (
              <div
                key={item.step}
                className="relative pl-8 lg:pl-0 lg:pt-8 border-l lg:border-l-0 lg:border-t border-[#E3EBE5]"
              >
                <span className="absolute left-[-11px] top-0 lg:left-0 lg:top-[-11px] w-5 h-5 rounded-full bg-[#16834A] text-white text-[10px] font-mono-tabular font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <div className="lg:pr-3">
                  <p className="font-mono-tabular text-xs text-[#16834A] font-medium">
                    Step {item.step}
                  </p>
                  <h3 className="mt-1 font-display text-sm font-semibold text-[#17231C]">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-[#64756B] leading-relaxed">
                    {item.summary}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 7: Why Choose Us */}
      <section className="py-16 lg:py-20 border-t border-[#E3EBE5] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17231C] tracking-tight">
              Why Choose DreamTech Kashmir Solutions (DTKS)
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#64756B]">
              Practical website engineering standards focused on speed, clear pricing, and long-term maintainability across Srinagar and Jammu &amp; Kashmir.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {WHY_CHOOSE_US.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6 transition-colors hover:border-[#16834A]/60"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#E8F5EC] text-[#16834A] flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-base font-semibold text-[#17231C]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-[#64756B] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 8: Light Green Call-to-Action Band */}
      <section className="py-16 lg:py-20 border-t border-[#E3EBE5] bg-[#E8F5EC] text-[#17231C]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2
            className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-[#116438] mx-auto max-w-2xl"
            style={{ textWrap: 'balance' }}
          >
            Ready to Launch Your Website? Let&apos;s Build It Together.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[#17231C]/80 max-w-xl mx-auto">
            Share your website goals, required pages, and preferred launch date through our structured quotation builder.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/request-quote"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white shadow-xs transition-colors whitespace-nowrap"
            >
              <span>Request a Website Quote</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/packages"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-lg bg-white border border-[#16834A] text-[#16834A] hover:bg-[#F7FAF7] transition-colors whitespace-nowrap"
            >
              <span>View Packages</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
