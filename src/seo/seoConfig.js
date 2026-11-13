const OFFICIAL_PRODUCTION_URL = 'https://dreamtechkashmirsolutions.studio';

function readEnv(key) {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return String(import.meta.env[key]).trim();
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return String(process.env[key]).trim();
  }
  return '';
}

function isDisallowedCanonicalHost(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      parsed.protocol !== 'https:' ||
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.endsWith('.pages.dev') ||
      host.endsWith('.run.app')
    );
  } catch {
    return true;
  }
}

export function getSiteUrl() {
  const raw = readEnv('VITE_SITE_URL');
  if (!raw || isDisallowedCanonicalHost(raw)) {
    return OFFICIAL_PRODUCTION_URL;
  }
  return raw.replace(/\/+$/, '').replace(/^https?:\/\/www\./i, 'https://');
}

export function getVerificationMeta() {
  return {
    google: readEnv('VITE_GOOGLE_SITE_VERIFICATION'),
    bing: readEnv('VITE_BING_SITE_VERIFICATION'),
  };
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

export const IMAGE_DIMENSIONS = {
  '/assets/images/dreamtech-kashmir-website-studio.jpg': { width: 1376, height: 768 },
  '/assets/images/dtks-corporate-website-showcase.jpg': { width: 1200, height: 896 },
  '/assets/images/dtks-ecommerce-website-showcase.jpg': { width: 1200, height: 896 },
  '/assets/images/dtks-educational-website-showcase.jpg': { width: 1376, height: 768 },
  '/assets/images/dreamtech-kashmir-solutions-dtks-logo.png': { width: 512, height: 512 },
  '/assets/images/dreamtech-kashmir-solutions-dtks-logo.webp': { width: 512, height: 512 },
};

export function getImageDimensions(imagePath) {
  if (!imagePath || typeof imagePath !== 'string') {
    return { width: 1376, height: 768 };
  }
  return IMAGE_DIMENSIONS[imagePath] || { width: 1376, height: 768 };
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
    'DreamTech Kashmir Solutions DTKS',
  ],
  siteName: 'DreamTech Kashmir Solutions (DTKS)',
  businessCategory: 'Website Design & Development Company',
  description:
    'DreamTech Kashmir Solutions (DTKS) delivers professional website design, website development, e-commerce websites, website redesign and maintenance services for businesses in Kashmir and beyond.',
  logoPath: '/assets/images/dreamtech-kashmir-solutions-dtks-logo.png',
  logoWebpPath: '/assets/images/dreamtech-kashmir-solutions-dtks-logo.webp',
  logoWidth: 512,
  logoHeight: 512,
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
      'Explore responsive business websites, e-commerce website development, website redesign, UI/UX design, hosting setup, SEO and website maintenance services by DTKS Kashmir.',
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
      'Compare transparent website development packages, business website cost, e-commerce website plans, optional maintenance plans and custom website quotations from DTKS.',
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
      'Explore responsive business websites, e-commerce storefronts, portfolio websites and institutional web showcases built by DreamTech Kashmir Solutions (DTKS).',
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
      'Meet the DreamTech Kashmir Solutions (DTKS) website architecture, full-stack web development, UI/UX design, e-commerce and technical SEO specialists.',
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
      'Learn about DreamTech Kashmir Solutions (DTKS), our website design and development expertise in Kashmir, engineering standards, and transparent asset ownership.',
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
      'Contact DreamTech Kashmir Solutions (DTKS) for business website enquiries, website redesign consultations, maintenance questions and custom website quotations.',
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
      'Submit your website category, required pages, design preferences, domain and hosting choice, and target launch date for a tailored quotation from DTKS.',
    robots: 'index, follow',
    ogType: 'website',
    inSitemap: true,
    priority: '0.8',
    changefreq: 'monthly',
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
      'Terms & Conditions covering hybrid website quotations, hosting and domain ownership, and maintenance scope at DreamTech Kashmir Solutions (DTKS).',
    robots: 'index, follow',
    ogType: 'website',
    inSitemap: false,
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Terms & Conditions', path: '/terms' },
    ],
  },
};
