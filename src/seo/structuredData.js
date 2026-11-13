import { SITE_CONFIG, buildCanonicalUrl, getSiteUrl } from './seoConfig.js';

function isPlaceholderValue(value) {
  if (!value || typeof value !== 'string') return true;
  const lower = value.trim().toLowerCase();
  return (
    !lower ||
    lower.includes('placeholder') ||
    lower.includes('000-0000') ||
    lower.includes('00000 00000') ||
    lower.includes('.example') ||
    lower.includes('configurable')
  );
}

function getVerifiedSocialUrls(socialLinks = {}) {
  return Object.values(socialLinks)
    .filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url.trim()))
    .map((url) => url.trim());
}

export function buildOrganizationSchema(settings = {}) {
  const siteUrl = getSiteUrl();
  const orgId = `${siteUrl}/#organization`;
  const logoUrl = `${siteUrl}${SITE_CONFIG.logoPath}`;
  const sameAs = getVerifiedSocialUrls(settings.socialLinks);

  const schema = {
    '@type': 'Organization',
    '@id': orgId,
    name: settings.companyName || SITE_CONFIG.officialName,
    alternateName: SITE_CONFIG.alternateNames,
    url: `${siteUrl}/`,
    logo: {
      '@type': 'ImageObject',
      url: logoUrl,
      width: 1254,
      height: 1254,
    },
    description: SITE_CONFIG.description,
    areaServed: SITE_CONFIG.areaServed.map((name) => ({
      '@type': 'AdministrativeArea',
      name,
    })),
  };

  if (!isPlaceholderValue(settings.contactEmail)) {
    schema.email = settings.contactEmail.trim();
  }
  if (!isPlaceholderValue(settings.contactPhone)) {
    schema.telephone = settings.contactPhone.trim();
  }
  if (sameAs.length > 0) {
    schema.sameAs = sameAs;
  }

  return schema;
}

export function buildWebsiteSchema(settings = {}) {
  const siteUrl = getSiteUrl();
  return {
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    name: SITE_CONFIG.displayName,
    alternateName: ['DTKS', 'DreamTech Kashmir', 'DTKS Kashmir'],
    url: `${siteUrl}/`,
    description: SITE_CONFIG.description,
    inLanguage: SITE_CONFIG.language,
    publisher: {
      '@id': `${siteUrl}/#organization`,
    },
  };
}

export function buildProfessionalServiceSchema(settings = {}) {
  const siteUrl = getSiteUrl();
  const schema = {
    '@type': 'ProfessionalService',
    '@id': `${siteUrl}/#professional-service`,
    name: settings.companyName || SITE_CONFIG.officialName,
    alternateName: ['DTKS', 'DreamTech Kashmir'],
    url: `${siteUrl}/`,
    image: `${siteUrl}${SITE_CONFIG.ogImagePath}`,
    description: SITE_CONFIG.description,
    serviceType: 'Website Design & Website Development',
    areaServed: [
      { '@type': 'City', name: 'Srinagar' },
      { '@type': 'AdministrativeArea', name: 'Kashmir' },
      { '@type': 'State', name: 'Jammu & Kashmir' },
      { '@type': 'Country', name: 'India' },
    ],
    address: {
      '@type': 'PostalAddress',
      addressLocality: SITE_CONFIG.defaultLocation.locality,
      addressRegion: SITE_CONFIG.defaultLocation.region,
      addressCountry: SITE_CONFIG.defaultLocation.country,
    },
  };

  if (!isPlaceholderValue(settings.contactEmail)) {
    schema.email = settings.contactEmail.trim();
  }
  if (!isPlaceholderValue(settings.contactPhone)) {
    schema.telephone = settings.contactPhone.trim();
  }

  return schema;
}

export function buildBreadcrumbSchema(breadcrumbs = []) {
  if (!Array.isArray(breadcrumbs) || breadcrumbs.length === 0) return null;
  return {
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: buildCanonicalUrl(crumb.path),
    })),
  };
}

export function buildServiceCatalogSchema(services = []) {
  const siteUrl = getSiteUrl();
  if (!Array.isArray(services) || services.length === 0) return null;

  return {
    '@type': 'Service',
    '@id': `${siteUrl}/services#website-development-service`,
    name: 'Website Design & Development Services',
    serviceType: 'Website Design & Website Development',
    provider: {
      '@id': `${siteUrl}/#organization`,
    },
    areaServed: SITE_CONFIG.areaServed,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Website Development Services Catalog',
      itemListElement: services.map((svc, idx) => ({
        '@type': 'Offer',
        position: idx + 1,
        itemOffered: {
          '@type': 'Service',
          name: svc.title,
          description: svc.shortDescription || svc.description,
          url: `${siteUrl}/services#${svc.slug}`,
        },
      })),
    },
  };
}

export function buildPackagesOfferCatalogSchema(packages = []) {
  const siteUrl = getSiteUrl();
  const active = Array.isArray(packages) ? packages.filter((p) => p.active) : [];
  if (active.length === 0) return null;

  return {
    '@type': 'OfferCatalog',
    '@id': `${siteUrl}/packages#offer-catalog`,
    name: 'DreamTech Kashmir Solutions (DTKS) Website Packages',
    itemListElement: active.map((pkg, idx) => {
      const offer = {
        '@type': 'Offer',
        position: idx + 1,
        name: pkg.title,
        description: pkg.description,
        category: pkg.category,
        url: `${siteUrl}/packages`,
        offeredBy: {
          '@id': `${siteUrl}/#organization`,
        },
      };
      if (pkg.startingPrice !== null && pkg.startingPrice !== undefined && pkg.startingPrice !== '') {
        offer.priceSpecification = {
          '@type': 'PriceSpecification',
          minPrice: Number(pkg.startingPrice),
          priceCurrency: pkg.currency || 'INR',
        };
      }
      return offer;
    }),
  };
}

export function buildPortfolioSchema(projects = []) {
  const siteUrl = getSiteUrl();
  const published = Array.isArray(projects) ? projects.filter((p) => p.published) : [];
  return {
    '@type': 'CollectionPage',
    '@id': `${siteUrl}/portfolio#collection`,
    name: 'Website Development Portfolio — DreamTech Kashmir Solutions (DTKS)',
    url: `${siteUrl}/portfolio`,
    isPartOf: { '@id': `${siteUrl}/#website` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: published.map((proj, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        url: `${siteUrl}/portfolio/${proj.slug}`,
        name: proj.title,
      })),
    },
  };
}

export function buildProjectSchema(project) {
  if (!project) return null;
  const siteUrl = getSiteUrl();
  const imageUrl = project.coverImage
    ? project.coverImage.startsWith('http')
      ? project.coverImage
      : `${siteUrl}${project.coverImage}`
    : `${siteUrl}${SITE_CONFIG.ogImagePath}`;

  return {
    '@type': 'CreativeWork',
    '@id': `${siteUrl}/portfolio/${project.slug}#project`,
    name: project.title,
    description: project.shortOverview || project.description,
    url: `${siteUrl}/portfolio/${project.slug}`,
    image: imageUrl,
    creator: {
      '@id': `${siteUrl}/#organization`,
    },
    keywords: (project.technologies || []).join(', '),
  };
}

export function buildPageJsonLd({
  path = '/',
  title,
  description,
  breadcrumbs,
  settings = {},
  extraSchemas = [],
}) {
  const siteUrl = getSiteUrl();
  const canonicalUrl = buildCanonicalUrl(path);

  const webPage = {
    '@type': 'WebPage',
    '@id': `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: title,
    description,
    inLanguage: SITE_CONFIG.language,
    isPartOf: { '@id': `${siteUrl}/#website` },
    about: { '@id': `${siteUrl}/#organization` },
  };

  const graph = [
    buildOrganizationSchema(settings),
    buildWebsiteSchema(settings),
    buildProfessionalServiceSchema(settings),
    webPage,
  ];

  const breadcrumbSchema = buildBreadcrumbSchema(breadcrumbs);
  if (breadcrumbSchema) {
    webPage.breadcrumb = { '@id': `${canonicalUrl}#breadcrumb` };
    breadcrumbSchema['@id'] = `${canonicalUrl}#breadcrumb`;
    graph.push(breadcrumbSchema);
  }

  extraSchemas.filter(Boolean).forEach((s) => graph.push(s));

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
}
