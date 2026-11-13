import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SITE_CONFIG } from '../../seo/seoConfig.js';
import { resolveSeoProps } from '../../seo/resolveSeo.js';

export { resolveSeoProps };

function setMetaTag(selector, attrName, attrValue, content) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonicalLink(href) {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

function setJsonLdScript(data) {
  const existing = document.head.querySelector('script#dtks-jsonld');
  if (!data) {
    if (existing) existing.remove();
    return;
  }
  const el = existing || document.createElement('script');
  el.setAttribute('id', 'dtks-jsonld');
  el.setAttribute('type', 'application/ld+json');
  el.textContent = JSON.stringify(data);
  if (!existing) {
    document.head.appendChild(el);
  }
}

export default function SEO(props) {
  const location = useLocation();
  const pathname = props.pathname || location.pathname || '/';

  const {
    resolvedTitle,
    resolvedDescription,
    resolvedRobots,
    canonicalUrl,
    resolvedOgImage,
    resolvedOgImageAlt,
    resolvedOgType,
    jsonLd,
  } = resolveSeoProps({ ...props, pathname });

  useEffect(() => {
    document.documentElement.lang = SITE_CONFIG.language;
    document.title = resolvedTitle;

    setMetaTag('meta[name="description"]', 'name', 'description', resolvedDescription);
    setMetaTag('meta[name="robots"]', 'name', 'robots', resolvedRobots);
    setCanonicalLink(canonicalUrl);

    setMetaTag('meta[property="og:type"]', 'property', 'og:type', resolvedOgType);
    setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', SITE_CONFIG.siteName);
    setMetaTag('meta[property="og:locale"]', 'property', 'og:locale', SITE_CONFIG.locale);
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', resolvedTitle);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', resolvedDescription);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', resolvedOgImage);
    setMetaTag('meta[property="og:image:alt"]', 'property', 'og:image:alt', resolvedOgImageAlt);
    setMetaTag('meta[property="og:image:width"]', 'property', 'og:image:width', String(SITE_CONFIG.ogImageWidth));
    setMetaTag('meta[property="og:image:height"]', 'property', 'og:image:height', String(SITE_CONFIG.ogImageHeight));

    setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', resolvedTitle);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', resolvedDescription);
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', resolvedOgImage);
    setMetaTag('meta[name="twitter:image:alt"]', 'name', 'twitter:image:alt', resolvedOgImageAlt);

    setJsonLdScript(jsonLd);
  }, [
    resolvedTitle,
    resolvedDescription,
    resolvedRobots,
    canonicalUrl,
    resolvedOgImage,
    resolvedOgImageAlt,
    resolvedOgType,
    jsonLd,
  ]);

  return null;
}
