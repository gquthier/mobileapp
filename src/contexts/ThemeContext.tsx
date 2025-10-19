import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const THEME_COLOR_KEY = '@theme_color_preference';

type ColorMode = 'auto' | 'custom';

interface ThemeContextType {
  brandColor: string;
  colorMode: ColorMode;
  customColor: string | null;
  setBrandColor: (color: string) => void;
  setColorMode: (mode: ColorMode) => void;
  setCustomColor: (color: string) => void;
  loadCurrentChapterColor: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

const DEFAULT_BRAND_COLOR = '#9B66FF'; // Purple par défaut

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [brandColor, setBrandColor] = useState<string>(DEFAULT_BRAND_COLOR);
  const [colorMode, setColorMode] = useState<ColorMode>('auto');
  const [customColor, setCustomColor] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load preferences from AsyncStorage
  useEffect(() => {
    loadPreferences();
  }, []);

  // Update brand color when mode or custom color changes (but not on initial load)
  useEffect(() => {
    if (!isInitialized) return; // Skip initial load

    if (colorMode === 'custom' && customColor) {
      setBrandColor(customColor);
    } else if (colorMode === 'auto') {
      // Auto mode: load current chapter color
      loadCurrentChapterColor();
    }
  }, [colorMode, customColor, isInitialized]);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_COLOR_KEY);
      if (stored) {
        const { mode, color } = JSON.parse(stored);
        setColorMode(mode);
        if (mode === 'custom' && color) {
          setCustomColor(color);
          setBrandColor(color);
        } else {
          await loadCurrentChapterColor();
        }
      } else {
        // Default: auto mode with current chapter color
        await loadCurrentChapterColor();
      }
    } catch (error) {
      console.error('❌ Error loading theme preferences:', error);
      setBrandColor(DEFAULT_BRAND_COLOR);
    } finally {
      setIsInitialized(true); // Mark as initialized after loading
    }
  };

  const loadCurrentChapterColor = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setBrandColor(DEFAULT_BRAND_COLOR);
        return;
      }

      // Fetch current chapter
      const { data: chapters, error } = await supabase
        .from('chapters')
        .select('color')
        .eq('user_id', user.id)
        .eq('is_current', true)
        .limit(1);

      if (error) {
        console.error('❌ Error fetching current chapter:', error);
        setBrandColor(DEFAULT_BRAND_COLOR);
        return;
      }

      if (chapters && chapters.length > 0 && chapters[0].color) {
        setBrandColor(chapters[0].color);
      } else {
        setBrandColor(DEFAULT_BRAND_COLOR);
      }
    } catch (error) {
      console.error('❌ Error loading current chapter color:', error);
      setBrandColor(DEFAULT_BRAND_COLOR);
    }
  };

  const handleSetColorMode = async (mode: ColorMode) => {
    setColorMode(mode);
    try {
      await AsyncStorage.setItem(
        THEME_COLOR_KEY,
        JSON.stringify({ mode, color: customColor })
      );
      if (mode === 'auto') {
        await loadCurrentChapterColor();
      }
    } catch (error) {
      console.error('❌ Error saving color mode:', error);
    }
  };

  const handleSetCustomColor = async (color: string) => {
    setCustomColor(color);
    setColorMode('custom'); // Change mode to custom
    setBrandColor(color);
    try {
      await AsyncStorage.setItem(
        THEME_COLOR_KEY,
        JSON.stringify({ mode: 'custom', color })
      );
    } catch (error) {
      console.error('❌ Error saving custom color:', error);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        brandColor,
        colorMode,
        customColor,
        setBrandColor,
        setColorMode: handleSetColorMode,
        setCustomColor: handleSetCustomColor,
        loadCurrentChapterColor,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
