/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import { FontConfig } from './types';

/**
 * Font setup utilities for Next.js
 */

/**
 * Get Next.js font configuration
 * For use with next/font/google or next/font/local
 */
export function getNextFontConfig(fontConfig: FontConfig) {
  return {
    subsets: fontConfig.subsets || ['latin'],
    weight: fontConfig.weights || ['400'],
    variable: fontConfig.variable || `--font-${fontConfig.family.toLowerCase().replace(/\s+/g, '-')}`
  };
}

/**
 * Generate font CSS variable
 */
export function getFontCSSVariable(fontConfig: FontConfig): string {
  return fontConfig.variable || `--font-${fontConfig.family.toLowerCase().replace(/\s+/g, '-')}`;
}

/**
 * Generate font-family CSS value
 */
export function getFontFamilyCSS(fontConfig: FontConfig): string {
  const variable = getFontCSSVariable(fontConfig);
  const fallback = fontConfig.fallback || ['sans-serif'];
  return `var(${variable}), ${fallback.join(', ')}`;
}
