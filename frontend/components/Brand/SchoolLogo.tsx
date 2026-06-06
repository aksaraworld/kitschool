'use client';

import { useState } from 'react';
import Image from 'next/image';
import { brand } from '@/lib/branding';

type SchoolLogoProps = {
  logo?: string | null;
  name?: string | null;
  width?: number;
  height?: number;
  className?: string;
  textClassName?: string;
};

export default function SchoolLogo({
  logo,
  name,
  width = 140,
  height = 56,
  className = 'h-14 w-auto object-contain',
  textClassName = 'font-heading text-lg font-bold text-primary-600 text-center',
}: SchoolLogoProps) {
  const [logoError, setLogoError] = useState(false);
  const src = logo || brand.schoolLogo;
  const label = name || brand.schoolName || 'Sekolah';

  if (!src || logoError) {
    return <p className={textClassName}>{label}</p>;
  }

  return (
    <Image
      src={src}
      alt={label}
      width={width}
      height={height}
      className={className}
      style={{ width: 'auto', maxHeight: className.includes('h-14') ? '3.5rem' : `${height}px` }}
      unoptimized
      onError={() => setLogoError(true)}
      priority
    />
  );
}
