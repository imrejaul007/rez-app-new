import { colors } from '@/constants/theme';

// ============================================
// NUQTA DESIGN SYSTEM - Premium Color Palette
// ============================================
export const NUQTA = {
  // Primary Colors
  nileBlue: colors.nileBlue,
  lightMustard: colors.gold,
  linen: colors.linen,
  lightPeach: colors.lightPeach,
  lavenderMist: colors.lavenderMist,

  // Derived Shades
  nileBlueLight: '#243f55',
  nileBlueDark: '#0f2637',
  mustardDark: '#e5b84d',
  mustardLight: '#ffe082',
  peachDark: colors.brand.sand,
  peachLight: '#ffe4d1',
  lavenderDark: '#c5d9ed',

  // Semantic Colors
  text: {
    primary: colors.nileBlue,
    secondary: '#4a6580',
    muted: '#8aa3b8',
    inverse: colors.background.primary,
  },

  // Glass Effects
  glass: {
    white: 'rgba(255, 255, 255, 0.85)',
    whiteBorder: 'rgba(255, 255, 255, 0.5)',
    mustard: 'rgba(255, 205, 87, 0.12)',
    mustardBorder: 'rgba(255, 205, 87, 0.3)',
    peach: 'rgba(255, 215, 181, 0.15)',
    peachBorder: 'rgba(255, 215, 181, 0.4)',
  },
};

// Legacy COLORS for compatibility
export const COLORS = {
  primary: NUQTA.lightMustard,
  primaryDark: NUQTA.nileBlue,
  gold: NUQTA.lightMustard,
  navy: NUQTA.nileBlue,
  slate: NUQTA.nileBlue,
  muted: NUQTA.text.muted,
  surface: NUQTA.linen,
  error: NUQTA.nileBlue,
  warning: NUQTA.lightMustard,
  glassWhite: NUQTA.glass.white,
  glassBorder: NUQTA.glass.whiteBorder,
  glassHighlight: 'rgba(255, 255, 255, 0.6)',
};
