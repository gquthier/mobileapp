/**
 * Design System Master Index
 * ===========================
 * Main entry point for the entire design system
 * Import this file to access all design tokens, components, and utilities
 */

// Design Tokens
export * from './tokens';

// Component Styles
export * from './components';

// Utilities
export * from './utilities';

// New design system exports (recommended)
export { theme } from './theme';

// Safe legacy exports for backward compatibility
export { colors, typography, spacing } from './theme';

export {
  getButtonStyle,
  getInputStyle,
  getCardStyle,
} from './components';