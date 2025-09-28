/**
 * Card Styles Component Library
 * ==============================
 * Reusable card and container styles
 */

import { ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { theme } from '../theme';

// NO MODULE-LEVEL DESTRUCTURING - Direct access only

// Card base styles
const cardBase: ViewStyle = {
  backgroundColor: theme.colors.cardBackground,
  borderRadius: theme.layout.borderRadius.card,
  padding: theme.spacing['4'],
  ...theme.layout.shadows.sm,
};

// Card variants
export const cardVariants = {
  // Default elevated card
  elevated: {
    container: {
      ...cardBase,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    } as ViewStyle,
  },

  // Flat card (no shadow)
  flat: {
    container: {
      ...cardBase,
      ...theme.layout.shadows.none,
      borderWidth: theme.layout.borderWidth.thin,
      borderColor: theme.colors.cardBorder,
    } as ViewStyle,
  },

  // Outlined card
  outlined: {
    container: {
      backgroundColor: theme.colors.transparent,
      borderRadius: theme.layout.borderRadius.card,
      padding: theme.spacing['4'],
      borderWidth: theme.layout.borderWidth.thin,
      borderColor: theme.colors.cardBorder,
    } as ViewStyle,
  },

  // Filled card (colored background)
  filled: {
    container: {
      ...cardBase,
      backgroundColor: theme.colors.gray100,
      ...theme.layout.shadows.none,
    } as ViewStyle,
  },

  // Interactive card (for pressable cards)
  interactive: {
    container: {
      ...cardBase,
      ...theme.layout.shadows.sm,
    } as ViewStyle,
    pressed: {
      ...theme.layout.shadows.xs,
      backgroundColor: theme.colors.gray50,
    } as ViewStyle,
  },
};

// Card sections
export const cardSections = {
  header: {
    flexDirection: 'row' as ViewStyle['flexDirection'],
    alignItems: 'center',
    marginBottom: theme.spacing['3'],
  } as ViewStyle,

  body: {
    flex: 1,
  } as ViewStyle,

  footer: {
    flexDirection: 'row' as ViewStyle['flexDirection'],
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: theme.spacing['3'],
    paddingTop: theme.spacing['3'],
    borderTopWidth: theme.layout.borderWidth.hairline,
    borderTopColor: theme.colors.divider,
  } as ViewStyle,
};

// Media card styles
export const mediaCardStyles = {
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.layout.borderRadius.card,
    overflow: 'hidden' as ViewStyle['overflow'],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  } as ViewStyle,

  image: {
    width: '100%' as ImageStyle['width'],
    aspectRatio: 16 / 9,
    backgroundColor: theme.colors.gray200,
  } as ImageStyle,

  content: {
    padding: theme.spacing['4'],
  } as ViewStyle,

  overlay: {
    position: 'absolute' as ViewStyle['position'],
    bottom: 0,
    left: 0,
    right: 0,
    padding: theme.spacing['4'],
    backgroundColor: theme.colors.blackOverlay70,
  } as ViewStyle,

  overlayText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textOnDark,
  } as TextStyle,
};

// Chapter card styles (specific to app)
export const chapterCardStyles = {
  container: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.layout.borderRadius.xl,
    padding: theme.spacing['4'],
    marginBottom: theme.spacing['3'],
    ...theme.layout.shadows.sm,
  } as ViewStyle,

  header: {
    flexDirection: 'row' as ViewStyle['flexDirection'],
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing['2'],
  } as ViewStyle,

  title: {
    ...theme.typography.h5,
    color: theme.colors.textPrimary,
    flex: 1,
  } as TextStyle,

  status: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.gray100,
    paddingHorizontal: theme.spacing['2'],
    paddingVertical: theme.spacing['1'],
    borderRadius: theme.layout.borderRadius.sm,
    overflow: 'hidden' as TextStyle['overflow'],
  } as TextStyle,

  statusActive: {
    backgroundColor: theme.colors.primaryOverlay10,
    color: theme.colors.primary600,
  } as TextStyle,

  period: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing['3'],
  } as TextStyle,

  progressContainer: {
    marginTop: theme.spacing['3'],
  } as ViewStyle,

  progressBar: {
    height: 4,
    backgroundColor: theme.colors.gray200,
    borderRadius: theme.layout.borderRadius.full,
    overflow: 'hidden' as ViewStyle['overflow'],
  } as ViewStyle,

  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary400,
    borderRadius: theme.layout.borderRadius.full,
  } as ViewStyle,

  stats: {
    flexDirection: 'row' as ViewStyle['flexDirection'],
    marginTop: theme.spacing['2'],
  } as ViewStyle,

  statItem: {
    marginRight: theme.spacing['4'],
  } as ViewStyle,

  statValue: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  } as TextStyle,

  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  } as TextStyle,
};

// Video card styles
export const videoCardStyles = {
  container: {
    borderRadius: 12,
    overflow: 'hidden' as ViewStyle['overflow'],
    marginBottom: theme.spacing['3'],
    ...theme.layout.shadows.sm,
  } as ViewStyle,

  thumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: theme.colors.gray200,
  } as ImageStyle,

  duration: {
    position: 'absolute' as ViewStyle['position'],
    bottom: theme.spacing['2'],
    right: theme.spacing['2'],
    backgroundColor: theme.colors.blackOverlay80,
    paddingHorizontal: theme.spacing['2'],
    paddingVertical: theme.spacing['1'],
    borderRadius: theme.layout.borderRadius.sm,
  } as ViewStyle,

  durationText: {
    ...theme.typography.tiny,
    color: theme.colors.white,
  } as TextStyle,

  info: {
    padding: theme.spacing['3'],
    backgroundColor: theme.colors.cardBackground,
  } as ViewStyle,

  title: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing['1'],
  } as TextStyle,

  metadata: {
    flexDirection: 'row' as ViewStyle['flexDirection'],
    alignItems: 'center',
  } as ViewStyle,

  date: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  } as TextStyle,
};

// Prompt card styles
export const promptCardStyles = {
  container: {
    backgroundColor: theme.colors.primary50,
    borderRadius: 12,
    padding: theme.spacing['4'],
    borderWidth: theme.layout.borderWidth.thin,
    borderColor: theme.colors.primary200,
  } as ViewStyle,

  icon: {
    width: 24,
    height: 24,
    marginBottom: theme.spacing['2'],
    tintColor: theme.colors.primary500,
  },

  text: {
    ...theme.typography.body,
    color: theme.colors.primary700,
  } as TextStyle,

  action: {
    marginTop: theme.spacing['3'],
    flexDirection: 'row' as ViewStyle['flexDirection'],
    alignItems: 'center',
  } as ViewStyle,

  actionText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary600,
  } as TextStyle,
};

// List card styles (for library items)
export const listCardStyles = {
  container: {
    flexDirection: 'row' as ViewStyle['flexDirection'],
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    padding: theme.spacing['3'],
    borderRadius: 8,
    marginBottom: theme.spacing['2'],
  } as ViewStyle,

  icon: {
    width: 40,
    height: 40,
    borderRadius: theme.layout.borderRadius.sm,
    backgroundColor: theme.colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing['3'],
  } as ViewStyle,

  content: {
    flex: 1,
  } as ViewStyle,

  title: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  } as TextStyle,

  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing['0.5'],
  } as TextStyle,

  action: {
    marginLeft: theme.spacing['2'],
  } as ViewStyle,
};

// Helper function to get card styles
export const getCardStyle = (
  variant: keyof typeof cardVariants = 'elevated',
  isPressed?: boolean
) => {
  const variantStyle = cardVariants[variant];

  let containerStyle = variantStyle.container;

  if (isPressed && 'pressed' in variantStyle) {
    containerStyle = { ...containerStyle, ...variantStyle.pressed };
  }

  return containerStyle;
};