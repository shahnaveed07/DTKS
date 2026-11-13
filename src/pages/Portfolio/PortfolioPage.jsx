import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { PORTFOLIO_CATEGORIES } from '../../data/seedData.js';
import SEO from '../../components/common/SEO.jsx';
import { buildPortfolioSchema } from '../../seo/structuredData.js';
import PageHead from '../../components/common/PageHead.jsx';
import ProjectCard from '../../components/cards/ProjectCard.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

export default function PortfolioPage() {
  const { portfolio } = useApp();
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

  return (
    <>
      <SEO extraSchemas={[portfolioSchema]} />

      <PageHead
        eyebrow="Website Development Portfolio"
        title="Websites & Digital Platforms Built for Modern Businesses"
        description="Explore verified website design and web application projects delivered by DreamTech Kashmir Solutions (DTKS)."
      />

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {publishedProjects.length > 0 ? (
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
          ) : (
            <EmptyState
              title="Our project portfolio is being updated."
              description="We only showcase verified client websites and approved production builds. Contact us or request a quote to discuss your website requirements."
              actionLabel="Request a Website Quote"
              onAction={() => navigate('/request-quote')}
            />
          )}
        </div>
      </section>
    </>
  );
}
