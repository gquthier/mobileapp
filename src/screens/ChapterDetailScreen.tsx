// ============================================================================
// Chapter Detail Screen
// Description: Récapitulatif d'un chapitre (design inspiré de l'image)
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Modal,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import Svg, { Circle } from 'react-native-svg';
import { theme } from '../styles';
import { Chapter, VideoRecord, supabase } from '../lib/supabase';
import { formatChapterPeriod } from '../services/chapterService';
import { TranscriptionJob } from '../services/transcriptionJobService';
import { Icon } from '../components/Icon';
import { VideoPlayer } from '../components/VideoPlayer';
import { CHAPTER_COLORS } from '../constants/chapterColors';
import * as Haptics from 'expo-haptics';

const { width: screenWidth } = Dimensions.get('window');
const MARGIN = 16;

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
  const [loading, setLoading] = useState(true);
  const [chapter, setChapter] = useState<Chapter>(initialChapter); // State for chapter with AI data
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [transcriptionJobs, setTranscriptionJobs] = useState<{
    [videoId: string]: TranscriptionJob;
  }>({});
  const [showChaptersModal, setShowChaptersModal] = useState(false);
  const [showCircularPreview, setShowCircularPreview] = useState(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [showFullStory, setShowFullStory] = useState(false);
  const [expandedInsight, setExpandedInsight] = useState<'challenge' | 'growth' | 'lessons' | null>('challenge');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>([]); // 🆕 Quotes from transcript_highlight
  const [quotesCurrentPage, setQuotesCurrentPage] = useState(0); // 🆕 Current quote page for swipe
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

  const selectedVideo = videos[selectedVideoIndex];
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
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  useEffect(() => {
    loadChapterData();
    loadAllChapters();
  }, [chapter.id]);

  // 🆕 Load quotes when videos are loaded
  useEffect(() => {
    if (videos.length > 0) {
      loadQuotes();
    }
  }, [videos]);

  // ============================================================================
  // Action Handlers
  // ============================================================================

  const handleShare = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: Implement share functionality (generate image + text)
    console.log('📤 Share chapter:', chapter.title);
  }, [chapter]);

  const handleEdit = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: Navigate to chapter edit screen
    console.log('✏️ Edit chapter:', chapter.title);
  }, [chapter, navigation]);

  const handleColorButtonPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowColorPicker(true);
  }, []);

  const handleColorSelect = useCallback(async (color: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // Update chapter color in database
      const { error } = await supabase
        .from('chapters')
        .update({ color })
        .eq('id', chapter.id);

      if (error) {
        console.error('❌ Error updating chapter color:', error);
        return;
      }

      // Update local state
      setChapter({ ...chapter, color });
      console.log('✅ Chapter color updated:', color);
    } catch (error) {
      console.error('❌ Error in handleColorSelect:', error);
    }
    setShowColorPicker(false);
  }, [chapter]);

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

  const loadChapterData = async () => {
    try {
      setLoading(true);

      // Reload chapter with AI data
      const { data: chapterData, error: chapterError } = await supabase
        .from('chapters')
        .select('*')
        .eq('id', chapter.id)
        .single();

      if (!chapterError && chapterData) {
        setChapter(chapterData as Chapter);
      }

      // Load videos
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .eq('chapter_id', chapter.id)
        .order('created_at', { ascending: true });

      if (videosError) throw videosError;
      setVideos(videosData || []);

      if (videosData && videosData.length > 0) {
        const videoIds = videosData.map((v) => v.id);
        const { data: jobs, error: jobsError } = await supabase
          .from('transcription_jobs')
          .select('*')
          .in('video_id', videoIds);

        if (!jobsError && jobs) {
          const jobsMap: { [videoId: string]: TranscriptionJob } = {};
          jobs.forEach((job) => {
            jobsMap[job.video_id] = job as TranscriptionJob;
          });
          setTranscriptionJobs(jobsMap);
        }
      }
    } catch (error) {
      console.error('❌ Error loading chapter data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllChapters = async () => {
    try {
      const { data: chaptersData, error } = await supabase
        .from('chapters')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && chaptersData) {
        setAllChapters(chaptersData as Chapter[]);
      }
    } catch (error) {
      console.error('❌ Error loading chapters:', error);
    }
  };

  // 🆕 Load quotes from transcript_highlight for this chapter's videos
  const loadQuotes = async () => {
    try {
      if (videos.length === 0) {
        console.log('📝 No videos to load quotes from');
        return;
      }

      const videoIds = videos.map(v => v.id);

      // Fetch transcription jobs with highlights
      const { data: jobs, error } = await supabase
        .from('transcription_jobs')
        .select('video_id, transcript_highlight')
        .in('video_id', videoIds)
        .eq('status', 'completed');

      if (error) {
        console.error('❌ Error loading quotes:', error);
        return;
      }

      if (!jobs || jobs.length === 0) {
        console.log('📝 No transcription jobs found for quotes');
        return;
      }

      // Extract quotes from transcript_highlight.quotes
      const allQuotes: Quote[] = [];
      jobs.forEach(job => {
        if (job.transcript_highlight && typeof job.transcript_highlight === 'object') {
          const highlight = job.transcript_highlight as any;

          // Look for 'quotes' field in transcript_highlight JSON
          if (Array.isArray(highlight.quotes)) {
            highlight.quotes.forEach((quote: any) => {
              // Find video title
              const video = videos.find(v => v.id === job.video_id);

              allQuotes.push({
                text: quote.text || quote.quote || '',
                video_id: job.video_id,
                video_title: video?.title || 'Untitled Video',
                timestamp: quote.timestamp || quote.start_time || 0,
              });
            });
          }
        }
      });

      console.log(`✅ Loaded ${allQuotes.length} quotes for chapter:`, chapter.title);
      setQuotes(allQuotes);
    } catch (error) {
      console.error('❌ Error in loadQuotes:', error);
    }
  };

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

  // Convert chapter color to rgba with transparency
  const getBackgroundColor = () => {
    if (!chapter.color) return theme.colors.white;

    // Convert hex to rgba with 0.05 opacity for subtle background
    const hex = chapter.color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, 0.05)`;
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: getBackgroundColor() }]}>
        <ActivityIndicator size="large" color={theme.colors.brand.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: getBackgroundColor() }]} edges={['top']}>
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
          {/* Action buttons (Color + Edit) */}
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

            {/* Edit Icon in Liquid Glass bubble */}
            <TouchableOpacity onPress={handleEdit} activeOpacity={0.8}>
              <LiquidGlassView
                style={[
                  styles.editIconGlass,
                  !isLiquidGlassSupported && {
                    backgroundColor: theme.colors.gray100,
                  }
                ]}
                interactive={true}
              >
                <Icon name="edit" size={20} color={theme.colors.text.primary} />
              </LiquidGlassView>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Card - 4 métriques clés */}
        <View style={styles.statsSection}>
          <LiquidGlassView
            style={[
              styles.statsGlass,
              !isLiquidGlassSupported && {
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
              }
            ]}
            interactive={false}
          >
            <View style={styles.statsGrid}>
              {/* Videos */}
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.videosCount}</Text>
                <Text style={styles.statLabel}>Videos</Text>
              </View>

              {/* Duration */}
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatDuration(stats.totalDuration)}</Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>

              {/* Active Days */}
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.activeDays}</Text>
                <Text style={styles.statLabel}>Days</Text>
              </View>

              {/* Mood */}
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.averageMood}%</Text>
                <Text style={styles.statLabel}>Mood</Text>
              </View>
            </View>
          </LiquidGlassView>
        </View>

        {/* Story Section - AI-generated summary */}
        <View style={styles.storySection}>
          {/* Centered Summary Card with AI Title inside */}
          <View style={styles.storySummaryContainer}>
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
          </View>

          {/* Read Full Story button */}
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
        </View>

        {/* Insights & Lessons - Accordion expandable */}
        <View style={styles.insightsSection}>
          {/* Challenge */}
          <TouchableOpacity
            style={styles.accordionItem}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setExpandedInsight(expandedInsight === 'challenge' ? null : 'challenge');
            }}
            activeOpacity={0.8}
          >
            <View style={styles.accordionHeader}>
              <View style={styles.accordionTitleContainer}>
                <Text style={styles.accordionEmoji}>💪</Text>
                <Text style={styles.accordionTitle}>Challenge</Text>
              </View>
              <Icon
                name={expandedInsight === 'challenge' ? 'chevronDown' : 'chevronRight'}
                size={20}
                color={theme.colors.text.secondary}
              />
            </View>
            {expandedInsight === 'challenge' && (
              <View style={styles.accordionContent}>
                {chapter.challenges && chapter.challenges.length > 0 ? (
                  chapter.challenges.map((challenge, index) => (
                    <Text key={index} style={styles.accordionText}>
                      {challenge}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.accordionPlaceholder}>
                    No challenges identified yet. Generate chapter story to see AI-extracted insights.
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* Growth */}
          <TouchableOpacity
            style={styles.accordionItem}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setExpandedInsight(expandedInsight === 'growth' ? null : 'growth');
            }}
            activeOpacity={0.8}
          >
            <View style={styles.accordionHeader}>
              <View style={styles.accordionTitleContainer}>
                <Text style={styles.accordionEmoji}>🌱</Text>
                <Text style={styles.accordionTitle}>Growth</Text>
              </View>
              <Icon
                name={expandedInsight === 'growth' ? 'chevronDown' : 'chevronRight'}
                size={20}
                color={theme.colors.text.secondary}
              />
            </View>
            {expandedInsight === 'growth' && (
              <View style={styles.accordionContent}>
                {chapter.growth && chapter.growth.length > 0 ? (
                  chapter.growth.map((item, index) => (
                    <Text key={index} style={styles.accordionText}>
                      {item}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.accordionPlaceholder}>
                    No growth insights yet. Generate chapter story to see AI-extracted insights.
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* Lessons Learned */}
          <TouchableOpacity
            style={styles.accordionItem}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setExpandedInsight(expandedInsight === 'lessons' ? null : 'lessons');
            }}
            activeOpacity={0.8}
          >
            <View style={styles.accordionHeader}>
              <View style={styles.accordionTitleContainer}>
                <Text style={styles.accordionEmoji}>🎯</Text>
                <Text style={styles.accordionTitle}>Lessons Learned</Text>
              </View>
              <Icon
                name={expandedInsight === 'lessons' ? 'chevronDown' : 'chevronRight'}
                size={20}
                color={theme.colors.text.secondary}
              />
            </View>
            {expandedInsight === 'lessons' && (
              <View style={styles.accordionContent}>
                {chapter.lessons_learned && chapter.lessons_learned.length > 0 ? (
                  chapter.lessons_learned.map((lesson, index) => (
                    <Text key={index} style={styles.accordionText}>
                      {lesson}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.accordionPlaceholder}>
                    No lessons learned yet. Generate chapter story to see AI-extracted insights.
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Keywords - Scrollable horizontal avec LiquidGlass + cliquables */}
        {chapter.keywords && chapter.keywords.length > 0 && (
          <View style={styles.keywordsSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.keywordsContainer}
              style={styles.keywordsScrollView}
            >
              {chapter.keywords.map((keyword, index) => {
                const count = getKeywordCount(keyword);
                return (
                  <TouchableOpacity
                    key={`${keyword}-${index}`}
                    style={styles.keywordWrapper}
                    onPress={() => handleKeywordPress(keyword)}
                    activeOpacity={0.7}
                  >
                    <LiquidGlassView
                      style={[
                        styles.keywordPill,
                        !isLiquidGlassSupported && {
                          backgroundColor: theme.colors.gray100,
                        }
                      ]}
                      interactive={true}
                    >
                      <Text style={styles.keywordText}>
                        {keyword} <Text style={styles.keywordCount}>({count})</Text>
                      </Text>
                    </LiquidGlassView>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Memories - Horizontal scrollable list (max 5 videos) */}
        {videos.length > 0 && (
          <View style={styles.memoriesSection}>
            <View style={styles.memoriesHeader}>
              <Text style={styles.memoriesTitle}>Memories ({videos.length} videos)</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.memoriesScrollContent}
              style={styles.memoriesScrollView}
            >
              {videos.slice(0, 5).map((video, index) => {
                const thumbnailUri = getThumbnailUri(video);
                return (
                  <TouchableOpacity
                    key={video.id}
                    style={styles.memoriesVideoItem}
                    onPress={() => handleVideoThumbnailPress(index)}
                    activeOpacity={0.8}
                  >
                    {thumbnailUri ? (
                      <Image
                        source={{ uri: thumbnailUri }}
                        style={styles.memoriesVideoThumbnail}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.memoriesVideoPlaceholder}>
                        <Icon name="video" size={24} color={theme.colors.gray400} />
                      </View>
                    )}
                    {video.title && (
                      <View style={styles.memoriesVideoOverlay}>
                        <Text style={styles.memoriesVideoTitle} numberOfLines={2}>
                          {video.title}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* View Full Video card (if more than 5 videos) */}
              {videos.length > 5 && (
                <TouchableOpacity
                  style={styles.viewFullCard}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    // Navigate to Library with chapter filter and auto-open search mode
                    navigation.navigate('Library', {
                      filterChapterId: chapter.id,
                      filterChapterTitle: chapter.title,
                      openSearchWithFilter: true, // ✅ Auto-open search mode with filter
                    });
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.viewFullContent}>
                    <View style={styles.viewFullIconContainer}>
                      <Icon name="plus" size={32} color={theme.colors.text.primary} />
                    </View>
                    <Text style={styles.viewFullText}>View Full{'\n'}Video</Text>
                  </View>
                </TouchableOpacity>
              )}
            </ScrollView>
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
                      quotesCurrentPage === index && styles.quoteActiveDot,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Before/After - Première vs Dernière vidéo du chapitre */}
        {videos.length > 1 && (
          <View style={styles.beforeAfterSection}>
            <Text style={styles.beforeAfterTitle}>Journey</Text>
            <View style={styles.beforeAfterCards}>
              {/* First Day */}
              <TouchableOpacity
                style={styles.beforeAfterCard}
                onPress={() => handleVideoThumbnailPress(0)}
                activeOpacity={0.8}
              >
                {getThumbnailUri(videos[0]) ? (
                  <Image
                    source={{ uri: getThumbnailUri(videos[0]) }}
                    style={styles.beforeAfterImage}
                  />
                ) : (
                  <View style={styles.beforeAfterImagePlaceholder}>
                    <Icon name="video" size={32} color={theme.colors.gray400} />
                  </View>
                )}
                <View style={styles.beforeAfterOverlay}>
                  <Text style={styles.beforeAfterLabel}>First Day</Text>
                  <Text style={styles.beforeAfterDate}>
                    {videos[0].created_at
                      ? new Date(videos[0].created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Unknown date'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Last Day */}
              <TouchableOpacity
                style={styles.beforeAfterCard}
                onPress={() => handleVideoThumbnailPress(videos.length - 1)}
                activeOpacity={0.8}
              >
                {getThumbnailUri(videos[videos.length - 1]) ? (
                  <Image
                    source={{ uri: getThumbnailUri(videos[videos.length - 1]) }}
                    style={styles.beforeAfterImage}
                  />
                ) : (
                  <View style={styles.beforeAfterImagePlaceholder}>
                    <Icon name="video" size={32} color={theme.colors.gray400} />
                  </View>
                )}
                <View style={styles.beforeAfterOverlay}>
                  <Text style={styles.beforeAfterLabel}>Last Day</Text>
                  <Text style={styles.beforeAfterDate}>
                    {videos[videos.length - 1].created_at
                      ? new Date(videos[videos.length - 1].created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Unknown date'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Relive Chapter Button - Opens vertical feed with all chapter videos */}
        {videos.length > 0 && (
          <TouchableOpacity
            style={styles.reliveChapterButtonWrapper}
            onPress={handleReliveChapter}
            activeOpacity={0.9}
          >
            <LiquidGlassView
              style={[
                styles.reliveChapterButton,
                {
                  backgroundColor: chapter.color
                    ? `${chapter.color}30`  // 30 in hex = ~18% opacity
                    : `${theme.colors.brand.primary}30`,
                },
                !isLiquidGlassSupported && {
                  backgroundColor: chapter.color
                    ? `${chapter.color}20`  // 20 in hex = ~12% opacity for fallback
                    : `${theme.colors.brand.primary}20`,
                },
              ]}
              interactive={true}
            >
              <Text style={styles.reliveChapterText}>Relive Chapter</Text>
              <Icon name="play" size={18} color={theme.colors.text.primary} />
            </LiquidGlassView>
          </TouchableOpacity>
        )}

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
    // backgroundColor will be set dynamically based on chapter.color
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor will be set dynamically based on chapter.color
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
    gap: 8,
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
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorIconGlass: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  editIconGlass: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
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
  // Stats Section
  statsSection: {
    marginHorizontal: MARGIN,
    marginTop: 16,
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
    marginTop: 16,
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
    marginTop: 12,
    marginHorizontal: MARGIN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.gray100,
  },
  readFullStoryText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  storySummaryContainer: {
    marginHorizontal: MARGIN,
    backgroundColor: theme.colors.gray100,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  storySummaryText: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  // Keywords Section (sur le fond, en dehors de la card)
  keywordsSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  keywordsScrollView: {
    maxHeight: 50,
    paddingHorizontal: MARGIN,
  },
  keywordsContainer: {
    flexDirection: 'row',
    paddingRight: MARGIN,
  },
  keywordWrapper: {
    marginRight: 8,
  },
  keywordPill: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  keywordText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  keywordCount: {
    fontSize: 12,
    fontWeight: '400',
    color: theme.colors.text.tertiary,
  },
  // Memories Section (Horizontal Scrollable)
  memoriesSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  memoriesHeader: {
    paddingHorizontal: MARGIN,
    marginBottom: 12,
  },
  memoriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  memoriesScrollView: {
    paddingLeft: MARGIN,
  },
  memoriesScrollContent: {
    paddingRight: MARGIN,
    gap: 12,
  },
  memoriesVideoItem: {
    width: 140,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.gray100,
  },
  memoriesVideoThumbnail: {
    width: '100%',
    height: '100%',
  },
  memoriesVideoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.gray100,
  },
  memoriesVideoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    // ✅ No background - title stands out with text shadow only
  },
  memoriesVideoTitle: {
    fontSize: 11,
    fontWeight: '600', // ✅ Slightly bolder for better visibility
    color: theme.colors.white,
    // ✅ Text shadow for elevation and visibility on any background
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  viewFullCard: {
    width: 140,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewFullContent: {
    alignItems: 'center',
    gap: 12,
  },
  viewFullIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  viewFullText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.primary,
    textAlign: 'center',
    lineHeight: 18,
  },
  // Insights & Lessons Section (Accordion)
  insightsSection: {
    marginHorizontal: MARGIN,
    marginTop: 24,
    marginBottom: 16,
    gap: 12,
  },
  accordionItem: {
    borderRadius: 12,
    backgroundColor: theme.colors.white,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  accordionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accordionEmoji: {
    fontSize: 20,
  },
  accordionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  accordionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  accordionText: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.text.secondary,
    marginBottom: 8, // Spacing between multiple items
  },
  accordionPlaceholder: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.text.tertiary,
    fontStyle: 'italic',
  },
  // Before/After Section
  beforeAfterSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  beforeAfterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginHorizontal: MARGIN,
    marginBottom: 12,
  },
  beforeAfterCards: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: MARGIN,
  },
  beforeAfterCard: {
    flex: 1,
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.gray100,
  },
  beforeAfterImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  beforeAfterImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.gray100,
  },
  beforeAfterOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  beforeAfterLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.white,
    marginBottom: 4,
  },
  beforeAfterDate: {
    fontSize: 12,
    fontWeight: '400',
    color: theme.colors.white,
    opacity: 0.9,
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
    backgroundColor: theme.colors.brand.primary,
    shadowColor: theme.colors.brand.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  // Relive Chapter Button
  reliveChapterButtonWrapper: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 16,
  },
  reliveChapterButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  reliveChapterText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    letterSpacing: 0.2,
  },
});
