// ============================================================================
// Chapter Management Screen
// Description: Gérer tous les chapitres (current et passés), créer, modifier, terminer
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '../styles/theme';
import { Chapter } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import {
  getUserChapters,
  endChapter,
  updateChapter,
  deleteChapter,
  formatChapterPeriod,
  formatDuration,
} from '../services/chapterService';
import { getRandomChapterColor } from '../constants/chapterColors';

interface ChapterManagementScreenProps {
  navigation: any;
}

export default function ChapterManagementScreen({ navigation }: ChapterManagementScreenProps) {
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Date editing states
  const [showDateModal, setShowDateModal] = useState(false);
  const [editStartDate, setEditStartDate] = useState(new Date());
  const [editEndDate, setEditEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadChapters();
    }, [])
  );

  const loadChapters = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const chaptersData = await getUserChapters(user.id);
      setChapters(chaptersData);
    } catch (error) {
      console.error('❌ Error loading chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditChapter = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setEditTitle(chapter.title);
    setEditDescription(chapter.description || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingChapter || !editTitle.trim()) return;

    const updated = await updateChapter(editingChapter.id!, {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
    });

    if (updated) {
      setShowEditModal(false);
      loadChapters();
    }
  };

  const handleEndChapter = async (chapter: Chapter) => {
    Alert.alert(
      'End This Chapter?',
      `Are you sure you want to end "${chapter.title}"? You can record a recap video to summarize this chapter.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Record Recap',
          onPress: () => {
            // Navigate to record screen with recap mode
            navigation.navigate('Record', {
              recapMode: true,
              chapterId: chapter.id,
            });
          },
        },
        {
          text: 'End Without Recap',
          style: 'destructive',
          onPress: async () => {
            const success = await endChapter(chapter.id!);
            if (success) {
              // Attribuer une couleur aléatoire si pas déjà définie
              if (!chapter.color) {
                const randomColor = getRandomChapterColor();
                await supabase
                  .from('chapters')
                  .update({ color: randomColor })
                  .eq('id', chapter.id!);
              }

              loadChapters();
              // Suggest creating new chapter
              Alert.alert(
                'Chapter Ended',
                'Would you like to start a new chapter?',
                [
                  { text: 'Later', style: 'cancel' },
                  {
                    text: 'Start New Chapter',
                    onPress: () => navigation.navigate('ChapterSetup'),
                  },
                ]
              );
            }
          },
        },
      ]
    );
  };

  const handleDeleteChapter = async (chapter: Chapter) => {
    if ((chapter.video_count || 0) > 0) {
      Alert.alert(
        'Cannot Delete',
        'This chapter has videos. Please reassign or delete the videos first.'
      );
      return;
    }

    Alert.alert(
      'Delete Chapter?',
      `Are you sure you want to delete "${chapter.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteChapter(chapter.id!);
            if (success) {
              loadChapters();
            }
          },
        },
      ]
    );
  };

  const handleViewVideos = (chapter: Chapter) => {
    navigation.navigate('Library', { chapterId: chapter.id });
  };

  const handleEditDates = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setEditStartDate(new Date(chapter.started_at));
    setEditEndDate(chapter.ended_at ? new Date(chapter.ended_at) : null);
    setShowDateModal(true);
  };

  const handleSaveDates = async () => {
    if (!editingChapter) return;

    const updated = await updateChapter(editingChapter.id!, {
      started_at: editStartDate.toISOString(),
      ended_at: editEndDate ? editEndDate.toISOString() : null,
    });

    if (updated) {
      setShowDateModal(false);
      loadChapters();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const currentChapter = chapters.find((c) => c.is_current);
  const pastChapters = chapters.filter((c) => !c.is_current);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Chapters</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ChapterSetup')}>
          <Text style={styles.addButton}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Current Chapter */}
        {currentChapter && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Chapter</Text>
            <ChapterItem
              chapter={currentChapter}
              onEdit={handleEditChapter}
              onEditDates={handleEditDates}
              onEnd={handleEndChapter}
              onViewVideos={handleViewVideos}
              isCurrent
            />
          </View>
        )}

        {/* Past Chapters */}
        {pastChapters.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Past Chapters</Text>
            {pastChapters.map((chapter) => (
              <ChapterItem
                key={chapter.id}
                chapter={chapter}
                onEdit={handleEditChapter}
                onEditDates={handleEditDates}
                onDelete={handleDeleteChapter}
                onViewVideos={handleViewVideos}
              />
            ))}
          </View>
        )}

        {chapters.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>📖 No Chapters Yet</Text>
            <Text style={styles.emptyText}>
              Start organizing your journey by creating your first chapter.
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('ChapterSetup')}
            >
              <Text style={styles.createButtonText}>Create First Chapter</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.dateModalContainer}>
            <LiquidGlassView
              style={[
                styles.dateModalGlass,
                !isLiquidGlassSupported && {
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                },
              ]}
              interactive={false}
            >
              <View style={styles.dateModalContent}>
                <Text style={styles.modalTitle}>Edit Chapter</Text>

                <Text style={styles.inputLabel}>Title</Text>
                <TextInput
                  style={styles.input}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Chapter title"
                  placeholderTextColor={theme.colors.gray500}
                  autoFocus
                />

                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="Add a description..."
                  placeholderTextColor={theme.colors.gray500}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalButtonCancel}
                    onPress={() => setShowEditModal(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalButtonCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalButtonSave}
                    onPress={handleSaveEdit}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalButtonSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LiquidGlassView>
          </View>
        </View>
      </Modal>

      {/* Edit Dates Modal */}
      <Modal visible={showDateModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.dateModalContainer}>
            <LiquidGlassView
              style={[
                styles.dateModalGlass,
                !isLiquidGlassSupported && {
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                },
              ]}
              interactive={false}
            >
              <View style={styles.dateModalContent}>
                <Text style={styles.modalTitle}>Edit Dates</Text>

                {/* Start Date */}
                <Text style={styles.inputLabel}>Start Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowStartPicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dateButtonText}>
                    {editStartDate.toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </TouchableOpacity>

                {showStartPicker && (
                  <DateTimePicker
                    value={editStartDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      setShowStartPicker(Platform.OS === 'ios');
                      if (selectedDate) {
                        setEditStartDate(selectedDate);
                      }
                    }}
                  />
                )}

                {/* End Date */}
                <Text style={styles.inputLabel}>End Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndPicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dateButtonText}>
                    {editEndDate
                      ? editEndDate.toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Present'}
                  </Text>
                </TouchableOpacity>

                {showEndPicker && (
                  <DateTimePicker
                    value={editEndDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      setShowEndPicker(Platform.OS === 'ios');
                      if (selectedDate) {
                        setEditEndDate(selectedDate);
                      }
                    }}
                  />
                )}

                {/* Clear End Date button */}
                {editEndDate && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => setEditEndDate(null)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.clearButtonText}>Set to Present</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalButtonCancel}
                    onPress={() => setShowDateModal(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalButtonCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalButtonSave}
                    onPress={handleSaveDates}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalButtonSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </LiquidGlassView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface ChapterItemProps {
  chapter: Chapter;
  onEdit: (chapter: Chapter) => void;
  onEditDates: (chapter: Chapter) => void;
  onEnd?: (chapter: Chapter) => void;
  onDelete?: (chapter: Chapter) => void;
  onViewVideos: (chapter: Chapter) => void;
  isCurrent?: boolean;
}

function ChapterItem({
  chapter,
  onEdit,
  onEditDates,
  onEnd,
  onDelete,
  onViewVideos,
  isCurrent,
}: ChapterItemProps) {
  return (
    <TouchableOpacity
      style={styles.chapterItemWrapper}
      onPress={() => onViewVideos(chapter)}
      activeOpacity={0.7}
    >
      <LiquidGlassView
        style={[
          styles.glassContainer,
          isCurrent && styles.currentGlassContainer,
          !isLiquidGlassSupported && {
            backgroundColor: theme.colors.gray100,
          },
        ]}
        interactive={true}
      >
        <View style={[styles.chapterItem, isCurrent && styles.currentChapterItem]}>
          {/* Badge Current en haut à droite */}
          {isCurrent && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>CURRENT</Text>
            </View>
          )}

          {/* Header */}
          <View style={styles.chapterHeader}>
            <Text style={[styles.chapterTitle, isCurrent && styles.currentTitle]}>
              {chapter.title}
            </Text>
            {chapter.description && (
              <Text style={styles.chapterDescription}>{chapter.description}</Text>
            )}
            <Text style={styles.chapterPeriod}>
              {formatChapterPeriod(chapter.started_at, chapter.ended_at)}
            </Text>
          </View>

          {/* Stats row */}
          <View style={styles.chapterStats}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, isCurrent && styles.currentStatValue]}>
                {chapter.video_count || 0}
              </Text>
              <Text style={styles.statLabel}>videos</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, isCurrent && styles.currentStatValue]}>
                {formatDuration(chapter.total_duration || 0)}
              </Text>
              <Text style={styles.statLabel}>duration</Text>
            </View>
          </View>

          {/* Actions en texte simple */}
          <View style={styles.chapterActions}>
            <TouchableOpacity onPress={() => onEdit(chapter)}>
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
            <Text style={styles.actionSeparator}>•</Text>
            <TouchableOpacity onPress={() => onEditDates(chapter)}>
              <Text style={styles.actionText}>Edit Dates</Text>
            </TouchableOpacity>
            <Text style={styles.actionSeparator}>•</Text>
            {isCurrent && onEnd && (
              <>
                <TouchableOpacity onPress={() => onEnd(chapter)}>
                  <Text style={[styles.actionText, styles.actionTextDanger]}>
                    End Chapter
                  </Text>
                </TouchableOpacity>
                <Text style={styles.actionSeparator}>•</Text>
              </>
            )}
            {!isCurrent && onDelete && (
              <>
                <TouchableOpacity onPress={() => onDelete(chapter)}>
                  <Text style={[styles.actionText, styles.actionTextDanger]}>Delete</Text>
                </TouchableOpacity>
                <Text style={styles.actionSeparator}>•</Text>
              </>
            )}
            <TouchableOpacity onPress={() => onViewVideos(chapter)}>
              <Text style={styles.actionText}>View Videos</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LiquidGlassView>
    </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  addButton: {
    fontSize: 32,
    color: theme.colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chapterItemWrapper: {
    marginBottom: theme.spacing['3'],
  },
  glassContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    // Shadow for depth
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  currentGlassContainer: {
    // Stronger shadow for current chapter
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  chapterItem: {
    padding: theme.spacing['4'],
  },
  currentChapterItem: {
    padding: theme.spacing['5'],
  },
  currentBadge: {
    position: 'absolute',
    top: theme.spacing['3'],
    right: theme.spacing['3'],
    backgroundColor: theme.colors.brand.primary,
    paddingHorizontal: theme.spacing['2'],
    paddingVertical: 4,
    borderRadius: 8,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chapterHeader: {
    marginBottom: theme.spacing['4'],
  },
  chapterTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  currentTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  chapterDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 6,
    lineHeight: 20,
  },
  chapterPeriod: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  chapterStats: {
    flexDirection: 'row',
    gap: theme.spacing['6'],
    marginBottom: theme.spacing['4'],
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing['1'],
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  currentStatValue: {
    fontSize: 28,
    color: theme.colors.brand.primary,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  chapterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['2'],
    flexWrap: 'wrap',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.brand.primary,
  },
  actionTextDanger: {
    color: '#FF3B30',
  },
  actionSeparator: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: theme.colors.gray600,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing['6'],
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing['5'],
    letterSpacing: -0.5,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing['2'],
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    borderRadius: 12,
    padding: theme.spacing['3'],
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing['4'],
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  // Date Modal Styles (LiquidGlass)
  dateModalContainer: {
    width: '95%',
    maxWidth: 500,
  },
  dateModalGlass: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  dateModalContent: {
    padding: theme.spacing['6'],
  },
  dateButton: {
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    borderRadius: 12,
    padding: theme.spacing['3'],
    marginBottom: theme.spacing['4'],
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  clearButton: {
    alignSelf: 'flex-start',
    paddingVertical: theme.spacing['2'],
    paddingHorizontal: theme.spacing['3'],
    marginBottom: theme.spacing['4'],
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.brand.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing['3'],
    marginTop: theme.spacing['2'],
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  modalButtonTextPrimary: {
    color: theme.colors.white,
  },
  // New button styles for Date Modal
  modalButtonCancel: {
    flex: 1,
    paddingVertical: theme.spacing['3'],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  modalButtonSave: {
    flex: 1,
    paddingVertical: theme.spacing['3'],
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.black,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },
});
