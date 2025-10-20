// ============================================================================
// Chapter Management Screen
// Description: Manage all chapters (current and past) - Edit titles, dates, keywords
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  SafeAreaView,
  Platform,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { theme as staticTheme } from '../styles/theme';
import { Chapter } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import {
  getUserChapters,
  formatChapterPeriod,
  formatDuration,
} from '../services/chapterService';
import { LoadingDots } from '../components/LoadingDots';
import { useTheme } from '../contexts/ThemeContext';
import { Icon } from '../components/Icon';

const MARGIN = 20;

interface ChapterManagementScreenProps {
  navigation: any;
}

export default function ChapterManagementScreen({ navigation }: ChapterManagementScreenProps) {
  const { brandColor } = useTheme();
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  // Edit Dates Modal
  const [showEditDatesModal, setShowEditDatesModal] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [editedStartDate, setEditedStartDate] = useState<Date>(new Date());
  const [editedEndDate, setEditedEndDate] = useState<Date | undefined>(undefined);

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

      // Sort: current first, then by started_at descending
      const sorted = chaptersData.sort((a, b) => {
        if (a.is_current && !b.is_current) return -1;
        if (!a.is_current && b.is_current) return 1;
        return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
      });

      setChapters(sorted);
    } catch (error) {
      console.error('❌ Error loading chapters:', error);
      Alert.alert('Error', 'Failed to load chapters');
    } finally {
      setLoading(false);
    }
  };

  const handleEditDates = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setEditedStartDate(new Date(chapter.started_at));
    setEditedEndDate(chapter.ended_at ? new Date(chapter.ended_at) : undefined);
    setShowEditDatesModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveDates = async () => {
    if (!editingChapter) return;

    try {
      const { error } = await supabase
        .from('chapters')
        .update({
          started_at: editedStartDate.toISOString(),
          ended_at: editedEndDate?.toISOString() || null,
        })
        .eq('id', editingChapter.id);

      if (error) throw error;

      setShowEditDatesModal(false);
      await loadChapters();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error saving dates:', error);
      Alert.alert('Error', 'Failed to save dates');
    }
  };

  const handleEditChapter = (chapter: Chapter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('EditChapter', { chapter });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingDots color={brandColor} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="arrowLeft" size={24} color={staticTheme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Chapters</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {chapters.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="bookOpen" size={64} color={staticTheme.colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No Chapters Yet</Text>
            <Text style={styles.emptyText}>
              Start organizing your journey by creating your first chapter.
            </Text>
          </View>
        ) : (
          chapters.map((chapter, index) => (
            <ChapterManagementCard
              key={chapter.id}
              chapter={chapter}
              chapterNumber={chapters.length - index}
              onEditDates={() => handleEditDates(chapter)}
              onEditChapter={() => handleEditChapter(chapter)}
            />
          ))
        )}

        {/* Bottom spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Edit Dates Modal */}
      <Modal
        visible={showEditDatesModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditDatesModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowEditDatesModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <LiquidGlassView
                  style={[
                    styles.modalContainer,
                    !isLiquidGlassSupported && {
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    }
                  ]}
                  interactive={false}
                >
                  <Text style={styles.modalTitle}>Edit Dates</Text>

                  <View style={styles.dateSection}>
                    <Text style={styles.dateLabel}>Start Date</Text>
                    <DateTimePicker
                      value={editedStartDate}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        if (selectedDate) setEditedStartDate(selectedDate);
                      }}
                      style={styles.datePicker}
                    />
                  </View>

                  <View style={styles.dateSection}>
                    <Text style={styles.dateLabel}>End Date</Text>
                    {editedEndDate && (
                      <TouchableOpacity
                        style={styles.clearEndDateButton}
                        onPress={() => setEditedEndDate(undefined)}
                      >
                        <Text style={styles.clearEndDateText}>Set to Present</Text>
                      </TouchableOpacity>
                    )}
                    <DateTimePicker
                      value={editedEndDate || new Date()}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        if (selectedDate) setEditedEndDate(selectedDate);
                      }}
                      style={styles.datePicker}
                    />
                  </View>

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonCancel]}
                      onPress={() => setShowEditDatesModal(false)}
                    >
                      <Text style={styles.modalButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonSave]}
                      onPress={handleSaveDates}
                    >
                      <Text style={[styles.modalButtonText, styles.modalButtonTextSave]}>
                        Save
                      </Text>
                    </TouchableOpacity>
                  </View>
                </LiquidGlassView>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface ChapterManagementCardProps {
  chapter: Chapter;
  chapterNumber: number;
  onEditDates: () => void;
  onEditChapter: () => void;
}

function ChapterManagementCard({
  chapter,
  chapterNumber,
  onEditDates,
  onEditChapter,
}: ChapterManagementCardProps) {
  const { brandColor } = useTheme();

  // Get chapter color
  const color = chapter.is_current ? brandColor : chapter.color;

  return (
    <View style={styles.cardWrapper}>
      <View
        style={[
          styles.cardGlass,
          !isLiquidGlassSupported && {
            backgroundColor: staticTheme.colors.gray100,
          }
        ]}
      >
        <View
          style={[
            styles.card,
            color && { backgroundColor: `${color}15` }, // Very transparent background (8% opacity)
          ]}
        >
        {/* Background Chapter Number */}
        <View style={styles.chapterNumberBackground}>
          <Text style={styles.chapterNumberText}>{chapterNumber}</Text>
        </View>

          {/* Current Badge */}
          {chapter.is_current && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>CURRENT</Text>
            </View>
          )}

          {/* Title + Period */}
          <View style={styles.titleSection}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {chapter.title}
            </Text>
            <Text style={styles.cardPeriod}>
              {formatChapterPeriod(chapter.started_at, chapter.ended_at)}
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{chapter.video_count || 0}</Text>
              <Text style={styles.statLabel}>videos</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatDuration(chapter.total_duration || 0)}
              </Text>
              <Text style={styles.statLabel}>duration</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onEditDates}
              activeOpacity={0.7}
            >
              <Icon name="calendar" size={16} color={staticTheme.colors.text.primary} />
              <Text style={styles.actionButtonText}>Edit Dates</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={onEditChapter}
              activeOpacity={0.7}
            >
              <Icon name="edit" size={16} color={staticTheme.colors.text.primary} />
              <Text style={styles.actionButtonText}>Edit Chapter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0)', // Transparent like other screens
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: MARGIN,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: staticTheme.colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: MARGIN,
    paddingTop: 8,
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
    color: staticTheme.colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: staticTheme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Chapter Card
  cardWrapper: {
    marginBottom: 16,
  },
  cardGlass: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: staticTheme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  card: {
    padding: staticTheme.spacing['4'],
    position: 'relative',
    overflow: 'hidden',
  },
  chapterNumberBackground: {
    position: 'absolute',
    right: -10,
    top: '50%',
    opacity: 0.5,
    zIndex: 0,
    transform: [{ translateY: -60 }],
  },
  chapterNumberText: {
    fontFamily: 'Georgia',
    fontSize: 120,
    fontWeight: '700',
    color: staticTheme.colors.ui.background, // Same as app background for knockout effect
    letterSpacing: -4,
  },
  cardContent: {
    padding: 16,
    zIndex: 1,
  },
  currentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: staticTheme.colors.brand.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: staticTheme.colors.white,
    letterSpacing: 1,
  },
  titleSection: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: staticTheme.colors.text.primary,
    marginBottom: 6,
  },
  cardPeriod: {
    fontSize: 14,
    fontWeight: '500',
    color: staticTheme.colors.text.secondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: staticTheme.colors.text.primary,
    fontFamily: 'Georgia',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: staticTheme.colors.text.secondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: staticTheme.colors.text.primary,
  },
  // Edit Dates Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: staticTheme.colors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  dateSection: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: staticTheme.colors.text.secondary,
    marginBottom: 8,
  },
  datePicker: {
    width: '100%',
  },
  clearEndDateButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  clearEndDateText: {
    fontSize: 13,
    fontWeight: '600',
    color: staticTheme.colors.brand.primary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  modalButtonSave: {
    backgroundColor: staticTheme.colors.brand.primary,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: staticTheme.colors.text.primary,
  },
  modalButtonTextSave: {
    color: staticTheme.colors.white,
  },
});
