/**
 * Button Styles Component Library
 * ================================
 * Reusable button styles for the entire application
 */

import { ViewStyle, TextStyle } from 'react-native';
import { theme } from '../theme';

// NO MODULE-LEVEL DESTRUCTURING - Direct access only

// Button base styles
const buttonBase: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: theme.spacing['4'],
  paddingVertical: theme.spacing['3'],
  borderRadius: theme.layout.borderRadius.button,
  minHeight: 48,
  minWidth: 64,
};

// Button variants
export const buttonVariants = {
  // Primary button (main actions)
  primary: {
    container: {
      ...buttonBase,
      backgroundColor: theme.colors.buttonPrimaryBackground,
      ...theme.layout.shadows.sm,
    } as ViewStyle,
    text: {
      ...theme.typography.button,
      color: theme.colors.buttonPrimaryText,
    } as TextStyle,
    pressed: {
      backgroundColor: theme.colors.primary500,
    } as ViewStyle,
    disabled: {
      backgroundColor: theme.colors.buttonDisabledBackground,
    } as ViewStyle,
  },

  // Secondary button (alternative actions)
  secondary: {
    container: {
      ...buttonBase,
      backgroundColor: theme.colors.buttonSecondaryBackground,
      borderWidth: 1,
      borderColor: theme.colors.borderLight,
    } as ViewStyle,
    text: {
      ...theme.typography.button,
      color: theme.colors.buttonSecondaryText,
    } as TextStyle,
    pressed: {
      backgroundColor: theme.colors.gray200,
    } as ViewStyle,
    disabled: {
      backgroundColor: theme.colors.buttonDisabledBackground,
      borderColor: theme.colors.borderLight,
    } as ViewStyle,
  },

  // Ghost button (minimal style)
  ghost: {
    container: {
      ...buttonBase,
      backgroundColor: theme.colors.transparent,
    } as ViewStyle,
    text: {
      ...theme.typography.button,
      color: theme.colors.textPrimary,
    } as TextStyle,
    pressed: {
      backgroundColor: theme.colors.blackOverlay5,
    } as ViewStyle,
    disabled: {
      opacity: 0.5,
    } as ViewStyle,
  },

  // Danger button (destructive actions)
  danger: {
    container: {
      ...buttonBase,
      backgroundColor: theme.colors.buttonDangerBackground,
      ...theme.layout.shadows.sm,
    } as ViewStyle,
    text: {
      ...theme.typography.button,
      color: theme.colors.buttonDangerText,
    } as TextStyle,
    pressed: {
      backgroundColor: theme.colors.error700,
    } as ViewStyle,
    disabled: {
      backgroundColor: theme.colors.buttonDisabledBackground,
    } as ViewStyle,
  },

  // Link button (text only)
  link: {
    container: {
      ...buttonBase,
      backgroundColor: theme.colors.transparent,
      paddingHorizontal: 0,
      paddingVertical: 0,
      minHeight: 0,
    } as ViewStyle,
    text: {
      ...theme.typography.button,
      color: theme.colors.primary400,
      textDecorationLine: 'underline',
    } as TextStyle,
    pressed: {
      opacity: 0.7,
    } as ViewStyle,
    disabled: {
      opacity: 0.5,
    } as ViewStyle,
  },
};

// Button sizes
export const buttonSizes = {
  small: {
    container: {
      paddingHorizontal: theme.spacing['3'],
      paddingVertical: theme.spacing['2'],
      minHeight: 36,
    } as ViewStyle,
    text: {
      ...theme.typography.buttonSmall,
    } as TextStyle,
  },

  medium: {
    container: {
      paddingHorizontal: theme.spacing['4'],
      paddingVertical: theme.spacing['3'],
      minHeight: 48,
    } as ViewStyle,
    text: {
      ...theme.typography.button,
    } as TextStyle,
  },

  large: {
    container: {
      paddingHorizontal: theme.spacing['6'],
      paddingVertical: theme.spacing['4'],
      minHeight: 56,
    } as ViewStyle,
    text: {
      ...theme.typography.buttonLarge,
    } as TextStyle,
  },
};

// Icon button styles
export const iconButtonStyles = {
  small: {
    container: {
      width: 32,
      height: 32,
      borderRadius: theme.layout.borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,
    icon: {
      width: 16,
      height: 16,
    },
  },

  medium: {
    container: {
      width: 40,
      height: 40,
      borderRadius: theme.layout.borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,
    icon: {
      width: 20,
      height: 20,
    },
  },

  large: {
    container: {
      width: 48,
      height: 48,
      borderRadius: theme.layout.borderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,
    icon: {
      width: 24,
      height: 24,
    },
  },
};

// FAB (Floating Action Button) styles
export const fabStyles = {
  container: {
    position: 'absolute' as ViewStyle['position'],
    bottom: theme.spacing['6'],
    right: theme.spacing['4'],
    width: 56,
    height: 56,
    borderRadius: theme.layout.borderRadius.full,
    backgroundColor: theme.colors.fabBackground,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  } as ViewStyle,

  extended: {
    container: {
      position: 'absolute' as ViewStyle['position'],
      bottom: theme.spacing['6'],
      right: theme.spacing['4'],
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing['4'],
      paddingVertical: theme.spacing['3'],
      minHeight: 48,
      borderRadius: theme.layout.borderRadius.full,
      backgroundColor: theme.colors.fabBackground,
      shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
    } as ViewStyle,
    text: {
      ...theme.typography.button,
      color: theme.colors.white,
      marginLeft: theme.spacing['2'],
    } as TextStyle,
  },

  mini: {
    container: {
      position: 'absolute' as ViewStyle['position'],
      bottom: theme.spacing['6'],
      right: theme.spacing['4'],
      width: 40,
      height: 40,
      borderRadius: theme.layout.borderRadius.full,
      backgroundColor: theme.colors.fabBackground,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    } as ViewStyle,
  },
};

// Helper function to combine button styles
export const getButtonStyle = (
  variant: keyof typeof buttonVariants = 'primary',
  size: keyof typeof buttonSizes = 'medium',
  isPressed?: boolean,
  isDisabled?: boolean
) => {
  const variantStyle = buttonVariants[variant];
  const sizeStyle = buttonSizes[size];

  let containerStyle = {
    ...variantStyle.container,
    ...sizeStyle.container,
  };

  if (isPressed && variantStyle.pressed) {
    containerStyle = { ...containerStyle, ...variantStyle.pressed };
  }

  if (isDisabled && variantStyle.disabled) {
    containerStyle = { ...containerStyle, ...variantStyle.disabled };
  }

  return {
    container: containerStyle,
    text: {
      ...variantStyle.text,
      ...sizeStyle.text,
      ...(isDisabled ? { color: theme.colors.buttonDisabledText } : {}),
    },
  };
};