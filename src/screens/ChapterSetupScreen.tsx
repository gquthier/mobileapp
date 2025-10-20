// ============================================================================
// Chapter Setup Screen
// Description: Créer un nouveau chapitre ou le premier chapitre
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  Alert,
  
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../styles/theme';
import { supabase } from '../lib/supabase';
import {
  createChapter,
  getVideosWithoutChapter,
  assignVideosToChapter,
} from '../services/chapterService';
import { LoadingDots } from '../components/LoadingDots';
import { useTheme } from '../contexts/ThemeContext';

interface ChapterSetupScreenProps {
  navigation: any;
  route?: any;
}

export default function ChapterSetupScreen({ navigation, route }: ChapterSetupScreenProps) {
  const { brandColor } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startedAt, setStartedAt] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unassignedVideos, setUnassignedVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);

  const isFirstChapter = route?.params?.isFirstChapter || false;

  useEffect(() => {
    loadUnassignedVideos();
  }, []);

  const loadUnassignedVideos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const videos = await getVideosWithoutChapter(user.id);
      setUnassignedVideos(videos);
    } catch (error) {
      console.error('❌ Error loading unassigned videos:', error);
    } finally {
      setLoadingVideos(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a chapter title');
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newChapter = await createChapter(
        user.id,
        title.trim(),
        startedAt.toISOString(),
        true, // is_current
        description.trim() || undefined
      );

      if (!newChapter) {
        throw new Error('Failed to create chapter');
      }

      console.log('✅ Chapter created:', newChapter.title);

      // Si il y a des vidéos non assignées, proposer de les assigner
      if (unassignedVideos.length > 0) {
        Alert.alert(
          'Assign Existing Videos?',
          `You have ${unassignedVideos.length} video(s) without a chapter. Would you like to assign them to "${newChapter.title}"?`,
          [
            {
              text: 'Later',
              style: 'cancel',
              onPress: () => {
                navigation.navigate('Momentum');
              },
            },
            {
              text: 'Assign All',
              onPress: async () => {
                const videoIds = unassignedVideos.map((v) => v.id);
                const success = await assignVideosToChapter(videoIds, newChapter.id!);
                if (success) {
                  Alert.alert('Success', 'Videos assigned to chapter!');
                }
                navigation.navigate('Momentum');
              },
            },
            {
              text: 'Select Videos',
              onPress: () => {
                navigation.navigate('AssignVideos', {
                  chapterId: newChapter.id,
                  chapterTitle: newChapter.title,
                });
              },
            },
          ]
        );
      } else {
        Alert.alert('Success', 'Chapter created!', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Momentum'),
          },
        ]);
      }
    } catch (error) {
      console.error('❌ Error creating chapter:', error);
      Alert.alert('Error', 'Failed to create chapter. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartedAt(selectedDate);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isFirstChapter ? 'Start Your First Chapter' : 'New Chapter'}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Intro */}
          <View style={styles.intro}>
            <Text style={styles.emoji}>📖</Text>
            <Text style={styles.introTitle}>What chapter of your life are you in?</Text>
            <Text style={styles.introText}>
              Give this period a meaningful name that reflects where you are right now.
            </Text>
          </View>

          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Chapter Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Starting my career, Becoming a parent, Chapter 7..."
              placeholderTextColor={theme.colors.gray400}
              autoFocus
              maxLength={100}
            />
            <Text style={styles.helperText}>Give it a name that resonates with you</Text>
          </View>

          {/* Description Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add notes about this chapter..."
              placeholderTextColor={theme.colors.gray400}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>

          {/* Started At */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>When did it start?</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {startedAt.toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
              <Text style={styles.dateIcon}>📅</Text>
            </TouchableOpacity>
            <Text style={styles.helperText}>
              You can backdate this if it started earlier
            </Text>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={startedAt}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}

          {/* Unassigned Videos Info */}
          {!loadingVideos && unassignedVideos.length > 0 && (
            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                You have {unassignedVideos.length} video(s) without a chapter. After creating
                this chapter, you'll be able to assign them.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createButton, !title.trim() && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={loading || !title.trim()}
        >
          {loading ? (
            <LoadingDots color={theme.colors.white} />
          ) : (
            <Text style={styles.createButtonText}>
              {isFirstChapter ? 'Start This Chapter' : 'Create Chapter'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray200,
  },
  backButton: {
    fontSize: 28,
    color: theme.colors.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  intro: {
    alignItems: 'center',
    marginBottom: 32,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  introText: {
    fontSize: 15,
    color: theme.colors.gray600,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.white,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 13,
    color: theme.colors.gray500,
    marginTop: 6,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    borderRadius: 12,
    padding: 16,
    backgroundColor: theme.colors.white,
  },
  dateButtonText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  dateIcon: {
    fontSize: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray200,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: theme.colors.gray300,
  },
  createButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.white,
  },
});
