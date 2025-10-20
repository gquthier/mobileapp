import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { useTheme as useHookTheme } from '../hooks/useTheme';
import { useTheme as useThemeContext } from '../contexts/ThemeContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { TopBar } from '../components/TopBar';
import { Icon } from '../components/Icon';
import { LoadingDots } from '../components/LoadingDots';
import { AuthService, Profile } from '../services/authService';
import { supabase, Chapter } from '../lib/supabase';
import {
  generateMissingChapterStories,
  countChaptersWithoutStories
} from '../services/chapterStoryService';
import { getCurrentChapter } from '../services/chapterService';
import { CHAPTER_COLORS } from '../constants/chapterColors';
import ProfileScreen from './ProfileScreen';
import AuthScreen from './AuthScreen';

// ✅ Static Life Areas configuration (12 fixed areas)
const LIFE_AREAS_CONFIG: Record<string, { emoji: string; name: string }> = {
  'Health': { emoji: '💪', name: 'Health' },
  'Family': { emoji: '👨‍👩‍👧‍👦', name: 'Family' },
  'Friends': { emoji: '🤝', name: 'Friends' },
  'Love': { emoji: '❤️', name: 'Love' },
  'Work': { emoji: '💼', name: 'Work' },
  'Business': { emoji: '📈', name: 'Business' },
  'Money': { emoji: '💰', name: 'Money' },
  'Growth': { emoji: '🌱', name: 'Growth' },
  'Leisure': { emoji: '🎯', name: 'Leisure' },
  'Home': { emoji: '🏠', name: 'Home' },
  'Spirituality': { emoji: '🙏', name: 'Spirituality' },
  'Community': { emoji: '🌍', name: 'Community' },
};

interface SettingsItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  value?: string;
  showChevron?: boolean;
  showSwitch?: boolean;
  switchValue?: boolean;
  colorCircle?: string; // Color for a circular icon instead of standard icon
  onPress?: () => void;
  onSwitchChange?: (value: boolean) => void;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  icon,
  title,
  subtitle,
  value,
  showChevron = false,
  showSwitch = false,
  switchValue = false,
  colorCircle,
  onPress,
  onSwitchChange,
}) => {
  const theme = useHookTheme();

  return (
    <TouchableOpacity
      style={[styles.settingsItem, {
        backgroundColor: theme.colors.ui.surface,
        borderBottomColor: theme.colors.ui.muted
      }]}
      onPress={onPress}
      disabled={!onPress && !showSwitch}
      activeOpacity={0.6}
    >
      <View style={styles.itemLeft}>
        {colorCircle ? (
          <View style={[styles.iconContainer, { backgroundColor: 'transparent' }]}>
            <View style={[styles.colorCircleIcon, { backgroundColor: colorCircle }]} />
          </View>
        ) : (
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.ui.surfaceHover }]}>
            <Icon name={icon} size={20} color={theme.colors.text.primary} />
          </View>
        )}
        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, { color: theme.colors.text.primary }]}>{title}</Text>
          {subtitle && <Text style={[styles.itemSubtitle, { color: theme.colors.text.secondary }]}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.itemRight}>
        {value && <Text style={[styles.itemValue, { color: theme.colors.text.secondary }]}>{value}</Text>}
        {showSwitch && (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{ false: theme.colors.ui.border, true: theme.colors.brand.primary }}
            thumbColor={theme.colors.white}
            ios_backgroundColor={theme.colors.ui.border}
          />
        )}
        {showChevron && <Icon name="chevronRight" size={16} color={theme.colors.text.disabled} />}
      </View>
    </TouchableOpacity>
  );
};

interface SettingsSectionProps {
  title?: string;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children }) => {
  const theme = useHookTheme();

  return (
    <View style={styles.section}>
      {title && <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>{title}</Text>}
      <View style={[styles.sectionContent, { backgroundColor: theme.colors.ui.surface }]}>{children}</View>
    </View>
  );
};

interface ProfileHeaderProps {
  profile: Profile | null;
  currentChapter: Chapter | null;
  onPhotoPress: () => void;
  onNamePress: () => void;
  isUploading?: boolean;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ profile, currentChapter, onPhotoPress, onNamePress, isUploading }) => {
  const theme = useHookTheme();
  const { brandColor } = useThemeContext();

  return (
    <View style={styles.profileHeader}>
      {/* Photo de profil (cliquable pour modifier) */}
      <TouchableOpacity
        style={styles.avatarContainer}
        onPress={onPhotoPress}
        activeOpacity={0.8}
      >
        {isUploading ? (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.ui.surfaceHover }]}>
            <LoadingDots color={brandColor} />
          </View>
        ) : profile?.avatar_url ? (
          <Image
            source={{ uri: profile.avatar_url }}
            style={styles.avatar}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.ui.surfaceHover }]}>
            <Icon name="user" size={48} color={theme.colors.text.disabled} />
          </View>
        )}
      </TouchableOpacity>

      {/* Prénom (éditable uniquement si vide) */}
      {!profile?.first_name ? (
        <TouchableOpacity
          style={styles.nameContainer}
          onPress={onNamePress}
          activeOpacity={0.8}
        >
          <Text style={[styles.profileName, { color: theme.colors.text.tertiary }]}>
            Tap to add name
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.nameContainer}>
          <Text style={[styles.profileName, { color: theme.colors.text.primary }]}>
            {profile.first_name}
          </Text>
        </View>
      )}

      {/* Current Chapter label - below name */}
      {currentChapter && (
        <Text style={[styles.chapterLabel, { color: theme.colors.text.secondary }]}>
          CHAPTER {currentChapter.chapter_number || ''}
        </Text>
      )}
    </View>
  );
};

interface SettingsScreenProps {
  navigation?: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const theme = useHookTheme();
  const { brandColor, colorMode, customColor, setColorMode, setCustomColor, loadCurrentChapterColor } = useThemeContext();
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const [currentView, setCurrentView] = useState<'settings' | 'profile' | 'auth'>('settings');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);

  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [cloudBackup, setCloudBackup] = useState(false);

  // Profile editing state
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [editedName, setEditedName] = useState('');

  // App color theme state
  const [showColorPickerModal, setShowColorPickerModal] = useState(false);

  // AI Story generation state
  const [isGeneratingStories, setIsGeneratingStories] = useState(false);
  const [chaptersWithoutStories, setChaptersWithoutStories] = useState(0);
  const [generationProgress, setGenerationProgress] = useState('');

  useEffect(() => {
    loadUserData();
    loadChapterStoriesCount();
  }, []);

  const loadChapterStoriesCount = async () => {
    const count = await countChaptersWithoutStories();
    setChaptersWithoutStories(count);
  };

  const loadUserData = async () => {
    setLoading(true);
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser.user);
        setProfile(currentUser.profile);

        // Load current chapter
        const chapter = await getCurrentChapter(currentUser.user.id);

        // If chapter doesn't have chapter_number, calculate it
        if (chapter && !chapter.chapter_number) {
          // Get all user chapters to count
          const { data: allChapters } = await supabase
            .from('chapters')
            .select('id, started_at')
            .eq('user_id', currentUser.user.id)
            .order('started_at', { ascending: true });

          if (allChapters) {
            // Find index of current chapter
            const chapterIndex = allChapters.findIndex(c => c.id === chapter.id);
            chapter.chapter_number = chapterIndex + 1; // 1-indexed
          }
        }

        setCurrentChapter(chapter);

        // Load user preferences from profile
        if (currentUser.profile?.notification_settings) {
          const notifSettings = currentUser.profile.notification_settings;
          setNotificationsEnabled(notifSettings.push_enabled);
          setReminderEnabled(notifSettings.reminders_enabled);
        }

        if (currentUser.profile?.backup_settings) {
          const backupSettings = currentUser.profile.backup_settings;
          setCloudBackup(backupSettings.cloud_backup_enabled);
        }
      } else {
        setCurrentView('auth');
      }
    } catch (error) {
      console.error('❌ Failed to load user data:', error);
      setCurrentView('auth');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountPress = () => {
    if (!user) {
      setCurrentView('auth');
    } else {
      setCurrentView('profile');
    }
  };

  const handleManageChaptersPress = () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to manage your chapters');
      return;
    }
    if (navigation) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate('ChapterManagement');
    }
  };

  const handleNotificationSettings = () => {
    Alert.alert('Notification Settings', 'Advanced notification settings coming soon');
  };

  const handleBackupSettings = () => {
    Alert.alert('Backup Settings', 'Configure backup preferences coming soon');
  };

  const handlePrivacyPress = () => {
    Alert.alert('Privacy', 'Privacy settings coming soon');
  };

  const handleLanguagePress = () => {
    Alert.alert('Language', 'Language selection coming soon');
  };

  const handleHelpPress = () => {
    Alert.alert('Help & Support', 'Help center coming soon');
  };

  const handleAboutPress = () => {
    Alert.alert('About', 'Chapters App v1.0.0\nBuilt for personal reflection and growth');
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.signOut();
              setUser(null);
              setProfile(null);
              setCurrentView('auth');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const updateNotificationSettings = async (key: string, value: boolean) => {
    if (!profile) return;

    try {
      const updatedSettings = {
        ...profile.notification_settings,
        [key]: value,
      };

      await AuthService.updateProfile(profile.id, {
        notification_settings: updatedSettings,
      });
    } catch (error) {
      console.error('❌ Failed to update notification settings:', error);
    }
  };

  const updateBackupSettings = async (key: string, value: boolean) => {
    if (!profile) return;

    try {
      const updatedSettings = {
        ...profile.backup_settings,
        [key]: value,
      };

      await AuthService.updateProfile(profile.id, {
        backup_settings: updatedSettings,
      });
    } catch (error) {
      console.error('❌ Failed to update backup settings:', error);
    }
  };

  const onNotificationsChange = (value: boolean) => {
    setNotificationsEnabled(value);
    updateNotificationSettings('push_enabled', value);
  };

  const onRemindersChange = (value: boolean) => {
    setReminderEnabled(value);
    updateNotificationSettings('reminders_enabled', value);
  };

  const onCloudBackupChange = (value: boolean) => {
    setCloudBackup(value);
    updateBackupSettings('cloud_backup_enabled', value);
  };

  /**
   * Upload profile photo from gallery
   */
  const handlePhotoPress = async () => {
    if (!user || !profile) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to change your profile picture.');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setIsUploadingPhoto(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Upload to Supabase Storage
      const fileExt = asset.uri.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert base64 to Uint8Array
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Upload to 'avatars' bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, bytes, {
          contentType: asset.mimeType || 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const avatarUrl = urlData.publicUrl;

      // Update profile
      await AuthService.updateProfile(profile.id, {
        avatar_url: avatarUrl,
      });

      // Reload user data
      await loadUserData();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Profile photo updated successfully!');
    } catch (error) {
      console.error('❌ Error uploading photo:', error);
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  /**
   * Open name edit modal
   */
  const handleNamePress = () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    setEditedName(profile?.first_name || '');
    setShowNameModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  /**
   * Save edited name
   */
  const handleSaveName = async () => {
    if (!profile) return;

    try {
      await AuthService.updateProfile(profile.id, {
        first_name: editedName.trim(),
      });

      await loadUserData();
      setShowNameModal(false);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Name updated successfully!');
    } catch (error) {
      console.error('❌ Error updating name:', error);
      Alert.alert('Error', 'Failed to update name. Please try again.');
    }
  };

  const handleAuthSuccess = () => {
    setCurrentView('settings');
    loadUserData();
  };

  /**
   * Open App Color Theme picker modal
   */
  const handleAppColorPress = () => {
    setShowColorPickerModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  /**
   * Set color mode to Auto (current chapter)
   */
  const handleSetAutoColor = async () => {
    await setColorMode('auto');
    setShowColorPickerModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  /**
   * Set custom color
   */
  const handleSelectCustomColor = async (color: string) => {
    await setCustomColor(color);
    setShowColorPickerModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  /**
   * Get color mode label
   */
  const getColorModeLabel = (): string => {
    if (colorMode === 'auto') {
      return 'Auto (Current Chapter)';
    } else {
      return 'Custom';
    }
  };

  /**
   * Create transcription jobs for videos that don't have them
   */
  const handleBackfillTranscriptions = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    Alert.alert(
      'Create Transcription Jobs',
      'This will create transcription jobs for all your videos that don\'t have them yet.\n\nThis will enable AI features like chapter stories and highlights.\n\nContinue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create Jobs',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

              console.log('🚀 Calling backfill-transcription-jobs...');

              const { data, error } = await supabase.functions.invoke('backfill-transcription-jobs', {
                body: {
                  limit: 100, // Process up to 100 videos
                  userId: user.id
                }
              });

              if (error) {
                throw new Error(error.message);
              }

              if (!data.success) {
                throw new Error(data.error || 'Failed to create transcription jobs');
              }

              console.log('✅ Backfill result:', data);

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                'Success! 🎉',
                `Created ${data.created} transcription jobs.\n\nProcessing will start automatically. Check back in a few minutes!`
              );

            } catch (error: any) {
              console.error('❌ Error backfilling transcriptions:', error);
              Alert.alert('Error', error.message || 'Failed to create transcription jobs. Please try again.');
            }
          }
        }
      ]
    );
  };

  /**
   * 🧪 DEV ONLY: Test Life Areas calculation (simplified - reads from highlights JSON)
   */
  const handleTestLifeAreas = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      console.log('🧪 TEST: Starting Life Areas analysis...');

      // Get all transcription jobs with highlights
      const { data: jobs, error: jobsError } = await supabase
        .from('transcription_jobs')
        .select('transcript_highlight, video_id')
        .not('transcript_highlight', 'is', null);

      if (jobsError) {
        console.error('❌ Error loading transcription jobs:', jobsError);
        Alert.alert('Error', 'Failed to load transcription jobs');
        return;
      }

      console.log(`📊 Found ${jobs?.length || 0} transcription jobs with highlights`);

      if (!jobs || jobs.length === 0) {
        Alert.alert('No Data', 'No transcription jobs with highlights found.\n\nMake sure your videos are transcribed.');
        return;
      }

      // Count mentions per life area (simple string counting from JSON)
      const mentionCounts = new Map<string, number>();
      let totalHighlights = 0;
      let highlightsWithArea = 0;

      jobs.forEach((job, jobIndex) => {
        if (!job.transcript_highlight) return;

        const highlights = job.transcript_highlight.highlights || [];
        console.log(`📝 Job ${jobIndex}: ${highlights.length} highlights`);

        highlights.forEach((highlight: any, highlightIndex: number) => {
          totalHighlights++;

          // Get the area field from the highlight (simple string)
          const highlightArea = highlight.area;
          console.log(`  - Highlight ${highlightIndex}: area="${highlightArea}"`);

          if (highlightArea && typeof highlightArea === 'string') {
            highlightsWithArea++;

            // Normalize to capitalized form (e.g., "health" → "Health")
            const normalizedArea = highlightArea.charAt(0).toUpperCase() + highlightArea.slice(1).toLowerCase();

            // Check if it exists in our static config
            if (LIFE_AREAS_CONFIG[normalizedArea]) {
              const currentCount = mentionCounts.get(normalizedArea) || 0;
              mentionCounts.set(normalizedArea, currentCount + 1);
              console.log(`    ✅ Matched to "${normalizedArea}"`);
            } else {
              console.log(`    ⚠️ No match found for "${highlightArea}" (normalized: "${normalizedArea}")`);
            }
          }
        });
      });

      console.log(`\n📊 RESULTS:`);
      console.log(`   Total highlights: ${totalHighlights}`);
      console.log(`   Highlights with area: ${highlightsWithArea}`);
      console.log(`   Mentions per area:`, Object.fromEntries(mentionCounts));

      // Calculate percentages for areas with mentions
      const areaPercentages = Array.from(mentionCounts.entries())
        .map(([areaKey, count]) => ({
          display_name: LIFE_AREAS_CONFIG[areaKey].name,
          count,
          percentage: Math.round((count / totalHighlights) * 100)
        }))
        .filter(item => item.count > 0) // Only areas with at least one mention
        .sort((a, b) => b.count - a.count); // Sort by count descending

      const resultsText = areaPercentages
        .map(item => `${item.display_name}: ${item.percentage}% (${item.count} mentions)`)
        .join('\n');

      Alert.alert(
        'Life Areas Analysis',
        `Total highlights: ${totalHighlights}\nHighlights with area: ${highlightsWithArea}\n\n${resultsText || 'No life areas found in highlights'}`,
        [{ text: 'OK' }]
      );

    } catch (error: any) {
      console.error('❌ Error testing life areas:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    }
  };

  /**
   * Generate AI stories for all old chapters without them
   */
  const handleGenerateChapterStories = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    if (chaptersWithoutStories === 0) {
      Alert.alert('All Done!', 'All your chapters already have AI-generated stories! 🎉');
      return;
    }

    Alert.alert(
      'Generate Chapter Stories',
      `This will generate AI-powered stories for ${chaptersWithoutStories} old chapters.\n\nThis may take a few minutes. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setIsGeneratingStories(true);
            setGenerationProgress('Starting generation...');

            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

              // Generate stories in batches of 5
              const batchSize = 5;
              let totalProcessed = 0;
              let totalSuccess = 0;

              while (totalProcessed < chaptersWithoutStories) {
                setGenerationProgress(`Generating... ${totalProcessed}/${chaptersWithoutStories}`);

                const result = await generateMissingChapterStories({ limit: batchSize });

                if (!result.success) {
                  throw new Error(result.error || 'Generation failed');
                }

                totalProcessed += result.processed;
                totalSuccess += result.successCount || 0;

                // If no more chapters to process, break
                if (result.processed === 0) {
                  break;
                }
              }

              setGenerationProgress('');
              await loadChapterStoriesCount(); // Refresh count

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                'Success! 🎉',
                `Generated AI stories for ${totalSuccess} chapters!`
              );

            } catch (error: any) {
              console.error('❌ Error generating chapter stories:', error);
              setGenerationProgress('');
              Alert.alert('Error', error.message || 'Failed to generate stories. Please try again.');
            } finally {
              setIsGeneratingStories(false);
            }
          }
        }
      ]
    );
  };

  // Show appropriate screen based on current view
  if (currentView === 'auth') {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  if (currentView === 'profile') {
    return <ProfileScreen onBack={() => setCurrentView('settings')} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.ui.background }]}>
      <View style={styles.content}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Header - Photo + Name */}
          {user && (
            <ProfileHeader
              profile={profile}
              currentChapter={currentChapter}
              onPhotoPress={handlePhotoPress}
              onNamePress={handleNamePress}
              isUploading={isUploadingPhoto}
            />
          )}

          {/* Account Section */}
          <SettingsSection title="Account">
            <SettingsItem
              icon="user"
              title={user ? 'Profile' : 'Sign In'}
              subtitle={
                user
                  ? `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || profile?.email
                  : 'Sign in to sync your data'
              }
              showChevron
              onPress={handleAccountPress}
            />
          </SettingsSection>

          {/* Chapters Management Section */}
          {user && (
            <SettingsSection title="Chapters">
              <SettingsItem
                icon="bookOpen"
                title="Manage Chapters"
                subtitle="Edit titles, dates, and organize your chapters"
                showChevron
                onPress={handleManageChaptersPress}
              />
            </SettingsSection>
          )}

          {/* Appearance Section */}
          <SettingsSection title="Appearance">
            <SettingsItem
              icon="moon"
              title="Night Mode"
              subtitle="Switch to dark theme"
              showSwitch
              switchValue={isDarkMode}
              onSwitchChange={toggleDarkMode}
            />
            <SettingsItem
              icon="droplet"
              title="App Color Theme"
              subtitle={getColorModeLabel()}
              colorCircle={brandColor}
              showChevron
              onPress={handleAppColorPress}
            />
          </SettingsSection>

          {/* Notifications Section */}
          <SettingsSection title="Notifications">
            <SettingsItem
              icon="bell"
              title="Push Notifications"
              subtitle="Receive reminders and updates"
              showSwitch
              switchValue={notificationsEnabled}
              onSwitchChange={onNotificationsChange}
            />
            <SettingsItem
              icon="clock"
              title="Recording Reminders"
              subtitle="Daily prompts to record your reflections"
              showSwitch
              switchValue={reminderEnabled}
              onSwitchChange={onRemindersChange}
            />
            <SettingsItem
              icon="settings"
              title="Notification Settings"
              subtitle="Customize notification preferences"
              showChevron
              onPress={handleNotificationSettings}
            />
          </SettingsSection>

          {/* Backup & Storage Section */}
          <SettingsSection title="Backup & Storage">
            <SettingsItem
              icon="cloud"
              title="Cloud Backup"
              subtitle="Automatically backup your videos"
              showSwitch
              switchValue={cloudBackup}
              onSwitchChange={onCloudBackupChange}
            />
            <SettingsItem
              icon="folder"
              title="Storage Settings"
              subtitle="Manage local and cloud storage"
              showChevron
              onPress={handleBackupSettings}
            />
          </SettingsSection>

          {/* Privacy & Security Section */}
          <SettingsSection title="Privacy & Security">
            <SettingsItem
              icon="shield"
              title="Privacy Settings"
              subtitle="Control your data and privacy"
              showChevron
              onPress={handlePrivacyPress}
            />
          </SettingsSection>

          {/* General Section */}
          <SettingsSection title="General">
            <SettingsItem
              icon="globe"
              title="Language"
              value={profile?.language === 'fr' ? 'Français' : profile?.language === 'es' ? 'Español' : 'English'}
              showChevron
              onPress={handleLanguagePress}
            />
          </SettingsSection>

          {/* Support Section */}
          <SettingsSection title="Support">
            <SettingsItem
              icon="helpCircle"
              title="Help & Support"
              subtitle="Get help and contact support"
              showChevron
              onPress={handleHelpPress}
            />
            <SettingsItem
              icon="info"
              title="About"
              subtitle="App version and information"
              showChevron
              onPress={handleAboutPress}
            />
          </SettingsSection>

          {/* AI Features Section - Only show if user is signed in */}
          {user && (
            <SettingsSection title="AI Features">
              {/* Generate Chapter Stories */}
              <TouchableOpacity
                style={[styles.aiFeatureCard, {
                  backgroundColor: theme.colors.ui.surface,
                  borderColor: isGeneratingStories ? theme.colors.brand.primary : theme.colors.ui.border,
                }]}
                onPress={handleGenerateChapterStories}
                disabled={isGeneratingStories}
                activeOpacity={0.7}
              >
                <View style={styles.aiFeatureContent}>
                  <View style={styles.aiFeatureHeader}>
                    <View style={[styles.aiIconContainer, {
                      backgroundColor: isGeneratingStories
                        ? theme.colors.brand.primary + '20'
                        : theme.colors.ui.surfaceHover
                    }]}>
                      {isGeneratingStories ? (
                        <LoadingDots color={brandColor} size={6} />
                      ) : (
                        <Icon name="sparkles" size={24} color={theme.colors.brand.primary} />
                      )}
                    </View>
                    <View style={styles.aiFeatureText}>
                      <Text style={[styles.aiFeatureTitle, { color: theme.colors.text.primary }]}>
                        Generate Chapter Stories
                      </Text>
                      <Text style={[styles.aiFeatureSubtitle, { color: theme.colors.text.secondary }]}>
                        {isGeneratingStories
                          ? generationProgress
                          : chaptersWithoutStories > 0
                            ? `${chaptersWithoutStories} chapters need AI stories`
                            : 'All chapters have AI stories ✓'
                        }
                      </Text>
                    </View>
                  </View>

                  {!isGeneratingStories && chaptersWithoutStories > 0 && (
                    <View style={[styles.aiFeatureBadge, { backgroundColor: theme.colors.brand.primary }]}>
                      <Text style={styles.aiFeatureBadgeText}>{chaptersWithoutStories}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* Create Missing Transcription Jobs */}
              <TouchableOpacity
                style={[styles.aiFeatureCard, {
                  backgroundColor: theme.colors.ui.surface,
                  borderColor: theme.colors.ui.border,
                  marginTop: theme.spacing['3'],
                }]}
                onPress={handleBackfillTranscriptions}
                activeOpacity={0.7}
              >
                <View style={styles.aiFeatureContent}>
                  <View style={styles.aiFeatureHeader}>
                    <View style={[styles.aiIconContainer, {
                      backgroundColor: theme.colors.ui.surfaceHover
                    }]}>
                      <Icon name="fileText" size={24} color={theme.colors.brand.primary} />
                    </View>
                    <View style={styles.aiFeatureText}>
                      <Text style={[styles.aiFeatureTitle, { color: theme.colors.text.primary }]}>
                        Create Transcription Jobs
                      </Text>
                      <Text style={[styles.aiFeatureSubtitle, { color: theme.colors.text.secondary }]}>
                        For videos without transcriptions
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>

              {/* 🧪 DEV: Test Life Areas */}
              <TouchableOpacity
                style={[styles.aiFeatureCard, {
                  backgroundColor: theme.colors.ui.surface,
                  borderColor: theme.colors.ui.border,
                  marginTop: theme.spacing['3'],
                }]}
                onPress={handleTestLifeAreas}
                activeOpacity={0.7}
              >
                <View style={styles.aiFeatureContent}>
                  <View style={styles.aiFeatureHeader}>
                    <View style={[styles.aiIconContainer, {
                      backgroundColor: theme.colors.ui.surfaceHover
                    }]}>
                      <Icon name="target" size={24} color={theme.colors.brand.primary} />
                    </View>
                    <View style={styles.aiFeatureText}>
                      <Text style={[styles.aiFeatureTitle, { color: theme.colors.text.primary }]}>
                        🧪 Test Life Areas
                      </Text>
                      <Text style={[styles.aiFeatureSubtitle, { color: theme.colors.text.secondary }]}>
                        Analyze Life Areas in highlights (DEV)
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </SettingsSection>
          )}

          {/* Sign Out Section - Only show if user is signed in */}
          {user && (
            <SettingsSection>
              <SettingsItem
                icon="logOut"
                title="Sign Out"
                onPress={handleSignOut}
              />
            </SettingsSection>
          )}

          {/* Bottom spacing for navigation */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      {/* Name Edit Modal */}
      <Modal
        visible={showNameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNameModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowNameModal(false)}
        >
          <TouchableOpacity
            style={[styles.modalContent, { backgroundColor: theme.colors.ui.surface }]}
            activeOpacity={1}
            onPress={() => {}}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
              Edit Name
            </Text>

            <TextInput
              style={[styles.modalInput, {
                backgroundColor: theme.colors.ui.background,
                color: theme.colors.text.primary,
                borderColor: theme.colors.ui.border,
              }]}
              placeholder="Enter your first name"
              placeholderTextColor={theme.colors.text.disabled}
              value={editedName}
              onChangeText={setEditedName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.ui.muted }]}
                onPress={() => setShowNameModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text.primary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.brand.primary }]}
                onPress={handleSaveName}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.white }]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* App Color Theme Picker Modal */}
      <Modal
        visible={showColorPickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowColorPickerModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowColorPickerModal(false)}
        >
          <TouchableOpacity
            style={[styles.colorPickerModalContent, { backgroundColor: theme.colors.ui.surface }]}
            activeOpacity={1}
            onPress={() => {}}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
              Choose App Color
            </Text>

            {/* Auto Option */}
            <TouchableOpacity
              style={[styles.colorModeOption, {
                backgroundColor: colorMode === 'auto' ? theme.colors.brand.primary + '15' : theme.colors.ui.background,
                borderColor: colorMode === 'auto' ? theme.colors.brand.primary : theme.colors.ui.border,
              }]}
              onPress={handleSetAutoColor}
              activeOpacity={0.7}
            >
              <View style={styles.colorModeOptionContent}>
                <View style={[styles.colorModeIcon, { backgroundColor: brandColor }]} />
                <View style={styles.colorModeText}>
                  <Text style={[styles.colorModeTitle, { color: theme.colors.text.primary }]}>
                    Auto (Current Chapter)
                  </Text>
                  <Text style={[styles.colorModeSubtitle, { color: theme.colors.text.secondary }]}>
                    Follows your active chapter color
                  </Text>
                </View>
              </View>
              {colorMode === 'auto' && (
                <Icon name="check" size={20} color={theme.colors.brand.primary} />
              )}
            </TouchableOpacity>

            {/* Custom Colors Grid */}
            <Text style={[styles.colorGridTitle, { color: theme.colors.text.secondary }]}>
              Or choose a custom color
            </Text>
            <ScrollView
              style={styles.colorGridScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.colorGrid}>
                {CHAPTER_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorCircle, {
                      backgroundColor: color,
                      borderColor: colorMode === 'custom' && customColor === color ? theme.colors.black : 'transparent',
                    }]}
                    onPress={() => handleSelectCustomColor(color)}
                    activeOpacity={0.7}
                  >
                    {colorMode === 'custom' && customColor === color && (
                      <View style={styles.colorCircleCheck}>
                        <Icon name="check" size={16} color={theme.colors.white} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

// Note: Dynamic styles are now handled inline with useTheme()
// Base styles without colors
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContent: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  colorCircleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemValue: {
    fontSize: 14,
  },
  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chapterLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 0,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  // Name Edit Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // AI Features Section
  aiFeatureCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
  },
  aiFeatureContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiFeatureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  aiIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aiFeatureText: {
    flex: 1,
  },
  aiFeatureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  aiFeatureSubtitle: {
    fontSize: 14,
  },
  aiFeatureBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiFeatureBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  // App Color Theme Picker Modal
  colorPickerModalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  colorModeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 16,
  },
  colorModeOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorModeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  colorModeText: {
    flex: 1,
  },
  colorModeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  colorModeSubtitle: {
    fontSize: 14,
  },
  colorGridTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
  },
  colorGridScroll: {
    maxHeight: 300,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 16,
  },
  colorCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCircleCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SettingsScreen;