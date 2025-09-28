/**
 * Input Styles Component Library
 * ===============================
 * Reusable input field styles for forms and text inputs
 */

import { ViewStyle, TextStyle } from 'react-native';
import { theme } from '../theme';

// NO MODULE-LEVEL DESTRUCTURING - Direct access only

// Input base styles
const inputBase: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: theme.spacing['3'],
  paddingVertical: theme.spacing['3'],
  borderRadius: theme.layout.borderRadius.input,
  borderWidth: theme.layout.borderWidth.thin,
  minHeight: 48,
  backgroundColor: theme.colors.inputBackground,
  borderColor: theme.colors.inputBorder,
};

// Input variants
export const inputVariants = {
  // Default input
  default: {
    container: {
      ...inputBase,
    } as ViewStyle,
    input: {
      ...theme.typography.input,
      color: theme.colors.textPrimary,
      flex: 1,
    } as TextStyle,
    placeholder: {
      color: theme.colors.inputTextPlaceholder,
    } as TextStyle,
    focused: {
      borderColor: theme.colors.inputBorderFocused,
      borderWidth: theme.layout.borderWidth.medium,
    } as ViewStyle,
    error: {
      borderColor: theme.colors.error500,
      borderWidth: theme.layout.borderWidth.medium,
    } as ViewStyle,
    disabled: {
      backgroundColor: theme.colors.gray100,
      opacity: 0.6,
    } as ViewStyle,
  },

  // Filled input (no border, just background)
  filled: {
    container: {
      ...inputBase,
      borderWidth: 0,
      backgroundColor: theme.colors.gray100,
    } as ViewStyle,
    input: {
      ...theme.typography.input,
      color: theme.colors.textPrimary,
      flex: 1,
    } as TextStyle,
    placeholder: {
      color: theme.colors.inputTextPlaceholder,
    } as TextStyle,
    focused: {
      backgroundColor: theme.colors.gray200,
    } as ViewStyle,
    error: {
      backgroundColor: theme.colors.error50,
    } as ViewStyle,
    disabled: {
      backgroundColor: theme.colors.gray50,
      opacity: 0.6,
    } as ViewStyle,
  },

  // Outline input (transparent background)
  outline: {
    container: {
      ...inputBase,
      backgroundColor: theme.colors.transparent,
      borderWidth: theme.layout.borderWidth.medium,
    } as ViewStyle,
    input: {
      ...theme.typography.input,
      color: theme.colors.textPrimary,
      flex: 1,
    } as TextStyle,
    placeholder: {
      color: theme.colors.inputTextPlaceholder,
    } as TextStyle,
    focused: {
      borderColor: theme.colors.inputBorderFocused,
    } as ViewStyle,
    error: {
      borderColor: theme.colors.error500,
    } as ViewStyle,
    disabled: {
      borderColor: theme.colors.gray300,
      opacity: 0.6,
    } as ViewStyle,
  },

  // Underline input
  underline: {
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 0,
      paddingVertical: theme.spacing['2'],
      borderBottomWidth: theme.layout.borderWidth.thin,
      borderBottomColor: theme.colors.inputBorder,
      backgroundColor: theme.colors.transparent,
      minHeight: 48,
    } as ViewStyle,
    input: {
      ...theme.typography.input,
      color: theme.colors.textPrimary,
      flex: 1,
    } as TextStyle,
    placeholder: {
      color: theme.colors.inputTextPlaceholder,
    } as TextStyle,
    focused: {
      borderBottomColor: theme.colors.inputBorderFocused,
      borderBottomWidth: theme.layout.borderWidth.medium,
    } as ViewStyle,
    error: {
      borderBottomColor: theme.colors.error500,
      borderBottomWidth: theme.layout.borderWidth.medium,
    } as ViewStyle,
    disabled: {
      borderBottomColor: theme.colors.gray300,
      opacity: 0.6,
    } as ViewStyle,
  },
};

// Input sizes
export const inputSizes = {
  small: {
    container: {
      paddingHorizontal: theme.spacing['2'],
      paddingVertical: theme.spacing['2'],
      minHeight: 36,
    } as ViewStyle,
    input: {
      ...theme.typography.bodySmall,
    } as TextStyle,
  },

  medium: {
    container: {
      paddingHorizontal: theme.spacing['3'],
      paddingVertical: theme.spacing['3'],
      minHeight: 48,
    } as ViewStyle,
    input: {
      ...theme.typography.input,
    } as TextStyle,
  },

  large: {
    container: {
      paddingHorizontal: theme.spacing['4'],
      paddingVertical: theme.spacing['4'],
      minHeight: 56,
    } as ViewStyle,
    input: {
      ...theme.typography.bodyLarge,
    } as TextStyle,
  },
};

// Textarea styles
export const textareaStyles = {
  container: {
    ...inputBase,
    minHeight: 100,
    paddingTop: theme.spacing['3'],
    paddingBottom: theme.spacing['3'],
    alignItems: 'flex-start',
  } as ViewStyle,
  input: {
    ...theme.typography.input,
    color: theme.colors.textPrimary,
    flex: 1,
    textAlignVertical: 'top' as TextStyle['textAlignVertical'],
    minHeight: 80,
  } as TextStyle,
};

// Search input styles
export const searchInputStyles = {
  container: {
    ...inputBase,
    backgroundColor: theme.colors.gray100,
    borderWidth: 0,
    borderRadius: theme.layout.borderRadius.full,
  } as ViewStyle,
  input: {
    ...theme.typography.input,
    color: theme.colors.textPrimary,
    flex: 1,
    marginLeft: theme.spacing['2'],
  } as TextStyle,
  icon: {
    width: 20,
    height: 20,
    tintColor: theme.colors.gray500,
  },
};

// Input label styles
export const inputLabelStyles = {
  label: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing['2'],
  } as TextStyle,
  required: {
    color: theme.colors.error500,
  } as TextStyle,
  optional: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    marginLeft: theme.spacing['1'],
  } as TextStyle,
};

// Input helper text styles
export const inputHelperStyles = {
  helper: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing['1'],
  } as TextStyle,
  error: {
    ...theme.typography.caption,
    color: theme.colors.error600,
    marginTop: theme.spacing['1'],
  } as TextStyle,
  success: {
    ...theme.typography.caption,
    color: theme.colors.success600,
    marginTop: theme.spacing['1'],
  } as TextStyle,
  counter: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing['1'],
    textAlign: 'right' as TextStyle['textAlign'],
  } as TextStyle,
};

// Input group styles (for forms)
export const inputGroupStyles = {
  container: {
    marginBottom: theme.spacing['4'],
  } as ViewStyle,
  row: {
    flexDirection: 'row' as ViewStyle['flexDirection'],
    gap: theme.spacing['3'],
  } as ViewStyle,
  column: {
    flexDirection: 'column' as ViewStyle['flexDirection'],
    gap: theme.spacing['3'],
  } as ViewStyle,
};

// Helper function to get input styles
export const getInputStyle = (
  variant: keyof typeof inputVariants = 'default',
  size: keyof typeof inputSizes = 'medium',
  state?: 'focused' | 'error' | 'disabled'
) => {
  const variantStyle = inputVariants[variant];
  const sizeStyle = inputSizes[size];

  let containerStyle = {
    ...variantStyle.container,
    ...sizeStyle.container,
  };

  if (state === 'focused' && variantStyle.focused) {
    containerStyle = { ...containerStyle, ...variantStyle.focused };
  }

  if (state === 'error' && variantStyle.error) {
    containerStyle = { ...containerStyle, ...variantStyle.error };
  }

  if (state === 'disabled' && variantStyle.disabled) {
    containerStyle = { ...containerStyle, ...variantStyle.disabled };
  }

  return {
    container: containerStyle,
    input: {
      ...variantStyle.input,
      ...sizeStyle.input,
    },
    placeholder: variantStyle.placeholder,
  };
};