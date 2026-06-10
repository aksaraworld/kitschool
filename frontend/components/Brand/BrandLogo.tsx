'use client';

import { useState } from 'react';
import { brand } from '@/lib/branding';

type BrandLogoProps = {
  width?: number;
  height?: number;
  className?: string;
  textClassName?: string;
};

export default function BrandLogo({
  width = 120,
  height = 36,
  className = '',
  textClassName = 'font-heading text-3xl font-bold text-primary-500',
}: BrandLogoProps) {
  const [logoError, setLogoError] = useState(false);

  if (logoError) {
    return <h1 className={textClassName}>{brand.name}</h1>;
  }

  return (
    <img
      src={brand.logo}
      alt={brand.name}
      className={`object-contain mx-auto block ${className}`.trim()}
      style={{ height: `${height}px`, width: 'auto', maxWidth: `${width}px` }}
      onError={() => setLogoError(true)}
    />
  );
}
