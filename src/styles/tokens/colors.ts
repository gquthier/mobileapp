/**
 * Color Design Tokens
 * ===================
 * Centralized color system for the entire application
 * All colors should be defined here and nowhere else
 */

// Base colors
const baseColors = {
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

// Gray scale (10 shades)
const grayScale = {
  gray50: '#FCFCFC',
  gray100: '#FAFAFA',
  gray200: '#F5F5F5',
  gray300: '#E6E6E6',
  gray400: '#CCCCCC',
  gray500: '#999999',
  gray600: '#666666',
  gray700: '#333333',
  gray800: '#1A1A1A',
  gray900: '#0D0D0D',
};

// Primary colors (Purple/Violet)
const primaryColors = {
  primary50: '#F5F0FF',
  primary100: '#E8DCFF',
  primary200: '#D4BDFF',
  primary300: '#B894FF',
  primary400: '#9A65FF', // Main accent
  primary500: '#7A3FFF', // Accent dark
  primary600: '#6320EE',
  primary700: '#5011D4',
  primary800: '#3D0BA8',
  primary900: '#2A0572',
};

// Secondary colors (Blue)
const secondaryColors = {
  secondary50: '#F0F2FF',
  secondary100: '#E0E5FF',
  secondary200: '#C1CBFF',
  secondary300: '#93A0FF',
  secondary400: '#5D70FF',
  secondary500: '#2D27FF', // accent2
  secondary600: '#1A14E6',
  secondary700: '#1310CC',
  secondary800: '#0F0FA3',
  secondary900: '#0B0B7A',
};

// Tertiary colors (Pink/Red)
const tertiaryColors = {
  tertiary50: '#FFF0F3',
  tertiary100: '#FFE1E7',
  tertiary200: '#FFC3D0',
  tertiary300: '#FF94AB',
  tertiary400: '#FF5E80',
  tertiary500: '#FF4D6D', // accent3
  tertiary600: '#E63355',
  tertiary700: '#CC1F40',
  tertiary800: '#A61932',
  tertiary900: '#801327',
};

// Semantic colors
const semanticColors = {
  // Success (Green)
  success50: '#F0FDF4',
  success100: '#DCFCE7',
  success200: '#BBF7D0',
  success300: '#86EFAC',
  success400: '#4ADE80',
  success500: '#22C55E',
  success600: '#16A34A',
  success700: '#15803D',
  success800: '#166534',
  success900: '#14532D',

  // Warning (Yellow/Orange)
  warning50: '#FFFBEB',
  warning100: '#FEF3C7',
  warning200: '#FDE68A',
  warning300: '#FCD34D',
  warning400: '#FBBF24',
  warning500: '#F59E0B',
  warning600: '#D97706',
  warning700: '#B45309',
  warning800: '#92400E',
  warning900: '#78350F',

  // Error (Red)
  error50: '#FEF2F2',
  error100: '#FEE2E2',
  error200: '#FECACA',
  error300: '#FCA5A5',
  error400: '#F87171',
  error500: '#EF4444',
  error600: '#DC2626',
  error700: '#B91C1C',
  error800: '#991B1B',
  error900: '#7F1D1D',

  // Info (Blue)
  info50: '#EFF6FF',
  info100: '#DBEAFE',
  info200: '#BFDBFE',
  info300: '#93C5FD',
  info400: '#60A5FA',
  info500: '#3B82F6',
  info600: '#2563EB',
  info700: '#1D4ED8',
  info800: '#1E40AF',
  info900: '#1E3A8A',
};

// Overlay colors (with transparency)
const overlayColors = {
  // Black overlays
  blackOverlay5: 'rgba(0, 0, 0, 0.05)',
  blackOverlay10: 'rgba(0, 0, 0, 0.1)',
  blackOverlay20: 'rgba(0, 0, 0, 0.2)',
  blackOverlay30: 'rgba(0, 0, 0, 0.3)',
  blackOverlay40: 'rgba(0, 0, 0, 0.4)',
  blackOverlay50: 'rgba(0, 0, 0, 0.5)',
  blackOverlay60: 'rgba(0, 0, 0, 0.6)',
  blackOverlay70: 'rgba(0, 0, 0, 0.7)',
  blackOverlay80: 'rgba(0, 0, 0, 0.8)',
  blackOverlay90: 'rgba(0, 0, 0, 0.9)',

  // White overlays
  whiteOverlay5: 'rgba(255, 255, 255, 0.05)',
  whiteOverlay10: 'rgba(255, 255, 255, 0.1)',
  whiteOverlay20: 'rgba(255, 255, 255, 0.2)',
  whiteOverlay30: 'rgba(255, 255, 255, 0.3)',
  whiteOverlay40: 'rgba(255, 255, 255, 0.4)',
  whiteOverlay50: 'rgba(255, 255, 255, 0.5)',
  whiteOverlay60: 'rgba(255, 255, 255, 0.6)',
  whiteOverlay70: 'rgba(255, 255, 255, 0.7)',
  whiteOverlay80: 'rgba(255, 255, 255, 0.8)',
  whiteOverlay90: 'rgba(255, 255, 255, 0.9)',

  // Primary color overlays
  primaryOverlay5: 'rgba(154, 101, 255, 0.05)',
  primaryOverlay10: 'rgba(154, 101, 255, 0.10)',
  primaryOverlay15: 'rgba(154, 101, 255, 0.15)',
  primaryOverlay20: 'rgba(154, 101, 255, 0.20)',
  primaryOverlay30: 'rgba(154, 101, 255, 0.30)',
  primaryOverlay35: 'rgba(154, 101, 255, 0.35)',
  primaryOverlay40: 'rgba(122, 63, 255, 0.40)',
  primaryOverlay50: 'rgba(154, 101, 255, 0.50)',
};

// Component specific colors (semantic naming)
const componentColors = {
  // Navigation
  tabBarBackground: grayScale.gray100,
  tabBarIconActive: baseColors.black,
  tabBarIconInactive: grayScale.gray500,
  fabBackground: grayScale.gray900,

  // Dividers & Borders
  divider: grayScale.gray300,
  borderLight: grayScale.gray300,
  borderMedium: grayScale.gray400,
  borderDark: grayScale.gray600,

  // Surfaces
  surfaceBackground: baseColors.white,
  surfaceElevated: grayScale.gray50,
  surfaceOverlay: overlayColors.blackOverlay80,

  // Text
  textPrimary: grayScale.gray900,
  textSecondary: grayScale.gray600,
  textTertiary: grayScale.gray500,
  textDisabled: grayScale.gray400,
  textOnDark: baseColors.white,
  textOnPrimary: baseColors.white,

  // Inputs
  inputBackground: grayScale.gray100,
  inputBorder: grayScale.gray300,
  inputBorderFocused: primaryColors.primary400,
  inputTextPlaceholder: grayScale.gray500,

  // Buttons
  buttonPrimaryBackground: primaryColors.primary400,
  buttonPrimaryText: baseColors.white,
  buttonSecondaryBackground: grayScale.gray100,
  buttonSecondaryText: grayScale.gray900,
  buttonDangerBackground: semanticColors.error600,
  buttonDangerText: baseColors.white,
  buttonDisabledBackground: grayScale.gray200,
  buttonDisabledText: grayScale.gray400,

  // Recording specific
  recordingBackground: semanticColors.error600,
  recordingPulse: semanticColors.error400,
  cameraOverlay: overlayColors.blackOverlay60,

  // Video player
  videoControlsBackground: overlayColors.blackOverlay70,
  videoProgressBar: primaryColors.primary400,
  videoProgressBackground: overlayColors.whiteOverlay30,

  // Chips & Tags
  chipBackground: grayScale.gray100,
  chipBackgroundActive: primaryColors.primary100,
  chipText: grayScale.gray700,
  chipTextActive: primaryColors.primary600,

  // Cards
  cardBackground: baseColors.white,
  cardBorder: grayScale.gray200,
  cardShadow: overlayColors.blackOverlay10,
};

// Export all color tokens
export const colors = {
  ...baseColors,
  ...grayScale,
  ...primaryColors,
  ...secondaryColors,
  ...tertiaryColors,
  ...semanticColors,
  ...overlayColors,
  ...componentColors,
};

// Legacy mapping (for backward compatibility during migration)
export const legacyColors = {
  white: colors.white,
  black: colors.black,
  tabBarBg: colors.tabBarBackground,
  divider: colors.divider,
  inactive: colors.tabBarIconInactive,
  fabBg: colors.fabBackground,
  gray100: colors.gray100,
  gray200: colors.gray200,
  gray300: colors.gray300,
  gray400: colors.gray400,
  gray500: colors.gray500,
  gray600: colors.gray600,
  gray700: colors.gray700,
  gray800: colors.gray800,
  gray900: colors.gray900,
  accent: colors.primary400,
  accentDark: colors.primary500,
  accent2: colors.secondary500,
  accent3: colors.tertiary500,
  accent06: colors.primaryOverlay5,
  accent10: colors.primaryOverlay10,
  accentShadow35: colors.primaryOverlay35,
  accentShadow40: colors.primaryOverlay40,
};

// Type exports for TypeScript
export type ColorToken = keyof typeof colors;
export type LegacyColorToken = keyof typeof legacyColors;