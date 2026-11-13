import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';

const ROOT_DIR = process.cwd();
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function replaceMetaContent(html, attrName, attrValue, content) {
  const pattern = new RegExp(
    `<meta\\s+[^>]*${attrName}=["']${attrValue}["'][^>]*>\\s*`,
    'i'
  );
  if (!content) {
    return html.replace(pattern, '');
  }
  const escaped = escapeHtml(content);
  const replacement = `<meta ${attrName}="${attrValue}" content="${escaped}" />`;
  if (pattern.test(html)) {
    return html.replace(pattern, `${replacement}\n    `);
  }
  return html.replace('</head>', `    ${replacement}\n  </head>`);
}

function replaceTitle(html, title) {
  const escaped = escapeHtml(title);
  if (/<title>[\s\S]*?<\/title>/i.test(html)) {
    return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escaped}</title>`);
  }
  return html.replace('</head>', `    <title>${escaped}</title>\n  </head>`);
}

function replaceCanonical(html, href, isNoindex) {
  const pattern = /<link\s+[^>]*rel=["']canonical["'][^>]*>\s*/i;
  if (isNoindex) {
    return html.replace(pattern, '');
  }
  const escaped = escapeHtml(href);
  const replacement = `<link rel="canonical" href="${escaped}" />`;
  if (pattern.test(html)) {
    return html.replace(pattern, `${replacement}\n    `);
  }
  return html.replace('</head>', `    ${replacement}\n  </head>`);
}

function injectJsonLd(html, jsonLd) {
  const cleaned = html.replace(/<script\s+[^>]*id=["']dtks-jsonld["'][^>]*>[\s\S]*?<\/script>\s*/i, '');
  if (!jsonLd) return cleaned;
  const serialized = JSON.stringify(jsonLd).replace(/</g, '\\u003c');
  const scriptTag = `<script id="dtks-jsonld" type="application/ld+json">${serialized}</script>`;
  return cleaned.replace('</head>', `    ${scriptTag}\n  </head>`);
}

function routePathToOutputFile(routePath) {
  if (routePath === '/') {
    return path.join(DIST_DIR, 'index.html');
  }
  if (routePath === '/404') {
    return path.join(DIST_DIR, '404.html');
  }
  const clean = routePath.replace(/^\/+|\/+$/g, '');
  return path.join(DIST_DIR, `${clean}.html`);
}

function buildSitemapXml(routes, siteUrl, lastmod) {
  const entries = routes
    .filter((r) => r.inSitemap)
    .map((r) => {
      const loc = r.path === '/' ? `${siteUrl}/` : `${siteUrl}${r.path}`;
      return [
        '  <url>',
        `    <loc>${escapeHtml(loc)}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${r.changefreq || 'weekly'}</changefreq>`,
        `    <priority>${r.priority || '0.7'}</priority>`,
        '  </url>',
      ].join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    '</urlset>',
    '',
  ].join('\n');
}

function buildRobotsTxt(siteUrl) {
  return [
    'User-agent: *',
    'Allow: /',
    '',
    'Disallow: /admin/',
    'Disallow: /track-order',
    'Disallow: /order-success',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n');
}

async function main() {
  const templatePath = path.join(DIST_DIR, 'index.html');
  const templateHtml = await fs.readFile(templatePath, 'utf-8');

  const vite = await createServer({
    server: {
      middlewareMode: true,
      hmr: false,
      watch: null,
    },
    appType: 'custom',
    logLevel: 'error',
  });

  let siteUrl;
  let routes;

  try {
    const entry = await vite.ssrLoadModule('/src/entry-prerender.jsx');
    const seoConfig = await vite.ssrLoadModule('/src/seo/seoConfig.js');
    siteUrl = seoConfig.getSiteUrl();
    const verification = seoConfig.getVerificationMeta();
    const siteName = seoConfig.SITE_CONFIG.siteName;
    const locale = seoConfig.SITE_CONFIG.locale;

    routes = entry.getPrerenderRoutes();

    for (const route of routes) {
      const { appHtml, seo } = entry.renderRoute(route.path);
      const isNoindex = seo.resolvedRobots.includes('noindex');

      let pageHtml = templateHtml.replace(
        '<div id="root"></div>',
        `<div id="root">${appHtml}</div>`
      );

      pageHtml = replaceTitle(pageHtml, seo.resolvedTitle);
      pageHtml = replaceMetaContent(pageHtml, 'name', 'description', seo.resolvedDescription);
      pageHtml = replaceMetaContent(pageHtml, 'name', 'robots', seo.resolvedRobots);
      pageHtml = replaceCanonical(pageHtml, seo.canonicalUrl, isNoindex);

      if (verification.google) {
        pageHtml = replaceMetaContent(pageHtml, 'name', 'google-site-verification', verification.google);
      }
      if (verification.bing) {
        pageHtml = replaceMetaContent(pageHtml, 'name', 'msvalidate.01', verification.bing);
      }

      pageHtml = replaceMetaContent(pageHtml, 'property', 'og:type', seo.resolvedOgType);
      pageHtml = replaceMetaContent(pageHtml, 'property', 'og:site_name', siteName);
      pageHtml = replaceMetaContent(pageHtml, 'property', 'og:locale', locale);
      pageHtml = replaceMetaContent(pageHtml, 'property', 'og:title', seo.resolvedTitle);
      pageHtml = replaceMetaContent(pageHtml, 'property', 'og:description', seo.resolvedDescription);
      pageHtml = replaceMetaContent(pageHtml, 'property', 'og:url', seo.canonicalUrl);
      pageHtml = replaceMetaContent(pageHtml, 'property', 'og:image', seo.resolvedOgImage);
      pageHtml = replaceMetaContent(pageHtml, 'property', 'og:image:alt', seo.resolvedOgImageAlt);
      pageHtml = replaceMetaContent(pageHtml, 'property', 'og:image:width', String(seo.resolvedOgImageWidth));
      pageHtml = replaceMetaContent(pageHtml, 'property', 'og:image:height', String(seo.resolvedOgImageHeight));

      pageHtml = replaceMetaContent(pageHtml, 'name', 'twitter:card', 'summary_large_image');
      pageHtml = replaceMetaContent(pageHtml, 'name', 'twitter:title', seo.resolvedTitle);
      pageHtml = replaceMetaContent(pageHtml, 'name', 'twitter:description', seo.resolvedDescription);
      pageHtml = replaceMetaContent(pageHtml, 'name', 'twitter:image', seo.resolvedOgImage);
      pageHtml = replaceMetaContent(pageHtml, 'name', 'twitter:image:alt', seo.resolvedOgImageAlt);

      pageHtml = injectJsonLd(pageHtml, seo.jsonLd);

      const outputFile = routePathToOutputFile(route.path);
      await fs.mkdir(path.dirname(outputFile), { recursive: true });
      await fs.writeFile(outputFile, pageHtml, 'utf-8');
    }
  } finally {
    await vite.close();
  }

  const today = new Date().toISOString().slice(0, 10);
  const sitemapXml = buildSitemapXml(routes, siteUrl, today);
  const robotsTxt = buildRobotsTxt(siteUrl);

  await fs.writeFile(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml, 'utf-8');
  await fs.writeFile(path.join(DIST_DIR, 'robots.txt'), robotsTxt, 'utf-8');
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.writeFile(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemapXml, 'utf-8');
  await fs.writeFile(path.join(PUBLIC_DIR, 'robots.txt'), robotsTxt, 'utf-8');

  console.log(
    `[SEO Prerender] Generated ${routes.length} static HTML pages, sitemap.xml, and robots.txt for ${siteUrl}`
  );
}

main().catch((err) => {
  console.error('[SEO Prerender] Failed:', err);
  process.exit(1);
});
