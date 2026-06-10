'use client';

import { useState } from 'react';
import { brand } from '@/lib/branding';

type SchoolLogoProps = {
  logo?: string | null;
  name?: string | null;
  /** Max display height in px */
  height?: number;
  /** Max display width in px */
  width?: number;
  className?: string;
  textClassName?: string;
};

export default function SchoolLogo({
  logo,
  name,
  width = 96,
  height = 32,
  className = '',
  textClassName = 'font-heading text-lg font-bold text-primary-600 text-center',
}: SchoolLogoProps) {
  const [logoError, setLogoError] = useState(false);
  const src = logo || brand.schoolLogo;
  const label = name || brand.schoolName || 'Sekolah';

  if (!src || logoError) {
    return <p className={textClassName}>{label}</p>;
  }

  return (
    <img
      src={src}
      alt={label}
      className={`object-contain mx-auto block ${className}`.trim()}
      style={{ height: `${height}px`, width: 'auto', maxWidth: `${width}px` }}
      onError={() => setLogoError(true)}
    />
  );
}
