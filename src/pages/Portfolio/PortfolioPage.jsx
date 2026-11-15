import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { PORTFOLIO_CATEGORIES } from '../../data/seedData.js';
import SEO from '../../components/common/SEO.jsx';
import Breadcrumbs from '../../components/common/Breadcrumbs.jsx';
import { ROUTE_SEO } from '../../seo/seoConfig.js';
import { buildPortfolioSchema } from '../../seo/structuredData.js';
import ProjectCard from '../../components/cards/ProjectCard.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import {
  ResourceErrorNotice,
  ResourceLoadingNotice,
} from '../../components/common/ResourceNotice.jsx';

export default function PortfolioPage() {
  const {
    portfolio,
    isLoading,
    resourceStatus,
    resourceErrors,
    refreshAll,
    dataAdapterMode,
  } = useApp();
  const isApiMode = dataAdapterMode === 'api';
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const publishedProjects = useMemo(
    () => portfolio.filter((p) => p.published && !p.isSample),
    [portfolio]
  );

  const filteredProjects = useMemo(() => {
    if (selectedCategory === 'All') return publishedProjects;
    return publishedProjects.filter((p) => p.category === selectedCategory);
  }, [publishedProjects, selectedCategory]);

  const portfolioSchema = useMemo(
    () => buildPortfolioSchema(publishedProjects),
    [publishedProjects]
  );

  const portfolioLoading =
    isApiMode && (isLoading || resourceStatus?.portfolio === 'loading') && portfolio.length === 0;
  const portfolioError = isApiMode ? resourceErrors?.portfolio : null;

  return (
    <>
      <SEO extraSchemas={[portfolioSchema]} />

      <section className="border-b border-[#E3EBE5] bg-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={ROUTE_SEO['/portfolio'].breadcrumbs} />
          <div className="max-w-3xl">
            <p className="text-xs font-semibold text-[#16834A]">
              Website Development Portfolio
            </p>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#17231C]">
              Websites &amp; Digital Platforms Built for Modern Businesses
            </h1>
            <p className="mt-4 text-base text-[#64756B] leading-relaxed">
              Explore verified website design and web application projects delivered by DreamTech Kashmir Solutions (DTKS).
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <ResourceErrorNotice
            title="Failed to load portfolio projects"
            message={portfolioError}
            onRetry={() => refreshAll()}
            retrying={isLoading}
          />

          {portfolioLoading ? (
            <ResourceLoadingNotice label="Loading verified portfolio projects..." />
          ) : publishedProjects.length > 0 ? (
            <>
              {/* Category Filter */}
              <div
                className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 border-b border-[#E3EBE5]"
                role="tablist"
                aria-label="Filter portfolio by website category"
              >
                {PORTFOLIO_CATEGORIES.map((category) => {
                  const active = selectedCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-[#16834A] text-white'
                          : 'bg-[#F7FAF7] text-[#64756B] hover:text-[#17231C] border border-[#E3EBE5]'
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>

              {filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {filteredProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No published projects in this category yet"
                  description="Select another website category or view all published portfolio items."
                  actionLabel="Show All Categories"
                  onAction={() => setSelectedCategory('All')}
                />
              )}
            </>
          ) : !portfolioError ? (
            <EmptyState
              title="Our project portfolio is being updated."
              description="We only showcase verified client websites and approved production builds. Contact us or request a quote to discuss your website requirements."
              actionLabel="Request a Website Quote"
              onAction={() => navigate('/request-quote')}
            />
          ) : null}
        </div>
      </section>
    </>
  );
}
