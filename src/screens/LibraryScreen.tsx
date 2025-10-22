import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  FlatList,
  Dimensions,
  TouchableWithoutFeedback,
  Alert,
  Animated,
  Modal,
  Share,
  Linking,
  InteractionManager,
  Keyboard,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { theme } from '../styles';
import { useTheme } from '../hooks/useTheme';
import { TopBar } from '../components/TopBar';
import { Icon } from '../components/Icon';
import { LoadingDots } from '../components/LoadingDots';
import { VideoPlayer } from '../components/VideoPlayer';
import { VideoRecord } from '../lib/supabase';
import { VideoService } from '../services/videoService';
import { VideoCacheService } from '../services/videoCacheService';
import { ImportQueueService, ImportQueueState } from '../services/importQueueService';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { GlassButton, GlassContainer } from './OptimizedGlassComponents';
import { getUserChapters, getCurrentChapter, Chapter } from '../services/chapterService';
import { useTheme as useThemeContext } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
// ✅ Phase 3.3 - Refactored UI components
import {
  LibraryChapterModal,
  LibraryCalendarView,
  LibraryGridView,
  LibrarySearchResults,
} from './Library/components';
// ✅ Phase 3.3 - Extracted hooks
import {
  useStreak,
  useLibraryAnimations,
  useLibrarySearch,
  useLibraryData,
} from './Library/hooks';

const { width: screenWidth } = Dimensions.get('window');
const GRID_PADDING = 4;
const GRID_GAP = 1;
const THUMBNAIL_WIDTH = (screenWidth - (GRID_PADDING * 2) - (GRID_GAP * 4)) / 5; // 5 columns with gaps
const THUMBNAIL_HEIGHT = THUMBNAIL_WIDTH * 1.33; // Vertical aspect ratio (4:3)

const VIDEOS_PER_PAGE = 50;

// Life areas for filtering
const LIFE_AREAS = [
  'Health', 'Family', 'Friends', 'Love', 'Work',
  'Business', 'Money', 'Growth', 'Leisure', 'Home',
  'Spirituality', 'Community'
];

const LibraryScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const theme = useTheme();
  const insets = useSafeAreaInsets(); // ✅ Get safe area insets manually
  const { brandColor } = useThemeContext(); // ✅ Get user's selected color (auto or custom)

  // ✅ Phase 3.3 - Replace useReducer with custom hooks
  const libraryData = useLibraryData();
  const libraryAnimations = useLibraryAnimations(libraryData.viewMode);
  const librarySearch = useLibrarySearch(libraryAnimations.searchBarProgress);
  const streakData = useStreak(libraryData.videos);

  // Extract functions and state from hooks for direct use
  const { fetchVideos, handleLoadMore, selectedChapterId, setSelectedChapterId, chapters, currentChapter } = libraryData;
  const { performSearch, handleSearchPress, handleCloseSearch, toggleSearchBar, handleCollapseSearchBar, handleLifeAreaPress } = librarySearch;
  const { currentStreak, getStreakMessage, getCurrentMonthDays } = streakData;

  // 🚀 OPTIMIZATION: Track loading phases for progressive rendering
  const [loadingPhase, setLoadingPhase] = useState<'skeleton' | 'cache' | 'complete'>('skeleton');

  // Track keyboard visibility
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Modal states
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);

  // ✅ Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);

  // ✅ Calculate header height for content inset
  // Different padding for calendar vs grid view
  const headerHeightCalendar = insets.top + 72; // More spacing for calendar view
  const headerHeightGrid = insets.top + 60; // Less spacing for grid view (photos closer to top bar)

  // Extract animations for backward compatibility
  const { searchBarProgress, calendarIconScale, gridIconScale, toggleSelectorPosition, scrollY, headerOpacity } = libraryAnimations;
  const { modalScale, modalOpacity, filterButtonScale, chapterScrollY, chapterTitleSlide, chapterTitleOpacity } = libraryAnimations;

  // Extract search ref
  const { lifeAreaScrollViewRef } = librarySearch;

  // ✅ FIX: Stable date ref to avoid recalculations every minute
  const currentDateRef = useRef(new Date());

  // Create infinite scroll array (3x duplication for smooth looping)
  const infiniteLifeAreas = useMemo(() => {
    return [...LIFE_AREAS, ...LIFE_AREAS, ...LIFE_AREAS];
  }, []);

  // Initialize toggle selector position on mount
  useEffect(() => {
    const initialPosition = libraryData.viewMode === 'calendar' ? 0 : 1;
    toggleSelectorPosition.setValue(initialPosition);
  }, []);

  // Listen for keyboard events
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Handle navigation params (filter by chapter if coming from ChapterDetailScreen)
  useEffect(() => {
    const params = route.params as any;
    if (params?.filterChapterId) {
      console.log('📚 Navigation params received:', {
        filterChapterId: params.filterChapterId,
        filterChapterTitle: params.filterChapterTitle,
        openSearchWithFilter: params.openSearchWithFilter,
      });

      // Apply chapter filter
      libraryData.setSelectedChapterId(params.filterChapterId);
      console.log('✅ Chapter filter applied:', params.filterChapterTitle || params.filterChapterId);

      // ✅ Just apply the filter - don't open full search mode
      // The videos will be filtered by filteredVideos useMemo
      if (params?.openSearchWithFilter) {
        console.log('🎯 Filter active - videos will be filtered by chapter');

        // Switch to grid view (better for filtered lists)
        libraryData.setViewMode('grid');
        console.log('📱 Switched to grid view for filtered results');

        // Haptic feedback to confirm filter applied
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  }, [route.params]);

  // Animate toggle icons and selector based on active state
  // ✅ FIX: Skip animation on first render to avoid blocking scroll at mount
  const isFirstRender = useRef(true);

  useEffect(() => {
    const targetCalendarScale = libraryData.viewMode === 'calendar' ? 1 : 0.9;
    const targetGridScale = libraryData.viewMode === 'grid' ? 1 : 0.9;
    const targetSelectorPosition = libraryData.viewMode === 'calendar' ? 0 : 1;

    if (isFirstRender.current) {
      // ✅ First render: Set values immediately without animation (prevents 300ms freeze)
      calendarIconScale.setValue(targetCalendarScale);
      gridIconScale.setValue(targetGridScale);
      toggleSelectorPosition.setValue(targetSelectorPosition);
      isFirstRender.current = false;
    } else {
      // ✅ Subsequent changes: Animate normally (smooth UX)
      Animated.parallel([
        Animated.spring(calendarIconScale, {
          toValue: targetCalendarScale,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }),
        Animated.spring(gridIconScale, {
          toValue: targetGridScale,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }),
        Animated.spring(toggleSelectorPosition, {
          toValue: targetSelectorPosition,
          useNativeDriver: false, // We need layout animations for the selector
          friction: 10,
          tension: 80,
        }),
      ]).start();
    }
  }, [libraryData.viewMode, calendarIconScale, gridIconScale, toggleSelectorPosition]);

  // Create placeholder videos for videos being uploaded
  const createUploadingPlaceholders = useCallback((queueState: ImportQueueState | null): VideoRecord[] => {
    if (!queueState || queueState.items.length === 0) return [];

    return queueState.items
      .filter(item => item.status === 'pending' || item.status === 'uploading')
      .map(item => {
        // ✅ Use original creation date from video metadata
        let createdAt = new Date().toISOString();

        if (item.asset?.creationTime) {
          createdAt = new Date(item.asset.creationTime).toISOString();
        } else if (item.pickerAsset?.timestamp) {
          createdAt = new Date(item.pickerAsset.timestamp).toISOString();
        }

        return {
          id: item.id,
          title: item.title || 'Uploading...',
          file_path: item.uri,
          thumbnail_path: item.uri, // Use video URI as thumbnail temporarily
          duration: item.pickerAsset?.duration || item.asset?.duration || 0,
          user_id: '',
          created_at: createdAt, // ✅ Use original date, not current date
          // Mark as uploading for UI
          metadata: { isUploading: true, progress: item.progress },
        } as VideoRecord;
      });
  }, []);

  // ✅ fetchVideos now comes from useLibraryData hook

  // ✅ calculateStreakOptimized now in useStreak hook

  // ✅ Video loading on mount now handled in useLibraryData hook

  // ✅ handleLoadMore now comes from useLibraryData hook

  // ✅ currentStreak now comes from useStreak hook (no need to recalculate)
  // ✅ ImportQueue subscription now handled in useLibraryData hook
  // ✅ Video fetching now handled in useLibraryData hook

  // ✅ Memoize combined videos
  const allVideos = useMemo(() => {
    const uploadingPlaceholders = createUploadingPlaceholders(libraryData.importState.queueState);
    // Put uploading videos first (most recent)
    return [...uploadingPlaceholders, ...libraryData.videos];
  }, [libraryData.videos, libraryData.importState.queueState, createUploadingPlaceholders]);

  // ✅ Filter videos by selected chapter
  const filteredVideos = useMemo(() => {
    if (!selectedChapterId) {
      console.log('📹 No chapter filter - showing all', allVideos.length, 'videos');
      return allVideos; // No filter - show all videos
    }

    // Filter videos that belong to the selected chapter
    const filtered = allVideos.filter(video => video.chapter_id === selectedChapterId);

    console.log('🔍 Filtering videos by chapter:', {
      selectedChapterId,
      totalVideos: allVideos.length,
      filteredCount: filtered.length,
      sampleVideoChapterIds: allVideos.slice(0, 3).map(v => ({ id: v.id, chapter_id: v.chapter_id })),
    });

    return filtered;
  }, [allVideos, selectedChapterId]);

  // Handler for CALENDAR view - Opens VideoPlayer with all videos from the day
  const handleCalendarVideoPress = useCallback((
    video: VideoRecord,
    allVideosFromDay?: VideoRecord[],
    index: number = 0
  ) => {
    console.log('📅 Calendar video selected:', {
      date: video.created_at,
      totalVideos: allVideosFromDay?.length || 1,
      initialIndex: index,
    });

    // Open VideoPlayer with all videos from that day (vertical scroll)
    const videosToShow = allVideosFromDay || [video];

    libraryData.setVideoPlayer({
      isOpen: true,
      selectedVideo: video,
      videos: videosToShow,
      initialIndex: index,
    });
  }, []);

  // Handler for GRID view - Opens VideoPlayer directly
  const handleGridVideoPress = useCallback((
    video: VideoRecord,
    allVideosFromDay?: VideoRecord[],
    index: number = 0
  ) => {
    console.log('🎬 Grid video selected:', {
      title: video.title,
      date: video.created_at,
      totalVideos: allVideosFromDay?.length || 1,
    });

    // Open VideoPlayer directly with selected video
    const videosToPlay = allVideosFromDay || [video];
    libraryData.setVideoPlayer({
      isOpen: true,
      selectedVideo: video,
      videos: videosToPlay,
      initialIndex: index,
    });
  }, []);

  const handleCloseVideoPlayer = useCallback(() => {
    libraryData.setVideoPlayer({ isOpen: false });
  }, []);

  /**
   * ✅ Pull-to-refresh handler
   * Reloads videos from Supabase when user swipes down
   */
  const handleRefresh = useCallback(async () => {
    console.log('🔄 Pull-to-refresh triggered');
    setRefreshing(true);
    try {
      await fetchVideos(0, false); // Reload from page 0
    } finally {
      setRefreshing(false);
    }
  }, [fetchVideos]);

  /**
   * Open Vertical Feed Mode (TikTok-style)
   * Uses current filtered/sorted videos
   */
  const handleOpenVerticalFeed = useCallback((startIndex: number = 0) => {
    console.log('🎬 Opening Vertical Feed at index:', startIndex);

    // ✅ OPTION 1: No filtering needed - VideoService already filters at source
    // Use filtered videos (respect current search/filters)
    const videosToShow = librarySearch.showSearch && librarySearch.results.length > 0
      ? librarySearch.results
      : libraryData.videos;

    if (videosToShow.length === 0) {
      console.warn('⚠️ No videos to show in Vertical Feed');
      return;
    }

    // Navigate to VerticalFeed screen
    navigation.navigate('VerticalFeed' as never, {
      videos: videosToShow,
      initialIndex: Math.max(0, Math.min(startIndex, videosToShow.length - 1)),
      sourceScreen: 'library',
      preserveState: {
        scrollPosition: 0, // TODO: Get actual scroll position
        filters: undefined,
        searchQuery: librarySearch.query,
      },
    } as never);
  }, [navigation, libraryData.videos, librarySearch.showSearch, librarySearch.results, librarySearch.query, undefined]);

  const handleNavigateToSettings = () => {
    // Navigate to the Settings tab
    navigation.navigate('Settings' as never);
  };

  // 🎡 CHAPTER SWIPE NAVIGATION (Wheel effect)
  // Sort chapters chronologically
  const sortedChapters = useMemo(() => {
    const allChapters = [
      { id: null, title: 'Chapters', started_at: new Date(0).toISOString() }, // "All Chapters" at the beginning
      ...chapters.sort((a, b) =>
        new Date(a.started_at || 0).getTime() - new Date(b.started_at || 0).getTime()
      )
    ];
    return allChapters;
  }, [chapters]);

  // Navigate to next/previous chapter with animation
  const navigateToChapter = useCallback((direction: 'up' | 'down') => {
    try {
      // Safety checks
      if (!sortedChapters || sortedChapters.length === 0) {
        console.warn('⚠️ No chapters available for navigation');
        return;
      }

      if (sortedChapters.length === 1) {
        console.log('ℹ️ Only one chapter, skipping navigation');
        return;
      }

      const currentIndex = sortedChapters.findIndex(ch => ch.id === selectedChapterId);

      // If current chapter not found, default to first chapter
      if (currentIndex === -1) {
        console.warn('⚠️ Current chapter not found, defaulting to first');
        const firstChapter = sortedChapters[0];
        if (firstChapter) {
          setSelectedChapterId(firstChapter.id ?? null);
        }
        return;
      }

      let newIndex: number;

      if (direction === 'up') {
        // Swipe up = previous chapter
        newIndex = currentIndex > 0 ? currentIndex - 1 : sortedChapters.length - 1;
      } else {
        // Swipe down = next chapter
        newIndex = currentIndex < sortedChapters.length - 1 ? currentIndex + 1 : 0;
      }

      const newChapter = sortedChapters[newIndex];

      // Safety check for new chapter
      if (!newChapter) {
        console.warn('⚠️ New chapter not found at index:', newIndex);
        return;
      }

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(err => {
        console.warn('⚠️ Haptic feedback failed:', err);
      });

      // Animate title change (slide effect)
      const slideDirection = direction === 'up' ? -1 : 1;

      Animated.sequence([
        Animated.parallel([
          Animated.timing(chapterTitleSlide, {
            toValue: slideDirection * 20,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(chapterTitleOpacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(chapterTitleSlide, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(chapterTitleOpacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
      ]).start();

      // Update selected chapter (without closing modal)
      setSelectedChapterId(newChapter.id ?? null);
    } catch (error) {
      console.error('❌ Error in navigateToChapter:', error instanceof Error ? error.message : JSON.stringify(error));
    }
  }, [sortedChapters, selectedChapterId, chapterTitleSlide, chapterTitleOpacity]);

  // Gesture handler for chapter button swipe
  const chapterSwipeGesture = useMemo(() => {
    return Gesture.Pan()
      .activeOffsetY([-15, 15])
      .failOffsetX([-30, 30])
      .runOnJS(true) // 🔑 Run all callbacks on JS thread - no need for individual runOnJS() calls
      .onEnd((event) => {
        if (!event) return;

        const velocityY = event.velocityY ?? 0;
        const translationY = event.translationY ?? 0;
        const translationX = event.translationX ?? 0;

        const isVerticalMovement = Math.abs(translationY) > Math.abs(translationX) * 1.5;

        if (isVerticalMovement && (Math.abs(translationY) > 25 || Math.abs(velocityY) > 600)) {
          if (translationY < 0) {
            navigateToChapter('up');
          } else {
            navigateToChapter('down');
          }
        }
      })
      .enabled(sortedChapters.length > 1);
  }, [navigateToChapter, sortedChapters.length]);

  // 🚀 OPTIMIZATION: Memoize month days calculation - only recalculate when needed
  // ✅ getCurrentMonthDays and getStreakMessage now come from useStreak hook

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: 'Check out this amazing app! 🎬',
        // url: 'https://apps.apple.com/app/your-app-id', // Add your App Store URL when available
      });
    } catch (error) {
      console.error('Error sharing app:', error);
    }
  };

  const handleLeaveReview = async () => {
    try {
      // Replace with your actual App Store ID when available
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

  // ✅ handleSearchPress, handleCloseSearch, toggleSearchBar, handleCollapseSearchBar now come from useLibrarySearch hook


  const handleOutsidePress = useCallback(() => {
    // Priority 1: If keyboard is visible, dismiss it
    if (isKeyboardVisible) {
      console.log('⌨️ Keyboard visible - dismissing keyboard');
      Keyboard.dismiss();
      return;
    }

    // Priority 2: If in search mode, close search
    if (librarySearch.showSearch) {
      console.log('🔍 Search active - closing search');
      handleCloseSearch();
    } else if (librarySearch.showSearchBar) {
      // Mode expanded (search bar visible) - collapse vers mode normal
      console.log('👆 Outside tap detected - collapsing search bar');

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Collapse search bar
      librarySearch.toggleSearchBar();

      // Animate the transition
      Animated.spring(searchBarProgress, {
        toValue: 0,
        useNativeDriver: false,
        tension: 60,
        friction: 10,
      }).start();
    }
  }, [isKeyboardVisible, librarySearch.showSearch, librarySearch.showSearchBar, handleCloseSearch, searchBarProgress]);

  // Navigate to VideoImportScreen (custom Apple Photos-style picker)
  const handleImportVideos = () => {
    console.log('📱 Navigating to VideoImportScreen...');
    navigation.navigate('VideoImport' as never);
  };

  // Chapter Modal Handlers (iOS-style animations like Momentum)
  const handleOpenChapterModal = useCallback(() => {
    console.log('📖 Opening chapter modal');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    modalScale.setValue(0.95);
    modalOpacity.setValue(0);
    setShowChapterModal(true);

    // Button press animation
    Animated.sequence([
      Animated.timing(filterButtonScale, {
        toValue: 0.96,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(filterButtonScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 80,
      }),
    ]).start();

    // Modal entrance animation
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
  }, [filterButtonScale, modalScale, modalOpacity]);

  const handleCloseChapterModal = useCallback(() => {
    console.log('📖 Closing chapter modal');
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
      setShowChapterModal(false);
    });
  }, [modalScale, modalOpacity]);

  const handleSelectChapter = useCallback((chapterId: string | null) => {
    console.log('📖 Chapter selected:', chapterId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setSelectedChapterId(chapterId);
    handleCloseChapterModal();

    // Videos are automatically filtered by the filteredVideos useMemo
  }, [handleCloseChapterModal]);

  // ✅ performSearch now comes from useLibrarySearch hook

  // ✅ Debounced search now handled in useLibrarySearch hook

  // Handle infinite scroll repositioning
  const handleLifeAreaScroll = useCallback((event: any) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const contentWidth = event.nativeEvent.contentSize.width;
    const viewWidth = event.nativeEvent.layoutMeasurement.width;

    // Approximate width of one set of items (12 items)
    const oneSetWidth = contentWidth / 3;

    // If scrolled past 2/3 (into the third set), jump back to middle set
    if (scrollX > oneSetWidth * 2 - viewWidth) {
      lifeAreaScrollViewRef.current?.scrollTo({ x: oneSetWidth, animated: false });
    }
    // If scrolled before 1/3 (into the first set), jump forward to middle set
    else if (scrollX < oneSetWidth / 3) {
      lifeAreaScrollViewRef.current?.scrollTo({ x: oneSetWidth + scrollX, animated: false });
    }
  }, []);

  // ✅ Scroll position initialization now handled in useLibrarySearch hook

  // ✅ handleLifeAreaPress now comes from useLibrarySearch hook

  // ✅ Phase 3.3 - renderSearchGrid and renderLibraryGrid removed
  // Now using LibrarySearchResults, LibraryGridView, and LibraryCalendarView components
  // ✅ renderEmpty removed - LibraryScreen always shows calendar/grid view, even with 0 videos

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header - Normal or Search Mode */}
        {librarySearch.showSearch ? (
            <View style={[styles.searchHeader, { paddingTop: insets.top + theme.spacing['3'] }]}>
              <View style={styles.searchHeaderContent}>
                {/* Search Bar with Liquid Glass */}
                <LiquidGlassView
                  style={[
                    styles.searchGlassBar,
                    !isLiquidGlassSupported && {
                      backgroundColor: theme.colors.gray100,
                    }
                  ]}
                  interactive={false}
                >
                  <View style={styles.searchInputInner}>
                    <Icon name="search" size={18} color={theme.colors.text.tertiary} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search by title, date, keywords..."
                      placeholderTextColor={theme.colors.text.tertiary}
                      value={librarySearch.query}
                      onChangeText={(text) => librarySearch.setQuery(text)}
                      autoFocus={true}
                      returnKeyType="search"
                    />
                    {librarySearch.query.length > 0 && (
                      <TouchableOpacity onPress={() => librarySearch.setQuery('')}>
                        <Icon name="close" size={18} color={theme.colors.text.tertiary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </LiquidGlassView>

                {/* Filter Button with Liquid Glass (animated with elevation when chapter selected) */}
                <Animated.View
                  style={{
                    transform: [{ scale: filterButtonScale }],
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: selectedChapterId ? 4 : 0 },
                    shadowOpacity: selectedChapterId ? 0.15 : 0,
                    shadowRadius: selectedChapterId ? 8 : 0,
                    elevation: selectedChapterId ? 8 : 0,
                  }}
                >
                  <GlassButton
                    onPress={handleOpenChapterModal}
                    style={styles.filterButton}
                    fallbackStyle={{ backgroundColor: theme.colors.ui.surfaceHover }}
                  >
                    <Icon name="filter" size={18} />
                  </GlassButton>
                </Animated.View>
              </View>
            </View>
          ) : (
            <Animated.View style={[styles.header, { paddingTop: insets.top + theme.spacing['3'] }]}>
              {!librarySearch.showSearchBar ? (
                  <>
                    {/* Left side: Chapters Logo */}
                    <Animated.View
                      style={{
                        opacity: searchBarProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 0],
                        }),
                        transform: [{
                          translateX: searchBarProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -200], // Slide left when opening
                          }),
                        }],
                      }}
                    >
                      <GestureDetector gesture={chapterSwipeGesture}>
                        <TouchableOpacity
                          onPress={handleOpenChapterModal}
                          activeOpacity={0.7}
                          style={styles.chaptersGlassContainer}
                        >
                          <LiquidGlassView
                            style={[
                              styles.chaptersGlassInner,
                              !isLiquidGlassSupported && {
                                backgroundColor: theme.colors.gray100,
                              }
                            ]}
                            interactive={false}
                          >
                            <View style={styles.chaptersTextContainer}>
                              <Animated.Text
                                style={[
                                  styles.title,
                                  {
                                    opacity: chapterTitleOpacity,
                                    transform: [{ translateY: chapterTitleSlide }],
                                  }
                                ]}
                              >
                                {selectedChapterId === null
                                  ? 'Chapters'
                                  : chapters.find(c => c.id === selectedChapterId)?.title || 'Chapters'}
                              </Animated.Text>
                            </View>
                          </LiquidGlassView>
                        </TouchableOpacity>
                      </GestureDetector>
                    </Animated.View>

                    {/* Center spacer */}
                    <View style={{ flex: 1 }} />

                    {/* Right side: Chevron + View Toggle */}
                    <Animated.View
                      style={{
                        opacity: searchBarProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 0],
                        }),
                        transform: [{
                          translateX: searchBarProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 200], // Slide right when opening (follows chevron direction)
                          }),
                        }],
                      }}
                    >
                      <GlassContainer spacing={6} style={styles.headerRight}>
                        {/* Chevron button - expands top bar (points left) */}
                        <GlassButton
                          onPress={toggleSearchBar}
                          style={styles.chevronGlassContainer}
                          fallbackStyle={{ backgroundColor: theme.colors.gray100 }}
                        >
                          <Icon name="chevronLeft" size={18} color={theme.colors.text.primary} />
                        </GlassButton>

                        {/* Single View Toggle Button - shows current view icon */}
                        <GlassButton
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            // Toggle between calendar and grid
                            const newMode = libraryData.viewMode === 'calendar' ? 'grid' : 'calendar';
                            libraryData.setViewMode(newMode);
                          }}
                          style={styles.singleViewToggle}
                          fallbackStyle={{ backgroundColor: theme.colors.gray100 }}
                        >
                          <Animated.View style={{
                            transform: [{
                              scale: libraryData.viewMode === 'calendar' ? calendarIconScale : gridIconScale
                            }],
                          }}>
                            <Icon
                              name={libraryData.viewMode === 'calendar' ? 'calendar' : 'grid'}
                              size={18}
                              color={theme.colors.text.primary}
                            />
                          </Animated.View>
                        </GlassButton>
                      </GlassContainer>
                    </Animated.View>
                  </>
                ) : (
                  <>
                    {/* Expanded mode: search bar + import + settings (pas de chevron!) */}
                    <Animated.View
                      style={{
                        flex: 1,
                        marginRight: theme.spacing['2'],
                        opacity: searchBarProgress,
                        transform: [{
                          translateX: searchBarProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [300, 0],
                          }),
                        }],
                      }}
                    >
                      <GlassButton
                        onPress={() => librarySearch.handleSearchPress()}
                        style={styles.expandedSearchBar}
                        fallbackStyle={{ backgroundColor: theme.colors.gray100 }}
                      >
                        <View style={styles.expandedSearchInner}>
                          <Icon name="search" size={18} color={theme.colors.text.tertiary} />
                          <Text style={styles.searchBarPlaceholder}>Search...</Text>
                        </View>
                      </GlassButton>
                    </Animated.View>

                    <Animated.View
                      style={{
                        opacity: searchBarProgress,
                        transform: [{
                          translateX: searchBarProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [100, 0],
                          }),
                        }],
                      }}
                    >
                      <GlassContainer spacing={6} style={styles.headerRight}>
                        {/* Import Button with Liquid Glass */}
                        <GlassButton
                          onPress={handleImportVideos}
                          style={styles.chevronGlassContainer}
                          fallbackStyle={{ backgroundColor: theme.colors.ui.surfaceHover }}
                        >
                          <Icon name="plus" size={18} />
                        </GlassButton>

                        {/* Close button - chevron pointing right to collapse */}
                        <GlassButton
                          onPress={handleCollapseSearchBar}
                          style={styles.chevronGlassContainer}
                          fallbackStyle={{ backgroundColor: theme.colors.gray100 }}
                        >
                          <Icon name="chevronRight" size={18} color={theme.colors.text.primary} />
                        </GlassButton>
                      </GlassContainer>
                    </Animated.View>
                  </>
                )}
              </Animated.View>
          )}

          {/* ✅ Error state removed - errors logged to console only (no UI pop-up) */}

          {/* Content Area */}
          {librarySearch.showSearch ? (
            <TouchableWithoutFeedback onPress={handleOutsidePress}>
              <View style={[styles.searchContentContainer, { paddingTop: insets.top + 12 + 44 + 10 }]}>
                {/* Life Area Bubbles - Edge-to-edge with infinite scroll */}
                <ScrollView
                  ref={lifeAreaScrollViewRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.lifeAreaBubblesContainer}
                  style={styles.lifeAreaScrollView}
                  onScroll={handleLifeAreaScroll}
                  scrollEventThrottle={16}
                  keyboardShouldPersistTaps="handled"
                >
                  {infiniteLifeAreas.map((area, index) => {
                    const isSelected = librarySearch.selectedLifeArea === area;
                    return (
                      <TouchableOpacity
                        key={`${area}-${index}`}
                        onPress={() => handleLifeAreaPress(area)}
                        activeOpacity={0.7}
                      >
                        <LiquidGlassView
                          style={[
                            styles.lifeAreaBubble,
                            isSelected && styles.lifeAreaBubbleSelected,
                            !isLiquidGlassSupported && {
                              backgroundColor: isSelected ? theme.colors.gray300 : theme.colors.gray100,
                            }
                          ]}
                          interactive={true}
                        >
                          <Text style={[
                            styles.lifeAreaText,
                            isSelected && styles.lifeAreaTextSelected
                          ]}>
                            {area}
                          </Text>
                        </LiquidGlassView>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Results Area */}
                {librarySearch.isSearchingLifeArea ? (
                  <View style={[styles.searchLoadingContainer, { paddingHorizontal: theme.spacing['4'] }]}>
                    <LoadingDots color={brandColor} size={6} />
                    <Text style={styles.searchLoadingText}>Loading...</Text>
                  </View>
                ) : librarySearch.selectedLifeArea && librarySearch.lifeAreaResults.length > 0 ? (
                  <View style={{ paddingHorizontal: 2 }}>
                    <FlatList
                      data={librarySearch.lifeAreaResults}
                      keyExtractor={(item) => item.id || ''}
                      numColumns={4}
                      columnWrapperStyle={styles.lifeAreaGridRow}
                      contentContainerStyle={styles.lifeAreaGridContainer}
                      initialNumToRender={16}
                      maxToRenderPerBatch={8}
                      windowSize={5}
                      removeClippedSubviews={true}
                      renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.lifeAreaGridThumbnail}
                        onPress={() => {
                          const itemIndex = librarySearch.lifeAreaResults.findIndex(v => v.id === item.id);

                          // 🎯 Open VideoPlayer modal with segment timestamp
                          // Pass segment_start_time so VideoPlayer seeks to the highlight
                          // Don't close search - user will return to filter view on back
                          libraryData.setVideoPlayer({
                            isOpen: true,
                            selectedVideo: item,
                            videos: librarySearch.lifeAreaResults,
                            initialIndex: itemIndex,
                            initialTimestamp: item.is_segment ? item.segment_start_time : undefined
                          });
                        }}
                      >
                        {item.thumbnail_frames && item.thumbnail_frames.length > 0 ? (
                          <Image
                            source={{ uri: item.thumbnail_frames[0] }}
                            style={styles.gridThumbnailImage}
                            resizeMode="cover"
                          />
                        ) : item.thumbnail_path ? (
                          <Image
                            source={{ uri: item.thumbnail_path }}
                            style={styles.gridThumbnailImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.gridThumbnailPlaceholder}>
                            <Icon name="cameraFilled" size={16} color={theme.colors.gray400} />
                          </View>
                        )}
                      </TouchableOpacity>
                    )}
                    showsVerticalScrollIndicator={false}
                  />
                  </View>
                ) : (
                  <View style={{ paddingHorizontal: theme.spacing['4'] }}>
                    <LibrarySearchResults
                      results={librarySearch.results}
                      query={librarySearch.query}
                      isSearching={librarySearch.isSearching}
                      onVideoPress={(video, allVideos, index) => {
                        handleGridVideoPress(video, allVideos, index);
                        handleCloseSearch();
                      }}
                      brandColor={brandColor}
                    />
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          ) : (
            <View style={styles.contentContainer}>
              {/* ✅ Always show calendar/grid view, even with 0 videos */}
              {libraryData.viewMode === 'grid' ? (
                <LibraryGridView
                  videos={filteredVideos}
                  onVideoPress={handleGridVideoPress}
                  onEndReached={handleLoadMore}
                  onEndReachedThreshold={0.8}
                  contentInsetTop={headerHeightGrid} // ✅ Less padding for grid view (photos closer to top bar)
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={handleRefresh}
                      tintColor={brandColor}
                    />
                  }
                />
              ) : (
                <LibraryCalendarView
                  videos={filteredVideos}
                  onVideoPress={handleCalendarVideoPress}
                  chapters={chapters}
                  onEndReached={handleLoadMore}
                  onEndReachedThreshold={0.8}
                  contentInsetTop={headerHeightCalendar} // ✅ More padding for calendar view
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={handleRefresh}
                      tintColor={brandColor}
                    />
                  }
                />
              )}
            </View>
          )}

          {/* Video Player (from grid AND calendar) */}
          <VideoPlayer
            visible={libraryData.videoPlayer.isOpen}
            video={libraryData.videoPlayer.selectedVideo}
            videos={libraryData.videoPlayer.videos}
            initialIndex={libraryData.videoPlayer.initialIndex}
            initialTimestamp={libraryData.videoPlayer.initialTimestamp}
            onClose={handleCloseVideoPlayer}
          />

          {/* Streak Modal */}
          <Modal
            visible={showStreakModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowStreakModal(false)}
          >
            <View style={styles.streakModalOverlay}>
              {/* Background overlay - closes modal when tapped */}
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={() => setShowStreakModal(false)}
              />

              {/* Modal content - does not close modal when tapped */}
              <View style={styles.streakModalContent}>
                    {/* Header */}
                    <View style={styles.streakModalHeader}>
                      <View style={{ flex: 1 }} />
                      <TouchableOpacity
                        onPress={() => setShowStreakModal(false)}
                        style={styles.streakModalCloseButton}
                      >
                        <Icon name="x" size={24} color={theme.colors.gray400} />
                      </TouchableOpacity>
                    </View>

                    {/* Streak message */}
                    <View style={styles.streakMessageContainer}>
                      <Text style={styles.streakMessageText}>
                        {getStreakMessage(currentStreak)}
                      </Text>
                      <Text style={styles.streakCountText}>
                        {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}
                      </Text>
                    </View>

                    {/* Month label */}
                    <Text style={styles.streakMonthLabel}>
                      {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </Text>

                    {/* Days timeline */}
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
                              dayData.hasVideo && styles.streakDayActive,
                              dayData.isToday && styles.streakDayToday,
                            ]}
                          >
                            <Text
                              style={[
                                styles.streakDayText,
                                dayData.hasVideo && styles.streakDayTextActive,
                                dayData.isToday && styles.streakDayTextToday,
                              ]}
                            >
                              {dayData.day}
                            </Text>
                          </View>
                          {dayData.hasVideo && (
                            <View style={styles.streakDayDot} />
                          )}
                        </View>
                      ))}
                    </ScrollView>

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
                        style={styles.shareButton}
                        onPress={handleShareApp}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.shareButtonText}>Share the app</Text>
                      </TouchableOpacity>
                    </View>
              </View>
            </View>
          </Modal>

          {/* ✅ Phase 3.3 - Chapter Modal Component */}
          <LibraryChapterModal
            visible={showChapterModal}
            chapters={chapters}
            currentChapter={currentChapter}
            selectedChapterId={selectedChapterId}
            onSelect={handleSelectChapter}
            onClose={handleCloseChapterModal}
            chapterScrollY={chapterScrollY}
            modalOpacity={modalOpacity}
            topInset={insets.top}
            brandColor={brandColor}
          />

          {/* Removed Import Progress Modal - videos now show inline with spinner */}
        </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0)', // ✅ Fully transparent container (SafeAreaView)
  },
  content: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0)', // ✅ Fully transparent content
  },
  header: {
    position: 'absolute', // ✅ Float above content like iOS Photos
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing['4'],
    // paddingTop applied dynamically with insets
    backgroundColor: 'rgba(0,0,0,0)', // ✅ Fully transparent background
    zIndex: 100, // ✅ Ensure header stays on top
  },
  logo: {
    width: 32,
    height: 32,
  },
  // Left side container: Chapters + Chevron + View Toggle
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0)', // ✅ Fully transparent background
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0)', // ✅ Fully transparent background
  },
  streakGlassContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    height: 36, // Match view toggle height (32px content + 2x2px padding)
  },
  streakTouchable: {
    flex: 1,
    justifyContent: 'center',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6, // Adjusted for 36px total height
  },
  fireIcon: {
    width: 16,
    height: 16,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Chevron button with Liquid Glass
  chevronGlassContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Single view toggle button (shows current view icon)
  singleViewToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // View Mode Toggle (iOS-style with Liquid Glass)
  viewToggleContainer: {
    borderRadius: 22,
    overflow: 'hidden',
    padding: 2,
    position: 'relative', // For absolute positioning of selector
  },
  viewToggleInner: {
    flexDirection: 'row',
    gap: 2,
    position: 'relative',
  },
  // Animated selection indicator
  toggleSelector: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    zIndex: 1, // Behind the icons but above background
  },
  toggleSelectorGlass: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  viewToggleOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 10, // Above the selector
  },
  viewToggleOptionActive: {
    // Active state now handled by animated selector
  },
  viewToggleButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    padding: theme.spacing['1'], // 4px - divise par 2 l'espacement original
  },
  title: {
    fontFamily: 'Poppins-SemiBoldItalic',
    fontSize: 18,
    fontWeight: '600', // semi-bold (backup for systems without custom font)
    fontStyle: 'italic', // backup for systems without custom font
    letterSpacing: -0.54, // -3% de 18px
    color: theme.colors.text.primary,
    overflow: 'hidden',
  },
  // Chapters bubble with Liquid Glass (now interactive)
  chaptersGlassContainer: {
    borderRadius: 22,
    overflow: 'hidden',
    height: 44, // Match search bar height
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
  contentContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0)', // ✅ Fully transparent content container
  },
  // ✅ Error styles removed - errors logged to console only (no UI display)
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing['15'],
  },
  loadingText: {
    ...theme.typography.body2,
    marginTop: theme.spacing['4'],
    color: theme.colors.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing['10'],
  },
  emptyTitle: {
    ...theme.typography.h2,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: theme.spacing['4'],
    marginBottom: theme.spacing['2'],
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing['4'],
  },
  // New Search Interface Styles
  searchHeader: {
    position: 'absolute', // ✅ Float above content like iOS Photos
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing['4'],
    // paddingTop applied dynamically with insets
    backgroundColor: 'rgba(0,0,0,0)', // ✅ Fully transparent background
    borderBottomWidth: 0, // ✅ Remove border for cleaner look
    zIndex: 100, // ✅ Ensure header stays on top
  },
  searchHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['2'], // 8px gap between search bar and filter button
  },
  // Search Bar with Liquid Glass
  searchGlassBar: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    height: 44, // iOS standard search bar height
  },
  searchInputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['2'],
    paddingHorizontal: theme.spacing['3'],
    paddingVertical: theme.spacing['2'],
    height: '100%',
  },
  searchInput: {
    flex: 1,
    ...theme.typography.body,
    fontSize: 16,
    color: theme.colors.text.primary,
  },
  // Filter Button with Liquid Glass
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContentContainer: {
    flex: 1,
    paddingTop: theme.spacing['2'],
    // No paddingHorizontal for edge-to-edge life area bubbles
  },
  // Grid styles for search results
  gridContainer: {
    paddingBottom: theme.spacing['4'],
    paddingHorizontal: GRID_PADDING,
  },
  gridRow: {
    justifyContent: 'flex-start',
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  gridThumbnail: {
    width: THUMBNAIL_WIDTH,
    height: THUMBNAIL_HEIGHT,
  },
  gridThumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
  },
  gridThumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
    backgroundColor: theme.colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Updated search styles for new interface
  searchLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing['6'],
    gap: theme.spacing['3'],
  },
  searchLoadingText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
  },
  searchEmptyState: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing['6'],
    paddingTop: theme.spacing['8'],
  },
  searchEmptyTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.text.secondary,
    marginTop: theme.spacing['3'],
  },
  searchEmptyText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Import Progress Modal Styles
  importProgressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  importProgressModal: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: theme.spacing['6'],
    width: screenWidth - 48,
    maxWidth: 400,
    ...theme.layout.shadows.lg,
  },
  importProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing['4'],
  },
  importProgressTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
  },
  importProgressStats: {
    marginBottom: theme.spacing['4'],
  },
  importProgressStat: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
    fontWeight: '600',
    marginBottom: theme.spacing['2'],
  },
  importProgressStatError: {
    ...theme.typography.body,
    color: theme.colors.error500,
  },
  importProgressBarContainer: {
    height: 8,
    backgroundColor: theme.colors.gray100,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: theme.spacing['4'],
  },
  importProgressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.brand.primary,
    borderRadius: 4,
  },
  importCurrentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['3'],
    marginBottom: theme.spacing['4'],
  },
  importCurrentItemText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
  },
  importProgressActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing['3'],
  },
  importActionButton: {
    paddingVertical: theme.spacing['3'],
    paddingHorizontal: theme.spacing['4'],
    borderRadius: 8,
    backgroundColor: theme.colors.brand.primary,
  },
  importActionButtonText: {
    ...theme.typography.body,
    color: theme.colors.white,
    fontWeight: '600',
  },
  // Expanded search bar (when open) - Glass container
  expandedSearchBar: {
    borderRadius: 22,
    overflow: 'hidden',
    height: 44, // Match full search bar height
  },
  expandedSearchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start', // ✅ Align content to the left
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: '100%',
  },
  searchBarPlaceholder: {
    fontSize: 16,
    color: theme.colors.text.tertiary,
    textAlign: 'left',
  },
  fireIcon: {
    width: 20,
    height: 20,
  },
  // Streak Modal
  streakModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing['4'],
  },
  streakModalContent: {
    backgroundColor: theme.colors.white,
    borderRadius: 24,
    padding: theme.spacing['6'],
    width: '100%',
    maxWidth: 500,
  },
  streakModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing['4'],
  },
  streakModalTitle: {
    ...theme.typography.h2,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  streakModalCloseButton: {
    padding: theme.spacing['1'],
  },
  streakMessageContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing['5'],
  },
  streakMessageText: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing['2'],
  },
  streakCountText: {
    fontSize: 48,
    fontWeight: '700',
    color: theme.colors.brand.primary,
  },
  streakMonthLabel: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing['3'],
    textAlign: 'center',
  },
  streakDaysScrollView: {
    flexGrow: 0,
  },
  streakDaysContainer: {
    paddingHorizontal: theme.spacing['2'],
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
    backgroundColor: theme.colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing['1'],
  },
  streakDayActive: {
    backgroundColor: theme.colors.brand.primary,
  },
  streakDayToday: {
    borderWidth: 2,
    borderColor: theme.colors.brand.primary,
    backgroundColor: theme.colors.white,
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
    color: theme.colors.brand.primary,
  },
  streakDayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.brand.primary,
  },
  // Action Buttons
  streakActionsContainer: {
    flexDirection: 'row',
    gap: theme.spacing['3'],
    marginTop: theme.spacing['5'],
  },
  reviewButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: theme.spacing['4'],
    borderRadius: 24,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  shareButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: theme.spacing['4'],
    borderRadius: 24,
    backgroundColor: theme.colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.white,
  },
  // Life Area Bubbles - Edge-to-edge
  lifeAreaScrollView: {
    maxHeight: 50,
    marginBottom: theme.spacing['3'],
  },
  lifeAreaBubblesContainer: {
    paddingLeft: 12, // Small padding for first item
    paddingRight: 12, // Small padding for last item
    gap: 8,
  },
  lifeAreaBubble: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  lifeAreaBubbleSelected: {
    // Selected state handled by Liquid Glass
  },
  lifeAreaText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.secondary,
  },
  lifeAreaTextSelected: {
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  // 4-column grid for life area results
  lifeAreaGridContainer: {
    paddingBottom: theme.spacing['4'],
    // No paddingHorizontal - handled by parent View
  },
  lifeAreaGridRow: {
    justifyContent: 'flex-start',
    gap: 2,
    marginBottom: 2,
  },
  lifeAreaGridThumbnail: {
    width: (screenWidth - 4 - 6) / 4, // 4 columns with 2px padding on each side (4px total)
    height: ((screenWidth - 4 - 6) / 4) * 1.33,
  },
  // Chapter Modal Styles (iOS-style like Momentum)
  // ✅ Phase 3.3 - Chapter modal styles moved to LibraryChapterModal.tsx
});

export default LibraryScreen;