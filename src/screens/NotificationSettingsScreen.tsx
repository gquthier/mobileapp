import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import { TopBar } from '../components/TopBar';
import { Icon } from '../components/Icon';
import { LoadingDots } from '../components/LoadingDots';
import {
  getNotificationPreferences,
  scheduleDailyReminder,
  cancelDailyReminder,
  updateDailyReminder,
  NotificationPreferences,
  ReminderFrequency,
} from '../services/notificationService';

interface NotificationSettingsScreenProps {
  onBack: () => void;
}

// ============================================================================
// SettingsItem Component (same as ProfileScreen)
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
// SettingsSection Component (same as ProfileScreen)
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
// Select Modal Component (same as ProfileScreen)
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
// Reminder Frequency Options
// ============================================================================

const REMINDER_OPTIONS: SelectOption[] = [
  { value: '24h', label: '24 hours' },
  { value: '3d', label: '3 days' },
  { value: '7d', label: '7 days' },
  { value: '14d', label: '14 days' },
  { value: '1m', label: '1 month' },
  { value: '2m', label: '2 months' },
];

// Helper to convert frequency value to readable label
const getReminderLabel = (value: string): string => {
  const option = REMINDER_OPTIONS.find(opt => opt.value === value);
  return option?.label || '24 hours';
};

// ============================================================================
// Main NotificationSettingsScreen Component
// ============================================================================

const NotificationSettingsScreen: React.FC<NotificationSettingsScreenProps> = ({ onBack }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [reminderFrequency, setReminderFrequency] = useState<ReminderFrequency>('24h');

  // Modal states
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [selectedTime, setSelectedTime] = useState(new Date());

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const prefs = await getNotificationPreferences();
      setPreferences(prefs);
      setReminderFrequency(prefs.reminderFrequency);

      // Set initial time for picker
      const now = new Date();
      now.setHours(prefs.dailyReminderHour, prefs.dailyReminderMinute, 0, 0);
      setSelectedTime(now);
    } catch (error) {
      console.error('❌ Failed to load notification preferences:', error);
      Alert.alert('Error', 'Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  };

  const handleReminderFrequencyChange = async (value: ReminderFrequency) => {
    try {
      if (!preferences) return;

      setReminderFrequency(value);

      // Re-programmer la notification avec la nouvelle fréquence
      if (preferences.dailyReminderEnabled) {
        await updateDailyReminder(
          preferences.dailyReminderHour,
          preferences.dailyReminderMinute,
          value
        );

        // Mettre à jour les préférences locales
        setPreferences({
          ...preferences,
          reminderFrequency: value,
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Updated', `Reminder frequency set to ${getReminderLabel(value)}`);
      } else {
        // Juste sauvegarder la préférence sans programmer
        setPreferences({
          ...preferences,
          reminderFrequency: value,
        });
      }
    } catch (error: any) {
      console.error('❌ Failed to update reminder frequency:', error);
      Alert.alert('Error', error.message || 'Failed to update reminder frequency');
    }
  };

  const handleTimeChange = async (event: any, date?: Date) => {
    if (!preferences) return;

    // Sur iOS, le picker reste ouvert jusqu'à ce qu'on clique sur Done
    if (Platform.OS === 'android') {
      setShowTimePickerModal(false);
    }

    if (date && event.type !== 'dismissed') {
      const hour = date.getHours();
      const minute = date.getMinutes();

      setSelectedTime(date);

      // Sauvegarder et re-programmer
      try {
        await updateDailyReminder(hour, minute, preferences.reminderFrequency);

        setPreferences({
          ...preferences,
          dailyReminderHour: hour,
          dailyReminderMinute: minute,
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error: any) {
        console.error('❌ Failed to update reminder time:', error);
        Alert.alert('Error', error.message || 'Failed to update reminder time');
      }
    }
  };

  const handleTimePickerDone = () => {
    setShowTimePickerModal(false);
  };

  const handleToggleNotifications = async () => {
    if (!preferences) return;

    try {
      if (preferences.dailyReminderEnabled) {
        // Disable notifications
        await cancelDailyReminder();
        setPreferences({ ...preferences, dailyReminderEnabled: false });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Disabled', 'Daily reminders have been disabled');
      } else {
        // Enable notifications avec la fréquence sélectionnée
        await scheduleDailyReminder(
          preferences.dailyReminderHour,
          preferences.dailyReminderMinute,
          preferences.reminderFrequency
        );
        setPreferences({ ...preferences, dailyReminderEnabled: true });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Enabled', 'Daily reminders have been enabled');
      }
    } catch (error: any) {
      console.error('❌ Failed to toggle notifications:', error);
      Alert.alert('Error', error.message || 'Failed to update notification settings');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.ui.background }]}>
        <TopBar title="Notifications" />
        <View style={styles.centerContainer}>
          <LoadingDots color={theme.colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.ui.background }]}>
      {/* Custom Header with larger title */}
      <View style={[styles.header, { borderBottomColor: theme.colors.ui.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          Notifications
        </Text>
        <TouchableOpacity onPress={onBack} style={styles.doneButtonContainer}>
          <Text style={[styles.doneButton, { color: theme.colors.text.primary }]}>
            Done
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Reminder Settings */}
        <SettingsSection title="Daily Reminders">
          <SettingsItem
            icon="bell"
            title="Enable Reminders"
            subtitle={preferences?.dailyReminderEnabled ? 'Notifications enabled' : 'Notifications disabled'}
            value={preferences?.dailyReminderEnabled ? 'On' : 'Off'}
            showChevron
            onPress={handleToggleNotifications}
          />
          {preferences?.dailyReminderEnabled && (
            <>
              <SettingsItem
                icon="clock"
                title="Reminder Time"
                subtitle="Time of day for reminders"
                value={`${preferences.dailyReminderHour}:${preferences.dailyReminderMinute.toString().padStart(2, '0')}`}
                showChevron
                onPress={() => setShowTimePickerModal(true)}
              />
              <SettingsItem
                icon="calendar"
                title="Reminder Frequency"
                subtitle="How often you want to be reminded"
                value={getReminderLabel(reminderFrequency)}
                showChevron
                onPress={() => setShowReminderModal(true)}
              />
            </>
          )}
        </SettingsSection>

        {/* Info Section */}
        <SettingsSection>
          <View style={styles.infoContainer}>
            <Icon name="info" size={20} color={theme.colors.text.secondary} />
            <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>
              {preferences?.dailyReminderEnabled
                ? 'You will receive a reminder to record your daily video based on your selected frequency.'
                : 'Enable reminders to receive notifications for recording your daily videos.'}
            </Text>
          </View>
        </SettingsSection>

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Time Picker Modal */}
      {showTimePickerModal && (
        <>
          {Platform.OS === 'ios' ? (
            <Modal visible={showTimePickerModal} transparent animationType="fade">
              <View style={styles.modalOverlay}>
                <TouchableOpacity
                  style={StyleSheet.absoluteFill}
                  activeOpacity={1}
                  onPress={handleTimePickerDone}
                />
                <View style={[styles.timePickerContainer, { backgroundColor: theme.colors.ui.surface }]}>
                  <View style={styles.timePickerHeader}>
                    <Text style={[styles.timePickerTitle, { color: theme.colors.text.primary }]}>
                      Select Time
                    </Text>
                    <TouchableOpacity onPress={handleTimePickerDone}>
                      <Text style={[styles.doneButton, { color: theme.colors.brand.primary }]}>
                        Done
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    display="spinner"
                    onChange={handleTimeChange}
                    textColor={theme.colors.text.primary}
                  />
                </View>
              </View>
            </Modal>
          ) : (
            <DateTimePicker
              value={selectedTime}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}
        </>
      )}

      {/* Reminder Frequency Modal */}
      <SelectModal
        visible={showReminderModal}
        title="Reminder Frequency"
        options={REMINDER_OPTIONS}
        selectedValue={reminderFrequency}
        onSelect={handleReminderFrequencyChange}
        onClose={() => setShowReminderModal(false)}
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
  // Custom Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  doneButtonContainer: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  doneButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
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

  // Info Container
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
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

  // Time Picker Modal (iOS)
  timePickerContainer: {
    borderRadius: 16,
    padding: 16,
    width: '90%',
    maxWidth: 400,
  },
  timePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timePickerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
});

export default NotificationSettingsScreen;
