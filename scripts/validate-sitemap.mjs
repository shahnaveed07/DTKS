import fs from 'node:fs/promises';
import path from 'node:path';
import { INITIAL_PORTFOLIO } from '../src/data/seedData.js';
import { ROUTE_SEO } from '../src/seo/seoConfig.js';

const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const OFFICIAL_ORIGIN = 'https://dreamtechkashmirsolutions.studio';
const OFFICIAL_HOST = 'dreamtechkashmirsolutions.studio';

const DISALLOWED_PATTERNS = [
  /dtks\.pages\.dev/i,
  /\.pages\.dev/i,
  /\blocalhost\b/i,
  /127\.0\.0\.1/,
  /\.run\.app/i,
  /https?:\/\/www\.dreamtechkashmirsolutions\.studio/i,
];

const EXCLUDED_PATH_PREFIXES = ['/admin', '/track-order', '/order-success', '/404'];

function assertNoDisallowedReferences(content, label, errors) {
  for (const pattern of DISALLOWED_PATTERNS) {
    if (pattern.test(content)) {
      errors.push(`${label} contains disallowed domain reference matching ${pattern}`);
    }
  }
}

function routePathToDistHtml(routePath) {
  if (routePath === '/') return path.join(DIST_DIR, 'index.html');
  if (routePath === '/404') return path.join(DIST_DIR, '404.html');
  const clean = routePath.replace(/^\/+|\/+$/g, '');
  return path.join(DIST_DIR, `${clean}.html`);
}

async function collectHtmlFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectHtmlFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const errors = [];

  const distSitemapPath = path.join(DIST_DIR, 'sitemap.xml');
  const publicSitemapPath = path.join(PUBLIC_DIR, 'sitemap.xml');
  const distRobotsPath = path.join(DIST_DIR, 'robots.txt');
  const publicRobotsPath = path.join(PUBLIC_DIR, 'robots.txt');

  if (!(await fileExists(distSitemapPath))) {
    errors.push('Missing dist/sitemap.xml');
  }
  if (!(await fileExists(distRobotsPath))) {
    errors.push('Missing dist/robots.txt');
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  const distSitemap = await fs.readFile(distSitemapPath, 'utf-8');
  const distRobots = await fs.readFile(distRobotsPath, 'utf-8');

  if (await fileExists(publicSitemapPath)) {
    const publicSitemap = await fs.readFile(publicSitemapPath, 'utf-8');
    if (publicSitemap !== distSitemap) {
      errors.push('public/sitemap.xml is out of sync with dist/sitemap.xml');
    }
  } else {
    errors.push('Missing public/sitemap.xml');
  }

  if (await fileExists(publicRobotsPath)) {
    const publicRobots = await fs.readFile(publicRobotsPath, 'utf-8');
    if (publicRobots !== distRobots) {
      errors.push('public/robots.txt is out of sync with dist/robots.txt');
    }
  } else {
    errors.push('Missing public/robots.txt');
  }

  // Validate sitemap XML structure
  if (!distSitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('dist/sitemap.xml must start with XML declaration');
  }
  if (!distSitemap.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')) {
    errors.push('dist/sitemap.xml missing standard <urlset> namespace declaration');
  }
  if (!distSitemap.trim().endsWith('</urlset>')) {
    errors.push('dist/sitemap.xml missing closing </urlset>');
  }

  assertNoDisallowedReferences(distSitemap, 'dist/sitemap.xml', errors);

  const urlBlocks = [...distSitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)];
  const openUrlCount = (distSitemap.match(/<url>/g) || []).length;
  const closeUrlCount = (distSitemap.match(/<\/url>/g) || []).length;
  if (openUrlCount === 0 || openUrlCount !== closeUrlCount || urlBlocks.length !== openUrlCount) {
    errors.push(`dist/sitemap.xml has malformed <url> tags (${openUrlCount} open, ${closeUrlCount} close)`);
  }

  const seenLocs = new Set();
  const sitemapPaths = [];

  for (const [idx, blockMatch] of urlBlocks.entries()) {
    const block = blockMatch[1];
    const locMatches = [...block.matchAll(/<loc>([^<]+)<\/loc>/g)];
    if (locMatches.length !== 1) {
      errors.push(`Sitemap <url> entry #${idx + 1} must contain exactly one <loc>`);
      continue;
    }

    const loc = locMatches[0][1].trim();
    const lastmodMatch = block.match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/);
    if (!lastmodMatch) {
      errors.push(`Sitemap <loc> ${loc} is missing a valid YYYY-MM-DD <lastmod>`);
    }

    let parsed;
    try {
      parsed = new URL(loc);
    } catch {
      errors.push(`Invalid URL in sitemap <loc>: ${loc}`);
      continue;
    }

    if (parsed.protocol !== 'https:' || parsed.hostname !== OFFICIAL_HOST || parsed.port) {
      errors.push(`Sitemap <loc> must use exact origin ${OFFICIAL_ORIGIN}, found: ${loc}`);
    }

    if (parsed.search || parsed.hash) {
      errors.push(`Sitemap <loc> must not contain query strings or fragments: ${loc}`);
    }

    const routePath = parsed.pathname === '/' ? '/' : parsed.pathname.replace(/\/+$/, '');
    if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
      errors.push(`Sitemap <loc> should not have trailing slash on non-root path: ${loc}`);
    }

    for (const excludedPrefix of EXCLUDED_PATH_PREFIXES) {
      if (routePath === excludedPrefix || routePath.startsWith(`${excludedPrefix}/`)) {
        errors.push(`Excluded private/admin/error route found in sitemap: ${loc}`);
      }
    }

    if (seenLocs.has(loc)) {
      errors.push(`Duplicate <loc> found in sitemap: ${loc}`);
    } else {
      seenLocs.add(loc);
      sitemapPaths.push(routePath);
    }

    const expectedHtmlFile = routePathToDistHtml(routePath);
    if (!(await fileExists(expectedHtmlFile))) {
      errors.push(`Sitemap URL ${loc} has no matching prerendered HTML file (${path.relative(ROOT_DIR, expectedHtmlFile)})`);
    }
  }

  // Verify expected public and published portfolio routes match sitemap
  const expectedRoutes = new Set([
    ...Object.entries(ROUTE_SEO)
      .filter(([, meta]) => meta.inSitemap)
      .map(([routePath]) => routePath),
    ...INITIAL_PORTFOLIO.filter((item) => item.published).map((item) => `/portfolio/${item.slug}`),
  ]);

  const unpublishedSlugs = INITIAL_PORTFOLIO.filter((item) => !item.published).map(
    (item) => `/portfolio/${item.slug}`
  );
  for (const unpublishedPath of unpublishedSlugs) {
    if (sitemapPaths.includes(unpublishedPath)) {
      errors.push(`Unpublished portfolio route must not appear in sitemap: ${unpublishedPath}`);
    }
  }

  for (const expectedPath of expectedRoutes) {
    if (!sitemapPaths.includes(expectedPath)) {
      errors.push(`Expected indexable route missing from sitemap: ${expectedPath}`);
    }
  }

  // Validate robots.txt
  assertNoDisallowedReferences(distRobots, 'dist/robots.txt', errors);
  const requiredRobotsLines = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /track-order',
    'Disallow: /order-success',
    `Sitemap: ${OFFICIAL_ORIGIN}/sitemap.xml`,
  ];
  for (const line of requiredRobotsLines) {
    if (!distRobots.includes(line)) {
      errors.push(`dist/robots.txt missing required directive: "${line}"`);
    }
  }

  // Validate prerendered HTML files
  const htmlFiles = await collectHtmlFiles(DIST_DIR);
  for (const htmlFile of htmlFiles) {
    const relPath = path.relative(ROOT_DIR, htmlFile);
    const html = await fs.readFile(htmlFile, 'utf-8');
    assertNoDisallowedReferences(html, relPath, errors);
  }

  for (const routePath of sitemapPaths) {
    const htmlFile = routePathToDistHtml(routePath);
    if (!(await fileExists(htmlFile))) continue;
    const relPath = path.relative(ROOT_DIR, htmlFile);
    const html = await fs.readFile(htmlFile, 'utf-8');
    const expectedCanonical = routePath === '/' ? `${OFFICIAL_ORIGIN}/` : `${OFFICIAL_ORIGIN}${routePath}`;

    if (!html.includes(`<link rel="canonical" href="${expectedCanonical}"`)) {
      errors.push(`${relPath} missing canonical link for ${expectedCanonical}`);
    }
    if (!html.includes(`<meta property="og:url" content="${expectedCanonical}"`)) {
      errors.push(`${relPath} missing og:url matching ${expectedCanonical}`);
    }
    if (!html.includes(`<meta property="og:image" content="${OFFICIAL_ORIGIN}/`)) {
      errors.push(`${relPath} missing production og:image URL`);
    }
    if (!html.includes(`<meta name="twitter:image" content="${OFFICIAL_ORIGIN}/`)) {
      errors.push(`${relPath} missing production twitter:image URL`);
    }

    const jsonLdMatch = html.match(/<script\s+id="dtks-jsonld"\s+type="application\/ld\+json">([\s\S]*?)<\/script>/i);
    if (!jsonLdMatch) {
      errors.push(`${relPath} missing #dtks-jsonld structured data`);
    } else {
      try {
        const parsedJsonLd = JSON.parse(jsonLdMatch[1]);
        const serialized = JSON.stringify(parsedJsonLd);
        if (!serialized.includes(OFFICIAL_ORIGIN)) {
          errors.push(`${relPath} JSON-LD missing official origin ${OFFICIAL_ORIGIN}`);
        }
        assertNoDisallowedReferences(serialized, `${relPath} JSON-LD`, errors);
      } catch (err) {
        errors.push(`${relPath} has invalid #dtks-jsonld JSON: ${err.message}`);
      }
    }
  }

  const noindexPaths = ['/404', '/track-order', '/admin', '/admin/orders'];
  for (const noindexPath of noindexPaths) {
    const htmlFile = routePathToDistHtml(noindexPath);
    if (await fileExists(htmlFile)) {
      const relPath = path.relative(ROOT_DIR, htmlFile);
      const html = await fs.readFile(htmlFile, 'utf-8');
      if (!html.includes('content="noindex, nofollow"')) {
        errors.push(`${relPath} must declare noindex, nofollow`);
      }
      if (/rel=["']canonical["']/i.test(html)) {
        errors.push(`${relPath} (noindex) must not declare a canonical link`);
      }
    }
  }

  if (errors.length > 0) {
    console.error('[SEO Validate] Validation failed:');
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log(
    `[SEO Validate] Passed: ${sitemapPaths.length} valid sitemap URLs on ${OFFICIAL_ORIGIN}, ${htmlFiles.length} HTML files verified, 0 disallowed references.`
  );
}

main().catch((err) => {
  console.error('[SEO Validate] Error:', err.message);
  process.exit(1);
});
