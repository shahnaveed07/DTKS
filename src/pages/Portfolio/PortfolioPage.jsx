import { useState, useMemo } from 'react';
import { Search, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { PORTFOLIO_CATEGORIES } from '../../data/seedData.js';
import PageHead from '../../components/common/PageHead.jsx';
import ProjectCard from '../../components/cards/ProjectCard.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';

export default function PortfolioPage() {
  const { portfolio } = useApp();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const publishedProjects = useMemo(
    () => portfolio.filter((item) => item.published),
    [portfolio]
  );

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return publishedProjects.filter((project) => {
      if (selectedCategory !== 'All' && project.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        project.title,
        project.category,
        project.shortOverview,
        ...(project.technologies || []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [publishedProjects, selectedCategory, searchQuery]);

  const hasSamples = filteredProjects.some((p) => p.isSample);

  return (
    <>
      <PageHead
        title="Website Portfolio"
        description="Explore business websites, e-commerce websites, portfolio websites, landing pages, educational websites, and custom websites by DreamTech Kashmir Solutions."
      />

      <section className="border-b border-[#E3EBE5] bg-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold text-[#16834A]">
              Website Portfolio
            </p>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#17231C]">
              Our Website Work &amp; Showcases
            </h1>
            <p className="mt-4 text-base text-[#64756B] leading-relaxed">
              Browse websites designed and developed by DreamTech Kashmir Solutions across Business, E-Commerce, Portfolio, Landing Pages, Educational, and Other website categories.
            </p>
          </div>

          {hasSamples && (
            <div className="mt-6 rounded-xl border border-[#E3EBE5] bg-[#E8F5EC]/60 px-4 py-3 flex items-start gap-3">
              <Info className="w-4 h-4 text-[#16834A] shrink-0 mt-0.5" />
              <p className="text-xs text-[#17231C]/80">
                Entries labeled <strong className="text-[#116438]">Sample Showcase</strong> are editable capability placeholders. Replace or publish verified client projects anytime via Admin Portfolio Management.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="py-12 bg-[#F7FAF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-10">
            <div
              role="group"
              aria-label="Filter projects by category"
              className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-white border border-[#E3EBE5] shadow-xs"
            >
              {PORTFOLIO_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    selectedCategory === category
                      ? 'bg-[#16834A] text-white'
                      : 'text-[#64756B] hover:text-[#17231C] hover:bg-[#F7FAF7]'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:w-72 shrink-0">
              <Search className="w-4 h-4 text-[#64756B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search projects by title or technology"
                placeholder="Search title or tech..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] placeholder:text-[#64756B]/70 focus:outline-none focus:border-[#16834A]"
              />
            </div>
          </div>

          {filteredProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No matching projects found"
              description="Try choosing another category filter or clearing your search query."
              actionLabel="Reset Filters"
              onAction={() => {
                setSelectedCategory('All');
                setSearchQuery('');
              }}
            />
          )}
        </div>
      </section>
    </>
  );
}
