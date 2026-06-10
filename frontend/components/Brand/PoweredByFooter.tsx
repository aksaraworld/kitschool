'use client';

import { useState } from 'react';
import Image from 'next/image';
import { brand } from '@/lib/branding';

type PoweredByFooterProps = {
  className?: string;
  schoolName?: string;
};

export default function PoweredByFooter({ className = '', schoolName }: PoweredByFooterProps) {
  const [logoError, setLogoError] = useState(false);
  const year = new Date().getFullYear();
  const label = schoolName;

  return (
    <footer
      className={`border-t border-cognifaNeutral-border bg-white/90 text-xs text-cognifaNeutral-secondary ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <span>© {year}{label ? ` ${label}` : ''}</span>
        <span className="hidden sm:inline text-gray-300">|</span>
        <span className="inline-flex items-center gap-1.5">
          <span>Powered by</span>
          {!logoError ? (
            <Image
              src={brand.logo}
              alt={brand.name}
              width={88}
              height={22}
              className="h-4 w-auto object-contain opacity-90"
              unoptimized
              onError={() => setLogoError(true)}
            />
          ) : (
            <span className="font-semibold text-primary-600">{brand.name}</span>
          )}
        </span>
      </div>
    </footer>
  );
}
