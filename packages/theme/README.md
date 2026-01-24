# @aksara/theme

Theme configuration and styling utilities for Aksara Framework with support for Tailwind CSS, fonts, and z-index management.

## Features

- ✅ Theme configuration (colors, fonts, z-index)
- ✅ Tailwind CSS config generator
- ✅ Font setup utilities (Next.js compatible)
- ✅ CSS variables generator
- ✅ Z-index hierarchy management
- ✅ Global CSS generator
- ✅ Configurable color palettes

## Installation

```bash
npm install @aksara/theme
```

## Usage

### Basic Theme Setup

```typescript
import { createTheme, defaultTheme } from '@aksara/theme';

// Use default theme
const theme = defaultTheme;

// Create custom theme
const customTheme = createTheme({
  colors: {
    primary: '#3ACCBC',
    secondary: '#87D86D',
    background: '#F5F5F5',
    text: '#242424'
  },
  fonts: {
    sans: {
      family: 'Baloo 2',
      variable: '--font-baloo-2',
      weights: ['400', '500', '600', '700', '800'],
      subsets: ['latin'],
      fallback: ['Arial', 'Helvetica', 'sans-serif']
    }
  }
});
```

### Tailwind Configuration

```typescript
import { generateTailwindConfig } from '@aksara/theme';

// Generate Tailwind config
const tailwindConfig = generateTailwindConfig({
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: customTheme
});

// Use in tailwind.config.js
module.exports = tailwindConfig;
```

### Font Setup (Next.js)

```typescript
import { Baloo_2 } from 'next/font/google';
import { getNextFontConfig } from '@aksara/theme';

const fontConfig = {
  family: 'Baloo 2',
  variable: '--font-baloo-2',
  weights: ['400', '500', '600', '700', '800'],
  subsets: ['latin']
};

const baloo2 = Baloo_2(getNextFontConfig(fontConfig));
```

### CSS Variables

```typescript
import { getCSSVariables } from '@aksara/theme';

const cssVars = getCSSVariables(theme);
// Returns: { '--color-primary': '#3ACCBC', '--color-secondary': '#87D86D', ... }
```

### Global CSS Generation

```typescript
import { generateGlobalCSS } from '@aksara/theme';

const globalCSS = generateGlobalCSS(theme);
// Returns complete CSS string with Tailwind directives, CSS variables, and z-index classes
```

### Z-Index Management

```typescript
import { generateZIndexCSS, getZIndex } from '@aksara/theme';

// Generate z-index CSS classes
const zIndexCSS = generateZIndexCSS(theme.zIndex);

// Get specific z-index value
const modalZIndex = getZIndex('modal', theme.zIndex); // Returns 9000
```

## Types

```typescript
interface ThemeConfig {
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

interface ColorPalette {
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
}

interface ZIndexConfig {
  popupNotice?: number;
  modal?: number;
  sidebar?: number;
  // ... more z-index values
}
```

## Default Values

### Colors
- Primary: `#3ACCBC` (Teal)
- Secondary: `#87D86D` (Green)
- Background: `#F5F5F5`
- Text: `#242424`

### Z-Index Hierarchy
- Popup Notice: `9999`
- Modal: `9000`
- Bottom Menu: `8000`
- Sidebar: `7000`
- Content: `1000`

### Fonts
- Default: Baloo 2 (Google Fonts)
- Variable: `--font-baloo-2`
- Weights: 400, 500, 600, 700, 800

## License

Proprietary - Copyright (c) 2025 Panji Tianda (panjitianda@gmail.com) - In behalf of Aksara Nirwana Tianda. All rights reserved.
