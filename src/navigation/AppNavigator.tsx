import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CustomTabBar } from '../components/CustomTabBar';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { useFirstTimeUser } from '../hooks/useFirstTimeUser';
import { WelcomeFlow } from '../components/WelcomeFlow';
import { OnboardingScreens } from '../components/OnboardingScreens';
import HomeScreen from '../screens/HomeScreen';
import LibraryScreen from '../screens/LibraryScreen';
import RecordScreen from '../screens/RecordScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AuthScreen from '../screens/AuthScreen';

const Tab = createBottomTabNavigator();

export const AppNavigator = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { isFirstTime, isLoading: firstTimeLoading, markWelcomeComplete } = useFirstTimeUser();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hideTabBar, setHideTabBar] = useState(false);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    getSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading || firstTimeLoading) {
    return null; // Show loading screen
  }

  // Déterminer quel contenu afficher
  let content;

  if (!session) {
    content = <AuthScreen onAuthSuccess={() => {}} />;
  } else if (isFirstTime && !showOnboarding) {
    content = <WelcomeFlow onComplete={() => setShowOnboarding(true)} />;
  } else if (showOnboarding) {
    content = <OnboardingScreens onComplete={markWelcomeComplete} />;
  } else {
    content = (
      <Tab.Navigator
        tabBar={(props) => hideTabBar ? null : <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
        screenListeners={({ route, navigation }) => ({
          state: (e) => {
            // Vérifier si on est sur RecordScreen et en mode enregistrement
            const currentRoute = e.data.state.routes[e.data.state.index];
            if (currentRoute.name === 'Record') {
              const isRecording = currentRoute.params?.isRecording;
              const showControls = currentRoute.params?.showControls;
              // Masquer la barre si on enregistre ET que les contrôles sont masqués
              setHideTabBar(isRecording && !showControls);
            }
          },
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: 'Chapters',
          }}
        />
        <Tab.Screen
          name="Library"
          component={LibraryScreen}
          options={{
            tabBarLabel: 'Library',
          }}
        />
        <Tab.Screen
          name="Record"
          component={RecordScreen}
          options={{
            tabBarLabel: 'Record',
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Settings',
          }}
        />
      </Tab.Navigator>
    );
  }

  return (
    <NavigationContainer>
      {content}
    </NavigationContainer>
  );
};