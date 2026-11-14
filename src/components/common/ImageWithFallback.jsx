import { useState, useEffect } from 'react';
import { Code2 } from 'lucide-react';
import { getImageDimensions } from '../../seo/seoConfig.js';
import { getCachedImageUrl, getImageUrl } from '../../services/media/mediaService.js';

function deriveWebpSrc(src) {
  if (!src || typeof src !== 'string') return null;
  if (src.startsWith('/assets/images/') && /\.(jpg|jpeg|png)$/i.test(src)) {
    return src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  }
  return null;
}

export default function ImageWithFallback({
  src,
  alt,
  className = '',
  fallbackTitle = 'Project Preview',
  loading = 'lazy',
  decoding = 'async',
  fetchPriority,
  width,
  height,
}) {
  const [hasError, setHasError] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState(() => getCachedImageUrl(src));

  useEffect(() => {
    setHasError(false);
    const immediate = getCachedImageUrl(src);
    setResolvedSrc(immediate);

    if (src && typeof src === 'string' && src.startsWith('idb://') && !immediate) {
      let active = true;
      getImageUrl(src).then((url) => {
        if (active) {
          if (url) {
            setResolvedSrc(url);
          } else {
            setHasError(true);
          }
        }
      });
      return () => {
        active = false;
      };
    }
  }, [src]);

  if (!src || !resolvedSrc || hasError) {
    return (
      <div
        role="img"
        aria-label={alt || fallbackTitle}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#E8F5EC] via-[#F7FAF7] to-[#FFFFFF] text-[#116438] p-6 ${className}`}
      >
        <Code2 className="w-8 h-8 text-[#16834A] mb-2" />
        <span className="text-xs font-medium text-[#17231C] text-center max-w-[180px] truncate">
          {fallbackTitle}
        </span>
      </div>
    );
  }

  const dims = getImageDimensions(resolvedSrc);
  const resolvedWidth = width || dims.width;
  const resolvedHeight = height || dims.height;
  const webpSrc = deriveWebpSrc(resolvedSrc);

  const imgElement = (
    <img
      src={resolvedSrc}
      alt={alt}
      width={resolvedWidth}
      height={resolvedHeight}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );

  if (webpSrc) {
    return (
      <picture className="contents">
        <source srcSet={webpSrc} type="image/webp" />
        {imgElement}
      </picture>
    );
  }

  return imgElement;
}
