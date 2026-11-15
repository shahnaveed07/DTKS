import { Globe } from 'lucide-react';
import { getValidSocialLinks } from '../../utils/orderUtils.js';

function SocialPlatformIcon({ platform, className = 'w-4 h-4' }) {
  switch (platform) {
    case 'github':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
          <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
        </svg>
      );
    case 'linkedin':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
        </svg>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
          <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5Zm9.65 1.5a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4Z" />
        </svg>
      );
    case 'facebook':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12c0-5.523-4.477-10-10-10Z" />
        </svg>
      );
    case 'x':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
        </svg>
      );
    default:
      return <Globe className={className} aria-hidden="true" />;
  }
}

const VARIANT_STYLES = {
  navbarDesktop: {
    container: 'flex items-center gap-1',
    link: 'inline-flex items-center justify-center w-7 h-7 rounded-md text-[#64756B] hover:text-[#16834A] hover:bg-[#E8F5EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16834A] transition-colors',
    icon: 'w-3.5 h-3.5',
  },
  navbarMobile: {
    container: 'flex flex-wrap items-center gap-2',
    link: 'inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#E3EBE5] bg-white text-[#17231C] hover:text-[#16834A] hover:border-[#16834A] hover:bg-[#E8F5EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16834A] transition-colors',
    icon: 'w-4 h-4',
  },
  footer: {
    container: 'flex flex-wrap items-center gap-2.5',
    link: 'inline-flex items-center justify-center w-9 h-9 rounded-lg border border-white/25 bg-white/5 text-[#E8F5EC] hover:text-white hover:bg-white/15 hover:border-white/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-colors',
    icon: 'w-4 h-4',
  },
};

export default function SocialLinks({
  socialLinks,
  companyName = 'DreamTech Kashmir Solutions',
  variant = 'footer',
  className = '',
  onLinkClick,
}) {
  const validLinks = getValidSocialLinks(socialLinks);
  if (validLinks.length === 0) return null;

  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.footer;

  return (
    <div className={`${styles.container} ${className}`.trim()}>
      {validLinks.map(({ platform, label, url }) => {
        const accessibleLabel =
          platform === 'other'
            ? `Visit ${companyName} external profile`
            : `Visit ${companyName} on ${label}`;
        return (
          <a
            key={platform}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={accessibleLabel}
            title={label}
            onClick={onLinkClick}
            className={styles.link}
          >
            <SocialPlatformIcon platform={platform} className={styles.icon} />
          </a>
        );
      })}
    </div>
  );
}
