/**
 * Style Usage Examples
 * ====================
 * Practical examples showing how to use the new design system
 * This file demonstrates best practices and common patterns
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

// Import the design system
import { theme } from '../theme';
import {
  getButtonStyle,
  getInputStyle,
  getCardStyle,
  layoutUtils,
  spacingUtils,
  textUtils,
  colorUtils,
  combineStyles
} from '../index';

// Example 1: Using design tokens directly
const ExampleWithTokens = () => (
  <View style={styles.container}>
    {/* Using color tokens */}
    <View style={[
      styles.card,
      { backgroundColor: theme.colors.ui.surface }
    ]}>
      {/* Using typography tokens */}
      <Text style={[
        theme.typography.h5,
        { color: theme.colors.text.primary }
      ]}>
        Example with Design Tokens
      </Text>

      {/* Using spacing tokens */}
      <Text style={[
        theme.typography.body,
        {
          color: theme.colors.text.secondary,
          marginTop: theme.spacing['2']
        }
      ]}>
        This demonstrates direct usage of design tokens
      </Text>
    </View>
  </View>
);

// Example 2: Using component style functions
const ExampleWithComponents = () => {
  const [isPressed, setIsPressed] = React.useState(false);

  const primaryButtonStyle = getButtonStyle('primary', 'medium');
  const secondaryButtonStyle = getButtonStyle('secondary', 'small');
  const cardStyle = getCardStyle('elevated');

  return (
    <View style={cardStyle}>
      <Text style={theme.typography.h6}>Component Style Examples</Text>

      {/* Primary button */}
      <Pressable
        style={primaryButtonStyle.container}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
      >
        <Text style={primaryButtonStyle.text}>Primary Button</Text>
      </Pressable>

      {/* Secondary button */}
      <Pressable style={secondaryButtonStyle.container}>
        <Text style={secondaryButtonStyle.text}>Secondary Button</Text>
      </Pressable>
    </View>
  );
};

// Example 3: Using utility styles
const ExampleWithUtilities = () => (
  <View style={[
    layoutUtils.flexColumn,
    spacingUtils.p4,
    colorUtils.bgWhite
  ]}>
    {/* Using layout utilities */}
    <View style={[
      layoutUtils.flexRow,
      layoutUtils.flexBetween,
      spacingUtils.mb3
    ]}>
      <Text style={[
        theme.typography.h6,
        textUtils.fontBold
      ]}>
        Utility Examples
      </Text>

      <Text style={[
        theme.typography.caption,
        colorUtils.textSecondary
      ]}>
        Status: Active
      </Text>
    </View>

    {/* Using spacing utilities */}
    <View style={[spacingUtils.py2, spacingUtils.px3]}>
      <Text style={theme.typography.body}>
        This content uses utility spacing
      </Text>
    </View>
  </View>
);

// Example 4: Combining multiple styles
const ExampleWithCombinedStyles = () => {
  const combinedCardStyle = combineStyles(
    getCardStyle('elevated'),
    spacingUtils.m4,
    { minHeight: 120 }
  );

  const combinedTextStyle = combineStyles(
    theme.typography.body,
    textUtils.textCenter,
    colorUtils.textPrimary
  );

  return (
    <View style={combinedCardStyle}>
      <Text style={combinedTextStyle}>
        This demonstrates combining multiple styles
      </Text>
    </View>
  );
};

// Example 5: Video player overlay (common pattern in the app)
const VideoOverlayExample = () => (
  <View style={styles.videoContainer}>
    {/* Video placeholder */}
    <View style={styles.videoPlaceholder} />

    {/* Overlay with controls */}
    <View style={[
      layoutUtils.absoluteFill,
      { backgroundColor: theme.colors.overlay.backdrop }
    ]}>
      <View style={[
        layoutUtils.flexCenter,
        layoutUtils.flex1
      ]}>
        {/* Play button */}
        <Pressable style={[
          styles.playButton,
          { backgroundColor: theme.colors.overlay.surface }
        ]}>
          <Text style={[
            theme.typography.buttonLarge,
            { color: theme.colors.text.inverse }
          ]}>
            ▶
          </Text>
        </Pressable>
      </View>

      {/* Bottom controls */}
      <View style={[
        layoutUtils.flexRow,
        layoutUtils.flexBetween,
        spacingUtils.p4
      ]}>
        <Text style={[
          theme.typography.caption,
          { color: theme.colors.text.inverse }
        ]}>
          0:00
        </Text>

        <Text style={[
          theme.typography.caption,
          { color: theme.colors.text.inverse }
        ]}>
          2:34
        </Text>
      </View>
    </View>
  </View>
);

// Example 6: Chapter card (specific to the app)
const ChapterCardExample = () => (
  <View style={[
    getCardStyle('elevated'),
    spacingUtils.m4
  ]}>
    {/* Header */}
    <View style={[
      layoutUtils.flexRow,
      layoutUtils.flexBetween,
      spacingUtils.mb2
    ]}>
      <Text style={[
        theme.typography.h6,
        colorUtils.textPrimary,
        layoutUtils.flex1
      ]}>
        Chapter: Summer 2024
      </Text>

      <View style={[
        spacingUtils.px2,
        spacingUtils.py1,
        {
          backgroundColor: theme.colors.brand.primaryLight,
          borderRadius: theme.layout.borderRadius.sm
        }
      ]}>
        <Text style={[
          theme.typography.caption,
          { color: theme.colors.brand.primary }
        ]}>
          Active
        </Text>
      </View>
    </View>

    {/* Period */}
    <Text style={[
      theme.typography.caption,
      colorUtils.textTertiary,
      spacingUtils.mb3
    ]}>
      June 2024 - August 2024
    </Text>

    {/* Progress bar */}
    <View style={spacingUtils.mt3}>
      <View style={[
        styles.progressBar,
        { backgroundColor: theme.colors.ui.border }
      ]}>
        <View style={[
          styles.progressFill,
          {
            backgroundColor: theme.colors.brand.primary,
            width: '65%'
          }
        ]} />
      </View>

      {/* Stats */}
      <View style={[
        layoutUtils.flexRow,
        spacingUtils.mt2
      ]}>
        <View style={spacingUtils.mr4}>
          <Text style={[
            theme.typography.bodyBold,
            colorUtils.textPrimary
          ]}>
            12
          </Text>
          <Text style={[
            theme.typography.caption,
            colorUtils.textTertiary
          ]}>
            Videos
          </Text>
        </View>

        <View>
          <Text style={[
            theme.typography.bodyBold,
            colorUtils.textPrimary
          ]}>
            4.2h
          </Text>
          <Text style={[
            theme.typography.caption,
            colorUtils.textTertiary
          ]}>
            Duration
          </Text>
        </View>
      </View>
    </View>
  </View>
);

// Styles using the new design system
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.ui.background,
    padding: theme.spacing['4'],
  },

  card: {
    padding: theme.spacing['4'],
    borderRadius: 12,
    ...theme.layout.shadows.sm,
  },

  videoContainer: {
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: theme.spacing['4'],
  },

  videoPlaceholder: {
    flex: 1,
    backgroundColor: theme.colors.ui.surfacePressed,
  },

  playButton: {
    width: 64,
    height: 64,
    borderRadius: theme.layout.borderRadius.full,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressBar: {
    height: 4,
    borderRadius: theme.layout.borderRadius.full,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: theme.layout.borderRadius.full,
  },
});

// Export examples for documentation
export {
  ExampleWithTokens,
  ExampleWithComponents,
  ExampleWithUtilities,
  ExampleWithCombinedStyles,
  VideoOverlayExample,
  ChapterCardExample,
};