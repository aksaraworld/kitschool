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
  className = 'h-[52px] w-auto object-contain',
  textClassName = 'font-heading text-3xl font-bold text-primary-500',
}: BrandLogoProps) {
  const [logoError, setLogoError] = useState(false);

  if (logoError) {
    return <h1 className={textClassName}>{brand.name}</h1>;
  }

  return (
    <Image
      src={brand.logo}
      alt={brand.name}
      width={width}
      height={height}
      className={className}
      style={{ width: 'auto', height: className.includes('h-9') ? '2.25rem' : `${height}px` }}
      unoptimized
      onError={() => setLogoError(true)}
      priority
    />
  );
}
