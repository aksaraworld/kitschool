/**
 * Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
 */

import { ThemeConfig, CSSVariablesOptions } from './types';
import { defaultTheme } from './theme';
import { generateZIndexCSS } from './zIndex';

/**
 * Generate global CSS from theme
 */
export function generateGlobalCSS(theme: ThemeConfig = defaultTheme): string {
  const cssVars = getCSSVariables(theme);
  const cssVarDeclarations = Object.entries(cssVars)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');

  const zIndexCSS = generateZIndexCSS(theme.zIndex);

  return `
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
${cssVarDeclarations}
}

/* Z-Index Hierarchy */
${zIndexCSS}

/* Force light theme if configured */
${theme.darkMode === 'force-light' ? `
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: ${theme.colors.background};
    --color-foreground: ${theme.colors.foreground || theme.colors.text || '#242424'};
    --color-text: ${theme.colors.text || '#242424'};
  }
}

html {
  background-color: ${theme.colors.background} !important;
  color: ${theme.colors.text || '#242424'} !important;
}
` : ''}

body {
  background: ${theme.colors.background} !important;
  color: ${theme.colors.text || '#242424'} !important;
  font-family: ${getFontFamilyCSS(theme.fonts.sans || { family: 'sans-serif' })};
}
`;
}

/**
 * Get CSS variables object
 */
function getCSSVariables(theme: ThemeConfig): Record<string, string> {
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

/**
 * Get font-family CSS value
 */
function getFontFamilyCSS(fontConfig: { family: string; variable?: string; fallback?: string[] }): string {
  const fallback = fontConfig.fallback || ['sans-serif'];
  if (fontConfig.variable) {
    return `var(${fontConfig.variable}), ${fallback.join(', ')}`;
  }
  return `${fontConfig.family}, ${fallback.join(', ')}`;
}
