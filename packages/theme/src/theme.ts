/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import { ThemeConfig, ColorPalette, FontConfig, ZIndexConfig } from './types';

/**
 * Default color palette
 */
export const defaultColors: ColorPalette = {
  primary: '#3ACCBC',
  secondary: '#87D86D',
  accent: '#1E1E1E',
  background: '#F5F5F5',
  foreground: '#242424',
  text: '#242424',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  input: '#F9FAFB',
  error: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
  info: '#3b82f6',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827'
  }
};

/**
 * Default font configuration
 */
export const defaultFonts: Record<string, FontConfig> = {
  sans: {
    family: 'Baloo 2',
    variable: '--font-baloo-2',
    weights: ['400', '500', '600', '700', '800'],
    subsets: ['latin'],
    fallback: ['Arial', 'Helvetica', 'sans-serif']
  }
};

/**
 * Default z-index configuration
 */
export const defaultZIndex: ZIndexConfig = {
  popupNotice: 9999,
  alert: 9999,
  toast: 9999,
  modal: 9000,
  modalBackdrop: 8999,
  formPopup: 9000,
  bottomMenu: 8000,
  sidebar: 7000,
  sidebarBackdrop: 6999,
  content: 1000,
  header: 1100,
  permissionModal: 10000
};

/**
 * Default theme configuration
 */
export const defaultTheme: ThemeConfig = {
  colors: defaultColors,
  fonts: defaultFonts,
  zIndex: defaultZIndex,
  darkMode: 'force-light',
  roundness: 8
};

/**
 * Create custom theme
 */
export function createTheme(config: Partial<ThemeConfig>): ThemeConfig {
  return {
    ...defaultTheme,
    ...config,
    colors: {
      ...defaultColors,
      ...config.colors
    },
    fonts: {
      ...defaultFonts,
      ...config.fonts
    },
    zIndex: {
      ...defaultZIndex,
      ...config.zIndex
    }
  };
}

/**
 * Get CSS variables from theme
 */
export function getCSSVariables(theme: ThemeConfig, prefix: string = ''): Record<string, string> {
  const vars: Record<string, string> = {};

  // Color variables
  Object.entries(theme.colors).forEach(([key, value]) => {
    if (typeof value === 'string') {
      vars[`--color-${key}`] = value;
    } else if (typeof value === 'object' && value !== null) {
      Object.entries(value).forEach(([subKey, subValue]) => {
        vars[`--color-${key}-${subKey}`] = subValue as string;
      });
    }
  });

  // Font variables
  Object.entries(theme.fonts).forEach(([key, font]) => {
    if (font?.variable) {
      vars[font.variable] = `var(${font.variable})`;
    }
  });

  // Background and foreground
  vars['--background'] = theme.colors.background;
  vars['--foreground'] = theme.colors.foreground || theme.colors.text || '#242424';

  return vars;
}
