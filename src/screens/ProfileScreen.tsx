import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../hooks/useTheme';
import { TopBar } from '../components/TopBar';
import { Icon } from '../components/Icon';
import { LoadingDots } from '../components/LoadingDots';
import { AuthService, Profile } from '../services/authService';
import { supabase } from '../lib/supabase';

interface ProfileScreenProps {
  onBack: () => void;
}

// ============================================================================
// SettingsItem Component (same as SettingsScreen)
// ============================================================================

interface SettingsItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  value?: string;
  showChevron?: boolean;
  onPress?: () => void;
  danger?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  icon,
  title,
  subtitle,
  value,
  showChevron = false,
  onPress,
  danger = false,
}) => {
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={[styles.settingsItem, {
        backgroundColor: theme.colors.ui.surface,
        borderBottomColor: theme.colors.ui.muted
      }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.6}
    >
      <View style={styles.itemLeft}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.ui.surfaceHover }]}>
          <Icon name={icon} size={20} color={danger ? '#DC2626' : theme.colors.text.primary} />
        </View>
        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, { color: danger ? '#DC2626' : theme.colors.text.primary }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.itemSubtitle, { color: theme.colors.text.secondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.itemRight}>
        {value && (
          <Text style={[styles.itemValue, { color: theme.colors.text.secondary }]}>
            {value}
          </Text>
        )}
        {showChevron && <Icon name="chevronRight" size={16} color={theme.colors.text.disabled} />}
      </View>
    </TouchableOpacity>
  );
};

// ============================================================================
// SettingsSection Component (same as SettingsScreen)
// ============================================================================

interface SettingsSectionProps {
  title?: string;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, children }) => {
  const theme = useTheme();

  return (
    <View style={styles.section}>
      {title && (
        <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
          {title}
        </Text>
      )}
      <View style={[styles.sectionContent, { backgroundColor: theme.colors.ui.surface }]}>
        {children}
      </View>
    </View>
  );
};

// ============================================================================
// Profile Header Component
// ============================================================================

interface ProfileHeaderProps {
  profile: Profile | null;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ profile }) => {
  const theme = useTheme();

  return (
    <View style={styles.profileHeader}>
      {profile?.avatar_url ? (
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
      <Text style={[styles.profileName, { color: theme.colors.text.primary }]}>
        {profile?.first_name && profile?.last_name
          ? `${profile.first_name} ${profile.last_name}`
          : profile?.first_name || 'No name set'}
      </Text>
      <Text style={[styles.profileEmail, { color: theme.colors.text.secondary }]}>
        {profile?.email || ''}
      </Text>
    </View>
  );
};

// ============================================================================
// Edit Field Modal Component
// ============================================================================

interface EditFieldModalProps {
  visible: boolean;
  title: string;
  value: string;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  onSave: (value: string) => void;
  onClose: () => void;
}

const EditFieldModal: React.FC<EditFieldModalProps> = ({
  visible,
  title,
  value,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'words',
  onSave,
  onClose,
}) => {
  const theme = useTheme();
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value, visible]);

  const handleSave = () => {
    if (inputValue.trim()) {
      onSave(inputValue.trim());
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.modalContent, { backgroundColor: theme.colors.ui.surface }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
            {title}
          </Text>
          <TextInput
            style={[
              styles.modalInput,
              {
                backgroundColor: theme.colors.ui.background,
                color: theme.colors.text.primary,
                borderColor: theme.colors.ui.border,
              }
            ]}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.text.tertiary}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoFocus
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.ui.surfaceHover }]}
              onPress={onClose}
            >
              <Text style={[styles.modalButtonText, { color: theme.colors.text.primary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.brand.primary }]}
              onPress={handleSave}
            >
              <Text style={[styles.modalButtonText, { color: theme.colors.white }]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ============================================================================
// Select Modal Component (for Language & Timezone)
// ============================================================================

interface SelectOption {
  value: string;
  label: string;
}

interface SelectModalProps {
  visible: boolean;
  title: string;
  options: SelectOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

const SelectModal: React.FC<SelectModalProps> = ({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}) => {
  const theme = useTheme();

  const handleSelect = (value: string) => {
    onSelect(value);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.modalContent, styles.selectModalContent, { backgroundColor: theme.colors.ui.surface }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
            {title}
          </Text>
          <ScrollView style={styles.selectScrollView}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.selectOption,
                  {
                    backgroundColor: selectedValue === option.value
                      ? theme.colors.brand.primary
                      : 'transparent',
                    borderBottomColor: theme.colors.ui.border,
                  }
                ]}
                onPress={() => handleSelect(option.value)}
              >
                <Text
                  style={[
                    styles.selectOptionText,
                    {
                      color: selectedValue === option.value
                        ? theme.colors.white
                        : theme.colors.text.primary
                    }
                  ]}
                >
                  {option.label}
                </Text>
                {selectedValue === option.value && (
                  <Icon name="check" size={16} color={theme.colors.white} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// Change Password Modal Component
// ============================================================================

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Password updated successfully');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.modalContent, { backgroundColor: theme.colors.ui.surface }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
            Change Password
          </Text>
          <TextInput
            style={[
              styles.modalInput,
              {
                backgroundColor: theme.colors.ui.background,
                color: theme.colors.text.primary,
                borderColor: theme.colors.ui.border,
              }
            ]}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New password"
            placeholderTextColor={theme.colors.text.tertiary}
            secureTextEntry
            autoCapitalize="none"
          />
          <TextInput
            style={[
              styles.modalInput,
              {
                backgroundColor: theme.colors.ui.background,
                color: theme.colors.text.primary,
                borderColor: theme.colors.ui.border,
              }
            ]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor={theme.colors.text.tertiary}
            secureTextEntry
            autoCapitalize="none"
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.ui.surfaceHover }]}
              onPress={onClose}
            >
              <Text style={[styles.modalButtonText, { color: theme.colors.text.primary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.brand.primary }]}
              onPress={handleChangePassword}
              disabled={loading}
            >
              {loading ? (
                <LoadingDots color={theme.colors.white} size={6} />
              ) : (
                <Text style={[styles.modalButtonText, { color: theme.colors.white }]}>
                  Update
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ============================================================================
// Main ProfileScreen Component
// ============================================================================

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Modal states
  const [showEditFirstNameModal, setShowEditFirstNameModal] = useState(false);
  const [showEditLastNameModal, setShowEditLastNameModal] = useState(false);
  const [showEditEmailModal, setShowEditEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (currentUser?.profile) {
        setProfile(currentUser.profile);
      }
    } catch (error) {
      console.error('❌ Failed to load profile:', error);
      Alert.alert('Error', 'Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  const updateField = async (field: string, value: any) => {
    if (!profile) return;

    try {
      const updatedProfile = await AuthService.updateProfile(profile.id, { [field]: value });
      if (updatedProfile) {
        setProfile(updatedProfile);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      console.error('❌ Failed to update profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    }
  };

  const handleChangeEmail = async (newEmail: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Confirmation Sent',
        'Please check your new email to confirm the change.'
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update email');
    }
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
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              // Navigation will be handled by AuthContext
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  const handleExportData = async () => {
    try {
      // Fetch all user data
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: videos } = await supabase
        .from('video_records')
        .select('*')
        .eq('user_id', user.id);

      const { data: chapters } = await supabase
        .from('chapters')
        .select('*')
        .eq('user_id', user.id);

      const exportData = {
        profile,
        videos: videos || [],
        chapters: chapters || [],
        exportDate: new Date().toISOString()
      };

      const fileName = `my_data_${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify(exportData, null, 2)
      );

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Success', `Data exported to ${fileName}`);
      }
    } catch (error: any) {
      console.error('❌ Export failed:', error);
      Alert.alert('Error', error.message || 'Failed to export data');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all videos. Do you want to export your data first?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export & Delete',
          onPress: async () => {
            await handleExportData();
            setTimeout(() => confirmDelete(), 1000);
          }
        },
        {
          text: 'Delete Without Export',
          style: 'destructive',
          onPress: confirmDelete
        }
      ]
    );
  };

  const confirmDelete = () => {
    Alert.alert(
      'Are you absolutely sure?',
      'This action cannot be undone. All your videos, chapters, and account data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.deleteAccount();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Account Deleted', 'Your account has been permanently deleted');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete account');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.ui.background }]}>
        <TopBar title="Profile" />
        <View style={styles.centerContainer}>
          <LoadingDots color={theme.colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.ui.background }]}>
      <TopBar
        title="Profile"
        right={
          <TouchableOpacity onPress={onBack}>
            <Text style={[styles.doneButton, { color: theme.colors.text.primary }]}>
              Done
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <ProfileHeader profile={profile} />

        {/* Personal Information */}
        <SettingsSection title="Personal Information">
          <SettingsItem
            icon="user"
            title="First Name"
            value={profile?.first_name || 'Not set'}
            showChevron
            onPress={() => setShowEditFirstNameModal(true)}
          />
          <SettingsItem
            icon="user"
            title="Last Name"
            value={profile?.last_name || 'Not set'}
            showChevron
            onPress={() => setShowEditLastNameModal(true)}
          />
          <SettingsItem
            icon="mail"
            title="Email"
            value={profile?.email}
            showChevron
            onPress={() => setShowEditEmailModal(true)}
          />
        </SettingsSection>

        {/* Security */}
        <SettingsSection title="Security">
          <SettingsItem
            icon="lock"
            title="Change Password"
            subtitle="Update your password"
            showChevron
            onPress={() => setShowPasswordModal(true)}
          />
          <SettingsItem
            icon="logOut"
            title="Sign Out"
            subtitle="Log out of your account"
            showChevron
            onPress={handleSignOut}
          />
        </SettingsSection>

        {/* Danger Zone */}
        <SettingsSection title="Danger Zone">
          <SettingsItem
            icon="download"
            title="Export All Data"
            subtitle="Download your videos and data"
            showChevron
            onPress={handleExportData}
          />
          <SettingsItem
            icon="trash"
            title="Delete Account"
            subtitle="Permanently delete your account"
            showChevron
            onPress={handleDeleteAccount}
            danger
          />
        </SettingsSection>

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modals */}
      <EditFieldModal
        visible={showEditFirstNameModal}
        title="Edit First Name"
        value={profile?.first_name || ''}
        placeholder="Enter your first name"
        onSave={(value) => updateField('first_name', value)}
        onClose={() => setShowEditFirstNameModal(false)}
      />

      <EditFieldModal
        visible={showEditLastNameModal}
        title="Edit Last Name"
        value={profile?.last_name || ''}
        placeholder="Enter your last name"
        onSave={(value) => updateField('last_name', value)}
        onClose={() => setShowEditLastNameModal(false)}
      />

      <EditFieldModal
        visible={showEditEmailModal}
        title="Change Email"
        value={profile?.email || ''}
        placeholder="Enter your new email"
        keyboardType="email-address"
        autoCapitalize="none"
        onSave={handleChangeEmail}
        onClose={() => setShowEditEmailModal(false)}
      />

      <ChangePasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </SafeAreaView>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },

  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
  },

  // Settings Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionContent: {
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },

  // Settings Item
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
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
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemValue: {
    fontSize: 15,
    marginRight: 4,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Select Modal
  selectModalContent: {
    maxHeight: '70%',
  },
  selectScrollView: {
    maxHeight: 400,
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  selectOptionText: {
    fontSize: 16,
  },
});

export default ProfileScreen;
