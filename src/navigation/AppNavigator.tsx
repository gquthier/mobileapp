import React, { useState, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import { createStackNavigator } from '@react-navigation/stack';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { useFirstTimeUser } from '../hooks/useFirstTimeUser';
import { useTheme } from '../contexts/ThemeContext';
import { WelcomeFlow } from '../components/WelcomeFlow';
import { ChapterCreationFlow } from '../components/ChapterCreationFlow';
import { VideoImportFlow } from '../components/VideoImportFlow';
import { OnboardingScreens } from '../components/OnboardingScreens';
import { ErrorBoundary } from '../components/ErrorBoundary';
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
import EditChapterScreen from '../screens/EditChapterScreen';
import { VerticalFeedScreen } from '../features/vertical-feed/screens/VerticalFeedScreen';
import { VerticalFeedTabScreen } from '../screens/VerticalFeedTabScreen';
import { setupNotificationClickListener, requestNotificationPermissions } from '../services/notificationService';
import { CHAPTER_COLORS } from '../constants/chapterColors';

const Tab = createNativeBottomTabNavigator();
const LibraryStack = createStackNavigator();
const MomentumStack = createStackNavigator();
const RootStack = createStackNavigator(); // ✅ Root Stack pour modal fullscreen

// Composant vide pour créer de l'espace à droite
function EmptyComponent() {
  return null;
}

// ✅ RecordScreen wrapped with ErrorBoundary for auto-recovery
function RecordScreenWithErrorBoundary(props: any) {
  const handleError = (error: Error) => {
    console.error('🔴 [RECORD ERROR]', error);

    // If in modal, try to close it and return to tab
    if (props.route?.params?.isModal && props.navigation?.canGoBack()) {
      console.log('🔄 [AUTO-RECOVERY] Closing modal and returning to Record tab...');
      setTimeout(() => {
        props.navigation.goBack();
      }, 2000);
    }
  };

  return (
    <ErrorBoundary onError={handleError} autoRecover={true}>
      <RecordScreen {...props} />
    </ErrorBoundary>
  );
}

// Main tabs component WITH RecordScreen (stays in tabs)
function MainTabs() {
  const { brandColor } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="Library"
      translucent={true}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: brandColor, // Dynamic brand color from current chapter
      }}
    >
      <Tab.Screen
        name="Library"
        component={LibraryStackNavigator}
        options={{
          title: 'Library',
          tabBarIcon: () => ({ sfSymbol: 'square.grid.2x2' }),
        }}
      />
      <Tab.Screen
        name="VerticalFeed"
        component={VerticalFeedTabScreen}
        options={{
          title: 'Feed',
          tabBarIcon: () => ({ sfSymbol: 'rectangle.stack.fill' }),
        }}
      />
      <Tab.Screen
        name="Momentum"
        component={MomentumStackNavigator}
        options={{
          title: 'Chapters',
          tabBarIcon: () => ({ sfSymbol: 'chart.line.uptrend.xyaxis' }),
        }}
      />
      <Tab.Screen
        name="Record"
        component={RecordScreenWithErrorBoundary} // ✅ RecordScreen avec ErrorBoundary
        options={{
          title: 'Record',
          tabBarIcon: () => ({ sfSymbol: 'record.circle' }),
        }}
      />
    </Tab.Navigator>
  );
}

// ✅ Root Stack avec Tabs + RecordScreen en modal fullscreen
function RootStackNavigator() {
  return (
    <RootStack.Navigator
      id="RootStack"
      screenOptions={{
        headerShown: false,
      }}
    >
      <RootStack.Screen name="MainTabs" component={MainTabs} />
      <RootStack.Screen
        name="RecordModal"
        component={RecordScreenWithErrorBoundary} // ✅ Modal avec ErrorBoundary
        options={{
          presentation: 'fullScreenModal', // ✅ Modal fullscreen sans tab bar
          animation: 'slide_from_bottom',
        }}
        initialParams={{ isModal: true }} // ✅ Flag to identify modal instance
      />
    </RootStack.Navigator>
  );
}

function LibraryStackNavigator() {
  return (
    <LibraryStack.Navigator screenOptions={{ headerShown: false }}>
      <LibraryStack.Screen name="LibraryMain" component={LibraryScreen} />
      <LibraryStack.Screen name="Settings" component={SettingsScreen} />
      <LibraryStack.Screen name="VideoImport" component={VideoImportScreen} />
      <LibraryStack.Screen name="ChapterManagement" component={ChapterManagementScreen} />
      <LibraryStack.Screen name="EditChapter" component={EditChapterScreen} />
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
      <MomentumStack.Screen name="EditChapter" component={EditChapterScreen} />
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
  const [showVideoImport, setShowVideoImport] = useState(false);
  const [createdChapterId, setCreatedChapterId] = useState<string | null>(null);
  const [chapterColor, setChapterColor] = useState<string>(CHAPTER_COLORS[0]);
  const [hideTabBar, setHideTabBar] = useState(false);
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  // ✅ Reset onboarding states when isFirstTime becomes true (after reset or new account)
  useEffect(() => {
    if (isFirstTime && session) {
      console.log('🔄 Resetting onboarding states for first-time user');
      setShowOnboarding(false);
      setShowVideoImport(false);
      setShowLifeAreasSelection(false);
      setCreatedChapterId(null);
      setChapterColor(CHAPTER_COLORS[0]);
    }
  }, [isFirstTime, session]);

  // 🔔 Demander les permissions de notification après l'onboarding
  useEffect(() => {
    if (session && !isFirstTime && !showOnboarding && !showVideoImport && !showLifeAreasSelection) {
      // Attendre 2 secondes après l'onboarding pour demander les permissions
      const timer = setTimeout(async () => {
        await requestNotificationPermissions();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [session, isFirstTime, showOnboarding, showVideoImport, showLifeAreasSelection]);

  // 🔔 Setup listener pour navigation quand on clique sur une notification
  useEffect(() => {
    const cleanup = setupNotificationClickListener((data) => {
      console.log('🔔 Navigation depuis notification:', data);

      // Navigate vers l'écran approprié
      if (navigationRef.current?.isReady()) {
        if (data.screen === 'RecordScreen') {
          // Ouvrir RecordScreen en modal
          navigationRef.current.navigate('MainTabs', {
            screen: 'Record'
          });
        }
        // 🔮 Ajouter d'autres screens ici si nécessaire
      }
    });

    return cleanup;
  }, []);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);

      // Reprendre les uploads interrompus au démarrage
      if (session) {
        const { VideoBackupService } = require('../services/videoBackupService');

        // ✅ Étape 1: Tenter d'uploader les vidéos en attente
        VideoBackupService.uploadPendingVideos()
          .catch((err: Error) => {
            console.error('❌ Error resuming pending uploads:', err);
          })
          .finally(() => {
            // ✅ Étape 2: Nettoyer les backups invalides (chemins obsolètes après reinstall)
            VideoBackupService.cleanupInvalidBackups().catch((err: Error) => {
              console.error('❌ Error cleaning up invalid backups:', err);
            });
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
    content = <ChapterCreationFlow
      onComplete={(chapterId, color) => {
        console.log('✅ Chapter created:', chapterId, 'with color:', color);
        setCreatedChapterId(chapterId);
        setChapterColor(color);
        setShowOnboarding(false);
        setShowVideoImport(true);
      }}
      onSkip={() => {
        setShowOnboarding(false);
        setShowLifeAreasSelection(false);
        markWelcomeComplete();
      }}
    />;
  } else if (showVideoImport && createdChapterId) {
    content = <VideoImportFlow
      chapterId={createdChapterId}
      chapterColor={chapterColor}
      onComplete={(importedCount) => {
        console.log(`✅ Imported ${importedCount} videos`);
        setShowVideoImport(false);
        markWelcomeComplete();
      }}
      onSkip={() => {
        setShowVideoImport(false);
        markWelcomeComplete();
      }}
    />;
  } else if (showLifeAreasSelection) {
    content = <LifeAreasSelectionScreen onComplete={markWelcomeComplete} navigation={undefined} />;
  } else {
    content = <RootStackNavigator />; // ✅ Use Root Stack instead of Tabs directly
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {content}
    </NavigationContainer>
  );
};