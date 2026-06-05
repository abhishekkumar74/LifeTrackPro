/**
 * Design system tokens for LifeTrack Pro.
 * Follows the strict design guidelines for premium, modern aesthetics.
 */

export const COLORS = {
  // Theme colors
  bg: '#F7F6F3',          // App background — warm white
  surface: '#FFFFFF',     // Cards, modals, sheets
  navy: '#17172A',        // Hero cards, focus screen, primary headings
  violet: '#5B4FE8',      // Primary accent — CTAs, active nav, progress rings
  violetSoft: '#EAE8FD',  // Violet tinted background
  mint: '#00B894',        // Success, completed, on-track, habits completed
  mintSoft: '#D4F5EE',    // Mint tinted background
  amber: '#E8A020',       // Streaks, warnings, AI nudge card
  amberSoft: '#FEF3DC',   // Amber tinted background
  coral: '#E85858',       // Errors, danger, blocker active
  coralSoft: '#FDE8E8',   // Coral tinted background

  // Text hierarchy
  t1: '#17172A',          // Primary text (Navy)
  t2: '#5C5C70',          // Secondary text
  t3: '#9B9BAF',          // Placeholder, micro-labels

  // Borders and separators
  border: '#E8E7E3',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,
  giga: 64,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const TYPOGRAPHY = {
  fonts: {
    display: 'InstrumentSerif', // Screen titles, hero headings
    sans: 'DMSans',             // UI labels, buttons, body
    mono: 'DMMono',             // Timers, statistics, streaks
  },
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    h3: 28,
    h2: 32,
    h1: 40,
  },
} as const;

export const SHADOWS = {
  card: {
    ios: {
      shadowColor: '#17172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
    },
    android: {
      elevation: 2,
    },
  },
  premium: {
    ios: {
      shadowColor: '#17172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.03,
      shadowRadius: 16,
    },
    android: {
      elevation: 6,
    },
  },
} as const;

export interface ThemeColors {
  bg: string;
  surface: string;
  navy: string;
  violet: string;
  violetSoft: string;
  mint: string;
  mintSoft: string;
  amber: string;
  amberSoft: string;
  coral: string;
  coralSoft: string;
  t1: string;
  t2: string;
  t3: string;
  border: string;
}

export interface Theme {
  colors: ThemeColors;
  spacing: typeof SPACING;
  radius: typeof RADIUS;
  typography: typeof TYPOGRAPHY;
  shadows: typeof SHADOWS;
}

export const theme: Theme = {
  colors: COLORS,
  spacing: SPACING,
  radius: RADIUS,
  typography: TYPOGRAPHY,
  shadows: SHADOWS,
};

export default theme;
