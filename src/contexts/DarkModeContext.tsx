import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DarkModeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

const DARK_MODE_KEY = '@app_dark_mode';

export const DarkModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // ✅ FORCE Light Mode - Always false (dark mode disabled)
  const isDarkMode = false;

  // Clear any stored dark mode preference on mount
  useEffect(() => {
    const clearDarkModePreference = async () => {
      try {
        await AsyncStorage.removeItem(DARK_MODE_KEY);
        console.log('✅ Dark mode preference cleared - Light mode forced');
      } catch (error) {
        console.error('Error clearing dark mode preference:', error);
      }
    };

    clearDarkModePreference();
  }, []);

  const toggleDarkMode = () => {
    // ✅ No-op - Dark mode is disabled
    console.log('⚠️ Dark mode is disabled. See NIGHT_MODE_RESTORATION_GUIDE.md to re-enable.');
  };

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  );
};

export const useDarkMode = (): DarkModeContextType => {
  const context = useContext(DarkModeContext);
  if (context === undefined) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  return context;
};
