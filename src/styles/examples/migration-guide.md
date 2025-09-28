# Style Migration Guide

## 🔄 How to Migrate from Old Styles to New Design System

This guide shows you how to replace hardcoded styles with the new design system.

## Before & After Examples

### 🎨 Colors

**❌ Before (Hardcoded):**
```tsx
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E6E6E6',
  },
  text: {
    color: '#000000',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
});
```

**✅ After (Design System):**
```tsx
import { theme } from '../styles';

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.ui.background,
    borderColor: theme.colors.ui.border,
  },
  text: {
    color: theme.colors.text.primary,
  },
  overlay: {
    backgroundColor: theme.colors.overlay.surface,
  },
});
```

### 📝 Typography

**❌ Before (Hardcoded):**
```tsx
const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  },
});
```

**✅ After (Design System):**
```tsx
import { theme } from '../styles';

const styles = StyleSheet.create({
  title: {
    ...theme.typography.h1,
  },
  body: {
    ...theme.typography.body,
  },
});
```

### 📏 Spacing

**❌ Before (Hardcoded):**
```tsx
const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
});
```

**✅ After (Design System):**
```tsx
import { theme, spacingUtils } from '../styles';

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing['4'],           // 16px
    marginBottom: theme.spacing['6'],      // 24px
    paddingHorizontal: theme.spacing['5'], // 20px
  },
});

// Or use utilities:
const styles = StyleSheet.create({
  container: {
    ...spacingUtils.p4,   // padding: 16px
    ...spacingUtils.mb6,  // marginBottom: 24px
    paddingHorizontal: theme.spacing['5'],
  },
});
```

### 🔲 Border Radius & Shadows

**❌ Before (Hardcoded):**
```tsx
const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});
```

**✅ After (Design System):**
```tsx
import { theme } from '../styles';

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.layout.borderRadius.card,
    ...theme.layout.shadows.md,
  },
});
```

## Common Migration Patterns

### 📱 Video Player Overlays

**❌ Before:**
```tsx
// Multiple hardcoded rgba values
const videoOverlay = {
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
};
const controlsBackground = {
  backgroundColor: 'rgba(255, 255, 255, 0.3)',
};
```

**✅ After:**
```tsx
import { theme } from '../styles';

const videoOverlay = {
  backgroundColor: theme.colors.overlay.surface,    // rgba(0, 0, 0, 0.8)
};
const controlsBackground = {
  backgroundColor: theme.colors.overlay.light,      // rgba(255, 255, 255, 0.2)
};
```

### 🃏 Card Components

**❌ Before:**
```tsx
const chapterCard = {
  backgroundColor: '#FFFFFF',
  borderRadius: 16,
  padding: 16,
  marginBottom: 12,
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 4,
  elevation: 2,
};
```

**✅ After:**
```tsx
import { getCardStyle, spacingUtils } from '../styles';

// Using component styles:
const chapterCard = {
  ...getCardStyle('elevated'),
  ...spacingUtils.mb3,
};

// Or using card-specific styles:
import { chapterCardStyles } from '../styles';
const chapterCard = chapterCardStyles.container;
```

### 🔘 Buttons

**❌ Before:**
```tsx
const primaryButton = {
  backgroundColor: '#9A65FF',
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
};
const buttonText = {
  fontSize: 16,
  fontWeight: '600',
  color: '#FFFFFF',
};
```

**✅ After:**
```tsx
import { getButtonStyle } from '../styles';

const buttonStyles = getButtonStyle('primary', 'medium');
// Use: buttonStyles.container and buttonStyles.text
```

## Step-by-Step Migration Process

### 1. Import the Design System
```tsx
// Replace old theme import
// import { colors, typography, spacing } from '../styles/theme';

// With new design system import
import { theme, getButtonStyle, spacingUtils, colorUtils } from '../styles';
```

### 2. Replace Color Values
- Find all hardcoded hex colors: `#FFFFFF`, `#000000`, etc.
- Replace with semantic color tokens: `theme.colors.ui.background`
- Replace rgba values with overlay tokens: `theme.colors.overlay.surface`

### 3. Replace Typography
- Find hardcoded `fontSize`, `fontWeight`, `lineHeight`
- Replace with typography tokens: `theme.typography.h1`

### 4. Replace Spacing
- Find hardcoded `padding`, `margin` values
- Replace with spacing tokens: `theme.spacing['4']`
- Use utility classes where appropriate: `spacingUtils.p4`

### 5. Replace Layout Properties
- Find hardcoded `borderRadius`, shadows
- Replace with layout tokens: `theme.layout.borderRadius.card`

## Quick Reference

### Most Common Replacements

| Old Value | New Token |
|-----------|-----------|
| `#FFFFFF` | `theme.colors.ui.background` |
| `#000000` | `theme.colors.text.primary` |
| `#9A65FF` | `theme.colors.brand.primary` |
| `rgba(0, 0, 0, 0.8)` | `theme.colors.overlay.surface` |
| `fontSize: 16` | `theme.typography.body` |
| `fontSize: 20` | `theme.typography.h5` |
| `padding: 16` | `theme.spacing['4']` |
| `margin: 24` | `theme.spacing['6']` |
| `borderRadius: 12` | `theme.layout.borderRadius.lg` |

### Utility Classes Cheat Sheet

| Utility | CSS Equivalent |
|---------|----------------|
| `spacingUtils.p4` | `padding: 16px` |
| `spacingUtils.mx3` | `marginHorizontal: 12px` |
| `layoutUtils.flexCenter` | `alignItems: center, justifyContent: center` |
| `textUtils.textCenter` | `textAlign: center` |
| `colorUtils.bgWhite` | `backgroundColor: white` |

## Testing Your Migration

1. **Visual Consistency:** Ensure components look identical after migration
2. **Type Safety:** Use TypeScript to catch missing properties
3. **Performance:** Verify no performance regression
4. **Dark Mode Ready:** Your components should be ready for future dark mode support