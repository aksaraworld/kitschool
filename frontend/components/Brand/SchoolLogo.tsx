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
  height = 48,
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
    <div
      className="flex items-center justify-center mx-auto"
      style={{ maxHeight: `${height}px`, maxWidth: `${width}px` }}
    >
      <Image
        src={src}
        alt={label}
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
