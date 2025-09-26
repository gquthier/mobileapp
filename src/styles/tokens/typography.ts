/**
 * Typography Design Tokens
 * ========================
 * Centralized typography system following a modular scale
 */

import { TextStyle } from 'react-native';

// Font families
export const fontFamilies = {
  regular: 'System',
  medium: 'System',
  semibold: 'System',
  bold: 'System',
  light: 'System',
  // Add custom fonts here when implemented
  // regular: 'Inter-Regular',
  // medium: 'Inter-Medium',
  // semibold: 'Inter-SemiBold',
  // bold: 'Inter-Bold',
};

// Font weights
export const fontWeights = {
  light: '300' as TextStyle['fontWeight'],
  regular: '400' as TextStyle['fontWeight'],
  medium: '500' as TextStyle['fontWeight'],
  semibold: '600' as TextStyle['fontWeight'],
  bold: '700' as TextStyle['fontWeight'],
  black: '900' as TextStyle['fontWeight'],
};

// Font sizes (using modular scale - ratio 1.2)
export const fontSizes = {
  // Tiny sizes
  xxs: 10,
  xs: 12,

  // Body sizes
  sm: 14,
  md: 16,  // Base size
  lg: 18,

  // Heading sizes
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 36,
  '6xl': 42,
  '7xl': 48,
};

// Line heights (relative to font size)
export const lineHeights = {
  tight: 1.2,
  snug: 1.3,
  normal: 1.4,
  relaxed: 1.5,
  loose: 1.75,
};

// Letter spacing
export const letterSpacing = {
  tightest: -0.8,
  tighter: -0.5,
  tight: -0.3,
  normal: 0,
  wide: 0.3,
  wider: 0.5,
  widest: 0.8,
};

// Typography styles (predefined combinations)
export const typography = {
  // Display styles (for large headings)
  display1: {
    fontSize: fontSizes['7xl'],
    fontWeight: fontWeights.bold,
    lineHeight: fontSizes['7xl'] * lineHeights.tight,
    letterSpacing: letterSpacing.tighter,
  } as TextStyle,

  display2: {
    fontSize: fontSizes['6xl'],
    fontWeight: fontWeights.bold,
    lineHeight: fontSizes['6xl'] * lineHeights.tight,
    letterSpacing: letterSpacing.tighter,
  } as TextStyle,

  // Headings
  h1: {
    fontSize: fontSizes['5xl'],
    fontWeight: fontWeights.bold,
    lineHeight: fontSizes['5xl'] * lineHeights.tight,
    letterSpacing: letterSpacing.tight,
  } as TextStyle,

  h2: {
    fontSize: fontSizes['4xl'],
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes['4xl'] * lineHeights.snug,
    letterSpacing: letterSpacing.tight,
  } as TextStyle,

  h3: {
    fontSize: fontSizes['3xl'],
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes['3xl'] * lineHeights.snug,
    letterSpacing: letterSpacing.tight,
  } as TextStyle,

  h4: {
    fontSize: fontSizes['2xl'],
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes['2xl'] * lineHeights.snug,
    letterSpacing: letterSpacing.tight,
  } as TextStyle,

  h5: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.xl * lineHeights.normal,
    letterSpacing: letterSpacing.tight,
  } as TextStyle,

  h6: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.lg * lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  } as TextStyle,

  // Body text
  bodyLarge: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.regular,
    lineHeight: fontSizes.lg * lineHeights.relaxed,
    letterSpacing: letterSpacing.normal,
  } as TextStyle,

  bodyLargeBold: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.lg * lineHeights.relaxed,
    letterSpacing: letterSpacing.normal,
  } as TextStyle,

  body: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.regular,
    lineHeight: fontSizes.md * lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  } as TextStyle,

  bodyBold: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.md * lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  } as TextStyle,

  bodySmall: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: fontSizes.sm * lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  } as TextStyle,

  bodySmallBold: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.sm * lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  } as TextStyle,

  // Supporting text
  caption: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: fontSizes.sm * lineHeights.snug,
    letterSpacing: letterSpacing.normal,
  } as TextStyle,

  captionBold: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    lineHeight: fontSizes.sm * lineHeights.snug,
    letterSpacing: letterSpacing.normal,
  } as TextStyle,

  tiny: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.regular,
    lineHeight: fontSizes.xs * lineHeights.snug,
    letterSpacing: letterSpacing.normal,
  } as TextStyle,

  tinyBold: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.medium,
    lineHeight: fontSizes.xs * lineHeights.snug,
    letterSpacing: letterSpacing.normal,
  } as TextStyle,

  micro: {
    fontSize: fontSizes.xxs,
    fontWeight: fontWeights.regular,
    lineHeight: fontSizes.xxs * lineHeights.normal,
    letterSpacing: letterSpacing.wide,
  } as TextStyle,

  // UI elements
  button: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.md * lineHeights.tight,
    letterSpacing: letterSpacing.wide,
  } as TextStyle,

  buttonSmall: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.sm * lineHeights.tight,
    letterSpacing: letterSpacing.wide,
  } as TextStyle,

  buttonLarge: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    lineHeight: fontSizes.lg * lineHeights.tight,
    letterSpacing: letterSpacing.normal,
  } as TextStyle,

  label: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
    lineHeight: fontSizes.sm * lineHeights.tight,
    letterSpacing: letterSpacing.wide,
    textTransform: 'uppercase' as TextStyle['textTransform'],
  } as TextStyle,

  input: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.regular,
    lineHeight: fontSizes.md * lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  } as TextStyle,

  // Special styles
  code: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.regular,
    lineHeight: fontSizes.sm * lineHeights.relaxed,
    letterSpacing: letterSpacing.normal,
    fontFamily: 'monospace',
  } as TextStyle,

  quote: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.light,
    lineHeight: fontSizes.lg * lineHeights.loose,
    letterSpacing: letterSpacing.normal,
    fontStyle: 'italic' as TextStyle['fontStyle'],
  } as TextStyle,
};

// Legacy typography mapping (for backward compatibility)
export const legacyTypography = {
  h1: typography.h3, // Old h1 was 28px, now h3
  h2: typography.h5, // Old h2 was 20px, now h5
  body: typography.body,
  bodyBold: typography.bodyBold,
  caption: typography.caption,
  tiny: typography.tiny,
};

// Type exports
export type TypographyToken = keyof typeof typography;
export type FontSizeToken = keyof typeof fontSizes;
export type FontWeightToken = keyof typeof fontWeights;