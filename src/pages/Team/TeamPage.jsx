import { Link, useNavigate } from 'react-router-dom';
import { Github, Linkedin, Globe, User } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import SEO from '../../components/common/SEO.jsx';
import Breadcrumbs from '../../components/common/Breadcrumbs.jsx';
import { ROUTE_SEO } from '../../seo/seoConfig.js';
import EmptyState from '../../components/common/EmptyState.jsx';
import ImageWithFallback from '../../components/common/ImageWithFallback.jsx';

export default function TeamPage() {
  const { team, settings } = useApp();
  const navigate = useNavigate();
  const visibleMembers = team.filter((m) => m.visible && !m.isPlaceholder);

  return (
    <>
      <SEO settings={settings} />

      <section className="border-b border-[#E3EBE5] bg-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={ROUTE_SEO['/team'].breadcrumbs} />
          <div className="max-w-3xl">
            <p className="text-xs font-semibold text-[#16834A]">
              Team &amp; Roles · DreamTech Kashmir Solutions (DTKS)
            </p>
            <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#17231C]">
              Meet the people behind DreamTech Kashmir Solutions.
            </h1>
            <p className="mt-4 text-base text-[#64756B] leading-relaxed">
              The DreamTech Kashmir Solutions (DTKS) web team covers website architecture, full-stack web development, UI/UX design, e-commerce storefronts, and technical SEO deployment. Learn more{' '}
              <Link to="/about" className="text-[#16834A] font-medium hover:underline">
                about our company
              </Link>
              , explore our{' '}
              <Link to="/services" className="text-[#16834A] font-medium hover:underline">
                website services
              </Link>
              , or{' '}
              <Link to="/contact" className="text-[#16834A] font-medium hover:underline">
                contact DTKS
              </Link>.
            </p>
          </div>
        </div>
      </section>

      <section className="py-14 bg-[#F7FAF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {visibleMembers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {visibleMembers.map((member) => (
                <article
                  key={member.id}
                  className="rounded-xl border border-[#E3EBE5] bg-white shadow-xs p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-4 mb-5">
                      {member.avatarUrl ? (
                        <ImageWithFallback
                          src={member.avatarUrl}
                          alt={`${member.fullName} — ${member.role} at DreamTech Kashmir Solutions`}
                          fallbackTitle={member.initials || member.fullName}
                          width={64}
                          height={64}
                          loading="lazy"
                          decoding="async"
                          className="w-16 h-16 rounded-xl object-cover border border-[#E3EBE5] shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-[#E8F5EC] border border-[#E3EBE5] flex items-center justify-center shrink-0 text-[#16834A]">
                          {member.initials ? (
                            <span className="font-display text-lg font-bold">{member.initials}</span>
                          ) : (
                            <User className="w-6 h-6" />
                          )}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#16834A]">
                          {member.role}
                        </p>
                        <h2 className="mt-0.5 font-display text-base font-bold text-[#17231C] leading-snug">
                          {member.fullName}
                        </h2>
                      </div>
                    </div>

                    {member.title && (
                      <p className="text-xs font-medium text-[#17231C] mb-2">
                        {member.title}
                      </p>
                    )}

                    <p className="text-sm text-[#64756B] leading-relaxed">
                      {member.bio}
                    </p>

                    {member.skills && member.skills.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-[#E3EBE5]">
                        <p className="text-xs text-[#64756B] mb-1">Focus Areas</p>
                        <p className="text-xs font-medium text-[#17231C]">
                          {member.skills.join(' · ')}
                        </p>
                      </div>
                    )}

                    {member.technologies && member.technologies.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-[#64756B] mb-1">Technologies</p>
                        <p className="text-xs text-[#64756B]">
                          {member.technologies.join(' · ')}
                        </p>
                      </div>
                    )}
                  </div>

                  {(member.linkedinUrl || member.githubUrl || member.websiteUrl) && (
                    <div className="mt-5 pt-4 border-t border-[#E3EBE5] flex items-center gap-3">
                      {member.linkedinUrl && (
                        <a
                          href={member.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${member.fullName} LinkedIn`}
                          className="p-2 rounded-lg border border-[#E3EBE5] text-[#64756B] hover:text-[#16834A] hover:border-[#16834A]/50 transition-colors"
                        >
                          <Linkedin className="w-4 h-4" />
                        </a>
                      )}
                      {member.githubUrl && (
                        <a
                          href={member.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${member.fullName} GitHub`}
                          className="p-2 rounded-lg border border-[#E3EBE5] text-[#64756B] hover:text-[#16834A] hover:border-[#16834A]/50 transition-colors"
                        >
                          <Github className="w-4 h-4" />
                        </a>
                      )}
                      {member.websiteUrl && (
                        <a
                          href={member.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`${member.fullName} Website`}
                          className="p-2 rounded-lg border border-[#E3EBE5] text-[#64756B] hover:text-[#16834A] hover:border-[#16834A]/50 transition-colors"
                        >
                          <Globe className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Meet the people behind DreamTech Kashmir Solutions."
              description="Verified team member profiles, roles, and technical specializations are being updated and will appear here once published."
              actionLabel="Contact Our Team"
              onAction={() => navigate('/contact')}
            />
          )}
        </div>
      </section>
    </>
  );
}
