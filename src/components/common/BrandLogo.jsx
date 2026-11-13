import { SITE_CONFIG } from '../../seo/seoConfig.js';

const VARIANT_CLASSES = {
  navbar: 'w-[104px] sm:w-[116px] aspect-[15/8] rounded-lg border border-[#021022]/15 shadow-xs',
  footer: 'w-[164px] aspect-[15/8] rounded-xl border border-white/20 shadow-sm',
  admin: 'w-[104px] aspect-[15/8] rounded-lg border border-[#021022]/15 shadow-xs',
};

export default function BrandLogo({
  variant = 'navbar',
  alt = SITE_CONFIG.logoAlt,
  className = '',
}) {
  const sizeClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.navbar;

  return (
    <span
      className={`inline-block overflow-hidden shrink-0 select-none bg-[#021022] ${sizeClass} ${className}`}
    >
      <picture>
        <source srcSet={SITE_CONFIG.logoWebpPath} type="image/webp" />
        <img
          src={SITE_CONFIG.logoPath}
          alt={alt}
          width={SITE_CONFIG.logoWidth}
          height={SITE_CONFIG.logoHeight}
          className="w-full h-full object-cover object-[49%_46.5%] scale-[1.18] origin-[49%_46.5%]"
          decoding="async"
        />
      </picture>
    </span>
  );
}
