// ============================================================================
// Edit Chapter Screen
// Description: Edit chapter details (title, keywords, description)
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import * as Haptics from 'expo-haptics';
import { theme as staticTheme } from '../styles/theme';
import { Chapter } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { Icon } from '../components/Icon';

const MARGIN = 20;

interface EditChapterScreenProps {
  route: {
    params: {
      chapter: Chapter;
    };
  };
  navigation: any;
}

export default function EditChapterScreen({ route, navigation }: EditChapterScreenProps) {
  const { chapter } = route.params;

  // Editable fields
  const [editedTitle, setEditedTitle] = useState(chapter.title);
  const [editedKeywords, setEditedKeywords] = useState(
    chapter.keywords?.join(', ') || ''
  );
  const [editedShortSummary, setEditedShortSummary] = useState(
    chapter.ai_short_summary || ''
  );
  const [editedSummary, setEditedSummary] = useState(
    chapter.ai_detailed_description || ''
  );

  // Saving states
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isSavingKeywords, setIsSavingKeywords] = useState(false);
  const [isSavingShortSummary, setIsSavingShortSummary] = useState(false);
  const [isSavingSummary, setIsSavingSummary] = useState(false);

  // Background color (chapter color)
  const backgroundColor = chapter.color || staticTheme.colors.brand.primary;

  // ============================================================================
  // SAVE FUNCTIONS (inspired by ChapterDetailScreen)
  // ============================================================================

  const handleSaveTitle = useCallback(async () => {
    if (!editedTitle.trim()) {
      Alert.alert('Error', 'Title cannot be empty');
      return;
    }

    setIsSavingTitle(true);
    try {
      const { error } = await supabase
        .from('chapters')
        .update({ title: editedTitle.trim() })
        .eq('id', chapter.id);

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', 'Chapter title updated successfully');
    } catch (error) {
      console.error('Error saving title:', error);
      Alert.alert('Error', 'Failed to save title');
    } finally {
      setIsSavingTitle(false);
    }
  }, [editedTitle, chapter.id]);

  const handleSaveKeywords = useCallback(async () => {
    setIsSavingKeywords(true);
    try {
      // Parse keywords from comma-separated string
      const keywordsArray = editedKeywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0)
        .slice(0, 10); // Max 10 keywords

      const { error } = await supabase
        .from('chapters')
        .update({ keywords: keywordsArray.length > 0 ? keywordsArray : null })
        .eq('id', chapter.id);

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', 'Keywords updated successfully');
    } catch (error) {
      console.error('Error saving keywords:', error);
      Alert.alert('Error', 'Failed to save keywords');
    } finally {
      setIsSavingKeywords(false);
    }
  }, [editedKeywords, chapter.id]);

  const handleSaveShortSummary = useCallback(async () => {
    setIsSavingShortSummary(true);
    try {
      const { error } = await supabase
        .from('chapters')
        .update({ ai_short_summary: editedShortSummary.trim() || null })
        .eq('id', chapter.id);

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', 'Short summary updated successfully');
    } catch (error) {
      console.error('Error saving short summary:', error);
      Alert.alert('Error', 'Failed to save short summary');
    } finally {
      setIsSavingShortSummary(false);
    }
  }, [editedShortSummary, chapter.id]);

  const handleSaveSummary = useCallback(async () => {
    setIsSavingSummary(true);
    try {
      const { error } = await supabase
        .from('chapters')
        .update({ ai_detailed_description: editedSummary.trim() || null })
        .eq('id', chapter.id);

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', 'Summary updated successfully');
    } catch (error) {
      console.error('Error saving summary:', error);
      Alert.alert('Error', 'Failed to save summary');
    } finally {
      setIsSavingSummary(false);
    }
  }, [editedSummary, chapter.id]);

  const handleSaveAll = useCallback(async () => {
    // Save all fields at once
    try {
      const keywordsArray = editedKeywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0)
        .slice(0, 10);

      const { error } = await supabase
        .from('chapters')
        .update({
          title: editedTitle.trim(),
          keywords: keywordsArray.length > 0 ? keywordsArray : null,
          ai_short_summary: editedShortSummary.trim() || null,
          ai_detailed_description: editedSummary.trim() || null,
        })
        .eq('id', chapter.id);

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', 'All changes saved successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        }
      ]);
    } catch (error) {
      console.error('Error saving all:', error);
      Alert.alert('Error', 'Failed to save changes');
    }
  }, [editedTitle, editedKeywords, editedShortSummary, editedSummary, chapter.id, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Icon name="arrowLeft" size={24} color={staticTheme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Chapter</Text>
          <TouchableOpacity onPress={handleSaveAll} activeOpacity={0.7}>
            <Text style={styles.saveButton}>Save All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Chapter Preview Card */}
          <View style={styles.previewSection}>
            <LiquidGlassView
              style={[
                styles.previewCard,
                { backgroundColor },
                !isLiquidGlassSupported && {
                  backgroundColor: backgroundColor || 'rgba(255, 255, 255, 0.8)',
                }
              ]}
              interactive={false}
            >
              <View style={styles.previewContent}>
                <Text style={styles.previewLabel}>PREVIEW</Text>
                <Text style={styles.previewTitle} numberOfLines={2}>
                  {editedTitle || 'Untitled Chapter'}
                </Text>
                {chapter.is_current && (
                  <View style={styles.currentBadgeSmall}>
                    <Text style={styles.currentBadgeTextSmall}>CURRENT</Text>
                  </View>
                )}
              </View>
            </LiquidGlassView>
          </View>

          {/* Edit Title Section */}
          <View style={styles.editSection}>
            <LiquidGlassView
              style={[
                styles.editCard,
                !isLiquidGlassSupported && {
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                }
              ]}
              interactive={false}
            >
              <View style={styles.editCardHeader}>
                <Icon name="edit" size={20} color={staticTheme.colors.text.secondary} />
                <Text style={styles.editCardTitle}>Chapter Title</Text>
              </View>
              <TextInput
                style={styles.titleInput}
                value={editedTitle}
                onChangeText={setEditedTitle}
                placeholder="Enter chapter title"
                placeholderTextColor={staticTheme.colors.text.tertiary}
                maxLength={60}
              />
              <LiquidGlassView
                style={[
                  styles.saveFieldButtonGlass,
                  { backgroundColor },
                  !isLiquidGlassSupported && {
                    backgroundColor: backgroundColor || staticTheme.colors.brand.primary,
                  }
                ]}
                interactive={false}
              >
                <TouchableOpacity
                  style={styles.saveFieldButton}
                  onPress={handleSaveTitle}
                  disabled={isSavingTitle}
                  activeOpacity={0.7}
                >
                  <Text style={styles.saveFieldButtonText}>
                    {isSavingTitle ? 'Saving...' : 'Save Title'}
                  </Text>
                </TouchableOpacity>
              </LiquidGlassView>
            </LiquidGlassView>
          </View>

          {/* Edit Keywords Section */}
          <View style={styles.editSection}>
            <LiquidGlassView
              style={[
                styles.editCard,
                !isLiquidGlassSupported && {
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                }
              ]}
              interactive={false}
            >
              <View style={styles.editCardHeader}>
                <Icon name="tag" size={20} color={staticTheme.colors.text.secondary} />
                <Text style={styles.editCardTitle}>Keywords</Text>
              </View>
              <Text style={styles.helperText}>
                Separate keywords with commas (max 10)
              </Text>
              <TextInput
                style={styles.keywordsInput}
                value={editedKeywords}
                onChangeText={setEditedKeywords}
                placeholder="e.g. Growth, Career, Travel, Health"
                placeholderTextColor={staticTheme.colors.text.tertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <LiquidGlassView
                style={[
                  styles.saveFieldButtonGlass,
                  { backgroundColor },
                  !isLiquidGlassSupported && {
                    backgroundColor: backgroundColor || staticTheme.colors.brand.primary,
                  }
                ]}
                interactive={false}
              >
                <TouchableOpacity
                  style={styles.saveFieldButton}
                  onPress={handleSaveKeywords}
                  disabled={isSavingKeywords}
                  activeOpacity={0.7}
                >
                  <Text style={styles.saveFieldButtonText}>
                    {isSavingKeywords ? 'Saving...' : 'Save Keywords'}
                  </Text>
                </TouchableOpacity>
              </LiquidGlassView>
            </LiquidGlassView>
          </View>

          {/* Edit Short Summary Section */}
          <View style={styles.editSection}>
            <LiquidGlassView
              style={[
                styles.editCard,
                !isLiquidGlassSupported && {
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                }
              ]}
              interactive={false}
            >
              <View style={styles.editCardHeader}>
                <Icon name="fileText" size={20} color={staticTheme.colors.text.secondary} />
                <Text style={styles.editCardTitle}>Short Summary</Text>
              </View>
              <Text style={styles.helperText}>
                AI-generated one-sentence summary (editable)
              </Text>
              <TextInput
                style={styles.descriptionInput}
                value={editedShortSummary}
                onChangeText={setEditedShortSummary}
                placeholder="One-sentence summary of this chapter..."
                placeholderTextColor={staticTheme.colors.text.tertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={300}
              />
              <Text style={styles.characterCount}>
                {editedShortSummary.length}/300
              </Text>
              <LiquidGlassView
                style={[
                  styles.saveFieldButtonGlass,
                  { backgroundColor },
                  !isLiquidGlassSupported && {
                    backgroundColor: backgroundColor || staticTheme.colors.brand.primary,
                  }
                ]}
                interactive={false}
              >
                <TouchableOpacity
                  style={styles.saveFieldButton}
                  onPress={handleSaveShortSummary}
                  disabled={isSavingShortSummary}
                  activeOpacity={0.7}
                >
                  <Text style={styles.saveFieldButtonText}>
                    {isSavingShortSummary ? 'Saving...' : 'Save Short Summary'}
                  </Text>
                </TouchableOpacity>
              </LiquidGlassView>
            </LiquidGlassView>
          </View>

          {/* Edit Detailed Summary Section */}
          <View style={styles.editSection}>
            <LiquidGlassView
              style={[
                styles.editCard,
                !isLiquidGlassSupported && {
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                }
              ]}
              interactive={false}
            >
              <View style={styles.editCardHeader}>
                <Icon name="fileText" size={20} color={staticTheme.colors.text.secondary} />
                <Text style={styles.editCardTitle}>Detailed Summary</Text>
              </View>
              <Text style={styles.helperText}>
                AI-generated detailed description of this chapter (editable)
              </Text>
              <TextInput
                style={styles.summaryInput}
                value={editedSummary}
                onChangeText={setEditedSummary}
                placeholder="Long-form summary of this chapter..."
                placeholderTextColor={staticTheme.colors.text.tertiary}
                multiline
                numberOfLines={10}
                textAlignVertical="top"
                maxLength={2000}
              />
              <Text style={styles.characterCount}>
                {editedSummary.length}/2000
              </Text>
              <LiquidGlassView
                style={[
                  styles.saveFieldButtonGlass,
                  { backgroundColor },
                  !isLiquidGlassSupported && {
                    backgroundColor: backgroundColor || staticTheme.colors.brand.primary,
                  }
                ]}
                interactive={false}
              >
                <TouchableOpacity
                  style={styles.saveFieldButton}
                  onPress={handleSaveSummary}
                  disabled={isSavingSummary}
                  activeOpacity={0.7}
                >
                  <Text style={styles.saveFieldButtonText}>
                    {isSavingSummary ? 'Saving...' : 'Save Summary'}
                  </Text>
                </TouchableOpacity>
              </LiquidGlassView>
            </LiquidGlassView>
          </View>

          {/* Info Note */}
          <View style={styles.infoNote}>
            <Icon name="info" size={16} color={staticTheme.colors.text.tertiary} />
            <Text style={styles.infoText}>
              AI-generated summaries and titles are preserved. Your edits won't overwrite them.
            </Text>
          </View>

          {/* Bottom spacing */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0)', // Transparent
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
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: staticTheme.colors.text.primary, // Black instead of purple
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: MARGIN,
  },
  // Preview Section
  previewSection: {
    marginBottom: 24,
  },
  previewCard: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 20,
    minHeight: 120,
    justifyContent: 'center',
  },
  previewContent: {
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 1,
    marginBottom: 8,
  },
  previewTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: staticTheme.colors.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  currentBadgeSmall: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeTextSmall: {
    fontSize: 10,
    fontWeight: '700',
    color: staticTheme.colors.white,
    letterSpacing: 1,
  },
  // Edit Sections
  editSection: {
    marginBottom: 20,
  },
  editCard: {
    borderRadius: 16,
    padding: 20,
    overflow: 'hidden',
  },
  editCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  editCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: staticTheme.colors.text.primary,
  },
  helperText: {
    fontSize: 13,
    color: staticTheme.colors.text.tertiary,
    marginBottom: 12,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '600',
    color: staticTheme.colors.text.primary,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  keywordsInput: {
    fontSize: 16,
    color: staticTheme.colors.text.primary,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    minHeight: 80,
  },
  descriptionInput: {
    fontSize: 16,
    color: staticTheme.colors.text.primary,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    minHeight: 140,
  },
  summaryInput: {
    fontSize: 16,
    color: staticTheme.colors.text.primary,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    minHeight: 200,
  },
  characterCount: {
    fontSize: 12,
    color: staticTheme.colors.text.tertiary,
    textAlign: 'right',
    marginBottom: 12,
  },
  saveFieldButtonGlass: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveFieldButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  saveFieldButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: staticTheme.colors.white,
  },
  // Info Note
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: staticTheme.colors.text.tertiary,
    lineHeight: 18,
  },
});
