/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import { ThemeConfig, TailwindConfigOptions } from './types';
import { defaultTheme } from './theme';

/**
 * Generate Tailwind CSS configuration
 */
export function generateTailwindConfig(options: TailwindConfigOptions) {
  const theme = options.theme || defaultTheme;
  const fonts: Record<string, string[]> = {};
  const colors: Record<string, string> = {};

  // Generate font family configuration
  Object.entries(theme.fonts).forEach(([key, font]) => {
    if (font) {
      const fallback = font.fallback || ['sans-serif'];
      if (font.variable) {
        fonts[key] = [`var(${font.variable})`, ...fallback];
      } else {
        fonts[key] = [font.family, ...fallback];
      }
    }
  });

  // Generate color configuration
  Object.entries(theme.colors).forEach(([key, value]) => {
    if (typeof value === 'string') {
      colors[key] = value;
    } else if (typeof value === 'object' && value !== null) {
      colors[key] = value as any;
    }
  });

  return {
    content: options.content,
    theme: {
      extend: {
        fontFamily: fonts,
        colors: colors,
        backgroundImage: {
          'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
          'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))'
        }
      }
    },
    plugins: options.plugins || []
  };
}
