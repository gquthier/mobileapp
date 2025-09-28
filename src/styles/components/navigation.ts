/**
 * Navigation Styles Component Library
 * ====================================
 * Styles for tab bars, headers, and navigation elements
 */

import { ViewStyle, TextStyle } from 'react-native';
import { theme } from '../theme';

// NO MODULE-LEVEL DESTRUCTURING - Direct access only

// Tab bar styles
export const tabBarStyles = {
  container: {
    flexDirection: 'row' as ViewStyle['flexDirection'],
    height: theme.layout.dimensions.tabBarHeight,
    backgroundColor: theme.colors.tabBarBackground,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    paddingBottom: theme.spacing['6'], // For safe area
    paddingTop: theme.spacing['2'],
    paddingHorizontal: theme.spacing['4'],
  } as ViewStyle,

  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing['2'],
  } as ViewStyle,

  tabIcon: {
    width: 24,
    height: 24,
    marginBottom: theme.spacing['1'],
  },

  tabIconActive: {
    tintColor: theme.colors.tabBarIconActive,
  },

  tabIconInactive: {
    tintColor: theme.colors.tabBarIconInactive,
  },

  tabLabel: {
    ...theme.typography.caption,
    textAlign: 'center' as TextStyle['textAlign'],
  } as TextStyle,

  tabLabelActive: {
    color: theme.colors.tabBarIconActive,
    fontWeight: '600',
  } as TextStyle,

  tabLabelInactive: {
    color: theme.colors.tabBarIconInactive,
  } as TextStyle,

  badge: {
    position: 'absolute' as ViewStyle['position'],
    top: -2,
    right: 8,
    backgroundColor: theme.colors.error500,
    borderRadius: theme.layout.borderRadius.full,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing['1'],
  } as ViewStyle,

  badgeText: {
    ...theme.typography.micro,
    color: theme.colors.white,
    fontWeight: '600',
  } as TextStyle,
};

// Top bar/header styles
export const topBarStyles = {
  container: {
    height: theme.layout.dimensions.topBarHeight,
    flexDirection: 'row' as ViewStyle['flexDirection'],
    alignItems: 'center',
    paddingHorizontal: theme.spacing['4'],
    backgroundColor: theme.colors.surfaceBackground,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  } as ViewStyle,

  elevated: {
    ...theme.layout.shadows.sm,
    borderBottomWidth: 0,
  } as ViewStyle,

  transparent: {
    backgroundColor: theme.colors.transparent,
    borderBottomWidth: 0,
  } as ViewStyle,

  leftSection: {
    flexDirection: 'row' as ViewStyle['flexDirection'],
    alignItems: 'center',
    minWidth: 60,
  } as ViewStyle,

  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.spacing['3'],
  } as ViewStyle,

  rightSection: {
    flexDirection: 'row' as ViewStyle['flexDirection'],
    alignItems: 'center',
    minWidth: 60,
    justifyContent: 'flex-end',
  } as ViewStyle,

  title: {
    ...theme.typography.h6,
    color: theme.colors.textPrimary,
    textAlign: 'center' as TextStyle['textAlign'],
  } as TextStyle,

  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center' as TextStyle['textAlign'],
    marginTop: theme.spacing['0.5'],
  } as TextStyle,

  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.layout.borderRadius.sm,
    marginRight: theme.spacing['2'],
  } as ViewStyle,

  actionButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.layout.borderRadius.sm,
    marginLeft: theme.spacing['2'],
  } as ViewStyle,
};

// Menu styles
export const menuStyles = {
  container: {
    backgroundColor: theme.colors.surfaceBackground,
    borderRadius: 12,
    paddingVertical: theme.spacing['2'],
    minWidth: 200,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  } as ViewStyle,

  item: {
    flexDirection: 'row' as ViewStyle['flexDirection'],
    alignItems: 'center',
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['3'],
    minHeight: 44,
  } as ViewStyle,

  itemPressed: {
    backgroundColor: theme.colors.gray100,
  } as ViewStyle,

  itemDestructive: {
    backgroundColor: theme.colors.error50,
  } as ViewStyle,

  itemIcon: {
    width: 20,
    height: 20,
    marginRight: theme.spacing['3'],
    tintColor: theme.colors.textSecondary,
  },

  itemText: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    flex: 1,
  } as TextStyle,

  itemTextDestructive: {
    color: theme.colors.error600,
  } as TextStyle,

  separator: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: theme.spacing['1'],
  } as ViewStyle,

  section: {
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['2'],
  } as ViewStyle,

  sectionTitle: {
    ...theme.typography.label,
    color: theme.colors.textTertiary,
  } as TextStyle,
};

// Breadcrumb styles
export const breadcrumbStyles = {
  container: {
    flexDirection: 'row' as ViewStyle['flexDirection'],
    alignItems: 'center',
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['2'],
  } as ViewStyle,

  item: {
    flexDirection: 'row' as ViewStyle['flexDirection'],
    alignItems: 'center',
  } as ViewStyle,

  text: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  } as TextStyle,

  textActive: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  } as TextStyle,

  separator: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    marginHorizontal: theme.spacing['2'],
  } as TextStyle,
};

// Pagination styles
export const paginationStyles = {
  container: {
    flexDirection: 'row' as ViewStyle['flexDirection'],
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing['4'],
    gap: theme.spacing['2'],
  } as ViewStyle,

  dot: {
    width: 8,
    height: 8,
    borderRadius: theme.layout.borderRadius.full,
    backgroundColor: theme.colors.gray300,
  } as ViewStyle,

  dotActive: {
    backgroundColor: theme.colors.primary400,
    width: 16,
  } as ViewStyle,

  button: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.layout.borderRadius.sm,
  } as ViewStyle,

  buttonText: {
    ...theme.typography.body,
    color: theme.colors.primary500,
  } as TextStyle,

  buttonDisabled: {
    opacity: 0.5,
  } as ViewStyle,
};

// Search bar styles
export const searchBarStyles = {
  container: {
    flexDirection: 'row' as ViewStyle['flexDirection'],
    alignItems: 'center',
    backgroundColor: theme.colors.gray100,
    borderRadius: theme.layout.borderRadius.full,
    paddingHorizontal: theme.spacing['3'],
    paddingVertical: theme.spacing['2'],
    marginHorizontal: theme.spacing['4'],
    marginVertical: theme.spacing['2'],
  } as ViewStyle,

  input: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    flex: 1,
    marginLeft: theme.spacing['2'],
  } as TextStyle,

  placeholder: {
    color: theme.colors.inputTextPlaceholder,
  } as TextStyle,

  icon: {
    width: 20,
    height: 20,
    tintColor: theme.colors.textTertiary,
  },

  clearButton: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing['2'],
  } as ViewStyle,
};

// Filter bar styles
export const filterBarStyles = {
  container: {
    flexDirection: 'row' as ViewStyle['flexDirection'],
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['2'],
    gap: theme.spacing['2'],
  } as ViewStyle,

  scrollContainer: {
    flexDirection: 'row' as ViewStyle['flexDirection'],
    gap: theme.spacing['2'],
  } as ViewStyle,

  chip: {
    flexDirection: 'row' as ViewStyle['flexDirection'],
    alignItems: 'center',
    paddingHorizontal: theme.spacing['3'],
    paddingVertical: theme.spacing['2'],
    backgroundColor: theme.colors.gray100,
    borderRadius: theme.layout.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.gray200,
  } as ViewStyle,

  chipActive: {
    backgroundColor: theme.colors.primary100,
    borderColor: theme.colors.primary400,
  } as ViewStyle,

  chipText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  } as TextStyle,

  chipTextActive: {
    color: theme.colors.primary600,
    fontWeight: '600',
  } as TextStyle,

  chipIcon: {
    width: 16,
    height: 16,
    marginRight: theme.spacing['1'],
    tintColor: theme.colors.textTertiary,
  },

  chipIconActive: {
    tintColor: theme.colors.primary500,
  },
};