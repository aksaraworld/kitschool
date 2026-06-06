/**
 * Per-deployment branding & theme (kitschool vs cognifa/default).
 */
const theme = (process.env.NEXT_PUBLIC_THEME || 'default') as 'default' | 'kitschool';

export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || 'Aksara School Management',
  logo: process.env.NEXT_PUBLIC_BRAND_LOGO || '/logo.png',
  tagline:
    process.env.NEXT_PUBLIC_BRAND_TAGLINE ||
    'Lacak. Terhubung. Percaya. Semua dalam Satu Tempat',
  theme,
  /** School logo in header (deployment default for single-school kitschool) */
  schoolLogo:
    process.env.NEXT_PUBLIC_SCHOOL_LOGO ||
    (theme === 'kitschool' ? '/ppst-alum-logo.png' : ''),
  schoolName:
    process.env.NEXT_PUBLIC_SCHOOL_NAME ||
    (theme === 'kitschool' ? 'PPST Al UM' : ''),
};

export const isKitschoolTheme = brand.theme === 'kitschool';
