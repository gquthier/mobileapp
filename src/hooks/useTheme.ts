import { useMemo } from 'react';
import { useDarkMode } from '../contexts/DarkModeContext';
import { getTheme } from '../styles/theme';
import { useTheme as useThemeContext } from '../contexts/ThemeContext';

export const useTheme = () => {
  const { isDarkMode } = useDarkMode();
  const themeContext = useThemeContext();
  const brandColor = themeContext?.brandColor || '#9B66FF';
  const baseTheme = getTheme(isDarkMode);

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
  }), [isDarkMode, brandColor]);
};
