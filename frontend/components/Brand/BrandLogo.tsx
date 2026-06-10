'use client';

import { useState } from 'react';
import Image from 'next/image';
import { brand } from '@/lib/branding';

type BrandLogoProps = {
  width?: number;
  height?: number;
  className?: string;
  textClassName?: string;
};

export default function BrandLogo({
  width = 200,
  height = 52,
  className = '',
  textClassName = 'font-heading text-3xl font-bold text-primary-500',
}: BrandLogoProps) {
  const [logoError, setLogoError] = useState(false);

  if (logoError) {
    return <h1 className={textClassName}>{brand.name}</h1>;
  }

  return (
    <div
      className="flex items-center justify-center"
      style={{ maxHeight: `${height}px`, maxWidth: `${width}px` }}
    >
      <Image
        src={brand.logo}
        alt={brand.name}
        width={width}
        height={height}
        className={`max-h-full max-w-full object-contain ${className}`.trim()}
        style={{ width: 'auto', height: 'auto' }}
        unoptimized
        onError={() => setLogoError(true)}
        priority
      />
    </div>
  );
}
