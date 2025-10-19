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
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Image,
  Modal,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../styles';
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
import { Icon } from '../components/Icon';

const { width } = Dimensions.get('window');

interface MomentumDashboardScreenProps {
  navigation: any;
}

export default function MomentumDashboardScreen({ navigation }: MomentumDashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<MomentumStats | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  // const [showChaptersModal, setShowChaptersModal] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

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
        <ActivityIndicator size="large" color={theme.colors.brand.primary} />
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

        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0)' }} />

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
        <LiquidGlassView
          style={[
            styles.streakGlassContainer,
            !isLiquidGlassSupported && {
              backgroundColor: theme.colors.gray100,
            }
          ]}
          interactive={false}
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
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No chapters yet. Start your first chapter!</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => navigation.navigate('ChapterSetup')}
              >
                <Text style={styles.createButtonText}>Create Chapter</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Current Chapter Section */}
              {filteredChapters.some(c => c.is_current) && (
                <>
                  <Text style={styles.sectionTitle}>Current Chapter</Text>
                  {filteredChapters
                    .filter(chapter => chapter.is_current)
                    .map((chapter) => (
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
                        isCurrent={true}
                        onPress={() => navigation.navigate('ChapterDetail', { chapter })}
                      />
                    ))}
                </>
              )}

              {/* Old Chapters Section with Manage button */}
              {filteredChapters.some(c => !c.is_current) && (
                <>
                  <View style={styles.oldChaptersHeader}>
                    <Text style={styles.sectionTitle}>Old Chapters</Text>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        navigation.navigate('ChapterManagement');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.manageButton}>Manage</Text>
                    </TouchableOpacity>
                  </View>
                  {filteredChapters
                    .filter(chapter => !chapter.is_current)
                    .map((chapter) => (
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
                        isCurrent={false}
                        onPress={() => navigation.navigate('ChapterDetail', { chapter })}
                      />
                    ))}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
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
  /*
  ========================================
  SAVED FOR FUTURE USE - Chapter/Edit button styles
  ========================================
  title: {
    fontFamily: 'Poppins-SemiBoldItalic',
    fontSize: 16,
    fontWeight: '600',
    fontStyle: 'italic',
    letterSpacing: -0.48,
    color: theme.colors.text.primary,
    overflow: 'hidden',
  },
  chaptersGlassContainer: {
    borderRadius: 18,
    overflow: 'hidden',
    height: 36,
  },
  chaptersGlassContainerSelected: {
    backgroundColor: 'rgba(155, 102, 255, 0.2)',
  },
  chaptersTextContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  titleSelected: {
    color: theme.colors.brand.primary,
  },
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
  // Old Chapters Header (with inline Manage button)
  oldChaptersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing['4'],
    marginBottom: theme.spacing['3'],
  },
  manageButton: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.brand.primary,
  },
  // Section titles
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginTop: theme.spacing['4'],
    marginBottom: theme.spacing['3'],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
});
