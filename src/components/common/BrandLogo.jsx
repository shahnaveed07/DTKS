const LOGO_SRC = '/assets/aistudio/DreamTech_Kashmir_Solutions_Logo_ce2eb216.png';

const VARIANT_CLASSES = {
  navbar: 'w-[108px] sm:w-[118px] aspect-[7/4]',
  footer: 'w-[148px] aspect-[7/4]',
  admin: 'w-[100px] aspect-[7/4]',
};

export default function BrandLogo({
  variant = 'navbar',
  alt = 'DreamTech Kashmir Solutions',
  className = '',
}) {
  const sizeClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.navbar;

  return (
    <span className={`inline-block overflow-hidden shrink-0 select-none ${sizeClass} ${className}`}>
      <img
        src={LOGO_SRC}
        alt={alt}
        className="w-full h-full object-cover object-center"
        decoding="async"
      />
    </span>
  );
}
