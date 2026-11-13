import { useState } from 'react';
import { Code2 } from 'lucide-react';

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

  if (!src || hasError) {
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

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
