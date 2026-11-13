import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FileQuestion } from 'lucide-react';
import SEO from '../../components/common/SEO.jsx';
import { useApp } from '../../context/AppContext.jsx';

export default function NotFoundPage() {
  const { settings } = useApp();

  return (
    <>
      <SEO
        noindex
        fullTitle="Page Not Found | DreamTech Kashmir Solutions (DTKS)"
        description="The requested page could not be found on DreamTech Kashmir Solutions (DTKS)."
        settings={settings}
      />
      <section className="py-20 bg-[#F7FAF7]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-8 sm:p-10">
            <div className="w-12 h-12 rounded-xl bg-[#E8F5EC] text-[#16834A] flex items-center justify-center mx-auto mb-5">
              <FileQuestion className="w-6 h-6" />
            </div>
            <p className="font-mono-tabular text-xs font-semibold text-[#16834A]">404 · Page Not Found</p>
            <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-[#17231C]">
              We Couldn&apos;t Find That Page
            </h1>
            <p className="mt-3 text-sm text-[#64756B] leading-relaxed">
              The link may be outdated or the page address may have changed. Explore DreamTech Kashmir Solutions (DTKS) website services, packages, or portfolio below.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Home</span>
              </Link>
              <Link
                to="/services"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg border border-[#16834A] text-[#16834A] hover:bg-[#E8F5EC] transition-colors"
              >
                <span>View Services</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
