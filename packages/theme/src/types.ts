/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

/**
 * Color palette configuration
 */
export interface ColorPalette {
  primary: string;
  secondary: string;
  accent?: string;
  background: string;
  foreground?: string;
  text?: string;
  textMuted?: string;
  border?: string;
  input?: string;
  error?: string;
  warning?: string;
  success?: string;
  info?: string;
  gray?: {
    50?: string;
    100?: string;
    200?: string;
    300?: string;
    400?: string;
    500?: string;
    600?: string;
    700?: string;
    800?: string;
    900?: string;
  };
}

/**
 * Font configuration
 */
export interface FontConfig {
  family: string;
  variable?: string;
  weights?: string[];
  subsets?: string[];
  fallback?: string[];
}

/**
 * Theme configuration
 */
export interface ThemeConfig {
  colors: ColorPalette;
  fonts: {
    sans?: FontConfig;
    mono?: FontConfig;
    [key: string]: FontConfig | undefined;
  };
  zIndex?: ZIndexConfig;
  darkMode?: 'light' | 'dark' | 'auto' | 'force-light';
  roundness?: number;
}

/**
 * Z-index configuration
 */
export interface ZIndexConfig {
  popupNotice?: number;
  alert?: number;
  toast?: number;
  modal?: number;
  modalBackdrop?: number;
  formPopup?: number;
  bottomMenu?: number;
  sidebar?: number;
  sidebarBackdrop?: number;
  content?: number;
  header?: number;
  permissionModal?: number;
}

/**
 * Tailwind config generator options
 */
export interface TailwindConfigOptions {
  content: string[];
  theme?: ThemeConfig;
  plugins?: string[];
}

/**
 * CSS variables generator options
 */
export interface CSSVariablesOptions {
  colors: ColorPalette;
  fonts?: Record<string, FontConfig>;
  prefix?: string;
}
