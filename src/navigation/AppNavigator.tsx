import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
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
import MomentumDashboardScreen from '../screens/MomentumDashboardScreen';
import LifeAreasSelectionScreen from '../screens/LifeAreasSelectionScreen';
import { VideoImportScreen } from '../screens/VideoImportScreen';
import ChapterManagementScreen from '../screens/ChapterManagementScreen';
import ChapterSetupScreen from '../screens/ChapterSetupScreen';
import ChapterDetailScreen from '../screens/ChapterDetailScreen';
import { VerticalFeedScreen } from '../features/vertical-feed/screens/VerticalFeedScreen';

const Tab = createBottomTabNavigator();
const LibraryStack = createStackNavigator();
const MomentumStack = createStackNavigator();

function LibraryStackNavigator() {
  return (
    <LibraryStack.Navigator screenOptions={{ headerShown: false }}>
      <LibraryStack.Screen name="LibraryMain" component={LibraryScreen} />
      <LibraryStack.Screen name="VideoImport" component={VideoImportScreen} />
      <LibraryStack.Screen
        name="VerticalFeed"
        component={VerticalFeedScreen}
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
    </LibraryStack.Navigator>
  );
}

function MomentumStackNavigator() {
  return (
    <MomentumStack.Navigator screenOptions={{ headerShown: false }}>
      <MomentumStack.Screen name="MomentumMain" component={MomentumDashboardScreen} />
      <MomentumStack.Screen name="ChapterDetail" component={ChapterDetailScreen} />
      <MomentumStack.Screen name="ChapterManagement" component={ChapterManagementScreen} />
      <MomentumStack.Screen name="ChapterSetup" component={ChapterSetupScreen} />
    </MomentumStack.Navigator>
  );
}

export const AppNavigator = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { isFirstTime, isLoading: firstTimeLoading, markWelcomeComplete } = useFirstTimeUser();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showLifeAreasSelection, setShowLifeAreasSelection] = useState(false);
  const [hideTabBar, setHideTabBar] = useState(false);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);

      // Reprendre les uploads interrompus au démarrage
      if (session) {
        const { VideoBackupService } = require('../services/videoBackupService');
        VideoBackupService.uploadPendingVideos().catch((err: Error) => {
          console.error('❌ Error resuming pending uploads:', err);
        });
      }
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
    content = <WelcomeFlow
      onComplete={() => setShowOnboarding(true)}
      onSkipDemo={() => {
        setShowOnboarding(false);
        setShowLifeAreasSelection(false);
        markWelcomeComplete();
      }}
    />;
  } else if (showOnboarding) {
    content = <OnboardingScreens
      onComplete={() => setShowLifeAreasSelection(true)}
      onSkipDemo={() => {
        setShowOnboarding(false);
        setShowLifeAreasSelection(false);
        markWelcomeComplete();
      }}
    />;
  } else if (showLifeAreasSelection) {
    content = <LifeAreasSelectionScreen onComplete={markWelcomeComplete} navigation={undefined} />;
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
          component={LibraryStackNavigator}
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
          name="Momentum"
          component={MomentumStackNavigator}
          options={{
            tabBarLabel: 'Momentum',
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