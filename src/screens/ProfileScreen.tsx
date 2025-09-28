import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles';
import { TopBar } from '../components/TopBar';
import { Icon } from '../components/Icon';
import { AuthService, Profile } from '../services/authService';

interface ProfileScreenProps {
  onBack: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bio, setBio] = useState('');
  const [timezone, setTimezone] = useState('');
  const [language, setLanguage] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (currentUser?.profile) {
        const profileData = currentUser.profile;
        setProfile(profileData);

        // Set form values
        setFirstName(profileData.first_name || '');
        setLastName(profileData.last_name || '');
        setUsername(profileData.username || '');
        setDateOfBirth(profileData.date_of_birth || '');
        setBio(profileData.bio || '');
        setTimezone(profileData.timezone || 'UTC');
        setLanguage(profileData.language || 'en');
      }
    } catch (error) {
      console.error('❌ Failed to load profile:', error);
      Alert.alert('Error', 'Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!firstName.trim()) {
      Alert.alert('Error', 'First name is required');
      return false;
    }
    return true;
  };

  const handleSaveProfile = async () => {
    if (!validateForm() || !profile) return;

    setSaving(true);
    try {
      const updates = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username: username.trim() || null,
        date_of_birth: dateOfBirth || null,
        bio: bio.trim(),
        timezone,
        language,
      };

      const updatedProfile = await AuthService.updateProfile(profile.id, updates);
      if (updatedProfile) {
        setProfile(updatedProfile);
        Alert.alert('Success', 'Profile updated successfully');
      }
    } catch (error: any) {
      console.error('❌ Failed to update profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data including videos, chapters, and account information will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.deleteAccount();
              Alert.alert('Account Deleted', 'Your account has been permanently deleted');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'es', name: 'Español' },
    { code: 'de', name: 'Deutsch' },
    { code: 'it', name: 'Italiano' },
  ];

  const timezones = [
    { code: 'UTC', name: 'UTC' },
    { code: 'America/New_York', name: 'Eastern Time' },
    { code: 'America/Chicago', name: 'Central Time' },
    { code: 'America/Denver', name: 'Mountain Time' },
    { code: 'America/Los_Angeles', name: 'Pacific Time' },
    { code: 'Europe/London', name: 'London' },
    { code: 'Europe/Paris', name: 'Paris' },
    { code: 'Asia/Tokyo', name: 'Tokyo' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <TopBar title="Profile" right={<Icon name="chevronRight" size={20} color={theme.colors.black} />} />
        <View style={styles.centerContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TopBar
          title="Profile"
          right={
            <TouchableOpacity onPress={onBack}>
              <Text style={styles.doneButton}>Done</Text>
            </TouchableOpacity>
          }
        />

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            {/* Profile Picture Section */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                <Icon name="user" size={48} color={theme.colors.gray400} />
              </View>
              <TouchableOpacity style={styles.changePhotoButton}>
                <Text style={styles.changePhotoText}>Change Photo</Text>
              </TouchableOpacity>
            </View>

            {/* Basic Information */}
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  autoCapitalize="words"
                />
              </View>
              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Choose a username"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={profile?.email || ''}
                editable={false}
                placeholder="Email address"
              />
              <Text style={styles.helperText}>Email cannot be changed</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date of Birth</Text>
              <TextInput
                style={styles.input}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
              />
            </View>

            {/* Personal Information */}
            <Text style={styles.sectionTitle}>Personal Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us a bit about yourself..."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Preferences */}
            <Text style={styles.sectionTitle}>Preferences</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Language</Text>
              <View style={styles.pickerContainer}>
                {languages.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.pickerOption,
                      language === lang.code && styles.pickerOptionSelected,
                    ]}
                    onPress={() => setLanguage(lang.code)}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        language === lang.code && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {lang.name}
                    </Text>
                    {language === lang.code && (
                      <Icon name="check" size={16} color={theme.colors.white} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Timezone</Text>
              <View style={styles.pickerContainer}>
                {timezones.map((tz) => (
                  <TouchableOpacity
                    key={tz.code}
                    style={[
                      styles.pickerOption,
                      timezone === tz.code && styles.pickerOptionSelected,
                    ]}
                    onPress={() => setTimezone(tz.code)}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        timezone === tz.code && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {tz.name}
                    </Text>
                    {timezone === tz.code && (
                      <Icon name="check" size={16} color={theme.colors.white} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.primaryButton, saving && styles.buttonDisabled]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              <Text style={styles.primaryButtonText}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>

            {/* Danger Zone */}
            <Text style={styles.dangerSectionTitle}>Danger Zone</Text>

            <TouchableOpacity
              style={styles.dangerButton}
              onPress={handleDeleteAccount}
            >
              <Icon name="trash" size={16} color={theme.colors.white} />
              <Text style={styles.dangerButtonText}>Delete Account</Text>
            </TouchableOpacity>

            {/* Bottom spacing */}
            <View style={{ height: 50 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.gray600,
  },
  doneButton: {
    ...theme.typography.bodyBold,
    color: theme.colors.black,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    paddingHorizontal: 16,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing['6'],
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  changePhotoButton: {
    paddingHorizontal: 16,
    paddingVertical: theme.spacing['2'],
  },
  changePhotoText: {
    ...theme.typography.caption,
    color: theme.colors.black,
    fontWeight: '500',
  },
  sectionTitle: {
    ...theme.typography.h2,
    color: theme.colors.black,
    marginTop: theme.spacing['6'],
    marginBottom: 16,
  },
  dangerSectionTitle: {
    ...theme.typography.h2,
    color: '#DC2626',
    marginTop: theme.spacing['6'],
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.black,
    fontWeight: '500',
    marginBottom: theme.spacing['1'],
  },
  input: {
    ...theme.typography.body,
    color: theme.colors.black,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.white,
  },
  inputDisabled: {
    backgroundColor: theme.colors.gray100,
    color: theme.colors.gray600,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  helperText: {
    ...theme.typography.tiny,
    color: theme.colors.gray600,
    marginTop: theme.spacing['1'],
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    borderRadius: 12,
    backgroundColor: theme.colors.white,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray200,
  },
  pickerOptionSelected: {
    backgroundColor: theme.colors.black,
  },
  pickerOptionText: {
    ...theme.typography.body,
    color: theme.colors.black,
  },
  pickerOptionTextSelected: {
    color: theme.colors.white,
  },
  primaryButton: {
    backgroundColor: theme.colors.black,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dangerButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing['2'],
  },
  dangerButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.white,
  },
});

export default ProfileScreen;