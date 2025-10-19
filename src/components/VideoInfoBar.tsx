import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { VideoSegment } from '../types';
import { theme } from '../styles/theme';
import { Icon } from './Icon';
import * as Haptics from 'expo-haptics';
import { Chapter } from '../services/chapterService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface VideoInfoBarProps {
  video: VideoSegment | null;
  transcriptionHighlights?: any[];
  bottomInset?: number; // Safe area bottom (pour navigation bar)
  onHighlightPress?: (timestamp: number) => void; // 🆕 Callback pour seek au timestamp
  onExpandedChange?: (isExpanded: boolean) => void; // 🆕 Callback pour notifier l'état d'expansion
  chapters?: Chapter[]; // 🆕 Chapitres pour afficher "CHAPTER X"
}

/**
 * VideoInfoBar - Inspired by TikTok/Instagram Stories
 * Shows video title and highlights in a collapsible overlay above navigation
 */
export const VideoInfoBar: React.FC<VideoInfoBarProps> = ({
  video,
  transcriptionHighlights = [],
  bottomInset = 0,
  onHighlightPress,
  onExpandedChange,
  chapters = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [heightAnim] = useState(new Animated.Value(60)); // Minimized height
  const [rotationAnim] = useState(new Animated.Value(0)); // Rotation pour le "+"

  const toggleExpanded = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);

    // 🆕 Notifier le parent du changement d'état
    if (onExpandedChange) {
      onExpandedChange(newExpanded);
    }

    // Animate height
    Animated.spring(heightAnim, {
      toValue: newExpanded ? screenHeight * 0.4 : 60, // 40% of screen when expanded
      useNativeDriver: false,
      friction: 10,
      tension: 100,
    }).start();

    // Animate rotation du "+" (0° → 45° pour effet croix qui tourne)
    Animated.spring(rotationAnim, {
      toValue: newExpanded ? 1 : 0,
      useNativeDriver: true,
      friction: 10,
      tension: 100,
    }).start();
  };

  // Rotation interpolation (0 → 45deg)
  const rotateInterpolation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  if (!video) {
    console.log('❌ VideoInfoBar: No video provided');
    return null;
  }

  console.log('✅ VideoInfoBar rendering with video:', video.title, 'bottomInset:', bottomInset);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getImportanceColor = (importance: number): string => {
    if (importance >= 8) return theme.colors.brand.primary;
    if (importance >= 6) return '#FFA500'; // Orange
    return theme.colors.text.secondary;
  };

  /**
   * Format date: "Lundi, 14 octobre 2025"
   */
  const formatVideoDate = (dateString: string): string => {
    if (!dateString) return '';

    const date = new Date(dateString);

    // French day names
    const daysOfWeek = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const dayName = daysOfWeek[date.getDay()];

    // French month names
    const months = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];
    const monthName = months[date.getMonth()];

    const day = date.getDate();
    const year = date.getFullYear();

    return `${dayName}, ${day} ${monthName} ${year}`;
  };

  // 🎯 Get display title - Use segment_title if this is a segment, otherwise video title
  const displayTitle = video.is_segment && video.segment_title
    ? video.segment_title
    : (video.title || 'Untitled Video');

  // 🆕 Calculate chapter number from video.chapter_id
  const chapterLabel = useMemo(() => {
    if (!video || !video.chapter_id || chapters.length === 0) {
      return null;
    }

    // 1. Try to use video.chapter_number if available
    if (video.chapter_number && video.chapter_number > 0) {
      return `CHAPTER ${video.chapter_number}`;
    }

    // 2. Otherwise, find chapter by ID and calculate index
    // Sort chapters by started_at (oldest first) to get chronological order
    const sortedChapters = [...chapters].sort((a, b) => {
      const dateA = new Date(a.started_at || 0).getTime();
      const dateB = new Date(b.started_at || 0).getTime();
      return dateA - dateB;
    });

    // Find the chapter by ID
    const chapterIndex = sortedChapters.findIndex(ch => ch.id === video.chapter_id);

    if (chapterIndex >= 0) {
      // Chapter number is index + 1 (1-based)
      return `CHAPTER ${chapterIndex + 1}`;
    }

    return null;
  }, [video, chapters]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          height: heightAnim,
          bottom: bottomInset,
        },
      ]}
    >
      {/* Minimized View - Title + Plus icon */}
      {!isExpanded && (
        <TouchableOpacity
          style={styles.minimizedContent}
          onPress={toggleExpanded}
          activeOpacity={0.9}
        >
          <View style={styles.minimizedLeft}>
            <Text style={styles.minimizedTitle} numberOfLines={1}>
              {displayTitle}
            </Text>
            {/* 🆕 Show Chapter label if available, otherwise show Life Area badge for segments */}
            {chapterLabel ? (
              <Text style={styles.chapterBadge}>
                {chapterLabel}
              </Text>
            ) : video.is_segment && video.segment_life_area && (
              <Text style={styles.lifeAreaBadge}>
                {video.segment_life_area}
              </Text>
            )}
          </View>
          <Animated.View
            style={[
              styles.plusIconContainer,
              { transform: [{ rotate: rotateInterpolation }] },
            ]}
          >
            <Text style={styles.plusIcon}>+</Text>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* Expanded View - Scrollable highlights */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {/* Header with title, date, and close */}
          <View style={styles.expandedHeader}>
            <View style={styles.expandedHeaderLeft}>
              <Text style={styles.expandedTitle} numberOfLines={2}>
                {displayTitle}
              </Text>
              {/* 🆕 Show Chapter label if available, otherwise show Life Area badge for segments */}
              {chapterLabel ? (
                <Text style={styles.chapterBadgeExpanded}>
                  {chapterLabel}
                </Text>
              ) : video.is_segment && video.segment_life_area && (
                <Text style={styles.lifeAreaBadgeExpanded}>
                  {video.segment_life_area}
                </Text>
              )}
              {video.created_at && (
                <Text style={styles.videoDate}>
                  {formatVideoDate(video.created_at)}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={toggleExpanded}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Animated.View
                style={{ transform: [{ rotate: rotateInterpolation }] }}
              >
                <Text style={styles.plusIcon}>+</Text>
              </Animated.View>
            </TouchableOpacity>
          </View>

          {/* Scrollable Highlights Section */}
          <ScrollView
            style={styles.highlightsScroll}
            contentContainerStyle={[
              styles.highlightsContent,
              { paddingBottom: bottomInset + 100 } // ✅ Dynamic padding to scroll behind nav
            ]}
            showsVerticalScrollIndicator={false}
          >
            {transcriptionHighlights && transcriptionHighlights.length > 0 ? (
              transcriptionHighlights.map((highlight: any, index: number) => {
                const timestamp = highlight.start_time || highlight.startTime || 0;

                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.highlightCard}
                    onPress={() => {
                      if (onHighlightPress && timestamp > 0) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onHighlightPress(timestamp);
                        console.log('🎯 Seeking to highlight at', timestamp, 'seconds');
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    {/* Title + Importance Badge */}
                    <View style={styles.highlightHeader}>
                      <Text style={styles.highlightTitle}>{highlight.title}</Text>
                      {highlight.importance && (
                        <View
                          style={[
                            styles.importanceBadge,
                            { backgroundColor: getImportanceColor(highlight.importance) },
                          ]}
                        >
                          <Text style={styles.importanceBadgeText}>{highlight.importance}</Text>
                        </View>
                      )}
                    </View>

                    {/* Summary */}
                    <Text style={styles.highlightSummary}>
                      {highlight.summary?.toString() || 'No summary available'}
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.noHighlightsContainer}>
                <Icon name="lightbulb" size={32} color="rgba(255, 255, 255, 0.5)" />
                <Text style={styles.noHighlightsText}>No highlights yet</Text>
                <Text style={styles.noHighlightsSubtext}>
                  Highlights will appear after transcription
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'transparent', // ✅ Transparent background (gradient is now global in VerticalFeedScreen)
    overflow: 'hidden', // ✅ Clip content at top
    zIndex: 50, // ✅ Above global gradient (40)
  },

  // Minimized State
  minimizedContent: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 20, // ✅ Align with back button (same as VideoPlayer back button left position)
    paddingRight: 20, // ✅ Align '+' with date (same as VideoPlayer date right position)
    paddingVertical: theme.spacing['3'],
  },
  minimizedLeft: {
    flex: 1,
    marginRight: theme.spacing['2'],
  },
  minimizedTitle: {
    fontSize: 18, // ✅ Same size as date in VideoPlayer
    fontWeight: '700',
    color: '#FFFFFF', // ✅ White text
    letterSpacing: -0.2,
    lineHeight: 22, // ✅ Define line height for consistent spacing
    textShadowColor: 'rgba(0, 0, 0, 0.8)', // ✅ Shadow for readability
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  // 🎯 Life Area badge (minimized view)
  lifeAreaBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  // 🆕 Chapter badge (minimized view) - Same style as lifeAreaBadge
  chapterBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  plusIconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusIcon: {
    fontSize: 28,
    fontWeight: '300',
    color: '#FFFFFF', // ✅ White plus icon
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Expanded State
  expandedContent: {
    flex: 1, // ✅ Take full container height (limited by heightAnim)
    backgroundColor: 'transparent', // ✅ Transparent background
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start', // ✅ Align croix with first line of title
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing['4'],
    paddingTop: theme.spacing['2'], // ✅ Reduced from spacing['4'] to spacing['2'] (half)
    paddingBottom: theme.spacing['0.5'], // ✅ Reduced even more
    borderBottomWidth: 0,
  },
  expandedHeaderLeft: {
    flex: 1,
    marginRight: theme.spacing['2'],
    justifyContent: 'center', // ✅ Center title vertically
  },
  expandedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF', // ✅ White text
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  // 🎯 Life Area badge (expanded view)
  lifeAreaBadgeExpanded: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 3,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  // 🆕 Chapter badge (expanded view) - Same style as lifeAreaBadgeExpanded
  chapterBadgeExpanded: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 3,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  videoDate: {
    fontSize: 11, // ✅ Very small text
    fontStyle: 'italic', // ✅ Italic style
    color: 'rgba(255, 255, 255, 0.7)', // ✅ White with opacity for subtle look
    marginTop: 4, // ✅ Small spacing from title
    letterSpacing: -0.1,
  },
  closeButton: {
    padding: theme.spacing['1'],
  },

  // Highlights Section
  highlightsScroll: {
    flex: 1,
  },
  highlightsContent: {
    paddingHorizontal: theme.spacing['4'],
    paddingTop: 8, // ✅ 8px gap between progress bar and first highlight
    paddingBottom: theme.spacing['1.5'],
  },
  highlightCard: {
    marginBottom: theme.spacing['3'],
    padding: theme.spacing['3'],
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // ✅ Transparent card with subtle white tint
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)', // ✅ Subtle white border
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing['1.5'],
  },
  highlightTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF', // ✅ White text
    marginRight: theme.spacing['2'],
  },
  importanceBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importanceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.white,
  },
  highlightSummary: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.8)', // ✅ White text with opacity
    marginBottom: theme.spacing['2'],
  },
  highlightFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timestampText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF', // ✅ White text
  },

  // No Highlights State
  noHighlightsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing['10'],
  },
  noHighlightsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF', // ✅ White text
    marginTop: theme.spacing['3'],
  },
  noHighlightsSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)', // ✅ White text with opacity
    marginTop: theme.spacing['1'],
    textAlign: 'center',
  },
});
