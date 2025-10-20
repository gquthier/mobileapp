import React, { useState, useEffect, useCallback, useRef, useReducer, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { theme } from '../styles';
import { useTheme } from '../hooks/useTheme';
import { TopBar } from '../components/TopBar';
import { Icon } from '../components/Icon';
import { LoadingDots } from '../components/LoadingDots';
import { CalendarGallerySimple as CalendarGallery } from '../components/CalendarGallerySimple';
import { VideoGallery } from '../components/VideoGallery';
import { VideoPlayer } from '../components/VideoPlayer';
import { VideoRecord } from '../lib/supabase';
import { VideoService } from '../services/videoService';
import { VideoCacheService } from '../services/videoCacheService';
import { ImportQueueService, ImportQueueState } from '../services/importQueueService';
import { libraryReducer, initialLibraryState } from './LibraryScreen.reducer';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { GlassButton, GlassContainer } from './OptimizedGlassComponents';
import { getUserChapters, getCurrentChapter, Chapter } from '../services/chapterService';
import { useTheme as useThemeContext } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

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

  // ✅ Replace 20+ useState with single useReducer
  const [state, dispatch] = useReducer(libraryReducer, initialLibraryState);

  // 🚀 OPTIMIZATION: Track loading phases for progressive rendering
  const [loadingPhase, setLoadingPhase] = useState<'skeleton' | 'cache' | 'complete'>('skeleton');

  // Track keyboard visibility
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Chapter filter state
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);

  // Animation values for chapter modal (iOS native-style animation)
  const modalScale = useRef(new Animated.Value(0.95)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const filterButtonScale = useRef(new Animated.Value(1)).current;

  // ✅ Calculate header height for content inset
  // Different padding for calendar vs grid view
  const headerHeightCalendar = insets.top + 72; // More spacing for calendar view
  const headerHeightGrid = insets.top + 60; // Less spacing for grid view (photos closer to top bar)

  // 🚀 OPTIMIZATION: Lazy animation initialization with useMemo (grouped for performance)
  const animations = useMemo(() => ({
    searchBarProgress: new Animated.Value(0),
    calendarIconScale: new Animated.Value(1),
    gridIconScale: new Animated.Value(1),
    toggleSelectorPosition: new Animated.Value(state.viewMode === 'calendar' ? 0 : 1),
    scrollY: new Animated.Value(0),
    headerOpacity: new Animated.Value(1),
  }), []); // ✅ Init once, never recreate

  // Extract for backward compatibility
  const searchBarProgress = animations.searchBarProgress;
  const calendarIconScale = animations.calendarIconScale;
  const gridIconScale = animations.gridIconScale;
  const toggleSelectorPosition = animations.toggleSelectorPosition;
  const scrollY = animations.scrollY;
  const headerOpacity = animations.headerOpacity;

  const lifeAreaScrollViewRef = useRef<ScrollView>(null);

  // ✅ FIX: Stable ref for fetchVideos to avoid re-subscriptions
  const fetchVideosRef = useRef<(pageToLoad?: number, append?: boolean) => Promise<void>>();

  // ✅ FIX: Stable date ref to avoid recalculations every minute
  const currentDateRef = useRef(new Date());

  // Create infinite scroll array (3x duplication for smooth looping)
  const infiniteLifeAreas = useMemo(() => {
    return [...LIFE_AREAS, ...LIFE_AREAS, ...LIFE_AREAS];
  }, []);

  // Initialize toggle selector position on mount
  useEffect(() => {
    const initialPosition = state.viewMode === 'calendar' ? 0 : 1;
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

  // Load chapters on mount
  useEffect(() => {
    const loadChapters = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Load all chapters
        const allChapters = await getUserChapters(user.id);
        setChapters(allChapters);

        // Load current chapter
        const current = await getCurrentChapter(user.id);
        setCurrentChapter(current);
      } catch (error) {
        console.error('❌ Error loading chapters:', error);
      }
    };

    loadChapters();
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
      setSelectedChapterId(params.filterChapterId);
      console.log('✅ Chapter filter applied:', params.filterChapterTitle || params.filterChapterId);

      // ✅ Just apply the filter - don't open full search mode
      // The videos will be filtered by filteredVideos useMemo
      if (params?.openSearchWithFilter) {
        console.log('🎯 Filter active - videos will be filtered by chapter');

        // Switch to grid view (better for filtered lists)
        dispatch({ type: 'SET_VIEW_MODE', mode: 'grid' });
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
    const targetCalendarScale = state.viewMode === 'calendar' ? 1 : 0.9;
    const targetGridScale = state.viewMode === 'grid' ? 1 : 0.9;
    const targetSelectorPosition = state.viewMode === 'calendar' ? 0 : 1;

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
  }, [state.viewMode, calendarIconScale, gridIconScale, toggleSelectorPosition]);

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

  // 🚀 OPTIMIZATION: Fetch videos with non-blocking cache-first strategy
  const fetchVideos = useCallback(async (pageToLoad: number = 0, append: boolean = false) => {
    try {
      if (!append) {
        dispatch({ type: 'FETCH_START' });

        // 🚀 PHASE 1: Try cache first (fast, synchronous)
        console.log('📦 Loading videos from cache...');
        const cacheStartTime = Date.now();
        const { videos: cachedVideos } = await VideoCacheService.loadFromCache();
        console.log(`⏱️ Cache loaded in ${Date.now() - cacheStartTime}ms`);

        if (cachedVideos.length > 0) {
          console.log(`✅ Showing ${cachedVideos.length} cached videos immediately`);
          // Sort cached videos
          const sortedCached = cachedVideos.sort((a, b) =>
            new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
          );
          dispatch({ type: 'FETCH_SUCCESS', videos: sortedCached });
          setLoadingPhase('cache');
        }
      } else {
        dispatch({ type: 'LOAD_MORE_START' });
      }

      // 🚀 PHASE 2: Fetch fresh data in background (after interactions complete)
      const offset = pageToLoad * VIDEOS_PER_PAGE;
      console.log(`🔄 Fetching videos page ${pageToLoad} (offset: ${offset}, limit: ${VIDEOS_PER_PAGE})`);

      const fetchStartTime = Date.now();
      const videosData = await VideoService.getAllVideos(undefined, VIDEOS_PER_PAGE, offset);
      console.log(`⏱️ Network fetch completed in ${Date.now() - fetchStartTime}ms (${videosData.length} videos)`);

      // Check if we have more pages
      const hasMoreVideos = videosData.length === VIDEOS_PER_PAGE;

      // Sort fresh videos
      const sortedFresh = videosData.sort((a, b) =>
        new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      );

      // Update UI with fresh data
      if (append) {
        dispatch({ type: 'LOAD_MORE_SUCCESS', videos: sortedFresh, hasMore: hasMoreVideos });
      } else {
        dispatch({ type: 'FETCH_SUCCESS', videos: sortedFresh });
        setLoadingPhase('complete');
        // Update cache only on initial load (in background, don't await)
        VideoCacheService.saveToCache(sortedFresh).catch(err =>
          console.error('❌ Cache save failed:', err)
        );
      }
    } catch (error) {
      console.error('❌ Error fetching videos:', error);
      if (append) {
        dispatch({ type: 'LOAD_MORE_ERROR' });
      } else {
        dispatch({ type: 'FETCH_ERROR', error: 'Failed to load videos. Please try again.' });
        setLoadingPhase('complete');
      }
    }
  }, []);

  // 🚀 OPTIMIZATION: Calculate streak with early exit and Set-based lookup
  const calculateStreakOptimized = useCallback((videoList: VideoRecord[]): number => {
    // 🚀 Early exit: No videos = no streak
    if (!videoList || videoList.length === 0) return 0;

    // 🚀 Early exit: Few videos = simple check
    if (videoList.length < 5) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayKey = today.toISOString().split('T')[0];

      const hasVideoToday = videoList.some(v =>
        v.created_at && new Date(v.created_at).toISOString().split('T')[0] === todayKey
      );
      return hasVideoToday ? 1 : 0;
    }

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 🚀 Optimization: Use Set for O(1) lookups instead of Map
    const videoDates = new Set<string>();
    videoList.forEach(video => {
      if (video.created_at) {
        const date = new Date(video.created_at);
        date.setHours(0, 0, 0, 0);
        videoDates.add(date.toISOString().split('T')[0]);
      }
    });

    // Calculate streak
    let streak = 0;
    let currentDate = new Date(today);
    const maxDaysToCheck = 365; // 🚀 Limit to prevent infinite loop

    for (let i = 0; i < maxDaysToCheck; i++) {
      const dateKey = currentDate.toISOString().split('T')[0];

      if (videoDates.has(dateKey)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break; // 🚀 Early exit when streak breaks
      }
    }

    return streak;
  }, []);

  // 🚀 OPTIMIZATION: Load videos after interactions complete (non-blocking)
  useEffect(() => {
    // Skeleton UI is already visible immediately
    // Now defer heavy operations until after navigation animation
    const handle = InteractionManager.runAfterInteractions(() => {
      console.log('🚀 Starting fetchVideos after interactions complete');
      fetchVideos(0, false);
    });

    return () => handle.cancel();
  }, [fetchVideos]);

  // Load more videos handler
  const handleLoadMore = useCallback(() => {
    const { hasMore, isLoadingMore } = state.pagination;
    const { loading } = state;

    if (!hasMore || isLoadingMore || loading) {
      console.log('⏸️ Skipping load more:', { hasMore, isLoadingMore, loading });
      return;
    }

    console.log('📄 Loading more videos, page:', state.pagination.page + 1);
    const nextPage = state.pagination.page + 1;
    fetchVideos(nextPage, true);
  }, [state.pagination, state.loading, fetchVideos]);

  // 🚀 OPTIMIZATION: Smart memoization - only recalculate when video count changes
  const currentStreak = useMemo(() => {
    const startTime = Date.now();
    const streak = calculateStreakOptimized(state.videos);
    const elapsed = Date.now() - startTime;
    if (elapsed > 10) {
      console.log(`⏱️ Streak calculated in ${elapsed}ms: ${streak} days`);
    }
    return streak;
  }, [state.videos.length, calculateStreakOptimized]);

  // Update streak in state when it changes
  useEffect(() => {
    dispatch({ type: 'UPDATE_STREAK', streak: currentStreak });
  }, [currentStreak]);

  // ✅ FIX: Keep fetchVideosRef updated with latest version
  useEffect(() => {
    fetchVideosRef.current = fetchVideos;
  }, [fetchVideos]);

  // 🚀 OPTIMIZATION: Subscribe to import queue updates (defer queue loading)
  useEffect(() => {
    // 🚀 Defer queue state loading to avoid blocking initial render
    const handle = InteractionManager.runAfterInteractions(() => {
      // Load persisted queue state after interactions complete (100ms delay)
      setTimeout(() => {
        console.log('🚀 Loading import queue state (deferred)');
        ImportQueueService.loadQueueState();
      }, 100);
    });

    // Subscribe to queue updates
    const unsubscribe = ImportQueueService.subscribe((queueState) => {
      dispatch({ type: 'UPDATE_IMPORT_STATE', queueState });

      // Don't show progress modal - videos will show inline with spinner
      // Just refresh when imports complete
      if (queueState.completedCount > 0 && !queueState.isProcessing) {
        // ✅ FIX: Defer fetchVideos to avoid blocking during interactions/animations
        // Wait 500ms for any ongoing animations to complete before fetching
        setTimeout(() => {
          console.log('🔄 Import completed - refreshing videos (deferred)');
          fetchVideosRef.current?.();
        }, 500);
      }
    });

    return () => {
      handle.cancel();
      unsubscribe();
    };
  }, []); // ✅ FIX: Empty deps - no re-subscriptions, use fetchVideosRef instead

  // ✅ Memoize combined videos
  const allVideos = useMemo(() => {
    const uploadingPlaceholders = createUploadingPlaceholders(state.importState.queueState);
    // Put uploading videos first (most recent)
    return [...uploadingPlaceholders, ...state.videos];
  }, [state.videos, state.importState.queueState, createUploadingPlaceholders]);

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

    dispatch({
      type: 'OPEN_VIDEO_PLAYER',
      video,
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
    dispatch({ type: 'OPEN_VIDEO_PLAYER', video, videos: videosToPlay, initialIndex: index });
  }, []);

  const handleCloseVideoPlayer = useCallback(() => {
    dispatch({ type: 'CLOSE_VIDEO_PLAYER' });
  }, []);

  /**
   * Open Vertical Feed Mode (TikTok-style)
   * Uses current filtered/sorted videos
   */
  const handleOpenVerticalFeed = useCallback((startIndex: number = 0) => {
    console.log('🎬 Opening Vertical Feed at index:', startIndex);

    // ✅ OPTION 1: No filtering needed - VideoService already filters at source
    // Use filtered videos (respect current search/filters)
    const videosToShow = state.search.showSearch && state.search.results.length > 0
      ? state.search.results
      : state.videos;

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
        filters: state.filters,
        searchQuery: state.search.query,
      },
    } as never);
  }, [navigation, state.videos, state.search.showSearch, state.search.results, state.search.query, state.filters]);

  const handleNavigateToSettings = () => {
    // Navigate to the Settings tab
    navigation.navigate('Settings' as never);
  };

  // 🚀 OPTIMIZATION: Memoize month days calculation - only recalculate when needed
  const getCurrentMonthDays = useMemo(() => {
    // 🚀 Early exit: No videos = empty month
    if (filteredVideos.length < 5) {
      return [];
    }

    // ✅ FIX: Use stable date ref instead of new Date() to avoid recalc every minute
    const today = currentDateRef.current;
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 🚀 Optimization: Pre-calculate video dates Set once
    const videoDates = new Set<number>();
    filteredVideos.forEach(video => {
      if (video.created_at) {
        const date = new Date(video.created_at);
        if (date.getMonth() === month && date.getFullYear() === year) {
          videoDates.add(date.getDate());
        }
      }
    });

    // Build days array
    const days = [];
    const todayDate = today.getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        date: new Date(year, month, day),
        hasVideo: videoDates.has(day),
        isToday: day === todayDate,
      });
    }

    return days;
  }, [filteredVideos.length]); // ✅ FIX: Removed new Date() deps - only recalc when video count changes

  const getStreakMessage = (streak: number) => {
    if (streak === 0) return "Start your journey today! 🎬";
    if (streak === 1) return "Great start! Keep it going! 🌟";
    if (streak < 7) return `${streak} days strong! You're building a habit! 💪`;
    if (streak < 30) return `Incredible! ${streak} day streak! 🔥`;
    if (streak < 100) return `Wow! ${streak} days of dedication! 🏆`;
    return `Legendary! ${streak} day streak! You're unstoppable! 👑`;
  };

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

  const handleSearchPress = useCallback(() => {
    dispatch({ type: 'TOGGLE_SEARCH_BAR', show: true });
  }, []);

  const handleCloseSearch = useCallback(() => {
    dispatch({ type: 'CLOSE_SEARCH' });

    // Reset search bar animation to closed state (logo visible)
    Animated.spring(searchBarProgress, {
      toValue: 0,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  }, [searchBarProgress]);

  // Toggle search bar visibility with animation
  const toggleSearchBar = useCallback(() => {
    const toValue = state.search.showSearchBar ? 0 : 1;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Update state immediately for conditional rendering
    dispatch({ type: 'TOGGLE_SEARCH_BAR', show: !state.search.showSearchBar });

    // Animate the transition
    Animated.spring(searchBarProgress, {
      toValue,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  }, [state.search.showSearchBar, searchBarProgress]);

  // Handle tap on chevron to collapse search bar
  const handleCollapseSearchBar = useCallback(() => {
    console.log('◀ Chevron tapped - collapsing search bar');

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Collapse search bar
    dispatch({ type: 'TOGGLE_SEARCH_BAR', show: false });

    // Animate the transition
    Animated.spring(searchBarProgress, {
      toValue: 0,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  }, [searchBarProgress]);


  const handleOutsidePress = useCallback(() => {
    // Priority 1: If keyboard is visible, dismiss it
    if (isKeyboardVisible) {
      console.log('⌨️ Keyboard visible - dismissing keyboard');
      Keyboard.dismiss();
      return;
    }

    // Priority 2: If in search mode, close search
    if (state.search.showSearch) {
      console.log('🔍 Search active - closing search');
      handleCloseSearch();
    } else if (state.search.showSearchBar) {
      // Mode expanded (search bar visible) - collapse vers mode normal
      console.log('👆 Outside tap detected - collapsing search bar');

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Collapse search bar
      dispatch({ type: 'TOGGLE_SEARCH_BAR', show: false });

      // Animate the transition
      Animated.spring(searchBarProgress, {
        toValue: 0,
        useNativeDriver: false,
        tension: 60,
        friction: 10,
      }).start();
    }
  }, [isKeyboardVisible, state.search.showSearch, state.search.showSearchBar, handleCloseSearch, searchBarProgress]);

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

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      dispatch({ type: 'SET_SEARCH_RESULTS', results: [] });
      return;
    }

    // Don't search if query is too short (< 2 characters)
    if (query.trim().length < 2) {
      dispatch({ type: 'SET_SEARCH_RESULTS', results: [] });
      return;
    }

    dispatch({ type: 'SET_SEARCHING', isSearching: true });
    try {
      console.time('⏱️ Search request');
      const results = await VideoService.searchVideos(query);
      console.timeEnd('⏱️ Search request');
      dispatch({ type: 'SET_SEARCH_RESULTS', results });
    } catch (error) {
      console.error('❌ Search failed:', error);
      dispatch({ type: 'SET_SEARCH_RESULTS', results: [] });
    } finally {
      dispatch({ type: 'SET_SEARCHING', isSearching: false });
    }
  }, []);

  // Debounced search (500ms to avoid excessive database queries)
  useEffect(() => {
    if (!state.search.query.trim()) {
      dispatch({ type: 'SET_SEARCH_RESULTS', results: [] });
      return;
    }

    // Wait 500ms after user stops typing before searching
    const debounceTimer = setTimeout(() => {
      performSearch(state.search.query);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [state.search.query, performSearch]);

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

  // Initialize scroll position to middle set
  useEffect(() => {
    if (state.search.showSearch && lifeAreaScrollViewRef.current) {
      // Wait for layout then scroll to middle
      setTimeout(() => {
        // Rough estimate: each bubble is ~100px wide
        const approxBubbleWidth = 100;
        const oneSetWidth = approxBubbleWidth * LIFE_AREAS.length;
        lifeAreaScrollViewRef.current?.scrollTo({ x: oneSetWidth, animated: false });
      }, 100);
    }
  }, [state.search.showSearch]);

  // Handle life area selection
  const handleLifeAreaPress = useCallback(async (lifeArea: string) => {
    console.log('🎯 Life area selected:', lifeArea);

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Select this life area
    dispatch({ type: 'SELECT_LIFE_AREA', lifeArea });
    dispatch({ type: 'SET_SEARCHING_LIFE_AREA', isSearching: true });

    try {
      // Search videos by life area
      const results = await VideoService.searchVideosByLifeArea(lifeArea);
      console.log(`✅ Found ${results.length} videos for ${lifeArea}`);
      dispatch({ type: 'SET_LIFE_AREA_RESULTS', results });
    } catch (error) {
      console.error('❌ Life area search failed:', error);
      dispatch({ type: 'SET_LIFE_AREA_RESULTS', results: [] });
    } finally {
      dispatch({ type: 'SET_SEARCHING_LIFE_AREA', isSearching: false });
    }
  }, []);

  const renderEmpty = () => {
    if (state.loading && state.videos.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <LoadingDots color={brandColor} />
          <Text style={styles.loadingText}>Loading your memories...</Text>
        </View>
      );
    }

    if (state.videos.length === 0 && !state.loading) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="cameraFilled" size={48} color={theme.colors.text.disabled} />
          <Text style={styles.emptyTitle}>No memories yet</Text>
          <Text style={styles.emptyText}>
            Record your first video to start building your story
          </Text>
        </View>
      );
    }

    return null;
  };

  const renderSearchGrid = () => (
    <FlatList
      data={state.search.results}
      keyExtractor={(item) => item.id || ''}
      numColumns={5}
      columnWrapperStyle={styles.gridRow}
      contentContainerStyle={styles.gridContainer}
      // Performance optimizations
      initialNumToRender={20}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={true}
      getItemLayout={(data, index) => ({
        length: THUMBNAIL_HEIGHT,
        offset: THUMBNAIL_HEIGHT * Math.floor(index / 5),
        index,
      })}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.gridThumbnail}
          onPress={() => {
            const itemIndex = state.search.results.findIndex(v => v.id === item.id);
            handleGridVideoPress(item, state.search.results, itemIndex);
            handleCloseSearch();
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
              <Icon name="cameraFilled" size={20} color={theme.colors.gray400} />
            </View>
          )}
        </TouchableOpacity>
      )}
      showsVerticalScrollIndicator={false}
    />
  );

  const renderLibraryGrid = () => (
    <FlatList
      data={allVideos}
      keyExtractor={(item) => item.id || ''}
      numColumns={5}
      columnWrapperStyle={styles.gridRow}
      contentContainerStyle={styles.gridContainer}
      // Performance optimizations
      initialNumToRender={20}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={true}
      getItemLayout={(data, index) => ({
        length: THUMBNAIL_HEIGHT,
        offset: THUMBNAIL_HEIGHT * Math.floor(index / 5),
        index,
      })}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.gridThumbnail}
          onPress={() => handleGridVideoPress(item)}
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
              <Icon name="cameraFilled" size={20} color={theme.colors.gray400} />
            </View>
          )}
        </TouchableOpacity>
      )}
      showsVerticalScrollIndicator={false}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header - Normal or Search Mode */}
        {state.search.showSearch ? (
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
                      value={state.search.query}
                      onChangeText={(text) => dispatch({ type: 'SET_SEARCH_QUERY', query: text })}
                      autoFocus={true}
                      returnKeyType="search"
                    />
                    {state.search.query.length > 0 && (
                      <TouchableOpacity onPress={() => dispatch({ type: 'SET_SEARCH_QUERY', query: '' })}>
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
              {!state.search.showSearchBar ? (
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
                            <Text style={styles.title}>
                              {selectedChapterId === null
                                ? 'Chapters'
                                : chapters.find(c => c.id === selectedChapterId)?.title || 'Chapters'}
                            </Text>
                          </View>
                        </LiquidGlassView>
                      </TouchableOpacity>
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
                            const newMode = state.viewMode === 'calendar' ? 'grid' : 'calendar';
                            dispatch({ type: 'SET_VIEW_MODE', mode: newMode });
                          }}
                          style={styles.singleViewToggle}
                          fallbackStyle={{ backgroundColor: theme.colors.gray100 }}
                        >
                          <Animated.View style={{
                            transform: [{
                              scale: state.viewMode === 'calendar' ? calendarIconScale : gridIconScale
                            }],
                          }}>
                            <Icon
                              name={state.viewMode === 'calendar' ? 'calendar' : 'grid'}
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
                        onPress={() => dispatch({ type: 'OPEN_SEARCH' })}
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

          {/* Error state */}
          {state.error && !state.search.showSearch && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{state.error}</Text>
              <TouchableOpacity onPress={() => fetchVideos()} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Content Area */}
          {state.search.showSearch ? (
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
                    const isSelected = state.search.selectedLifeArea === area;
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
                {state.search.isSearchingLifeArea ? (
                  <View style={[styles.searchLoadingContainer, { paddingHorizontal: theme.spacing['4'] }]}>
                    <LoadingDots color={brandColor} size={6} />
                    <Text style={styles.searchLoadingText}>Loading...</Text>
                  </View>
                ) : state.search.selectedLifeArea && state.search.lifeAreaResults.length > 0 ? (
                  <View style={{ paddingHorizontal: 2 }}>
                    <FlatList
                      data={state.search.lifeAreaResults}
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
                          const itemIndex = state.search.lifeAreaResults.findIndex(v => v.id === item.id);

                          // 🎯 Open VideoPlayer modal with segment timestamp
                          // Pass segment_start_time so VideoPlayer seeks to the highlight
                          // Don't close search - user will return to filter view on back
                          dispatch({
                            type: 'OPEN_VIDEO_PLAYER',
                            video: item,
                            videos: state.search.lifeAreaResults,
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
                ) : state.search.isSearching ? (
                  <View style={[styles.searchLoadingContainer, { paddingHorizontal: theme.spacing['4'] }]}>
                    <LoadingDots color={brandColor} size={6} />
                    <Text style={styles.searchLoadingText}>Searching...</Text>
                  </View>
                ) : state.search.query.trim() === '' && !state.search.selectedLifeArea ? (
                  <View />
                ) : state.search.results.length === 0 && state.search.query.trim() !== '' ? (
                  <View style={[styles.searchEmptyState, { paddingHorizontal: theme.spacing['4'] }]}>
                    <Icon name="search" size={48} color={theme.colors.text.disabled} />
                    <Text style={styles.searchEmptyTitle}>No results</Text>
                    <Text style={styles.searchEmptyText}>
                      No videos found for "{state.search.query}"
                    </Text>
                  </View>
                ) : state.search.query.trim() !== '' ? (
                  <View style={{ paddingHorizontal: theme.spacing['4'] }}>
                    {renderSearchGrid()}
                  </View>
                ) : (
                  <View />
                )}
              </View>
            </TouchableWithoutFeedback>
          ) : (
            <View style={styles.contentContainer}>
              {filteredVideos.length === 0 ? (
                renderEmpty()
              ) : state.viewMode === 'grid' ? (
                <VideoGallery
                  videos={filteredVideos}
                  onVideoPress={handleGridVideoPress}
                  onEndReached={handleLoadMore}
                  onEndReachedThreshold={0.8}
                  contentInsetTop={headerHeightGrid} // ✅ Less padding for grid view (photos closer to top bar)
                />
              ) : (
                <CalendarGallery
                  videos={filteredVideos}
                  onVideoPress={handleCalendarVideoPress}
                  chapters={chapters}
                  onEndReached={handleLoadMore}
                  onEndReachedThreshold={0.8}
                  contentInsetTop={headerHeightCalendar} // ✅ More padding for calendar view
                />
              )}
            </View>
          )}

          {/* Video Player (from grid AND calendar) */}
          <VideoPlayer
            visible={state.videoPlayer.isOpen}
            video={state.videoPlayer.selectedVideo}
            videos={state.videoPlayer.videos}
            initialIndex={state.videoPlayer.initialIndex}
            initialTimestamp={state.videoPlayer.initialTimestamp}
            onClose={handleCloseVideoPlayer}
          />

          {/* Streak Modal */}
          <Modal
            visible={state.showStreakModal}
            transparent
            animationType="fade"
            onRequestClose={() => dispatch({ type: 'TOGGLE_STREAK_MODAL', show: false })}
          >
            <View style={styles.streakModalOverlay}>
              {/* Background overlay - closes modal when tapped */}
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={() => dispatch({ type: 'TOGGLE_STREAK_MODAL', show: false })}
              />

              {/* Modal content - does not close modal when tapped */}
              <View style={styles.streakModalContent}>
                    {/* Header */}
                    <View style={styles.streakModalHeader}>
                      <View style={{ flex: 1 }} />
                      <TouchableOpacity
                        onPress={() => dispatch({ type: 'TOGGLE_STREAK_MODAL', show: false })}
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

          {/* Chapter Bubbles - Scrollable vertical list of separate bubbles */}
          {showChapterModal && (
            <>
              {/* Overlay to close bubbles when tapping outside */}
              <TouchableWithoutFeedback onPress={handleCloseChapterModal}>
                <View style={styles.chapterBubblesOverlay} />
              </TouchableWithoutFeedback>

              <Animated.View
                style={[
                  styles.chapterBubblesContainer,
                  {
                    top: insets.top + 60,
                    left: theme.spacing['4'],
                    opacity: modalOpacity,
                  }
                ]}
              >
                <ScrollView
                  style={styles.chapterBubblesScroll}
                  showsVerticalScrollIndicator={false}
                  bounces={true}
                >
                  {/* All Chapters option */}
                  <TouchableOpacity
                    onPress={() => handleSelectChapter(null)}
                    activeOpacity={0.7}
                    style={styles.chapterBubbleWrapper}
                  >
                    <LiquidGlassView
                      style={[
                        styles.chapterBubbleGlass,
                        selectedChapterId === null && { backgroundColor: brandColor },
                        !isLiquidGlassSupported && {
                          backgroundColor: selectedChapterId === null ? brandColor : theme.colors.gray100,
                        }
                      ]}
                      interactive={false}
                    >
                      <View style={styles.chapterBubbleContent}>
                        <Text style={[
                          styles.chapterBubbleText,
                          selectedChapterId === null && styles.chapterBubbleTextSelected
                        ]}>
                          Chapters
                        </Text>
                      </View>
                    </LiquidGlassView>
                  </TouchableOpacity>

                  {/* Current chapter first */}
                  {currentChapter && (
                    <TouchableOpacity
                      key={currentChapter.id}
                      onPress={() => handleSelectChapter(currentChapter.id!)}
                      activeOpacity={0.7}
                      style={styles.chapterBubbleWrapper}
                    >
                      <LiquidGlassView
                        style={[
                          styles.chapterBubbleGlass,
                          selectedChapterId === currentChapter.id && { backgroundColor: brandColor },
                          !isLiquidGlassSupported && {
                            backgroundColor: selectedChapterId === currentChapter.id ? brandColor : theme.colors.gray100,
                          }
                        ]}
                        interactive={false}
                      >
                        <View style={styles.chapterBubbleContent}>
                          <Text style={[
                            styles.chapterBubbleText,
                            selectedChapterId === currentChapter.id && styles.chapterBubbleTextSelected
                          ]}>
                            {currentChapter.title}
                          </Text>
                          <View style={[styles.currentBadgeBubble, {
                            backgroundColor: selectedChapterId === currentChapter.id ? 'rgba(255,255,255,0.3)' : brandColor
                          }]}>
                            <Icon
                              name="star"
                              size={6}
                              color="#FFFFFF"
                            />
                          </View>
                        </View>
                      </LiquidGlassView>
                    </TouchableOpacity>
                  )}

                  {/* Other chapters */}
                  {chapters
                    .filter(chapter => chapter.id !== currentChapter?.id)
                    .map((chapter) => (
                      <TouchableOpacity
                        key={chapter.id}
                        onPress={() => handleSelectChapter(chapter.id!)}
                        activeOpacity={0.7}
                        style={styles.chapterBubbleWrapper}
                      >
                        <LiquidGlassView
                          style={[
                            styles.chapterBubbleGlass,
                            selectedChapterId === chapter.id && { backgroundColor: brandColor },
                            !isLiquidGlassSupported && {
                              backgroundColor: selectedChapterId === chapter.id ? brandColor : theme.colors.gray100,
                            }
                          ]}
                          interactive={false}
                        >
                          <View style={styles.chapterBubbleContent}>
                            <Text style={[
                              styles.chapterBubbleText,
                              selectedChapterId === chapter.id && styles.chapterBubbleTextSelected
                            ]}>
                              {chapter.title}
                            </Text>
                          </View>
                        </LiquidGlassView>
                      </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Fade gradients for smooth scroll effect */}
                <LinearGradient
                  colors={['rgba(255,255,255,1)', 'rgba(255,255,255,0)']}
                  style={styles.chapterBubblesFadeTop}
                  pointerEvents="none"
                />
                <LinearGradient
                  colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
                  style={styles.chapterBubblesFadeBottom}
                  pointerEvents="none"
                />
              </Animated.View>
            </>
          )}

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
  errorContainer: {
    alignItems: 'center',
    padding: theme.spacing['5'],
    backgroundColor: theme.colors.gray50,
    borderRadius: 12,
    marginHorizontal: theme.spacing['4'],
    marginBottom: theme.spacing['4'],
  },
  errorText: {
    ...theme.typography.body2,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing['3'],
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: theme.spacing['5'],
    paddingVertical: theme.spacing['2.5'],
    backgroundColor: theme.colors.brand.primary,
    borderRadius: 8,
  },
  retryText: {
    ...theme.typography.body2,
    fontWeight: '600',
    color: theme.colors.white,
  },
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
  // Chapter Bubbles - Scrollable separate bubbles
  chapterBubblesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 999,
  },
  chapterBubblesContainer: {
    position: 'absolute',
    zIndex: 1000,
  },
  chapterBubblesScroll: {
    maxHeight: '70%', // Max 70% of screen height for scrolling
  },
  chapterBubbleWrapper: {
    marginBottom: 8, // Space between bubbles
    alignSelf: 'flex-start', // Width adapts to content
  },
  chapterBubbleGlass: {
    borderRadius: 22,
    overflow: 'hidden',
    height: 44, // Same height as main Chapters button
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chapterBubbleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center text horizontally
    paddingHorizontal: 16,
    paddingRight: 30, // More space for badge
    height: '100%',
    position: 'relative',
  },
  chapterBubbleText: {
    fontFamily: 'Poppins-SemiBoldItalic',
    fontSize: 16,
    fontWeight: '600',
    fontStyle: 'italic',
    letterSpacing: -0.48,
    color: theme.colors.text.primary,
    textAlign: 'center', // Center text
  },
  chapterBubbleTextSelected: {
    color: theme.colors.white,
  },
  currentBadgeBubble: {
    position: 'absolute',
    right: 12,
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chapterBubblesFadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    zIndex: 1001,
  },
  chapterBubblesFadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    zIndex: 1001,
  },
});

export default LibraryScreen;