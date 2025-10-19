import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { DarkModeProvider } from './src/contexts/DarkModeContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { useFonts, Poppins_600SemiBold_Italic } from '@expo-google-fonts/poppins';

export default function App() {
  const [fontsLoaded] = useFonts({
    'Poppins-SemiBoldItalic': Poppins_600SemiBold_Italic,
  });

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
