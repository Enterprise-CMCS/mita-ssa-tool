import { useState, useEffect } from 'react';

import Image from 'next/image';

import type { ImageProps } from 'next/image';

interface OptimizedImageProps extends Omit<ImageProps, 'onLoad' | 'onError'> {
  fallbackSrc?: string;
  lowQualitySrc?: string;
}

/**
 * ImageOptimizer component that implements progressive loading and fallback
 * for optimized image loading experience
 */
export const ImageOptimizer = ({
  src,
  alt,
  fallbackSrc,
  lowQualitySrc,
  className,
  ...props
}: OptimizedImageProps) => {
  const [imgSrc, setImgSrc] = useState(lowQualitySrc || src);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Reset states when src changes
    setImgSrc(lowQualitySrc || src);
    setIsLoading(true);
    setError(false);
  }, [src, lowQualitySrc]);

  // Handle successful load
  const handleLoad = () => {
    setIsLoading(false);
    // If we're showing the low quality version, switch to high quality
    if (imgSrc === lowQualitySrc) {
      setImgSrc(src);
    }
  };

  // Handle error
  const handleError = () => {
    setError(true);
    setIsLoading(false);
    if (fallbackSrc && imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
    }
  };

  return (
    <div className={`image-container ${isLoading ? 'image-loading' : ''}`}>
      <Image
        src={error && fallbackSrc ? fallbackSrc : imgSrc}
        alt={alt}
        className={`${className || ''} ${isLoading ? 'opacity-50' : 'opacity-100'}`}
        onLoadingComplete={handleLoad}
        onError={handleError}
        loading="lazy"
        {...props}
      />
      {isLoading && (
        <div className="loading-placeholder">
          <span className="loading-spinner"></span>
        </div>
      )}
    </div>
  );
};

export default ImageOptimizer;
