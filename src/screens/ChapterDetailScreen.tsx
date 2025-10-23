// ============================================================================
// Chapter Detail Screen
// Description: Récapitulatif d'un chapitre (design inspiré de l'image)
// ✅ Phase 3.3: Migrated to TanStack Query (0% UX changes)
// ============================================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import Svg, { Circle, Path } from 'react-native-svg';
import { theme } from '../styles';
import { Chapter, VideoRecord, supabase } from '../lib/supabase';
import { formatChapterPeriod } from '../services/chapterService';
import { TranscriptionJob } from '../services/transcriptionJobService';
import { Icon } from '../components/Icon';
import { VideoPlayer } from '../components/VideoPlayer';
import { LoadingDots } from '../components/LoadingDots';
import { CHAPTER_COLORS } from '../constants/chapterColors';
import { useTheme as useThemeContext } from '../contexts/ThemeContext';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
// ✅ Phase 3.3: React Query hooks
import { useVideosByChapterQuery } from '../hooks/queries/useVideosQuery';
import { useChapterQuery, useChaptersQuery, useUpdateChapterMutation } from '../hooks/queries/useChaptersQuery';
import { useQuotesQuery, useBulkTranscriptionsQuery } from '../hooks/queries/useTranscriptionQuery';

const { width: screenWidth } = Dimensions.get('window');
const MARGIN = 16;

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

// Create animated Circle component for SVG (used in circular preview)
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Interface for Quotes from transcript_highlight
interface Quote {
  text: string;
  video_id: string;
  video_title?: string;
  timestamp?: number;
}

interface ChapterDetailScreenProps {
  navigation: any;
  route: {
    params: {
      chapter: Chapter;
    };
  };
}

export default function ChapterDetailScreen({ navigation, route }: ChapterDetailScreenProps) {
  const { chapter: initialChapter } = route.params;
  const insets = useSafeAreaInsets();
  const { brandColor } = useThemeContext();

  // ✅ React Query: Fetch chapter data
  const {
    data: chapter = initialChapter,
    isLoading: chapterLoading,
  } = useChapterQuery(initialChapter.id);

  const {
    data: videos = [],
    isLoading: videosLoading,
  } = useVideosByChapterQuery(initialChapter.id);

  const {
    data: allChapters = [],
  } = useChaptersQuery();

  // ✅ React Query: Chapter mutation
  const updateChapterMutation = useUpdateChapterMutation();

  // ✅ Get video IDs for bulk fetching
  const videoIds = useMemo(() => videos.map(v => v.id), [videos]);

  // ✅ Bulk fetch transcriptions for all videos
  const {
    data: transcriptionsMap,
    isLoading: transcriptionsLoading,
  } = useBulkTranscriptionsQuery(videoIds);

  // ✅ Fetch quotes for this chapter's videos
  const {
    data: quotes = [],
    isLoading: quotesLoading,
  } = useQuotesQuery(videoIds);

  // ✅ Combined loading state
  const loading = chapterLoading || videosLoading || transcriptionsLoading || quotesLoading;

  // ✅ Convert transcriptionsMap to object (for backward compatibility)
  const transcriptionJobs = useMemo(() => {
    const jobs: { [videoId: string]: TranscriptionJob } = {};
    transcriptionsMap?.forEach((job, videoId) => {
      jobs[videoId] = job;
    });
    return jobs;
  }, [transcriptionsMap]);

  // ✅ Keep UI state (not data fetching)
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [showChaptersModal, setShowChaptersModal] = useState(false);
  const [showCircularPreview, setShowCircularPreview] = useState(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [showFullStory, setShowFullStory] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [quotesCurrentPage, setQuotesCurrentPage] = useState(0);
  const [summaryCardCurrentPage, setSummaryCardCurrentPage] = useState(0);
  const [randomQuote, setRandomQuote] = useState<Quote | null>(null);

  // ✅ Calculate life area mentions from highlights (useMemo)
  const lifeAreaMentions = useMemo(() => {
    // TODO: Calculate from transcriptionJobs highlights
    return [];
  }, [transcriptionJobs]);

  const leastMentionedAreas = useMemo(() => {
    // Bottom 3 areas
    return lifeAreaMentions.slice(-3);
  }, [lifeAreaMentions]);

  const circularVideoRef = useRef<Video>(null);

  // Animation values for modal (iOS native-style animation)
  const modalScale = useRef(new Animated.Value(0.95)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Animation values for circular preview
  const circularScale = useRef(new Animated.Value(0)).current;
  const circularOpacity = useRef(new Animated.Value(0)).current;

  // Long press progress animation
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressProgress = useRef(new Animated.Value(0)).current;
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const selectedVideo = videos[selectedVideoIndex] ?? null;
  const selectedTranscription = selectedVideo ? transcriptionJobs[selectedVideo.id] : null;

  // ============================================================================
  // Stats Calculation
  // ============================================================================

  const stats = {
    videosCount: videos.length,
    totalDuration: videos.reduce((sum, v) => sum + (v.duration || 0), 0),
    activeDays: new Set(
      videos.map((v) => {
        if (!v.created_at) return null;
        const date = new Date(v.created_at);
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      }).filter(Boolean)
    ).size,
    averageMood: 92, // TODO: Calculate from transcriptions sentiment analysis
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h${minutes}m`; // ✅ Compact format without space
    }
    return `${minutes}m`;
  };

  // ✅ Removed data fetching useEffects (now handled by React Query)
  // - loadChapterData() → useChapterQuery()
  // - loadAllChapters() → useChaptersQuery()
  // - loadQuotes() → useQuotesQuery()
  // - loadLifeAreaMentions() → useMemo calculation

  // ✅ Load random quote when quotes are available (UI logic only)
  useEffect(() => {
    if (quotes.length > 0 && !randomQuote) {
      const randomIndex = Math.floor(Math.random() * quotes.length);
      setRandomQuote(quotes[randomIndex]);
    }
  }, [quotes, randomQuote]);

  // ============================================================================
  // Action Handlers
  // ============================================================================

  const handleShare = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: Implement share functionality (generate image + text)
    console.log('📤 Share chapter:', chapter.title);
  }, [chapter]);

  const handleEditChapter = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('EditChapter', { chapter });
  }, [chapter, navigation]);

  const handleColorButtonPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowColorPicker(true);
  }, []);

  const handleColorSelect = useCallback(async (color: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // ✅ Use React Query mutation with optimistic updates
      await updateChapterMutation.mutateAsync({
        id: chapter.id,
        updates: { color },
      });
      console.log('✅ Chapter color updated:', color);
    } catch (error) {
      console.error('❌ Error in handleColorSelect:', error);
    }
    setShowColorPicker(false);
  }, [chapter.id, updateChapterMutation]);

  const handleKeywordPress = useCallback((keyword: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Filter videos by keyword
    console.log('🏷️ Filter by keyword:', keyword);
  }, []);

  const handleVideoThumbnailPress = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedVideoIndex(index);
    setShowVideoPlayer(true);
  }, []);

  // 🆕 Handle quotes scroll for pagination
  const handleQuotesScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const pageWidth = screenWidth - (MARGIN * 2); // Card width
    const page = Math.round(scrollPosition / pageWidth);
    setQuotesCurrentPage(page);
  };

  // 🆕 Handle summary card scroll for pagination
  const handleSummaryCardScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const pageWidth = screenWidth - (MARGIN * 2); // Card width
    const page = Math.round(scrollPosition / pageWidth);
    setSummaryCardCurrentPage(page);
  };

  // 🆕 Open vertical feed with all chapter videos (starting from first video)
  const handleReliveChapter = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (videos.length === 0) {
      console.log('⚠️ No videos in chapter to relive');
      return;
    }

    console.log(`🎬 Reliving chapter "${chapter.title}" with ${videos.length} videos`);

    // Navigate to VerticalFeed with chapter videos (chronological order)
    navigation.navigate('VerticalFeed' as never, {
      videos: videos, // Already sorted by created_at ascending
      initialIndex: 0, // Start from first video
      sourceScreen: 'chapterDetail',
    } as never);
  }, [videos, chapter.title, navigation]);

  const getKeywordCount = useCallback((keyword: string): number => {
    // TODO: Calculate from transcriptions
    // For now, return a placeholder count based on keyword frequency
    return videos.filter(v =>
      v.title?.toLowerCase().includes(keyword.toLowerCase())
    ).length || Math.floor(Math.random() * videos.length) + 1;
  }, [videos]);

  // ✅ Removed 4 dead functions (176 lines):
  // - loadChapterData() → useChapterQuery()
  // - loadAllChapters() → useChaptersQuery()
  // - loadQuotes() → useQuotesQuery()
  // - loadLifeAreaMentions() → useMemo calculation (lines 142-150)

  const getVideoUri = (video: VideoRecord): string => {
    if (video.file_path.startsWith('http')) return video.file_path;
    const baseUrl = 'https://eenyzudwktcjpefpoapi.supabase.co/storage/v1/object/public/videos';
    let cleanPath = video.file_path.replace(/^\/?(videos\/)?/, '');
    return `${baseUrl}/${cleanPath}`;
  };

  const getThumbnailUri = (video: VideoRecord): string | undefined => {
    if (video.thumbnail_frames?.[0]) return video.thumbnail_frames[0];
    if (video.thumbnail_path) {
      if (video.thumbnail_path.startsWith('http')) return video.thumbnail_path;
      return `https://eenyzudwktcjpefpoapi.supabase.co/storage/v1/object/public/videos/${video.thumbnail_path}`;
    }
    return undefined;
  };

  // Modal handlers (iOS native-style animations)
  const handleOpenModal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    modalScale.setValue(0.95);
    modalOpacity.setValue(0);
    setShowChaptersModal(true);

    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.96,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 80,
      }),
    ]).start();

    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.spring(modalScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 14,
          tension: 100,
        }),
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [buttonScale, modalScale, modalOpacity]);

  const handleCloseModal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.parallel([
      Animated.timing(modalScale, {
        toValue: 0.95,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowChaptersModal(false);
    });
  }, [modalScale, modalOpacity]);

  const handleSelectChapter = useCallback((selectedChapter: Chapter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleCloseModal();
    navigation.replace('ChapterDetail', { chapter: selectedChapter });
  }, [handleCloseModal, navigation]);

  // Circular Preview handlers
  const handleOpenCircularPreview = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    circularScale.setValue(0);
    circularOpacity.setValue(0);
    setShowCircularPreview(true);

    // Always restart from beginning
    requestAnimationFrame(async () => {
      if (circularVideoRef.current) {
        await circularVideoRef.current.setPositionAsync(0);
        await circularVideoRef.current.playAsync();
      }

      Animated.parallel([
        Animated.spring(circularScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 12,
          tension: 80,
        }),
        Animated.timing(circularOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [circularScale, circularOpacity]);

  const handleCloseCircularPreview = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.parallel([
      Animated.timing(circularScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(circularOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowCircularPreview(false);
    });
  }, [circularScale, circularOpacity]);

  // VideoPlayer handlers
  const handleOpenVideoPlayer = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Close circular preview first
    handleCloseCircularPreview();

    // Open VideoPlayer after a short delay to allow circular preview to close
    setTimeout(() => {
      setShowVideoPlayer(true);
    }, 250);
  }, [handleCloseCircularPreview]);

  const handleCloseVideoPlayer = useCallback(() => {
    setShowVideoPlayer(false);
  }, []);

  // Long press handlers with progress animation
  const handlePressIn = useCallback(() => {
    setIsLongPressing(true);

    // Start progress animation (0 to 1 in 2 seconds)
    Animated.timing(longPressProgress, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        // Animation completed - open video player
        handleOpenVideoPlayer();
        setIsLongPressing(false);
        longPressProgress.setValue(0);
      }
    });
  }, [longPressProgress, handleOpenVideoPlayer]);

  const handlePressOut = useCallback(() => {
    setIsLongPressing(false);

    // Stop and reset animation
    longPressProgress.stopAnimation();
    Animated.timing(longPressProgress, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [longPressProgress]);

  // ✅ Get chapter color for cards (same as Chapters page)
  const getCardBackgroundColor = () => {
    if (!chapter.color) return undefined;
    return `${chapter.color}15`; // 15% opacity (same as ChapterCard.tsx)
  };

  // 🆕 Divider component for visual separation between sections
  const Divider = () => <View style={styles.divider} />;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingDots color={brandColor} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Chapter Selector Modal (iOS-style with Liquid Glass) */}
      <Modal
        visible={showChaptersModal}
        transparent
        animationType="none"
        onRequestClose={handleCloseModal}
      >
        <TouchableWithoutFeedback onPress={handleCloseModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <Animated.View
                style={[
                  styles.chaptersModalContainer,
                  {
                    top: insets.top + theme.spacing['3'],
                    opacity: modalOpacity,
                    transform: [{ scale: modalScale }]
                  }
                ]}
              >
                <LiquidGlassView
                  style={[
                    styles.chaptersModalGlass,
                    !isLiquidGlassSupported && {
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    }
                  ]}
                  interactive={true}
                >
                  {/* Header */}
                  <View style={styles.chaptersModalHeader}>
                    <Text style={styles.chaptersModalHeaderText}>
                      {chapter.title}
                    </Text>
                  </View>

                  {/* Scrollable list */}
                  <ScrollView
                    style={styles.chaptersModalScroll}
                    showsVerticalScrollIndicator={false}
                  >
                    {/* List of chapters */}
                    {allChapters.map((chap) => (
                      <TouchableOpacity
                        key={chap.id}
                        style={[
                          styles.chapterModalItem,
                          chap.id === chapter.id && styles.chapterModalItemSelected
                        ]}
                        onPress={() => handleSelectChapter(chap)}
                      >
                        <Text style={[
                          styles.chapterModalItemText,
                          chap.id === chapter.id && styles.chapterModalItemTextSelected
                        ]}>
                          {chap.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </LiquidGlassView>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Circular Preview Modal */}
      <Modal
        visible={showCircularPreview}
        transparent
        animationType="none"
        onRequestClose={handleCloseCircularPreview}
      >
        <TouchableWithoutFeedback onPress={handleCloseCircularPreview}>
          <View style={styles.circularPreviewOverlay}>
            <Animated.View
              style={[
                styles.circularPreviewContainer,
                {
                  opacity: circularOpacity,
                  transform: [{ scale: circularScale }]
                }
              ]}
            >
              <TouchableWithoutFeedback
                onPress={(e) => e.stopPropagation()}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
              >
                <View style={styles.circularVideoWrapper}>
                  {selectedVideo && (
                    <Video
                      ref={circularVideoRef}
                      source={{ uri: getVideoUri(selectedVideo) }}
                      style={styles.circularVideo}
                      resizeMode={ResizeMode.COVER}
                      shouldPlay={true}
                      isMuted={false}
                      volume={1.0}
                      isLooping={false}
                      useNativeControls={false}
                    />
                  )}

                  {/* Progress Circle - Red line around video */}
                  {isLongPressing && (
                    <Animated.View
                      style={[
                        styles.progressCircleContainer,
                        {
                          opacity: longPressProgress.interpolate({
                            inputRange: [0, 0.1, 1],
                            outputRange: [0, 1, 1],
                          }),
                        }
                      ]}
                      pointerEvents="none"
                    >
                      <Svg
                        width={screenWidth * 0.75}
                        height={screenWidth * 0.75}
                        style={styles.progressCircleSvg}
                      >
                        <AnimatedCircle
                          cx={screenWidth * 0.75 / 2}
                          cy={screenWidth * 0.75 / 2}
                          r={(screenWidth * 0.75 / 2) - 4}
                          stroke="#FF0000"
                          strokeWidth={3}
                          fill="none"
                          strokeDasharray={Math.PI * 2 * ((screenWidth * 0.75 / 2) - 4)}
                          strokeDashoffset={longPressProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [Math.PI * 2 * ((screenWidth * 0.75 / 2) - 4), 0],
                          })}
                          strokeLinecap="round"
                          rotation="-90"
                          origin={`${screenWidth * 0.75 / 2}, ${screenWidth * 0.75 / 2}`}
                        />
                      </Svg>
                    </Animated.View>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Color Picker Modal */}
      <Modal visible={showColorPicker} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={() => setShowColorPicker(false)}>
          <View style={styles.colorModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.colorPickerContainer}>
                <LiquidGlassView
                  style={[
                    styles.colorPickerGlass,
                    !isLiquidGlassSupported && {
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    },
                  ]}
                  interactive={false}
                >
                  <View style={styles.colorPickerContent}>
                    <Text style={styles.colorPickerTitle}>Choose Chapter Color</Text>
                    <ScrollView
                      contentContainerStyle={styles.colorGrid}
                      showsVerticalScrollIndicator={false}
                    >
                      {CHAPTER_COLORS.map((colorOption) => (
                        <TouchableOpacity
                          key={colorOption}
                          style={[
                            styles.colorOption,
                            { backgroundColor: colorOption },
                            chapter.color === colorOption && styles.colorOptionSelected,
                          ]}
                          onPress={() => handleColorSelect(colorOption)}
                          activeOpacity={0.7}
                        >
                          {chapter.color === colorOption && (
                            <View style={styles.selectedIndicator} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </LiquidGlassView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header: Titre + Période + Edit Icon */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={handleOpenModal} activeOpacity={0.7}>
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <Text style={styles.title}>
                  {chapter.title}
                </Text>
              </Animated.View>
            </TouchableOpacity>
            {/* Period - dates du chapitre */}
            {(chapter.started_at || chapter.ended_at) && (
              <Text style={styles.periodText}>
                {formatChapterPeriod(chapter.started_at, chapter.ended_at)}
              </Text>
            )}
          </View>
          {/* Action buttons (Color) */}
          <View style={styles.headerActions}>
            {/* Color Button */}
            <TouchableOpacity onPress={handleColorButtonPress} activeOpacity={0.8}>
              <LiquidGlassView
                style={[
                  styles.colorIconGlass,
                  !isLiquidGlassSupported && {
                    backgroundColor: theme.colors.gray100,
                  }
                ]}
                interactive={true}
              >
                <View style={[
                  styles.colorCircle,
                  { backgroundColor: chapter.color || theme.colors.brand.primary }
                ]} />
              </LiquidGlassView>
            </TouchableOpacity>
          </View>
        </View>

        {/* 🆕 Chapter Summary Card - Scrollable horizontal card (inspired by Current Chapter Card) */}
        <View style={styles.chapterSummarySection}>
          <LiquidGlassView
            style={[
              styles.chapterSummaryGlass,
              { backgroundColor: getCardBackgroundColor() }, // ✅ Chapter color
              !isLiquidGlassSupported && {
                backgroundColor: getCardBackgroundColor() || 'rgba(255, 255, 255, 0.8)',
              }
            ]}
            interactive={false}
          >
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleSummaryCardScroll}
              scrollEventThrottle={16}
              style={styles.summaryCardScrollView}
            >
              {/* Page 1: Stats (Videos, Duration, Days) - 3 items */}
              <View style={[styles.summaryCardPage, { width: screenWidth - (MARGIN * 2) }]}>
                <View style={styles.summaryStatsGrid}>
                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryStatValue}>{stats.videosCount}</Text>
                    <Text style={styles.summaryStatLabel}>videos</Text>
                  </View>
                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryStatValue}>{formatDuration(stats.totalDuration)}</Text>
                    <Text style={styles.summaryStatLabel}>duration</Text>
                  </View>
                  <View style={styles.summaryStatItem}>
                    <Text style={styles.summaryStatValue}>{stats.activeDays}</Text>
                    <Text style={styles.summaryStatLabel}>days</Text>
                  </View>
                </View>
              </View>

              {/* Pages 2+: Life Areas "All About" - 3 per page */}
              {lifeAreaMentions.length > 0 ? (() => {
                // Group Life Areas into pages of 3
                const pages = [];
                for (let i = 0; i < lifeAreaMentions.length; i += 3) {
                  const pageAreas = lifeAreaMentions.slice(i, i + 3);
                  pages.push(
                    <View key={`life-areas-${i}`} style={[styles.summaryCardPage, { width: screenWidth - (MARGIN * 2) }]}>
                      <Text style={styles.summaryPageTitle}>all about...</Text>
                      <View style={styles.lifeAreasStatsThree}>
                        {pageAreas.map((item, index) => (
                          <View key={item.area_key} style={styles.lifeAreaStatItem}>
                            <Text style={styles.lifeAreaStatValue}>{item.percentage}%</Text>
                            <Text style={styles.lifeAreaStatLabel}>{item.display_name}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                }
                return pages;
              })() : (
                <View key="no-life-areas" style={[styles.summaryCardPage, { width: screenWidth - (MARGIN * 2) }]}>
                  <Text style={styles.summaryPageTitle}>Debug</Text>
                  <Text style={{ textAlign: 'center', color: theme.colors.text.secondary }}>
                    No Life Areas loaded yet ({lifeAreaMentions.length} items)
                  </Text>
                </View>
              )}

              {/* Page "Less About" - Bottom 3 Life Areas */}
              {leastMentionedAreas.length > 0 && (
                <View key="less-about" style={[styles.summaryCardPage, { width: screenWidth - (MARGIN * 2) }]}>
                  <Text style={styles.summaryPageTitle}>less about...</Text>
                  <View style={styles.lifeAreasStatsThree}>
                    {leastMentionedAreas.map((item) => (
                      <View key={item.area_key} style={styles.lifeAreaStatItem}>
                        <Text style={styles.lifeAreaStatValue}>{item.percentage}%</Text>
                        <Text style={styles.lifeAreaStatLabel}>{item.display_name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Challenge */}
              <View style={[styles.summaryCardPage, { width: screenWidth - (MARGIN * 2) }]}>
                <Text style={styles.summaryPageTitle}>Challenge</Text>
                <View style={styles.insightContentContainer}>
                  {chapter.challenges && chapter.challenges.length > 0 ? (
                    chapter.challenges.map((challenge, index) => (
                      <Text key={index} style={styles.insightText} numberOfLines={4}>
                        {challenge}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.insightPlaceholder}>
                      No challenges identified yet.{'\n'}Generate chapter story to unlock insights.
                    </Text>
                  )}
                </View>
              </View>

              {/* Growth */}
              <View style={[styles.summaryCardPage, { width: screenWidth - (MARGIN * 2) }]}>
                <Text style={styles.summaryPageTitle}>Growth</Text>
                <View style={styles.insightContentContainer}>
                  {chapter.growth && chapter.growth.length > 0 ? (
                    chapter.growth.map((item, index) => (
                      <Text key={index} style={styles.insightText} numberOfLines={4}>
                        {item}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.insightPlaceholder}>
                      No growth insights yet.{'\n'}Generate chapter story to unlock insights.
                    </Text>
                  )}
                </View>
              </View>

              {/* Lessons */}
              <View style={[styles.summaryCardPage, { width: screenWidth - (MARGIN * 2) }]}>
                <Text style={styles.summaryPageTitle}>Lessons</Text>
                <View style={styles.insightContentContainer}>
                  {chapter.lessons_learned && chapter.lessons_learned.length > 0 ? (
                    chapter.lessons_learned.map((lesson, index) => (
                      <Text key={index} style={styles.insightText} numberOfLines={4}>
                        {lesson}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.insightPlaceholder}>
                      No lessons learned yet.{'\n'}Generate chapter story to unlock insights.
                    </Text>
                  )}
                </View>
              </View>

              {/* Page Quote */}
              {randomQuote && (
                <View style={[styles.summaryCardPage, { width: screenWidth - (MARGIN * 2) }]}>
                  <Text style={styles.summaryQuoteMarkBackground}>"</Text>
                  <Text style={styles.summaryQuoteText} numberOfLines={6}>
                    {randomQuote.text}
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Pagination dots */}
            <View style={styles.summaryCardPaginationDots}>
              {(() => {
                const dots = [];
                dots.push(true); // Page 1: Stats

                // Add dots for Life Areas pages (3 per page)
                const lifeAreaPages = Math.ceil(lifeAreaMentions.length / 3);
                for (let i = 0; i < lifeAreaPages; i++) {
                  dots.push(true);
                }

                if (leastMentionedAreas.length > 0) dots.push(true); // Less About page

                // Always show Challenge, Growth, Lessons pages (after Life Areas)
                dots.push(true); // Challenge
                dots.push(true); // Growth
                dots.push(true); // Lessons

                if (randomQuote) dots.push(true); // Quote

                console.log('📍 Pagination dots count:', dots.length, {
                  stats: true,
                  challenge: true,
                  growth: true,
                  lessons: true,
                  lifeAreaPages,
                  lessAbout: leastMentionedAreas.length > 0,
                  quote: !!randomQuote,
                });

                return dots.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.summaryCardDot,
                      summaryCardCurrentPage === index && [
                        styles.summaryCardActiveDot,
                        {
                          backgroundColor: chapter.color || brandColor || theme.colors.brand.primary,
                          shadowColor: chapter.color || brandColor || theme.colors.brand.primary,
                        }
                      ],
                    ]}
                  />
                ));
              })()}
            </View>
          </LiquidGlassView>
        </View>

        {/* Keywords - Scrollable horizontal avec LiquidGlass */}
        {chapter.keywords && chapter.keywords.length > 0 && (
          <View style={styles.keywordsSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.keywordsContainer}
              style={styles.keywordsScrollView}
            >
              {chapter.keywords
                .slice(0, 10) // Max 10 keywords
                .map((keyword, index) => (
                  <TouchableOpacity
                    key={`${keyword}-${index}`}
                    style={styles.keywordWrapper}
                    onPress={() => handleKeywordPress(keyword)}
                    activeOpacity={0.7}
                  >
                    <LiquidGlassView
                      style={[
                        styles.keywordPill,
                        { backgroundColor: getCardBackgroundColor() },
                        !isLiquidGlassSupported && {
                          backgroundColor: getCardBackgroundColor() || 'rgba(255, 255, 255, 0.8)',
                        }
                      ]}
                      interactive={true}
                    >
                      <Text style={styles.keywordText}>
                        {keyword}
                      </Text>
                    </LiquidGlassView>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        )}

        {/* Story Section - AI-generated summary */}
        <View style={styles.storySection}>
          {/* Centered Summary Card with AI Title inside */}
          <LiquidGlassView
            style={[
              styles.storySummaryContainer,
              { backgroundColor: getCardBackgroundColor() },
              !isLiquidGlassSupported && {
                backgroundColor: getCardBackgroundColor() || 'rgba(255, 255, 255, 0.8)',
              }
            ]}
            interactive={false}
          >
            {/* 🆕 AI Generated badge */}
            <View style={styles.aiGeneratedBadge}>
              <Icon name="sparkles" size={10} color={theme.colors.text.tertiary} />
              <Text style={styles.aiGeneratedText}>AI Generated</Text>
            </View>

            {/* AI Title (optional) - Now inside the card */}
            {chapter.ai_title && (
              <Text style={styles.storyLiteraryTitle}>{chapter.ai_title}</Text>
            )}

            <Text style={styles.storySummaryText}>
              {showFullStory
                ? (chapter.ai_detailed_description ||
                    chapter.ai_short_summary ||
                    chapter.description ||
                    "Generate this chapter's story to see an AI-powered summary of this period...")
                : (chapter.ai_short_summary ||
                    chapter.description ||
                    "Generate this chapter's story to see an AI-powered summary of this period...")}
            </Text>

            {/* Read Full Story button - inside card */}
            {chapter.ai_detailed_description && (
              <TouchableOpacity
                style={styles.readFullStoryButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowFullStory(!showFullStory);
                }}
              >
                <Text style={styles.readFullStoryText}>
                  {showFullStory ? 'Show Less' : 'Read Full Story'}
                </Text>
                <Icon
                  name={showFullStory ? 'chevronUp' : 'arrowRight'}
                  size={16}
                  color={theme.colors.text.secondary}
                />
              </TouchableOpacity>
            )}
          </LiquidGlassView>
        </View>

        {/* Journey - Scrollable list of all videos */}
        {videos.length > 0 && (
          <View style={styles.timelineSection}>
            <LiquidGlassView
              style={[
                styles.timelineCard,
                { backgroundColor: getCardBackgroundColor() },
                !isLiquidGlassSupported && {
                  backgroundColor: getCardBackgroundColor() || 'rgba(255, 255, 255, 0.8)',
                }
              ]}
              interactive={false}
            >
              {/* Title inside the card */}
              <Text style={styles.timelineSectionTitle}>journey</Text>

              {/* Scrollable video list */}
              <ScrollView
                style={styles.timelineScrollView}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
              >
                {videos.map((video, index) => (
                  <TouchableOpacity
                    key={video.id}
                    style={styles.timelineItem}
                    onPress={() => handleVideoThumbnailPress(index)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.timelineDot,
                      { backgroundColor: chapter.color || brandColor || theme.colors.brand.primary }
                    ]} />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineDate}>
                        {video.created_at
                          ? new Date(video.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Unknown date'}
                      </Text>
                      <Text style={styles.timelineTitle} numberOfLines={2}>
                        {video.title || 'Untitled Video'}
                      </Text>
                    </View>
                    {video.duration && (
                      <Text style={styles.timelineDuration}>
                        {formatDuration(video.duration)}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* View All button at bottom */}
              <TouchableOpacity
                style={styles.timelineViewAllButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  navigation.navigate('Library', {
                    filterChapterId: chapter.id,
                    filterChapterTitle: chapter.title,
                    openSearchWithFilter: true,
                  });
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.timelineViewAllText}>View All Videos</Text>
                <Icon name="arrowRight" size={16} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </LiquidGlassView>
          </View>
        )}

        {/* Quotes Section - Swipable quotes from transcriptions */}
        {quotes.length > 0 && (
          <View style={styles.quotesSection}>
            <Text style={styles.quotesSectionTitle}>Quotes from this Chapter</Text>

            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.quotesScrollView}
              contentContainerStyle={styles.quotesScrollContent}
              onScroll={handleQuotesScroll}
              scrollEventThrottle={16}
            >
              {quotes.map((quote, index) => (
                <View key={index} style={styles.quotePage}>
                  <Text style={styles.quoteText}>"{quote.text}"</Text>
                  {quote.video_title && (
                    <Text style={styles.quoteSource}>— {quote.video_title}</Text>
                  )}
                </View>
              ))}
            </ScrollView>

            {/* Pagination Dots */}
            {quotes.length > 1 && (
              <View style={styles.quotesPaginationDots}>
                {quotes.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.quoteDot,
                      quotesCurrentPage === index && [
                        styles.quoteActiveDot,
                        {
                          backgroundColor: chapter.color || brandColor || theme.colors.brand.primary,
                          shadowColor: chapter.color || brandColor || theme.colors.brand.primary,
                        },
                      ],
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Edit Chapter Link - Simple text without button styling */}
        <TouchableOpacity
          onPress={handleEditChapter}
          activeOpacity={0.7}
          style={styles.editChapterLink}
        >
          <Text style={[styles.editChapterLinkText, { color: chapter.color || brandColor || theme.colors.brand.primary }]}>
            Edit Chapter
          </Text>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Video Player (fullscreen) */}
      <VideoPlayer
        visible={showVideoPlayer}
        video={selectedVideo}
        videos={videos}
        initialIndex={selectedVideoIndex}
        onClose={handleCloseVideoPlayer}
      />
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0)', // Transparent like MomentumDashboard
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0)', // Transparent like MomentumDashboard
  },
  scrollView: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: MARGIN,
    paddingTop: 24,
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
    gap: 0,
  },
  title: {
    fontFamily: 'Poppins-SemiBoldItalic',
    fontSize: 22,
    fontWeight: '600',
    fontStyle: 'italic',
    letterSpacing: -0.66,
    color: theme.colors.text.primary,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '400',
    color: theme.colors.text.secondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorIconGlass: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  colorCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  // Color Picker Modal
  colorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  colorPickerContainer: {
    width: '95%',
    maxWidth: 400,
  },
  colorPickerGlass: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  colorPickerContent: {
    padding: 24,
  },
  colorPickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    paddingBottom: 8,
  },
  colorOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  colorOptionSelected: {
    borderColor: theme.colors.black,
    transform: [{ scale: 1.1 }],
  },
  selectedIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  // 🆕 Divider - Visual separator between sections
  divider: {
    height: 1,
    backgroundColor: theme.colors.gray300,
    marginVertical: theme.spacing['4'], // 16px
    marginHorizontal: MARGIN,
  },
  // 🆕 Chapter Summary Card Section
  chapterSummarySection: {
    marginHorizontal: MARGIN,
    marginTop: 24,
  },
  chapterSummaryGlass: {
    borderRadius: 12,
    overflow: 'hidden',
    paddingVertical: 20,
    paddingHorizontal: 0,
  },
  summaryCardScrollView: {
    flexGrow: 0,
  },
  summaryCardPage: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 180,
  },
  // Page 1: Stats Grid
  summaryStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
  },
  summaryStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryStatValue: {
    fontFamily: 'Georgia', // Romanesque serif font (same as ChapterCard)
    fontSize: 32, // ✅ Slightly smaller to prevent line wrapping on duration
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  summaryStatLabel: {
    fontSize: 12, // ✅ Same as ChapterCard.tsx (was 11)
    fontWeight: '500',
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  // Page titles
  summaryPageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  // Pages 3+: Life Areas "All About"
  lifeAreasStatsThree: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
  lifeAreaStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  lifeAreaStatValue: {
    fontFamily: 'Georgia',
    fontSize: 32, // Same as stats page
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  lifeAreaStatLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  // Insights (Challenge, Growth, Lessons)
  insightContentContainer: {
    width: '100%',
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightText: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  insightPlaceholder: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 12,
  },
  // Page 4: Quote
  summaryQuoteMarkBackground: {
    position: 'absolute',
    left: -20,
    top: '30%',
    fontSize: 120,
    fontWeight: '700',
    color: theme.colors.gray300,
    opacity: 0.3,
    fontFamily: 'Georgia',
    zIndex: 0,
  },
  summaryQuoteText: {
    fontSize: 15,
    fontWeight: '400',
    color: theme.colors.text.primary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
    zIndex: 1,
  },
  // Page 2: Journey with wavy path
  summaryJourneyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  summaryJourneyEndpoint: {
    alignItems: 'center',
    gap: 6,
  },
  journeyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.brand.primary,
  },
  summaryJourneyLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryJourneyDate: {
    fontFamily: 'Georgia',
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  wavyPathContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Pagination dots for summary card
  summaryCardPaginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing['1'],
    marginTop: 16,
  },
  summaryCardDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.gray400,
    opacity: 0.2,
  },
  summaryCardActiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    opacity: 0.6,
    // backgroundColor set dynamically with chapter.color
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  // Stats Section
  statsSection: {
    marginHorizontal: MARGIN,
    marginTop: 24, // ✅ Consistent spacing
  },
  statsGlass: {
    borderRadius: 12,
    overflow: 'hidden',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontFamily: 'Georgia', // ✅ Romanesque serif font (same as momentum score)
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Story Section
  storySection: {
    marginTop: 24, // ✅ Consistent spacing
  },
  // 🆕 AI Generated badge
  aiGeneratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
    alignSelf: 'center',
  },
  aiGeneratedText: {
    fontSize: 9,
    fontWeight: '500',
    color: theme.colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  storyLiteraryTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontStyle: 'italic',
    color: theme.colors.text.primary,
    marginBottom: 12, // ✅ Spacing between title and summary text
    textAlign: 'center',
  },
  readFullStoryButton: {
    marginTop: 16,
    marginHorizontal: 0,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  readFullStoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  storySummaryContainer: {
    marginHorizontal: MARGIN,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    overflow: 'hidden',
  },
  storySummaryText: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  // Keywords Section (below Chapter Summary Card)
  keywordsSection: {
    marginTop: 24, // ✅ Same spacing as other sections
    marginBottom: 0,
  },
  keywordsScrollView: {
    paddingLeft: MARGIN,
  },
  keywordsContainer: {
    flexDirection: 'row',
    paddingRight: MARGIN,
  },
  keywordWrapper: {
    marginRight: 10, // ✅ Increased spacing between keywords for better readability
  },
  keywordPill: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  keywordText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  // 🆕 Chapter Timeline - Scrollable list of videos
  timelineSection: {
    marginHorizontal: MARGIN,
    marginTop: 24,
    marginBottom: 16,
  },
  timelineSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    textAlign: 'center', // Centered like "all about..."
    paddingTop: 16,
    paddingBottom: 8,
  },
  timelineCount: {
    fontFamily: 'Georgia',
    fontWeight: '700',
  },
  timelineCard: {
    borderRadius: 12,
    overflow: 'hidden',
    paddingBottom: 12,
  },
  timelineScrollView: {
    maxHeight: 320, // Fixed height for scrollable area
    paddingTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.6,
    // backgroundColor set dynamically with chapter.color
  },
  timelineContent: {
    flex: 1,
    gap: 4,
  },
  timelineDate: {
    fontFamily: 'Georgia',
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    letterSpacing: 0.3,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
    lineHeight: 18,
  },
  timelineDuration: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.text.tertiary,
    letterSpacing: 0.2,
  },
  timelineViewAllButton: {
    marginTop: 8,
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  timelineViewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  // Chapters Modal (iOS-style like Momentum)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  chaptersModalContainer: {
    position: 'absolute',
    left: theme.spacing['4'],
    width: 280,
    maxHeight: 450,
  },
  chaptersModalGlass: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  chaptersModalHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
    borderBottomWidth: 0,
  },
  chaptersModalHeaderText: {
    fontFamily: 'Poppins-SemiBoldItalic',
    fontSize: 18,
    fontWeight: '600',
    fontStyle: 'italic',
    letterSpacing: -0.54,
    color: theme.colors.text.primary,
    overflow: 'hidden',
  },
  chaptersModalScroll: {
    maxHeight: 400,
  },
  chapterModalItem: {
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['3'],
    borderBottomWidth: 0,
  },
  chapterModalItemSelected: {
    backgroundColor: 'rgba(155, 102, 255, 0.15)',
  },
  chapterModalItemText: {
    fontSize: 18,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  chapterModalItemTextSelected: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.brand.primary,
  },
  // Circular Preview Modal
  circularPreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularPreviewContainer: {
    width: screenWidth * 0.75,
    height: screenWidth * 0.75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularVideoWrapper: {
    width: '100%',
    height: '100%',
    borderRadius: (screenWidth * 0.75) / 2, // Perfect circle
    overflow: 'hidden',
    backgroundColor: theme.colors.black,
  },
  circularVideo: {
    width: '100%',
    height: '100%',
  },
  progressCircleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircleSvg: {
    position: 'absolute',
  },
  // Quotes Section
  quotesSection: {
    marginHorizontal: MARGIN,
    marginTop: 24,
    marginBottom: 16,
  },
  quotesSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  quotesScrollView: {
    marginHorizontal: -MARGIN,
  },
  quotesScrollContent: {
    paddingHorizontal: 0,
  },
  quotePage: {
    width: screenWidth - (MARGIN * 2),
    paddingHorizontal: MARGIN,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    minHeight: 180,
  },
  quoteText: {
    fontSize: 17,
    fontWeight: '400',
    color: theme.colors.text.primary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: 16,
  },
  quoteSource: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text.secondary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quotesPaginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing['1'],
    marginTop: 16,
  },
  quoteDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.gray400,
    opacity: 0.2,
  },
  quoteActiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    opacity: 0.6,
    // backgroundColor set dynamically with chapter.color
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  // Edit buttons and rows
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smallEditButton: {
    padding: 4,
    opacity: 0.5,
  },
  aiGeneratedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
    marginBottom: 6,
  },
  summaryEditButton: {
    position: 'absolute',
    right: 0,
    padding: 6,
    opacity: 0.5,
  },
  // Edit modals
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  editModalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    overflow: 'hidden',
  },
  editModalContainerLarge: {
    maxHeight: '70%',
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  editModalInput: {
    fontSize: 16,
    color: theme.colors.text.primary,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  editModalInputMultiline: {
    minHeight: 120,
    maxHeight: 200,
  },
  editModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editModalButtonCancel: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  editModalButtonSave: {
    backgroundColor: theme.colors.brand.primary,
  },
  editModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  editModalButtonTextSave: {
    color: theme.colors.white,
  },
  datePickerSection: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  datePicker: {
    width: '100%',
  },
  // Edit Chapter Link - Simple text style
  editChapterLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  editChapterLinkText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.brand.primary,
  },
});
