/**
 * Main Theme Configuration - Fixed Version
 * ========================================
 * Central theme object that combines all design tokens
 */

// Direct imports to avoid circular dependencies
import * as ColorTokens from './tokens/colors';
import * as TypographyTokens from './tokens/typography';
import * as SpacingTokens from './tokens/spacing';
import * as LayoutTokens from './tokens/layout';

// Extract the actual exports
const colors = ColorTokens.colors;
const typography = TypographyTokens.typography;
const fontSizes = TypographyTokens.fontSizes;
const fontWeights = TypographyTokens.fontWeights;
const spacing = SpacingTokens.spacing;
const semanticSpacing = SpacingTokens.semanticSpacing;
const borderRadius = LayoutTokens.legacyBorderRadius;
const shadows = LayoutTokens.legacyShadows;
const dimensions = LayoutTokens.dimensions;
const opacity = LayoutTokens.opacity;
const animations = LayoutTokens.animations;
const borderWidth = LayoutTokens.borderWidth;

// Light theme colors
const lightColors = {
  ...colors,
  // Semantic color mappings for easy customization
  brand: {
    primary: colors.primary400,
    primaryHover: colors.primary500,
    primaryPressed: colors.primary600,
    primaryDisabled: colors.primary200,
    primaryLight: colors.primary100,
    primaryLighter: colors.primary50,
  },

  ui: {
    background: colors.white,
    surface: colors.white,
    surfaceHover: colors.gray50,
    surfacePressed: colors.gray100,
    border: colors.gray300,
    borderHover: colors.gray400,
    divider: colors.gray200,
    muted: colors.gray200,
  },

  text: {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    tertiary: colors.textTertiary,
    disabled: colors.textDisabled,
    inverse: colors.textOnDark,
    brand: colors.primary500,
    error: colors.error600,
    warning: colors.warning600,
    success: colors.success600,
  },

  feedback: {
    error: colors.error500,
    errorLight: colors.error100,
    warning: colors.warning500,
    warningLight: colors.warning100,
    success: colors.success500,
    successLight: colors.success100,
    info: colors.info500,
    infoLight: colors.info100,
  },

  overlay: {
    backdrop: colors.blackOverlay60,
    surface: colors.blackOverlay80,
    light: colors.whiteOverlay20,
    heavy: colors.blackOverlay90,
  },
};

// Dark theme colors (inverted)
const darkColors = {
  ...colors,
  brand: {
    primary: colors.primary400,
    primaryHover: colors.primary500,
    primaryPressed: colors.primary600,
    primaryDisabled: colors.primary200,
    primaryLight: colors.primary100,
    primaryLighter: colors.primary50,
  },

  ui: {
    background: colors.black,
    surface: colors.gray900,
    surfaceHover: colors.gray800,
    surfacePressed: colors.gray700,
    border: colors.gray700,
    borderHover: colors.gray600,
    divider: colors.gray800,
    muted: colors.gray800,
  },

  text: {
    primary: colors.white,
    secondary: colors.gray300,
    tertiary: colors.gray400,
    disabled: colors.gray600,
    inverse: colors.black,
    brand: colors.primary400,
    error: colors.error400,
    warning: colors.warning400,
    success: colors.success400,
  },

  feedback: {
    error: colors.error500,
    errorLight: colors.error900,
    warning: colors.warning500,
    warningLight: colors.warning900,
    success: colors.success500,
    successLight: colors.success900,
    info: colors.info500,
    infoLight: colors.info900,
  },

  overlay: {
    backdrop: 'rgba(0, 0, 0, 0.8)',
    surface: 'rgba(0, 0, 0, 0.9)',
    light: 'rgba(255, 255, 255, 0.1)',
    heavy: 'rgba(0, 0, 0, 0.95)',
  },
};

// Main theme object - the single source of truth for the design system
export const theme = {
  // Color system (default light)
  colors: lightColors,

  // Typography system
  typography: {
    ...typography,
    // Quick access to common font combinations
    sizes: fontSizes,
    weights: fontWeights,
  },

  // Spacing system
  spacing: {
    ...spacing,
    // Semantic spacing for common use cases
    component: semanticSpacing,
  },

  // Layout properties
  layout: {
    borderRadius,
    shadows,
    dimensions,
    opacity,
    animations,
    borderWidth,
  },

  // Component variants (for theme switching)
  components: {
    button: {
      primary: {
        backgroundColor: colors.primary400,
        color: colors.white,
        borderColor: colors.primary400,
      },
      secondary: {
        backgroundColor: colors.transparent,
        color: colors.primary500,
        borderColor: colors.primary400,
      },
      ghost: {
        backgroundColor: colors.transparent,
        color: colors.textPrimary,
        borderColor: colors.transparent,
      },
    },

    input: {
      default: {
        backgroundColor: colors.inputBackground,
        borderColor: colors.inputBorder,
        color: colors.textPrimary,
        placeholderColor: colors.inputTextPlaceholder,
      },
      focused: {
        borderColor: colors.inputBorderFocused,
      },
      error: {
        borderColor: colors.error500,
      },
    },

    card: {
      default: {
        backgroundColor: colors.cardBackground,
        borderColor: colors.cardBorder,
        shadowColor: colors.cardShadow,
      },
    },

    navigation: {
      tabBar: {
        backgroundColor: colors.tabBarBackground,
        borderColor: colors.divider,
        activeColor: colors.tabBarIconActive,
        inactiveColor: colors.tabBarIconInactive,
      },
      topBar: {
        backgroundColor: colors.surfaceBackground,
        borderColor: colors.divider,
        titleColor: colors.textPrimary,
      },
    },
  },

  // Breakpoints for responsive design
  breakpoints: {
    mobile: 0,
    tablet: 768,
    desktop: 1024,
  },

  // Z-index scale
  zIndex: {
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
  },
};

// Theme variants for dark mode support
export const lightTheme = theme;

export const darkTheme = {
  ...theme,
  colors: darkColors,
};

// Function to get theme based on dark mode
export const getTheme = (isDarkMode: boolean) => {
  return isDarkMode ? darkTheme : lightTheme;
};

// Theme context type (for TypeScript)
export type Theme = typeof theme;
export type ThemeColors = typeof theme.colors;
export type ThemeTypography = typeof theme.typography;
export type ThemeSpacing = typeof theme.spacing;
export type ThemeLayout = typeof theme.layout;

// Named exports for backward compatibility
export { colors, typography, spacing };
export const layout = theme.layout;

// Default export
export default theme;