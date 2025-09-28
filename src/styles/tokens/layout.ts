/**
 * Layout Design Tokens
 * ====================
 * Centralized layout system for borders, shadows, and dimensions
 */

import { ViewStyle } from 'react-native';

// Border radius scale
export const borderRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  '4xl': 32,
  full: 999,
  // Component specific
  button: 12,
  card: 16,
  input: 8,
  modal: 20,
  chip: 999,
  avatar: 999,
};

// Border widths
export const borderWidth = {
  none: 0,
  hairline: 0.5,
  thin: 1,
  medium: 2,
  thick: 3,
  heavy: 4,
};

// Shadows (iOS and Android compatible)
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  } as ViewStyle,

  xs: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,

  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  } as ViewStyle,

  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  } as ViewStyle,

  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  } as ViewStyle,

  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  } as ViewStyle,

  '2xl': {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  } as ViewStyle,

  // Colored shadows
  primary: {
    shadowColor: '#9A65FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,

  error: {
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,

  // Inner shadow (simulated with border)
  inner: {
    borderWidth: borderWidth.hairline,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  } as ViewStyle,
};

// Z-index layers
export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  toast: 80,
  loading: 90,
};

// Common dimensions
export const dimensions = {
  // Screen breakpoints
  screenSmall: 320,
  screenMedium: 375,
  screenLarge: 428,
  screenXLarge: 768,

  // Component heights
  buttonHeight: 48,
  buttonHeightSmall: 36,
  buttonHeightLarge: 56,

  inputHeight: 48,
  inputHeightSmall: 36,
  inputHeightLarge: 56,

  tabBarHeight: 80,
  topBarHeight: 56,

  // Icon sizes
  iconXS: 12,
  iconSM: 16,
  iconMD: 20,
  iconLG: 24,
  iconXL: 32,
  icon2XL: 40,
  icon3XL: 48,

  // Avatar sizes
  avatarXS: 24,
  avatarSM: 32,
  avatarMD: 40,
  avatarLG: 48,
  avatarXL: 64,
  avatar2XL: 80,
  avatar3XL: 96,

  // Minimum touch targets (accessibility)
  minTouchTarget: 44,

  // Maximum content widths
  maxContentWidth: 600,
  maxCardWidth: 400,
  maxModalWidth: 500,
};

// Opacity levels
export const opacity = {
  transparent: 0,
  barely: 0.05,
  faint: 0.1,
  subtle: 0.2,
  light: 0.3,
  medium: 0.5,
  strong: 0.7,
  heavy: 0.9,
  opaque: 1,
};

// Animation durations (in milliseconds)
export const animations = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 350,
  slower: 500,
  slowest: 750,

  // Easing functions (React Native compatible)
  easing: {
    linear: 'linear' as const,
    ease: 'ease' as const,
    easeIn: 'ease-in' as const,
    easeOut: 'ease-out' as const,
    easeInOut: 'ease-in-out' as const,
  },
};

// Aspect ratios
export const aspectRatios = {
  square: 1,          // 1:1
  video: 16 / 9,      // 16:9
  videoVertical: 9 / 16, // 9:16
  photo: 4 / 3,       // 4:3
  photoWide: 3 / 2,   // 3:2
  photoTall: 2 / 3,   // 2:3
  cinema: 21 / 9,     // 21:9
};

// Legacy mappings - using direct values to avoid circular dependencies
export const legacyBorderRadius = {
  none: 0,
  xs: 2,   // borderRadius.xs
  sm: 4,   // borderRadius.sm
  md: 8,   // borderRadius.md
  lg: 12,  // borderRadius.lg
  xl: 16,  // borderRadius.xl
  '2xl': 20,
  '3xl': 24,
  '4xl': 32,
  full: 999,
  // Component specific
  button: 12,
  card: 16,
  input: 8,
  modal: 20,
  chip: 999,
  avatar: 999,
};

export const legacyShadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  } as ViewStyle,
  xs: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  } as ViewStyle,
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  } as ViewStyle,
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  } as ViewStyle,
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  } as ViewStyle,
  '2xl': {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  } as ViewStyle,
  // Colored shadows
  primary: {
    shadowColor: '#9A65FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,
  error: {
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.20,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,
  // Inner shadow (simulated with border)
  inner: {
    borderWidth: 0.5, // borderWidth.hairline
    borderColor: 'rgba(0, 0, 0, 0.1)',
  } as ViewStyle,
};

// Type exports
export type BorderRadiusToken = keyof typeof borderRadius;
export type BorderWidthToken = keyof typeof borderWidth;
export type ShadowToken = keyof typeof shadows;
export type ZIndexToken = keyof typeof zIndex;
export type OpacityToken = keyof typeof opacity;