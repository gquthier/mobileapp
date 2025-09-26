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

  if (!session) {
    return (
      <NavigationContainer>
        <AuthScreen onAuthSuccess={() => {}} />
      </NavigationContainer>
    );
  }

  // Show welcome flow for first-time users
  if (isFirstTime && !showOnboarding) {
    return (
      <NavigationContainer>
        <WelcomeFlow onComplete={() => setShowOnboarding(true)} />
      </NavigationContainer>
    );
  }

  // Show onboarding after welcome
  if (showOnboarding) {
    return (
      <NavigationContainer>
        <OnboardingScreens onComplete={markWelcomeComplete} />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
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
    </NavigationContainer>
  );
};