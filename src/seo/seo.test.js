import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCanonicalUrl,
  getSiteUrl,
  normalizeCanonicalPath,
  ROUTE_SEO,
} from './seoConfig.js';
import {
  buildFaqSchema,
  buildOrganizationSchema,
  buildPageJsonLd,
  buildProfessionalServiceSchema,
} from './structuredData.js';
import { resolveSeoProps } from './resolveSeo.js';
import { INITIAL_SETTINGS, PACKAGES_FAQS } from '../data/seedData.js';

test('normalizeCanonicalPath strips trailing slashes, hashes, and query strings', () => {
  assert.equal(normalizeCanonicalPath('/'), '/');
  assert.equal(normalizeCanonicalPath('/services/'), '/services');
  assert.equal(normalizeCanonicalPath('/packages/?ref=123#pricing'), '/packages');
  assert.equal(normalizeCanonicalPath('about'), '/about');
});

test('buildCanonicalUrl uses official non-www HTTPS domain and rejects preview/localhost URLs', () => {
  const prev = process.env.VITE_SITE_URL;
  try {
    process.env.VITE_SITE_URL = 'https://dtks.pages.dev';
    assert.equal(getSiteUrl(), 'https://dreamtechkashmirsolutions.studio');
    process.env.VITE_SITE_URL = 'http://localhost:3000';
    assert.equal(getSiteUrl(), 'https://dreamtechkashmirsolutions.studio');
    delete process.env.VITE_SITE_URL;
  } finally {
    if (prev !== undefined) process.env.VITE_SITE_URL = prev;
    else delete process.env.VITE_SITE_URL;
  }

  const origin = getSiteUrl();
  assert.equal(origin, 'https://dreamtechkashmirsolutions.studio');
  assert.equal(buildCanonicalUrl('/'), 'https://dreamtechkashmirsolutions.studio/');
  assert.equal(buildCanonicalUrl('/services/'), 'https://dreamtechkashmirsolutions.studio/services');
  assert.equal(
    buildCanonicalUrl('/portfolio?filter=all'),
    'https://dreamtechkashmirsolutions.studio/portfolio'
  );
  assert.equal(ROUTE_SEO['/request-quote'].inSitemap, true);
  assert.equal(ROUTE_SEO['/track-order'].inSitemap, false);
});

test('every indexable route has unique title and description', () => {
  const titles = new Set();
  const descriptions = new Set();
  for (const [path, meta] of Object.entries(ROUTE_SEO)) {
    assert.ok(meta.title && meta.title.length >= 20, `Missing title for ${path}`);
    assert.ok(meta.description && meta.description.length >= 40, `Missing description for ${path}`);
    assert.ok(!titles.has(meta.title), `Duplicate title on ${path}`);
    assert.ok(!descriptions.has(meta.description), `Duplicate description on ${path}`);
    titles.add(meta.title);
    descriptions.add(meta.description);
  }
});

test('noindex routes disable indexing and omit JSON-LD', () => {
  const trackSeo = resolveSeoProps({ pathname: '/track-order', settings: INITIAL_SETTINGS });
  assert.equal(trackSeo.resolvedRobots, 'noindex, nofollow');
  assert.equal(trackSeo.jsonLd, null);

  const adminSeo = resolveSeoProps({
    pathname: '/admin/orders',
    noindex: true,
    fullTitle: 'Orders | Admin | DTKS',
    settings: INITIAL_SETTINGS,
  });
  assert.equal(adminSeo.resolvedRobots, 'noindex, nofollow');
  assert.equal(adminSeo.jsonLd, null);
});

test('structured data includes verified default email/WhatsApp ContactPoint and skips ProfessionalService until calling phone or street address exists', () => {
  const org = buildOrganizationSchema(INITIAL_SETTINGS);
  assert.equal(org.name, 'DreamTech Kashmir Solutions');
  assert.ok(org.alternateName.includes('DTKS'));
  assert.equal(org.email, 'support@dreamtechkashmirsolutions.studio');
  assert.equal(org.telephone, undefined);
  assert.ok(Array.isArray(org.contactPoint));
  assert.equal(org.contactPoint[0].email, 'support@dreamtechkashmirsolutions.studio');
  assert.equal(org.contactPoint[0].telephone, '+91 9796854163');
  assert.equal(org.contactPoint[0].url, 'https://wa.me/919796854163');
  assert.equal(org.logo.width, 512);
  assert.equal(org.logo.height, 512);

  assert.equal(buildProfessionalServiceSchema(INITIAL_SETTINGS), null);

  const verifiedProf = buildProfessionalServiceSchema({
    ...INITIAL_SETTINGS,
    contactPhone: '+91 99060 12345',
    businessLocation: 'Residency Road, Srinagar, Jammu & Kashmir',
  });
  assert.ok(verifiedProf);
  assert.equal(verifiedProf.telephone, '+91 99060 12345');
  assert.equal(verifiedProf.address.addressLocality, 'Srinagar');
  assert.equal(verifiedProf.address.addressRegion, 'Jammu & Kashmir');
});

test('resolveSeoProps resolves accurate og:image dimensions per asset', () => {
  const studioSeo = resolveSeoProps({ pathname: '/', settings: INITIAL_SETTINGS });
  assert.equal(studioSeo.resolvedOgImageWidth, 1376);
  assert.equal(studioSeo.resolvedOgImageHeight, 768);

  const projectSeo = resolveSeoProps({
    pathname: '/portfolio/kashmir-enterprise-corporate-website-sample',
    ogImage: '/assets/images/dtks-corporate-website-showcase.jpg',
    settings: INITIAL_SETTINGS,
  });
  assert.equal(projectSeo.resolvedOgImageWidth, 1200);
  assert.equal(projectSeo.resolvedOgImageHeight, 896);
});

test('buildPageJsonLd emits valid Schema.org graph with BreadcrumbList and optional FAQPage', () => {
  const graph = buildPageJsonLd({
    path: '/packages',
    title: ROUTE_SEO['/packages'].title,
    description: ROUTE_SEO['/packages'].description,
    breadcrumbs: ROUTE_SEO['/packages'].breadcrumbs,
    settings: INITIAL_SETTINGS,
    extraSchemas: [buildFaqSchema(PACKAGES_FAQS)],
  });

  assert.equal(graph['@context'], 'https://schema.org');
  assert.ok(Array.isArray(graph['@graph']));
  const types = graph['@graph'].map((node) => node['@type']);
  assert.ok(types.includes('Organization'));
  assert.ok(types.includes('WebSite'));
  assert.ok(types.includes('WebPage'));
  assert.ok(types.includes('BreadcrumbList'));
  assert.ok(types.includes('FAQPage'));
  assert.ok(!types.includes('ProfessionalService'));
});
