import { useMemo } from 'react';
import { getTheme } from '../styles/theme';
import { useTheme as useThemeContext } from '../contexts/ThemeContext';

export const useTheme = () => {
  const themeContext = useThemeContext();
  const brandColor = themeContext?.brandColor || '#9B66FF';

  // ✅ ALWAYS return light theme (dark mode removed)
  const baseTheme = getTheme(false);

  // Return theme with dynamic brand.primary
  return useMemo(() => ({
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      brand: {
        ...baseTheme.colors.brand,
        primary: brandColor, // Dynamic brand color from ThemeContext
      },
    },
  }), [brandColor]);
};
