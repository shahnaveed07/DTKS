import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCanonicalUrl,
  getSiteUrl,
  normalizeCanonicalPath,
  ROUTE_SEO,
} from './seoConfig.js';
import {
  buildOrganizationSchema,
  buildPageJsonLd,
  buildProfessionalServiceSchema,
} from './structuredData.js';
import { resolveSeoProps } from './resolveSeo.js';
import { INITIAL_SETTINGS } from '../data/seedData.js';

test('normalizeCanonicalPath strips trailing slashes, hashes, and query strings', () => {
  assert.equal(normalizeCanonicalPath('/'), '/');
  assert.equal(normalizeCanonicalPath('/services/'), '/services');
  assert.equal(normalizeCanonicalPath('/packages/?ref=123#pricing'), '/packages');
  assert.equal(normalizeCanonicalPath('about'), '/about');
});

test('buildCanonicalUrl uses configured site URL and avoids duplicate trailing slashes', () => {
  const origin = getSiteUrl();
  assert.equal(buildCanonicalUrl('/'), `${origin}/`);
  assert.equal(buildCanonicalUrl('/services/'), `${origin}/services`);
  assert.equal(buildCanonicalUrl('/portfolio?filter=all'), `${origin}/portfolio`);
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

test('structured data omits placeholder email and placeholder phone numbers', () => {
  const org = buildOrganizationSchema(INITIAL_SETTINGS);
  assert.equal(org.name, 'DreamTech Kashmir Solutions');
  assert.ok(org.alternateName.includes('DTKS'));
  assert.equal(org.email, undefined);
  assert.equal(org.telephone, undefined);

  const prof = buildProfessionalServiceSchema(INITIAL_SETTINGS);
  assert.equal(prof.email, undefined);
  assert.equal(prof.telephone, undefined);
  assert.equal(prof.address.addressLocality, 'Srinagar');
  assert.equal(prof.address.addressRegion, 'Jammu & Kashmir');
});

test('buildPageJsonLd emits valid Schema.org graph with BreadcrumbList', () => {
  const graph = buildPageJsonLd({
    path: '/services',
    title: ROUTE_SEO['/services'].title,
    description: ROUTE_SEO['/services'].description,
    breadcrumbs: ROUTE_SEO['/services'].breadcrumbs,
    settings: INITIAL_SETTINGS,
  });

  assert.equal(graph['@context'], 'https://schema.org');
  assert.ok(Array.isArray(graph['@graph']));
  const types = graph['@graph'].map((node) => node['@type']);
  assert.ok(types.includes('Organization'));
  assert.ok(types.includes('WebSite'));
  assert.ok(types.includes('ProfessionalService'));
  assert.ok(types.includes('WebPage'));
  assert.ok(types.includes('BreadcrumbList'));
});
