import {
  ROUTE_SEO,
  SITE_CONFIG,
  buildCanonicalUrl,
  getImageDimensions,
  getSiteUrl,
  normalizeCanonicalPath,
} from './seoConfig.js';
import { buildPageJsonLd } from './structuredData.js';

export function resolveSeoProps({
  pathname = '/',
  title,
  fullTitle,
  description,
  robots,
  noindex = false,
  ogImage,
  ogImageAlt,
  ogType,
  breadcrumbs,
  settings,
  extraSchemas,
}) {
  const normalizedPath = normalizeCanonicalPath(pathname);
  const routeMeta = ROUTE_SEO[normalizedPath] || {};

  const isForcedNoindex =
    noindex ||
    normalizedPath.startsWith('/admin') ||
    normalizedPath.startsWith('/account') ||
    normalizedPath === '/login' ||
    normalizedPath === '/register' ||
    normalizedPath === '/verify-email' ||
    normalizedPath === '/forgot-password' ||
    normalizedPath === '/reset-password' ||
    normalizedPath === '/track-order';

  const resolvedTitle =
    fullTitle ||
    routeMeta.title ||
    (title
      ? title.includes('DreamTech') || title.includes('DTKS')
        ? title
        : `${title} | ${SITE_CONFIG.displayName}`
      : SITE_CONFIG.displayName);

  const resolvedDescription =
    description || routeMeta.description || SITE_CONFIG.description;

  const resolvedRobots = isForcedNoindex
    ? 'noindex, nofollow'
    : robots || routeMeta.robots || 'index, follow';

  const canonicalUrl = buildCanonicalUrl(normalizedPath);
  const siteUrl = getSiteUrl();
  const rawImage = ogImage || SITE_CONFIG.ogImagePath;
  const resolvedOgImage = rawImage.startsWith('http') ? rawImage : `${siteUrl}${rawImage}`;
  const resolvedOgImageAlt = ogImageAlt || SITE_CONFIG.ogImageAlt;
  const { width: resolvedOgImageWidth, height: resolvedOgImageHeight } =
    getImageDimensions(rawImage);
  const resolvedOgType = ogType || routeMeta.ogType || 'website';
  const resolvedBreadcrumbs = breadcrumbs || routeMeta.breadcrumbs || null;

  const isIndexable = !resolvedRobots.includes('noindex');
  const jsonLd = isIndexable
    ? buildPageJsonLd({
        path: normalizedPath,
        title: resolvedTitle,
        description: resolvedDescription,
        breadcrumbs: resolvedBreadcrumbs,
        settings,
        extraSchemas,
      })
    : null;

  return {
    resolvedTitle,
    resolvedDescription,
    resolvedRobots,
    canonicalUrl,
    resolvedOgImage,
    resolvedOgImageAlt,
    resolvedOgImageWidth,
    resolvedOgImageHeight,
    resolvedOgType,
    jsonLd,
  };
}
