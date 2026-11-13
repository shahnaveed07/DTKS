import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import ImageWithFallback from '../common/ImageWithFallback.jsx';

export default function ProjectCard({ project }) {
  return (
    <article className="group flex flex-col rounded-xl border border-[#E3EBE5] bg-white overflow-hidden shadow-xs transition-all duration-200 hover:border-[#16834A]/60 hover:shadow-sm">
      <div className="aspect-4/3 w-full overflow-hidden bg-[#F7FAF7] border-b border-[#E3EBE5]">
        <ImageWithFallback
          src={project.coverImage}
          alt={`${project.title} — ${project.category} showcase by DreamTech Kashmir Solutions (DTKS)`}
          fallbackTitle={project.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        />
      </div>

      <div className="flex-1 p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#64756B]">
            <span className="font-semibold text-[#16834A]">{project.category}</span>
            <span aria-hidden="true">·</span>
            <span>{project.status || 'Completed'}</span>
          </div>

          <h3 className="mt-2 font-display text-lg font-semibold text-[#17231C]">
            {project.title}
          </h3>

          <p className="mt-2 text-sm text-[#64756B] leading-relaxed line-clamp-3">
            {project.shortOverview}
          </p>

          <p className="mt-4 text-xs text-[#64756B]">
            {(project.technologies || []).join(' · ')}
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-[#E3EBE5] flex items-center justify-between">
          <Link
            to={`/portfolio/${project.slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#16834A] hover:text-[#116438] hover:underline whitespace-nowrap"
          >
            <span>View Details</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
