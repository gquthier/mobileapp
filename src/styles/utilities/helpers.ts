/**
 * Style Utility Helpers
 * ======================
 * Helper functions and utility styles for common patterns
 */

import { ViewStyle, TextStyle } from 'react-native';
import { theme } from '../theme';

// NO MODULE-LEVEL DESTRUCTURING - Direct access only

// Layout utilities
export const layoutUtils = {
  // Flexbox helpers
  flexRow: {
    flexDirection: 'row' as ViewStyle['flexDirection'],
  },
  flexColumn: {
    flexDirection: 'column' as ViewStyle['flexDirection'],
  },
  flexCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  flexBetween: {
    flexDirection: 'row' as ViewStyle['flexDirection'],
    justifyContent: 'space-between',
    alignItems: 'center',
  } as ViewStyle,
  flexAround: {
    flexDirection: 'row' as ViewStyle['flexDirection'],
    justifyContent: 'space-around',
    alignItems: 'center',
  } as ViewStyle,
  flex1: {
    flex: 1,
  },
  flexWrap: {
    flexWrap: 'wrap' as ViewStyle['flexWrap'],
  },

  // Positioning
  absolute: {
    position: 'absolute' as ViewStyle['position'],
  },
  relative: {
    position: 'relative' as ViewStyle['position'],
  },
  absoluteFill: {
    position: 'absolute' as ViewStyle['position'],
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  } as ViewStyle,

  // Overflow
  hidden: {
    overflow: 'hidden' as ViewStyle['overflow'],
  },
  visible: {
    overflow: 'visible' as ViewStyle['overflow'],
  },
};

// Spacing utilities
export const spacingUtils = {
  // Margin utilities
  m0: { margin: theme.spacing['0'] },
  m1: { margin: theme.spacing['1'] },
  m2: { margin: theme.spacing['2'] },
  m3: { margin: theme.spacing['3'] },
  m4: { margin: theme.spacing['4'] },
  m6: { margin: theme.spacing['6'] },
  m8: { margin: theme.spacing['8'] },

  // Horizontal margin
  mx1: { marginHorizontal: theme.spacing['1'] },
  mx2: { marginHorizontal: theme.spacing['2'] },
  mx3: { marginHorizontal: theme.spacing['3'] },
  mx4: { marginHorizontal: theme.spacing['4'] },
  mx6: { marginHorizontal: theme.spacing['6'] },

  // Vertical margin
  my1: { marginVertical: theme.spacing['1'] },
  my2: { marginVertical: theme.spacing['2'] },
  my3: { marginVertical: theme.spacing['3'] },
  my4: { marginVertical: theme.spacing['4'] },
  my6: { marginVertical: theme.spacing['6'] },

  // Specific margins
  mt1: { marginTop: theme.spacing['1'] },
  mt2: { marginTop: theme.spacing['2'] },
  mt3: { marginTop: theme.spacing['3'] },
  mt4: { marginTop: theme.spacing['4'] },
  mt6: { marginTop: theme.spacing['6'] },

  mb1: { marginBottom: theme.spacing['1'] },
  mb2: { marginBottom: theme.spacing['2'] },
  mb3: { marginBottom: theme.spacing['3'] },
  mb4: { marginBottom: theme.spacing['4'] },
  mb6: { marginBottom: theme.spacing['6'] },

  ml1: { marginLeft: theme.spacing['1'] },
  ml2: { marginLeft: theme.spacing['2'] },
  ml3: { marginLeft: theme.spacing['3'] },
  ml4: { marginLeft: theme.spacing['4'] },

  mr1: { marginRight: theme.spacing['1'] },
  mr2: { marginRight: theme.spacing['2'] },
  mr3: { marginRight: theme.spacing['3'] },
  mr4: { marginRight: theme.spacing['4'] },

  // Padding utilities
  p0: { padding: theme.spacing['0'] },
  p1: { padding: theme.spacing['1'] },
  p2: { padding: theme.spacing['2'] },
  p3: { padding: theme.spacing['3'] },
  p4: { padding: theme.spacing['4'] },
  p6: { padding: theme.spacing['6'] },
  p8: { padding: theme.spacing['8'] },

  // Horizontal padding
  px1: { paddingHorizontal: theme.spacing['1'] },
  px2: { paddingHorizontal: theme.spacing['2'] },
  px3: { paddingHorizontal: theme.spacing['3'] },
  px4: { paddingHorizontal: theme.spacing['4'] },
  px6: { paddingHorizontal: theme.spacing['6'] },

  // Vertical padding
  py1: { paddingVertical: theme.spacing['1'] },
  py2: { paddingVertical: theme.spacing['2'] },
  py3: { paddingVertical: theme.spacing['3'] },
  py4: { paddingVertical: theme.spacing['4'] },
  py6: { paddingVertical: theme.spacing['6'] },

  // Specific padding
  pt1: { paddingTop: theme.spacing['1'] },
  pt2: { paddingTop: theme.spacing['2'] },
  pt3: { paddingTop: theme.spacing['3'] },
  pt4: { paddingTop: theme.spacing['4'] },
  pt6: { paddingTop: theme.spacing['6'] },

  pb1: { paddingBottom: theme.spacing['1'] },
  pb2: { paddingBottom: theme.spacing['2'] },
  pb3: { paddingBottom: theme.spacing['3'] },
  pb4: { paddingBottom: theme.spacing['4'] },
  pb6: { paddingBottom: theme.spacing['6'] },
};

// Text utilities
export const textUtils = {
  // Alignment
  textCenter: {
    textAlign: 'center' as TextStyle['textAlign'],
  },
  textLeft: {
    textAlign: 'left' as TextStyle['textAlign'],
  },
  textRight: {
    textAlign: 'right' as TextStyle['textAlign'],
  },

  // Transform
  uppercase: {
    textTransform: 'uppercase' as TextStyle['textTransform'],
  },
  lowercase: {
    textTransform: 'lowercase' as TextStyle['textTransform'],
  },
  capitalize: {
    textTransform: 'capitalize' as TextStyle['textTransform'],
  },

  // Weight
  fontLight: {
    fontWeight: '300' as TextStyle['fontWeight'],
  },
  fontNormal: {
    fontWeight: '400' as TextStyle['fontWeight'],
  },
  fontMedium: {
    fontWeight: '500' as TextStyle['fontWeight'],
  },
  fontSemibold: {
    fontWeight: '600' as TextStyle['fontWeight'],
  },
  fontBold: {
    fontWeight: '700' as TextStyle['fontWeight'],
  },

  // Style
  italic: {
    fontStyle: 'italic' as TextStyle['fontStyle'],
  },
  underline: {
    textDecorationLine: 'underline' as TextStyle['textDecorationLine'],
  },
  lineThrough: {
    textDecorationLine: 'line-through' as TextStyle['textDecorationLine'],
  },
};

// Border utilities
export const borderUtils = {
  // Border radius
  rounded: { borderRadius: 8 },
  roundedSm: { borderRadius: theme.layout.borderRadius.sm },
  roundedLg: { borderRadius: 12 },
  roundedXl: { borderRadius: theme.layout.borderRadius.xl },
  roundedFull: { borderRadius: theme.layout.borderRadius.full },

  // Borders
  border: {
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  } as ViewStyle,
  borderTop: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  } as ViewStyle,
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  } as ViewStyle,
  borderLeft: {
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.borderLight,
  } as ViewStyle,
  borderRight: {
    borderRightWidth: 1,
    borderRightColor: theme.colors.borderLight,
  } as ViewStyle,
};

// Color utilities
export const colorUtils = {
  // Background colors
  bgTransparent: { backgroundColor: theme.colors.transparent },
  bgWhite: { backgroundColor: theme.colors.white },
  bgBlack: { backgroundColor: theme.colors.black },
  bgGray50: { backgroundColor: theme.colors.gray50 },
  bgGray100: { backgroundColor: theme.colors.gray100 },
  bgGray200: { backgroundColor: theme.colors.gray200 },
  bgPrimary: { backgroundColor: theme.colors.primary400 },
  bgPrimary50: { backgroundColor: theme.colors.primary50 },
  bgPrimary100: { backgroundColor: theme.colors.primary100 },
  bgError: { backgroundColor: theme.colors.error500 },
  bgError50: { backgroundColor: theme.colors.error50 },
  bgSuccess: { backgroundColor: theme.colors.success500 },
  bgSuccess50: { backgroundColor: theme.colors.success50 },

  // Text colors
  textPrimary: { color: theme.colors.textPrimary },
  textSecondary: { color: theme.colors.textSecondary },
  textTertiary: { color: theme.colors.textTertiary },
  textWhite: { color: theme.colors.white },
  textBlack: { color: theme.colors.black },
  textError: { color: theme.colors.error600 },
  textSuccess: { color: theme.colors.success600 },
  textWarning: { color: theme.colors.warning600 },
  textPrimaryColor: { color: theme.colors.primary500 },
};

// Interactive utilities
export const interactiveUtils = {
  // Touch feedback
  touchable: {
    activeOpacity: 0.7,
  },
  touchableFade: {
    activeOpacity: 0.5,
  },
  touchableScale: {
    activeOpacity: 0.9,
  },

  // Disabled states
  disabled: {
    opacity: 0.5,
  } as ViewStyle,
  disabledInteraction: {
    pointerEvents: 'none' as ViewStyle['pointerEvents'],
  } as ViewStyle,
};

// Screen utilities
export const screenUtils = {
  // Safe areas and screen padding
  screenContainer: {
    flex: 1,
    backgroundColor: theme.colors.surfaceBackground,
  } as ViewStyle,

  screenPadding: {
    paddingHorizontal: theme.spacing['4'],
    paddingTop: theme.spacing['6'],
    paddingBottom: theme.spacing['4'],
  } as ViewStyle,

  screenPaddingHorizontal: {
    paddingHorizontal: theme.spacing['4'],
  } as ViewStyle,

  // Content containers
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing['4'],
  } as ViewStyle,

  scrollContainer: {
    flexGrow: 1,
  } as ViewStyle,

  // Centered content
  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing['4'],
  } as ViewStyle,
};

// Media utilities
export const mediaUtils = {
  // Video player overlay styles
  videoOverlay: {
    ...layoutUtils.absoluteFill,
    backgroundColor: theme.colors.blackOverlay60,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  videoControls: {
    position: 'absolute' as ViewStyle['position'],
    bottom: theme.spacing['4'],
    left: theme.spacing['4'],
    right: theme.spacing['4'],
    backgroundColor: theme.colors.blackOverlay70,
    borderRadius: 12,
    padding: theme.spacing['3'],
  } as ViewStyle,

  // Camera overlay
  cameraOverlay: {
    ...layoutUtils.absoluteFill,
    backgroundColor: theme.colors.blackOverlay30,
  } as ViewStyle,

  // Image placeholders
  imagePlaceholder: {
    backgroundColor: theme.colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
};

// Animation utilities
export const animationUtils = {
  // Common animation properties
  fadeIn: {
    opacity: 1,
  },
  fadeOut: {
    opacity: 0,
  },
  slideInLeft: {
    transform: [{ translateX: 0 }],
  },
  slideOutLeft: {
    transform: [{ translateX: -100 }],
  },
  slideInRight: {
    transform: [{ translateX: 0 }],
  },
  slideOutRight: {
    transform: [{ translateX: 100 }],
  },
  scaleIn: {
    transform: [{ scale: 1 }],
  },
  scaleOut: {
    transform: [{ scale: 0.9 }],
  },
};

// Helper function to combine multiple utility styles
export const combineStyles = (...styles: (ViewStyle | TextStyle | undefined)[]) => {
  return Object.assign({}, ...styles.filter(Boolean));
};

// Helper function to create conditional styles
export const conditionalStyle = (condition: boolean, trueStyle: ViewStyle | TextStyle, falseStyle?: ViewStyle | TextStyle) => {
  return condition ? trueStyle : (falseStyle || {});
};