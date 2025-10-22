// ============================================================================
// Momentum Dashboard Screen
// Description: Écran principal affichant le score et les chapitres
// ============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Image,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Share,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../styles';
import { useTheme } from '../contexts/ThemeContext';
import {
  MomentumStats,
  MomentumChartData,
  LifeArea,
  MomentumLevel,
} from '../types/momentum';
import {
  getUserMomentum,
  getMomentumStats,
  getScoreHistory,
  getMomentumLevel,
} from '../services/momentumService';
import { getActiveLifeAreas } from '../services/lifeAreasService';
import { supabase, Chapter, VideoRecord } from '../lib/supabase';
import { VideoService } from '../services/videoService';
import {
  getCurrentChapter,
  getUserChapters,
  formatDuration,
  formatChapterPeriod,
} from '../services/chapterService';
import { ChapterCard } from '../components/ChapterCard';
import { LoadingDots } from '../components/LoadingDots';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { getRandomChapterColor } from '../constants/chapterColors';

const { width } = Dimensions.get('window');

interface MomentumDashboardScreenProps {
  navigation: any;
}

export default function MomentumDashboardScreen({ navigation }: MomentumDashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const { colorMode, loadCurrentChapterColor, brandColor } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<MomentumStats | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  // const [showChaptersModal, setShowChaptersModal] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [showStreakModal, setShowStreakModal] = useState(false);

  // Calculate header height for content inset (same as LibraryScreen)
  // Header height = safe area top + icon height (44px) + padding (12px top + 12px bottom for spacing)
  const headerHeight = insets.top + 68;

  /*
  ========================================
  SAVED FOR FUTURE USE - Modal animations
  ========================================
  const modalScale = useRef(new Animated.Value(0.95)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  */

  // Charger les données au montage et au focus
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  // Calculate current streak
  const calculateStreak = useCallback((videoList: VideoRecord[]): number => {
    if (!videoList || videoList.length === 0) return 0;

    // Get today's date at midnight (for consistent comparison)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Group videos by date (YYYY-MM-DD)
    const videosByDate = new Map<string, VideoRecord[]>();
    videoList.forEach(video => {
      if (video.created_at) {
        const date = new Date(video.created_at);
        date.setHours(0, 0, 0, 0);
        const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
        if (!videosByDate.has(dateKey)) {
          videosByDate.set(dateKey, []);
        }
        videosByDate.get(dateKey)!.push(video);
      }
    });

    // Calculate streak starting from today
    let streak = 0;
    let currentDate = new Date(today);

    while (true) {
      const dateKey = currentDate.toISOString().split('T')[0];

      // Check if there's at least one video on this date
      if (videosByDate.has(dateKey)) {
        streak++;
        // Move to previous day
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        // Streak broken
        break;
      }
    }

    return streak;
  }, []);

  // Get current month days for streak calendar
  const getCurrentMonthDays = useMemo(() => {
    if (videos.length === 0) {
      return [];
    }

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Pre-calculate video dates Set once
    const videoDates = new Set<number>();
    videos.forEach(video => {
      if (video.created_at) {
        const date = new Date(video.created_at);
        if (date.getFullYear() === year && date.getMonth() === month) {
          videoDates.add(date.getDate());
        }
      }
    });

    // Build days array
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return {
        day,
        hasVideo: videoDates.has(day),
        isToday: day === today.getDate(),
      };
    });
  }, [videos]);

  // Removed emoji-based streak messages for cleaner UI

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: 'Check out this amazing app! 🎬',
      });
    } catch (error) {
      console.error('Error sharing app:', error);
    }
  };

  const handleLeaveReview = async () => {
    try {
      const appStoreId = 'YOUR_APP_ID';
      const url = `https://apps.apple.com/app/id${appStoreId}?action=write-review`;

      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Unable to open App Store');
      }
    } catch (error) {
      console.error('Error opening App Store:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Récupérer l'utilisateur
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('❌ No authenticated user');
        return;
      }

      // Charger en parallèle (y compris le profil pour l'avatar)
      const [statsData, chaptersData, videosData, profileData] = await Promise.all([
        getMomentumStats(user.id),
        getUserChapters(user.id),
        VideoService.getAllVideos(),
        supabase.from('profiles').select('avatar_url').eq('id', user.id).single(),
      ]);

      setStats(statsData);
      setChapters(chaptersData);
      setVideos(videosData);

      // Set avatar URL
      if (profileData.data?.avatar_url) {
        setAvatarUrl(profileData.data.avatar_url);
      }
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleColorChange = async (chapterId: string, color: string) => {
    try {
      // 🔒 Get current user for security check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ No authenticated user for updating chapter color');
        return;
      }

      // Check if this is the current chapter
      const isCurrentChapter = chapters.find(ch => ch.id === chapterId)?.is_current;

      // 🔒 SECURITY: Update with user_id verification
      const { error } = await supabase
        .from('chapters')
        .update({ color })
        .eq('id', chapterId)
        .eq('user_id', user.id); // ← PROTECTION CRITIQUE

      if (error) {
        console.error('❌ Error updating chapter color:', error);
        return;
      }

      // Update local state
      setChapters((prevChapters) =>
        prevChapters.map((chapter) =>
          chapter.id === chapterId ? { ...chapter, color } : chapter
        )
      );

      // If this is the current chapter and color mode is auto, reload the theme color
      if (isCurrentChapter && colorMode === 'auto') {
        await loadCurrentChapterColor();
        console.log('✅ Theme color updated to match current chapter:', color);
      }

      console.log('✅ Chapter color updated:', color);
    } catch (error) {
      console.error('❌ Error in handleColorChange:', error);
    }
  };

  // Memoize streak calculation (expensive operation)
  const currentStreak = useMemo(() => {
    return calculateStreak(videos);
  }, [videos, calculateStreak]);

  // Format today's date in full text format (e.g., "Jeudi 16 Octobre")
  const getTodayDate = () => {
    const today = new Date();
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

    const dayName = days[today.getDay()];
    const dayNumber = today.getDate();
    const monthName = months[today.getMonth()];

    return `${dayName} ${dayNumber} ${monthName}`;
  };

  /*
  ========================================
  SAVED FOR FUTURE USE - Modal handlers
  ========================================
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

  const handleSelectChapter = useCallback((chapterId: string | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedChapterId(chapterId);
    handleCloseModal();
  }, [handleCloseModal]);
  */

  // Filter and sort chapters: current chapter first, then others by date
  const filteredChapters = chapters
    .filter((chapter) => {
      // Apply chapter filter if one is selected
      if (selectedChapterId && chapter.id !== selectedChapterId) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Current chapter always first
      if (a.is_current && !b.is_current) return -1;
      if (!a.is_current && b.is_current) return 1;

      // Otherwise sort by started_at (newest first)
      return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
    });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingDots color={brandColor} />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Impossible de charger vos données</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadDashboardData}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing['3'] }]}>
        {/* Profile Avatar - opens Settings on tap */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.navigate('Library', { screen: 'Settings' });
          }}
          activeOpacity={0.7}
        >
          <LiquidGlassView
            style={[
              styles.avatarGlassContainer,
              !isLiquidGlassSupported && {
                backgroundColor: theme.colors.gray100,
              }
            ]}
            interactive={true}
          >
            <View style={styles.avatarContainer}>
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Icon name="user" size={18} color={theme.colors.text.primary} />
              )}
            </View>
          </LiquidGlassView>
        </TouchableOpacity>

        {/* Chapters Logo - centered */}
        <View style={styles.centerLogoContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.chaptersGlassContainer}
          >
            <LiquidGlassView
              style={[
                styles.chaptersGlassInner,
                !isLiquidGlassSupported && {
                  backgroundColor: theme.colors.gray100,
                }
              ]}
              interactive={true}
            >
              <View style={styles.chaptersTextContainer}>
                <Text style={styles.chaptersTitle}>Chapters</Text>
              </View>
            </LiquidGlassView>
          </TouchableOpacity>
        </View>

        {/*
        ========================================
        SAVED FOR FUTURE USE - Edit button
        ========================================
        <TouchableOpacity onPress={() => console.log('📝 Edit chapters')} activeOpacity={0.7}>
          <LiquidGlassView
            style={[
              styles.editGlassContainer,
              !isLiquidGlassSupported && {
                backgroundColor: theme.colors.gray100,
              }
            ]}
            interactive={true}
          >
            <View style={styles.editContainer}>
              <Icon name="edit" size={18} color={theme.colors.text.primary} />
            </View>
          </LiquidGlassView>
        </TouchableOpacity>
        */}

        {/* Streak button with fire icon */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowStreakModal(true);
          }}
          activeOpacity={0.7}
        >
          <LiquidGlassView
            style={[
              styles.streakGlassContainer,
              !isLiquidGlassSupported && {
                backgroundColor: theme.colors.gray100,
              }
            ]}
            interactive={true}
          >
            <View style={styles.streakContainer}>
              <Image
                source={require('../../assets/ui-elements/fire.png')}
                style={styles.fireIcon}
                resizeMode="contain"
              />
              <Text style={styles.streakText}>
                {currentStreak}
              </Text>
            </View>
          </LiquidGlassView>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Section: Chapters */}
        <View style={styles.chaptersSection}>
          {/* Chapter Cards */}
          {filteredChapters.length === 0 ? (
            <EmptyState
              icon="📖"
              title="Begin Your Journey"
              description="Chapters help you organize your life into meaningful periods. Create your first chapter to start tracking your personal evolution."
              buttonText="Create Chapter"
              onButtonPress={() => navigation.navigate('ChapterSetup')}
              buttonColor={brandColor}
            />
          ) : (
            <>
              {/* All Chapters - Current first (larger), then old chapters */}
              {filteredChapters.map((chapter, index) => (
                <ChapterCard
                  key={chapter.id}
                  title={chapter.title}
                  period={formatChapterPeriod(chapter.started_at, chapter.ended_at)}
                  count={chapter.video_count || 0}
                  progress={
                    chapter.video_count && chapter.video_count > 0
                      ? Math.min((chapter.video_count / 30) * 100, 100)
                      : 0
                  }
                  isCurrent={chapter.is_current}
                  color={chapter.color}
                  keywords={!chapter.is_current ? chapter.keywords : null}
                  aiShortSummary={chapter.ai_short_summary}
                  chapterNumber={filteredChapters.length - index}
                  onPress={() => navigation.navigate('ChapterDetail', { chapter })}
                  onColorChange={(color) => handleColorChange(chapter.id!, color)}
                />
              ))}
            </>
          )}
        </View>
      </ScrollView>

      {/* Streak Modal */}
      <Modal
        visible={showStreakModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStreakModal(false)}
      >
        <View style={styles.streakModalOverlay}>
          {/* Background overlay - closes modal when tapped */}
          <TouchableWithoutFeedback onPress={() => setShowStreakModal(false)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

          {/* Modal content with Liquid Glass */}
          <LiquidGlassView
            style={[
              styles.streakModalGlass,
              !isLiquidGlassSupported && {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
              }
            ]}
            interactive={false}
          >
            <View style={styles.streakModalContent}>
              {/* Close button - simple X in top right */}
              <TouchableOpacity
                onPress={() => setShowStreakModal(false)}
                style={styles.streakModalCloseButton}
              >
                <Icon name="x" size={20} color={theme.colors.gray400} />
              </TouchableOpacity>

              {/* Streak count - large romanesque number */}
              <Text style={[styles.streakCountText, { color: brandColor }]}>
                {currentStreak}
              </Text>

              {/* "Day Streak" label */}
              <Text style={styles.streakDaysLabel}>
                {currentStreak === 1 ? 'Day Streak' : 'Day Streak'}
              </Text>

              {/* Month label */}
              <Text style={styles.streakMonthLabel}>
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>

              {/* Days timeline with Liquid Glass container */}
              <LiquidGlassView
                style={[
                  styles.streakDaysGlassContainer,
                  !isLiquidGlassSupported && {
                    backgroundColor: 'rgba(0, 0, 0, 0.03)',
                  }
                ]}
                interactive={false}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.streakDaysContainer}
                  style={styles.streakDaysScrollView}
                >
                  {getCurrentMonthDays.map((dayData) => (
                    <View key={dayData.day} style={styles.streakDayItem}>
                      <View
                        style={[
                          styles.streakDayCircle,
                          dayData.hasVideo && [styles.streakDayActive, { backgroundColor: brandColor }],
                          dayData.isToday && [styles.streakDayToday, { borderColor: brandColor }],
                        ]}
                      >
                        <Text
                          style={[
                            styles.streakDayText,
                            dayData.hasVideo && styles.streakDayTextActive,
                            dayData.isToday && [styles.streakDayTextToday, { color: brandColor }],
                          ]}
                        >
                          {dayData.day}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </LiquidGlassView>

              {/* Action Buttons */}
              <View style={styles.streakActionsContainer}>
                <TouchableOpacity
                  style={styles.reviewButton}
                  onPress={handleLeaveReview}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reviewButtonText}>Leave a review</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.shareButton, { backgroundColor: brandColor }]}
                  onPress={handleShareApp}
                  activeOpacity={0.7}
                >
                  <Text style={styles.shareButtonText}>Share the app</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LiquidGlassView>
        </View>
      </Modal>
    </View>
  );
}

// ============================================================================
// HELPERS - Removed MomentumScoreCard as per user request
// ============================================================================

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0)', // Transparent like Library
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: theme.colors.white,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors.brand.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing['4'],
    backgroundColor: 'rgba(0,0,0,0)',
    zIndex: 100,
  },
  // Avatar button (match LibraryScreen: 44x44)
  avatarGlassContainer: {
    borderRadius: 22,
    overflow: 'hidden',
    width: 44,
    height: 44,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4, // 4px padding for breathing room
  },
  avatarImage: {
    width: 36, // 44 - 8 (4px padding each side)
    height: 36,
    borderRadius: 18,
  },
  // Chapters Logo - centered
  centerLogoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chaptersGlassContainer: {
    borderRadius: 22,
    overflow: 'hidden',
    height: 44, // Match search bar height from Library
  },
  chaptersGlassInner: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  chaptersTextContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  chaptersTitle: {
    fontFamily: 'Poppins-SemiBoldItalic',
    fontSize: 16,
    fontWeight: '600',
    fontStyle: 'italic',
    letterSpacing: -0.48,
    color: theme.colors.text.primary,
  },
  /*
  ========================================
  SAVED FOR FUTURE USE - Edit button styles
  ========================================
  editGlassContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    height: 36,
  },
  editContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: '100%',
  },
  */
  streakGlassContainer: {
    borderRadius: 22,
    overflow: 'hidden',
    height: 44, // Match LibraryScreen icon height
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // ✅ Center content horizontally
    gap: 4,
    paddingHorizontal: 8,
    height: '100%', // ✅ Take full height for proper vertical centering
  },
  fireIcon: {
    width: 20,
    height: 20,
  },
  streakText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20, // Match icon height for better vertical alignment
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
    // paddingTop applied dynamically via headerHeight
  },
  // Chapters Section
  chaptersSection: {
    paddingHorizontal: theme.spacing['4'],
    paddingTop: theme.spacing['4'], // Top padding for first section
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing['10'],
  },
  emptyStateText: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing['4'],
  },
  createButton: {
    paddingHorizontal: theme.spacing['6'],
    paddingVertical: theme.spacing['3'],
    backgroundColor: theme.colors.brand.primary,
    borderRadius: 12,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },
  /*
  ========================================
  SAVED FOR FUTURE USE - Chapters Modal styles
  ========================================
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
  */
  // Streak Modal
  streakModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing['4'],
  },
  streakModalGlass: {
    borderRadius: 32,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  streakModalContent: {
    padding: theme.spacing['5'],
    alignItems: 'center',
  },
  streakModalCloseButton: {
    position: 'absolute',
    top: theme.spacing['3'],
    right: theme.spacing['3'],
    padding: theme.spacing['2'],
    zIndex: 10,
  },
  streakCountText: {
    fontSize: 96,
    fontWeight: '400',
    fontFamily: 'Georgia', // Romanesque/serif font
    textAlign: 'center',
    marginTop: theme.spacing['2'],
    lineHeight: 90, // Reduced for tighter spacing
  },
  streakDaysLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: -4, // Negative margin to bring it closer
    marginBottom: theme.spacing['3'],
  },
  streakMonthLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing['2'],
    letterSpacing: -0.3,
  },
  streakDaysGlassContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: theme.spacing['3'],
    width: '100%',
  },
  streakDaysScrollView: {
    flexGrow: 0,
  },
  streakDaysContainer: {
    paddingHorizontal: theme.spacing['3'],
    paddingVertical: theme.spacing['2'],
    flexDirection: 'row',
  },
  streakDayItem: {
    alignItems: 'center',
    marginHorizontal: theme.spacing['1'],
  },
  streakDayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakDayActive: {
    // backgroundColor set dynamically with brandColor
  },
  streakDayToday: {
    borderWidth: 2,
    backgroundColor: 'transparent',
    // borderColor set dynamically with brandColor
  },
  streakDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  streakDayTextActive: {
    color: theme.colors.white,
  },
  streakDayTextToday: {
    // color set dynamically with brandColor
  },
  streakActionsContainer: {
    flexDirection: 'row',
    gap: theme.spacing['3'],
    width: '100%',
  },
  reviewButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: theme.spacing['4'],
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  reviewButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  shareButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: theme.spacing['4'],
    // backgroundColor set dynamically with brandColor
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.white,
    textAlign: 'center',
  },
});
