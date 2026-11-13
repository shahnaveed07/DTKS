const DEFAULT_PRODUCTION_URL = 'https://dtks.pages.dev';

export function getSiteUrl() {
  let raw = '';
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SITE_URL) {
    raw = import.meta.env.VITE_SITE_URL;
  } else if (typeof process !== 'undefined' && process.env && process.env.VITE_SITE_URL) {
    raw = process.env.VITE_SITE_URL;
  }
  return (raw || DEFAULT_PRODUCTION_URL).trim().replace(/\/+$/, '');
}

export function normalizeCanonicalPath(pathname = '/') {
  if (!pathname || pathname === '/') return '/';
  const cleaned = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '');
  return cleaned.startsWith('/') ? cleaned : `/${cleaned}`;
}

export function buildCanonicalUrl(pathname = '/') {
  const origin = getSiteUrl();
  const path = normalizeCanonicalPath(pathname);
  return path === '/' ? `${origin}/` : `${origin}${path}`;
}

export const SITE_CONFIG = {
  officialName: 'DreamTech Kashmir Solutions',
  shortName: 'DTKS',
  displayName: 'DreamTech Kashmir Solutions (DTKS)',
  alternateNames: [
    'DTKS',
    'DTKS Kashmir',
    'DreamTech Kashmir',
    'Dream Tech Kashmir',
    'DreamTechKashmir',
  ],
  siteName: 'DreamTech Kashmir Solutions (DTKS)',
  businessCategory: 'Website Design & Development Company',
  description:
    'DreamTech Kashmir Solutions (DTKS) delivers professional website design, website development, e-commerce websites, redesign and maintenance services for businesses in Kashmir and beyond.',
  logoPath: '/assets/aistudio/file_000000001b088208817ae4b752e73385__1__6d1528fc.png',
  logoAlt: 'DreamTech Kashmir Solutions (DTKS) brand logo',
  ogImagePath: '/assets/images/dreamtech-kashmir-website-studio.jpg',
  ogImageAlt: 'DreamTech Kashmir Solutions (DTKS) — Website Design & Development Studio',
  ogImageWidth: 1376,
  ogImageHeight: 768,
  locale: 'en_IN',
  language: 'en',
  areaServed: ['Srinagar', 'Kashmir', 'Jammu & Kashmir', 'India'],
  defaultLocation: {
    locality: 'Srinagar',
    region: 'Jammu & Kashmir',
    country: 'IN',
  },
};

export const ROUTE_SEO = {
  '/': {
    title: 'DreamTech Kashmir Solutions (DTKS) | Website Development',
    description:
      'DreamTech Kashmir Solutions (DTKS) delivers professional website design, website development, e-commerce websites and maintenance services for businesses.',
    robots: 'index, follow',
    ogType: 'website',
    inSitemap: true,
    priority: '1.0',
    changefreq: 'weekly',
    breadcrumbs: [{ name: 'Home', path: '/' }],
  },
  '/services': {
    title: 'Website Design & Development Services | DTKS Kashmir',
    description:
      'Explore business websites, e-commerce development, website redesign, UI/UX design, hosting setup, SEO and website maintenance services by DTKS Kashmir.',
    robots: 'index, follow',
    ogType: 'website',
    inSitemap: true,
    priority: '0.9',
    changefreq: 'weekly',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Services', path: '/services' },
    ],
  },
  '/packages': {
    title: 'Website Development Packages & Pricing | DTKS',
    description:
      'Compare website development packages, business website pricing, e-commerce plans, maintenance options and custom website quotations from DTKS.',
    robots: 'index, follow',
    ogType: 'website',
    inSitemap: true,
    priority: '0.9',
    changefreq: 'weekly',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Packages & Pricing', path: '/packages' },
    ],
  },
  '/portfolio': {
    title: 'Our Website Development Portfolio | DreamTech Kashmir Solutions',
    description:
      'Explore responsive business websites, e-commerce storefronts, portfolio websites and custom web showcases crafted by DreamTech Kashmir Solutions (DTKS).',
    robots: 'index, follow',
    ogType: 'website',
    inSitemap: true,
    priority: '0.8',
    changefreq: 'weekly',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Portfolio', path: '/portfolio' },
    ],
  },
  '/team': {
    title: 'Meet Our Team | DreamTech Kashmir Solutions',
    description:
      'Meet the DreamTech Kashmir Solutions (DTKS) web architects, full-stack web developers, UI/UX designers, e-commerce and SEO specialists.',
    robots: 'index, follow',
    ogType: 'website',
    inSitemap: true,
    priority: '0.7',
    changefreq: 'monthly',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Team', path: '/team' },
    ],
  },
  '/about': {
    title: 'About DreamTech Kashmir Solutions (DTKS)',
    description:
      'Learn about DreamTech Kashmir Solutions (DTKS), our website design and development expertise in Kashmir, engineering standards and asset ownership model.',
    robots: 'index, follow',
    ogType: 'website',
    inSitemap: true,
    priority: '0.8',
    changefreq: 'monthly',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'About Us', path: '/about' },
    ],
  },
  '/contact': {
    title: 'Contact DreamTech Kashmir Solutions | DTKS',
    description:
      'Contact DreamTech Kashmir Solutions (DTKS) in Srinagar, Kashmir for business website enquiries, website redesign consultations and custom quotes.',
    robots: 'index, follow',
    ogType: 'website',
    inSitemap: true,
    priority: '0.8',
    changefreq: 'monthly',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Contact Us', path: '/contact' },
    ],
  },
  '/request-quote': {
    title: 'Request a Website Quote | DreamTech Kashmir Solutions (DTKS)',
    description:
      'Submit your website category, required pages, design preferences, domain/hosting choice and expected delivery date for a tailored quote from DTKS.',
    robots: 'index, follow',
    ogType: 'website',
    inSitemap: false,
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Request a Quote', path: '/request-quote' },
    ],
  },
  '/track-order': {
    title: 'Track Order | DreamTech Kashmir Solutions (DTKS)',
    description: 'Look up your website project request status using your reference ID and email.',
    robots: 'noindex, nofollow',
    ogType: 'website',
    inSitemap: false,
  },
  '/privacy-policy': {
    title: 'Privacy Policy | DreamTech Kashmir Solutions (DTKS)',
    description: 'Privacy Policy for DreamTech Kashmir Solutions (DTKS) website design and development services.',
    robots: 'index, follow',
    ogType: 'website',
    inSitemap: false,
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Privacy Policy', path: '/privacy-policy' },
    ],
  },
  '/terms': {
    title: 'Terms & Conditions | DreamTech Kashmir Solutions (DTKS)',
    description:
      'Terms & Conditions covering hybrid website quotations, hosting & domain ownership and maintenance boundaries at DreamTech Kashmir Solutions (DTKS).',
    robots: 'index, follow',
    ogType: 'website',
    inSitemap: false,
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Terms & Conditions', path: '/terms' },
    ],
  },
};
