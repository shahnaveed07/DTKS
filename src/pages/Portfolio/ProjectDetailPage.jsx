import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Github,
  Video,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import SEO from '../../components/common/SEO.jsx';
import { buildProjectSchema } from '../../seo/structuredData.js';
import ImageWithFallback from '../../components/common/ImageWithFallback.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

export default function ProjectDetailPage() {
  const { slug } = useParams();
  const { portfolio, settings } = useApp();
  const project = portfolio.find((p) => p.slug === slug);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <SEO noindex fullTitle="Project Not Found | DreamTech Kashmir Solutions (DTKS)" settings={settings} />
        <EmptyState
          title="Project not found"
          description="The requested portfolio entry could not be found or may have been unpublished."
          actionLabel="Back to Portfolio"
          onAction={() => window.history.back()}
        />
      </div>
    );
  }

  const gallery =
    project.gallery && project.gallery.length > 0
      ? project.gallery
      : [project.coverImage].filter(Boolean);

  const currentImage = gallery[activeImageIndex] || project.coverImage;

  const handlePrev = () => {
    setActiveImageIndex((prev) => (prev === 0 ? gallery.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveImageIndex((prev) => (prev === gallery.length - 1 ? 0 : prev + 1));
  };

  return (
    <>
      <SEO
        fullTitle={`${project.title} | DTKS Portfolio`}
        description={project.shortOverview || project.description}
        noindex={!project.published}
        ogImage={project.coverImage}
        ogImageAlt={`${project.title} — ${project.category} by DreamTech Kashmir Solutions (DTKS)`}
        breadcrumbs={[
          { name: 'Home', path: '/' },
          { name: 'Portfolio', path: '/portfolio' },
          { name: project.title, path: `/portfolio/${project.slug}` },
        ]}
        extraSchemas={[buildProjectSchema(project)]}
        settings={settings}
      />

      <div className="bg-[#F7FAF7] py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/portfolio"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#64756B] hover:text-[#16834A] mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Portfolio</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2 text-xs text-[#64756B]">
            <span className="font-semibold text-[#16834A]">
              {project.category}
            </span>
            <span aria-hidden="true">·</span>
            <span>{project.status || (project.isSample ? 'Sample Showcase' : 'Completed')}</span>
            {project.completionDate && (
              <>
                <span aria-hidden="true">·</span>
                <span>Completed {project.completionDate}</span>
              </>
            )}
          </div>

          <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#17231C]">
            {project.title}
          </h1>
          <p className="mt-4 text-base text-[#64756B] max-w-3xl leading-relaxed">
            {project.description}
          </p>

          {/* Image Carousel */}
          <div className="mt-8">
            <div className="relative rounded-xl overflow-hidden border border-[#E3EBE5] bg-white shadow-xs aspect-16/9">
              <ImageWithFallback
                src={currentImage}
                alt={`${project.title} screenshot ${activeImageIndex + 1} by DreamTech Kashmir Solutions`}
                fallbackTitle={project.title}
                width={1200}
                height={896}
                loading="eager"
                fetchPriority="high"
                className="w-full h-full object-cover"
              />
              {gallery.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Previous project image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#116438]/85 text-white hover:bg-[#116438] flex items-center justify-center transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Next project image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#116438]/85 text-white hover:bg-[#116438] flex items-center justify-center transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {gallery.length > 1 && (
              <div className="mt-3 flex items-center gap-3 overflow-x-auto pb-1">
                {gallery.map((imgUrl, idx) => (
                  <button
                    key={`${imgUrl}-${idx}`}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    aria-label={`Select screenshot ${idx + 1}`}
                    className={`w-24 aspect-4/3 rounded-lg overflow-hidden border-2 shrink-0 transition-colors ${
                      idx === activeImageIndex
                        ? 'border-[#16834A]'
                        : 'border-[#E3EBE5] opacity-75 hover:opacity-100'
                    }`}
                  >
                    <ImageWithFallback
                      src={imgUrl}
                      alt={`${project.title} thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Case Study Breakdown */}
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6">
                <h2 className="font-display text-lg font-bold text-[#17231C]">
                  Problem Addressed
                </h2>
                <p className="mt-2 text-sm text-[#64756B] leading-relaxed">
                  {project.problemAddressed || 'Problem statement configurable in Admin Portfolio.'}
                </p>
              </div>

              <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6">
                <h2 className="font-display text-lg font-bold text-[#17231C]">
                  Solution Implemented
                </h2>
                <p className="mt-2 text-sm text-[#64756B] leading-relaxed">
                  {project.solutionImplemented || 'Solution summary configurable in Admin Portfolio.'}
                </p>
              </div>

              {project.keyFeatures && project.keyFeatures.length > 0 && (
                <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6">
                  <h2 className="font-display text-lg font-bold text-[#17231C] mb-4">
                    Key Features
                  </h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {project.keyFeatures.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-sm text-[#17231C]">
                        <Check className="w-4 h-4 text-[#16834A] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <aside className="lg:col-span-4 space-y-6">
              <div className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6 space-y-5">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64756B]">
                    Technologies Used
                  </h3>
                  <p className="mt-2 text-sm font-medium text-[#17231C]">
                    {(project.technologies || []).join(' · ')}
                  </p>
                </div>

                {(project.liveUrl || project.githubUrl || project.demoVideoUrl) && (
                  <div className="pt-4 border-t border-[#E3EBE5] space-y-2.5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#64756B]">
                      Project Links
                    </h3>
                    {project.liveUrl && (
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-medium text-[#16834A] hover:text-[#116438] hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Live Website</span>
                      </a>
                    )}
                    {project.githubUrl && (
                      <a
                        href={project.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-medium text-[#16834A] hover:text-[#116438] hover:underline"
                      >
                        <Github className="w-4 h-4" />
                        <span>Public Repository</span>
                      </a>
                    )}
                    {project.demoVideoUrl && (
                      <a
                        href={project.demoVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm font-medium text-[#16834A] hover:text-[#116438] hover:underline"
                      >
                        <Video className="w-4 h-4" />
                        <span>Watch Demo</span>
                      </a>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t border-[#E3EBE5]">
                  <p className="text-xs text-[#64756B] mb-3">
                    Planning a similar platform for your organization?
                  </p>
                  <Link
                    to="/request-quote"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#16834A] hover:bg-[#116438] text-white transition-colors"
                  >
                    <span>Request a Similar Project</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
