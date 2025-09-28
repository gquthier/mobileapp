import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles';
import { TopBar } from '../components/TopBar';
import { Icon } from '../components/Icon';
import { AuthService, Profile } from '../services/authService';
import ProfileScreen from './ProfileScreen';
import AuthScreen from './AuthScreen';

interface SettingsItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  value?: string;
  showChevron?: boolean;
  showSwitch?: boolean;
  switchValue?: boolean;
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
  onPress,
  onSwitchChange,
}) => (
  <TouchableOpacity
    style={styles.settingsItem}
    onPress={onPress}
    disabled={!onPress && !showSwitch}
    activeOpacity={0.6}
  >
    <View style={styles.itemLeft}>
      <View style={styles.iconContainer}>
        <Icon name={icon} size={20} color={theme.colors.text.primary} />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{title}</Text>
        {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
      </View>
    </View>
    <View style={styles.itemRight}>
      {value && <Text style={styles.itemValue}>{value}</Text>}
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

interface SettingsSectionProps {
  title?: string;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children }) => (
  <View style={styles.section}>
    {title && <Text style={styles.sectionTitle}>{title}</Text>}
    <View style={styles.sectionContent}>{children}</View>
  </View>
);

const SettingsScreen: React.FC = () => {
  const [currentView, setCurrentView] = useState<'settings' | 'profile' | 'auth'>('settings');
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [cloudBackup, setCloudBackup] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser.user);
        setProfile(currentUser.profile);

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

  const handleAuthSuccess = () => {
    setCurrentView('settings');
    loadUserData();
  };

  // Show appropriate screen based on current view
  if (currentView === 'auth') {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  if (currentView === 'profile') {
    return <ProfileScreen onBack={() => setCurrentView('settings')} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TopBar title="Settings" />

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.ui.background,
  },
  content: {
    flex: 1,
    paddingTop: theme.spacing['4'],
    paddingHorizontal: theme.spacing['4'],
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: theme.spacing['6'],
  },
  sectionTitle: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing['2'],
    marginLeft: theme.spacing['1'],
  },
  sectionContent: {
    backgroundColor: theme.colors.ui.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['3'],
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.ui.muted,
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
    backgroundColor: theme.colors.ui.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing['3'],
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  itemSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing['0.5'],
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['2'],
  },
  itemValue: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
});

export default SettingsScreen;