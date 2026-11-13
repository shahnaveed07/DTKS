import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx';
import { AppRoutes } from './App.jsx';
import { resolveSeoProps } from './components/common/SEO.jsx';
import { ROUTE_SEO } from './seo/seoConfig.js';
import {
  buildPackagesOfferCatalogSchema,
  buildPortfolioSchema,
  buildProjectSchema,
  buildServiceCatalogSchema,
} from './seo/structuredData.js';
import {
  INITIAL_PACKAGES,
  INITIAL_PORTFOLIO,
  INITIAL_SERVICES,
  INITIAL_SETTINGS,
} from './data/seedData.js';

export function getPrerenderRoutes() {
  const publishedPortfolio = INITIAL_PORTFOLIO.filter((item) => item.published);

  const staticPublicRoutes = Object.entries(ROUTE_SEO).map(([path, meta]) => ({
    path,
    inSitemap: Boolean(meta.inSitemap),
    priority: meta.priority || '0.5',
    changefreq: meta.changefreq || 'monthly',
  }));

  const portfolioDetailRoutes = publishedPortfolio.map((project) => ({
    path: `/portfolio/${project.slug}`,
    inSitemap: true,
    priority: '0.7',
    changefreq: 'monthly',
  }));

  const adminShellRoutes = [
    {
      path: '/admin',
      inSitemap: false,
      noindex: true,
    },
  ];

  return [...staticPublicRoutes, ...portfolioDetailRoutes, ...adminShellRoutes];
}

function resolveRouteSeo(url) {
  const settings = INITIAL_SETTINGS;

  if (url === '/services') {
    return resolveSeoProps({
      pathname: url,
      extraSchemas: [buildServiceCatalogSchema(INITIAL_SERVICES)],
      settings,
    });
  }

  if (url === '/packages') {
    return resolveSeoProps({
      pathname: url,
      extraSchemas: [buildPackagesOfferCatalogSchema(INITIAL_PACKAGES)],
      settings,
    });
  }

  if (url === '/portfolio') {
    return resolveSeoProps({
      pathname: url,
      extraSchemas: [buildPortfolioSchema(INITIAL_PORTFOLIO.filter((p) => p.published))],
      settings,
    });
  }

  if (url.startsWith('/portfolio/')) {
    const slug = url.slice('/portfolio/'.length);
    const project = INITIAL_PORTFOLIO.find((p) => p.slug === slug);
    if (!project) {
      return resolveSeoProps({
        pathname: url,
        noindex: true,
        fullTitle: 'Project Not Found | DreamTech Kashmir Solutions (DTKS)',
        settings,
      });
    }
    return resolveSeoProps({
      pathname: url,
      fullTitle: `${project.title} | DTKS Portfolio`,
      description: project.shortOverview || project.description,
      noindex: !project.published,
      ogImage: project.coverImage,
      ogImageAlt: `${project.title} — ${project.category} by DreamTech Kashmir Solutions (DTKS)`,
      breadcrumbs: [
        { name: 'Home', path: '/' },
        { name: 'Portfolio', path: '/portfolio' },
        { name: project.title, path: `/portfolio/${project.slug}` },
      ],
      extraSchemas: [buildProjectSchema(project)],
      settings,
    });
  }

  if (url.startsWith('/admin')) {
    return resolveSeoProps({
      pathname: url,
      noindex: true,
      fullTitle: 'Overview | Admin | DTKS',
      description: 'Administrative prototype interface for DreamTech Kashmir Solutions (DTKS).',
      settings,
    });
  }

  return resolveSeoProps({
    pathname: url,
    settings,
  });
}

export function renderRoute(url) {
  const appHtml = renderToString(
    <StrictMode>
      <AppProvider>
        <StaticRouter location={url}>
          <AppRoutes />
        </StaticRouter>
      </AppProvider>
    </StrictMode>
  );

  const seo = resolveRouteSeo(url);
  return { appHtml, seo };
}
