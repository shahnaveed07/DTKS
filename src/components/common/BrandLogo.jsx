const LOGO_SRC = '/assets/aistudio/file_000000001b088208817ae4b752e73385__1__6d1528fc.png';

const VARIANT_CLASSES = {
  navbar: 'w-[104px] sm:w-[116px] aspect-[15/8] rounded-lg border border-[#021022]/15 shadow-xs',
  footer: 'w-[164px] aspect-[15/8] rounded-xl border border-white/20 shadow-sm',
  admin: 'w-[104px] aspect-[15/8] rounded-lg border border-[#021022]/15 shadow-xs',
};

export default function BrandLogo({
  variant = 'navbar',
  alt = 'DreamTech Kashmir Solutions',
  className = '',
}) {
  const sizeClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.navbar;

  return (
    <span
      className={`inline-block overflow-hidden shrink-0 select-none bg-[#021022] ${sizeClass} ${className}`}
    >
      <img
        src={LOGO_SRC}
        alt={alt}
        className="w-full h-full object-cover object-[49%_46.5%] scale-[1.18] origin-[49%_46.5%]"
        decoding="async"
      />
    </span>
  );
}
