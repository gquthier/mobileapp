/**
 * Spacing Design Tokens
 * =====================
 * Centralized spacing system using 4px base unit
 * Following a consistent scale for padding, margins, and gaps
 */

// Base unit (4px)
const BASE_UNIT = 4;

// Spacing scale (multipliers of base unit)
export const spacing = {
  // Micro spaces
  '0': 0,                    // 0px
  'px': 1,                   // 1px (for borders)
  '0.5': BASE_UNIT * 0.5,    // 2px

  // Small spaces
  '1': BASE_UNIT * 1,        // 4px
  '2': BASE_UNIT * 2,        // 8px
  '3': BASE_UNIT * 3,        // 12px

  // Medium spaces
  '4': BASE_UNIT * 4,        // 16px
  '5': BASE_UNIT * 5,        // 20px
  '6': BASE_UNIT * 6,        // 24px

  // Large spaces
  '8': BASE_UNIT * 8,        // 32px
  '10': BASE_UNIT * 10,      // 40px
  '12': BASE_UNIT * 12,      // 48px

  // Extra large spaces
  '16': BASE_UNIT * 16,      // 64px
  '20': BASE_UNIT * 20,      // 80px
  '24': BASE_UNIT * 24,      // 96px

  // Huge spaces
  '32': BASE_UNIT * 32,      // 128px
  '40': BASE_UNIT * 40,      // 160px
  '48': BASE_UNIT * 48,      // 192px
  '56': BASE_UNIT * 56,      // 224px
  '64': BASE_UNIT * 64,      // 256px
};

// Semantic spacing (for common use cases)
export const semanticSpacing = {
  // Screen padding
  screenPaddingHorizontal: spacing['4'],  // 16px
  screenPaddingVertical: spacing['6'],    // 24px
  screenPaddingTop: spacing['12'],        // 48px (safe area)
  screenPaddingBottom: spacing['8'],      // 32px (safe area)

  // Card spacing
  cardPadding: spacing['4'],              // 16px
  cardPaddingSmall: spacing['3'],         // 12px
  cardPaddingLarge: spacing['6'],         // 24px
  cardGap: spacing['3'],                  // 12px between cards

  // Button spacing
  buttonPaddingHorizontal: spacing['4'],  // 16px
  buttonPaddingVertical: spacing['3'],    // 12px
  buttonPaddingSmall: spacing['2'],       // 8px
  buttonPaddingLarge: spacing['5'],       // 20px
  buttonGap: spacing['2'],                // 8px between buttons

  // Input spacing
  inputPaddingHorizontal: spacing['3'],   // 12px
  inputPaddingVertical: spacing['3'],     // 12px
  inputMarginBottom: spacing['4'],        // 16px

  // List spacing
  listItemPadding: spacing['3'],          // 12px
  listItemGap: spacing['2'],              // 8px
  listSectionGap: spacing['6'],           // 24px

  // Icon spacing
  iconMargin: spacing['2'],               // 8px
  iconMarginSmall: spacing['1'],          // 4px
  iconMarginLarge: spacing['3'],          // 12px

  // Text spacing
  textLineGap: spacing['2'],              // 8px between lines
  paragraphGap: spacing['4'],             // 16px between paragraphs
  headingGap: spacing['6'],               // 24px after headings

  // Component spacing
  componentGap: spacing['4'],             // 16px between components
  sectionGap: spacing['8'],               // 32px between sections

  // Tab bar
  tabBarHeight: 80,                       // Fixed height
  tabBarPadding: spacing['2'],            // 8px

  // Modal/Dialog
  modalPadding: spacing['6'],             // 24px
  modalContentGap: spacing['4'],          // 16px
};

// Inset spacing (for safe areas and consistent padding)
export const insets = {
  none: {
    top: spacing['0'],
    right: spacing['0'],
    bottom: spacing['0'],
    left: spacing['0'],
  },
  xs: {
    top: spacing['2'],
    right: spacing['2'],
    bottom: spacing['2'],
    left: spacing['2'],
  },
  sm: {
    top: spacing['3'],
    right: spacing['3'],
    bottom: spacing['3'],
    left: spacing['3'],
  },
  md: {
    top: spacing['4'],
    right: spacing['4'],
    bottom: spacing['4'],
    left: spacing['4'],
  },
  lg: {
    top: spacing['6'],
    right: spacing['6'],
    bottom: spacing['6'],
    left: spacing['6'],
  },
  xl: {
    top: spacing['8'],
    right: spacing['8'],
    bottom: spacing['8'],
    left: spacing['8'],
  },
};

// Legacy spacing mapping (for backward compatibility)
export const legacySpacing = {
  xs: spacing['1'],   // 4px
  sm: spacing['2'],   // 8px
  md: spacing['3'],   // 12px
  lg: spacing['4'],   // 16px
  xl: spacing['6'],   // 24px
  xxl: spacing['8'],  // 32px
  xxxl: spacing['12'], // 48px
};

// Helper functions for dynamic spacing
export const getSpacing = (multiplier: number): number => BASE_UNIT * multiplier;
export const getHorizontalSpacing = (size: keyof typeof spacing) => ({
  paddingHorizontal: spacing[size],
});
export const getVerticalSpacing = (size: keyof typeof spacing) => ({
  paddingVertical: spacing[size],
});
export const getPadding = (size: keyof typeof spacing) => ({
  padding: spacing[size],
});
export const getMargin = (size: keyof typeof spacing) => ({
  margin: spacing[size],
});

// Type exports
export type SpacingToken = keyof typeof spacing;
export type SemanticSpacingToken = keyof typeof semanticSpacing;
export type InsetToken = keyof typeof insets;