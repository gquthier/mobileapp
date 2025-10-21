import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { DarkModeProvider, useDarkMode } from './src/contexts/DarkModeContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { useFonts, Poppins_600SemiBold_Italic } from '@expo-google-fonts/poppins';
import { initializeNotifications } from './src/services/notificationService';

// AppContent component that uses the dark mode context
function AppContent() {
  const { isDarkMode } = useDarkMode();

  return (
    <>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    'Poppins-SemiBoldItalic': Poppins_600SemiBold_Italic,
  });

  // 🔔 Initialiser le système de notifications au démarrage
  useEffect(() => {
    initializeNotifications();
  }, []);

  if (!fontsLoaded) {
    return null; // Ou un loading screen
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <DarkModeProvider>
            <AppContent />
          </DarkModeProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
