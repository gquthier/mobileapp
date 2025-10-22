import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { DarkModeProvider } from './src/contexts/DarkModeContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { useFonts, Poppins_600SemiBold_Italic } from '@expo-google-fonts/poppins';
import { initializeNotifications } from './src/services/notificationService';
import { VideoLRUCache } from './src/services/videoLRUCache';
import { HighlightsCache } from './src/services/highlightsCache';

export default function App() {
  const [fontsLoaded] = useFonts({
    'Poppins-SemiBoldItalic': Poppins_600SemiBold_Italic,
  });

  // 🔔 Initialiser le système de notifications au démarrage
  // 🧹 PHASE 3.2: Auto-cleanup des caches au démarrage
  useEffect(() => {
    initializeNotifications();

    // Nettoyer les vidéos en cache de plus de 30 jours (background, non-bloquant)
    VideoLRUCache.cleanup(30).then(removed => {
      if (removed > 0) {
        console.log(`🧹 [App] Startup cleanup: Removed ${removed} old cached videos`);
      }
    });

    // Nettoyer les highlights de plus de 7 jours (background, non-bloquant)
    HighlightsCache.cleanup(7).then(removed => {
      if (removed > 0) {
        console.log(`🧹 [App] Startup cleanup: Removed ${removed} old highlight entries`);
      }
    });
  }, []);

  if (!fontsLoaded) {
    return null; // Ou un loading screen
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <DarkModeProvider>
            <StatusBar style="auto" />
            <AppNavigator />
          </DarkModeProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
