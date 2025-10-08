import React, { useState, useEffect, useCallback, useRef, useReducer, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { launchImageLibrary } from 'react-native-image-picker';
import { theme } from '../styles';
import { useTheme } from '../hooks/useTheme';
import { TopBar } from '../components/TopBar';
import { Icon } from '../components/Icon';
import { CalendarGallerySimple as CalendarGallery } from '../components/CalendarGallerySimple';
import { ZoomableVideoGallery } from '../components/ZoomableVideoGallery';
import { VideoPlayer } from '../components/VideoPlayer';
import { DayDebriefScreen } from './DayDebriefScreen';
import { VideoRecord } from '../lib/supabase';
import { VideoService } from '../services/videoService';
import { VideoCacheService } from '../services/videoCacheService';
import { ImportQueueService, ImportQueueState } from '../services/importQueueService';
import Reanimated, { useSharedValue } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SharedElementPortal } from '../components/library/transition/SharedElementPortal';
import { useSharedTransition } from '../components/library/transition/useSharedTransition';
import { ZoomableMediaViewer } from '../components/library/ZoomableMediaViewer';
import { Asset, SourceRect } from '../components/library/types';
import { libraryReducer, initialLibraryState } from './LibraryScreen.reducer';

const { width: screenWidth } = Dimensions.get('window');
const GRID_PADDING = 4;
const GRID_GAP = 1;
const THUMBNAIL_WIDTH = (screenWidth - (GRID_PADDING * 2) - (GRID_GAP * 4)) / 5; // 5 columns with gaps
const THUMBNAIL_HEIGHT = THUMBNAIL_WIDTH * 1.33; // Vertical aspect ratio (4:3)

const VIDEOS_PER_PAGE = 50;

const LibraryScreen: React.FC = () => {
  const navigation = useNavigation();
  const theme = useTheme();

  // ✅ Replace 20+ useState with single useReducer
  const [state, dispatch] = useReducer(libraryReducer, initialLibraryState);

  // Keep refs and animations (not part of state)
  const searchBarProgress = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useSharedValue(0);

  const {
    transitionState,
    open,
    close,
    handleAnimationComplete,
    transitionSpec,
  } = useSharedTransition({
    onOpenComplete: () => {
      console.log('✅ Zoom transition opened');
      backdropOpacity.value = 0.95;
    },
    onCloseComplete: () => {
      console.log('✅ Zoom transition closed');
      dispatch({ type: 'CLOSE_ZOOM_VIEWER' });
      backdropOpacity.value = 0;
    },
  });

  // Create placeholder videos for videos being uploaded
  const createUploadingPlaceholders = useCallback((queueState: ImportQueueState | null): VideoRecord[] => {
    if (!queueState || queueState.items.length === 0) return [];

    return queueState.items
      .filter(item => item.status === 'pending' || item.status === 'uploading')
      .map(item => ({
        id: item.id,
        title: item.title || 'Uploading...',
        file_path: item.uri,
        thumbnail_path: item.uri, // Use video URI as thumbnail temporarily
        duration: item.pickerAsset?.duration || 0,
        user_id: '',
        created_at: new Date().toISOString(),
        // Mark as uploading for UI
        metadata: { isUploading: true, progress: item.progress },
      } as VideoRecord));
  }, []);

  // Fetch videos with cache-first strategy and pagination
  const fetchVideos = useCallback(async (pageToLoad: number = 0, append: boolean = false) => {
    try {
      if (!append) {
        dispatch({ type: 'FETCH_START' });

        // Initial load - try cache first
        console.log('📦 Loading videos from cache...');
        const { videos: cachedVideos } = await VideoCacheService.loadFromCache();

        if (cachedVideos.length > 0) {
          console.log(`✅ Showing ${cachedVideos.length} cached videos immediately`);
          // Sort cached videos
          const sortedCached = cachedVideos.sort((a, b) =>
            new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
          );
          dispatch({ type: 'FETCH_SUCCESS', videos: sortedCached });
        }
      } else {
        dispatch({ type: 'LOAD_MORE_START' });
      }

      // Fetch fresh data with pagination
      const offset = pageToLoad * VIDEOS_PER_PAGE;
      console.log(`🔄 Fetching videos page ${pageToLoad} (offset: ${offset}, limit: ${VIDEOS_PER_PAGE})`);

      const videosData = await VideoService.getAllVideos(undefined, VIDEOS_PER_PAGE, offset);
      console.log('✅ Fresh videos fetched:', videosData.length);

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
        // Update cache only on initial load
        await VideoCacheService.saveToCache(sortedFresh);
      }
    } catch (error) {
      console.error('❌ Error fetching videos:', error);
      if (append) {
        dispatch({ type: 'LOAD_MORE_ERROR' });
      } else {
        dispatch({ type: 'FETCH_ERROR', error: 'Failed to load videos. Please try again.' });
      }
    }
  }, []);

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

  // Load videos on component mount
  useEffect(() => {
    fetchVideos(0, false);
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

  // ✅ Memoize streak calculation (expensive operation)
  const currentStreak = useMemo(() => {
    return calculateStreak(state.videos);
  }, [state.videos, calculateStreak]);

  // Update streak in state when it changes
  useEffect(() => {
    dispatch({ type: 'UPDATE_STREAK', streak: currentStreak });
  }, [currentStreak]);

  // Subscribe to import queue updates
  useEffect(() => {
    // Load persisted queue state on mount
    ImportQueueService.loadQueueState();

    // Subscribe to queue updates
    const unsubscribe = ImportQueueService.subscribe((queueState) => {
      dispatch({ type: 'UPDATE_IMPORT_STATE', queueState });

      // Don't show progress modal - videos will show inline with spinner
      // Just refresh when imports complete
      if (queueState.completedCount > 0 && !queueState.isProcessing) {
        fetchVideos();
      }
    });

    return () => unsubscribe();
  }, [fetchVideos]);

  // Mock chapters data - you can fetch this from your database later
  const chapters = [
    {
      id: '1',
      title: 'Chapter 1: Lost',
      periodStart: new Date('2024-12-01'),
      periodEnd: new Date('2025-01-31'),
    },
    {
      id: '2',
      title: 'Chapter 2: Found',
      periodStart: new Date('2025-02-01'),
      periodEnd: new Date('2025-03-31'),
    },
  ];

  // ✅ Memoize combined videos
  const allVideos = useMemo(() => {
    const uploadingPlaceholders = createUploadingPlaceholders(state.importState.queueState);
    // Put uploading videos first (most recent)
    return [...uploadingPlaceholders, ...state.videos];
  }, [state.videos, state.importState.queueState, createUploadingPlaceholders]);

  // Handler for CALENDAR view - Opens DayDebriefScreen
  const handleCalendarVideoPress = useCallback((
    video: VideoRecord,
    allVideosFromDay?: VideoRecord[],
    index: number = 0
  ) => {
    console.log('📅 Calendar video selected:', {
      date: video.created_at,
      totalVideos: allVideosFromDay?.length || 1,
    });

    // Open Day Debrief Screen with all videos from that day
    const videosToShow = allVideosFromDay || [video];
    const date = new Date(video.created_at);

    dispatch({ type: 'OPEN_DAY_DEBRIEF', date, videos: videosToShow });
  }, []);

  const handleCloseDayDebrief = useCallback(() => {
    dispatch({ type: 'CLOSE_DAY_DEBRIEF' });
  }, []);

  // Handler for CALENDAR view with Apple Photos-style zoom
  const handleCalendarVideoPressWithRect = useCallback(
    (video: VideoRecord, rect: SourceRect, allVideosFromDay?: VideoRecord[], index: number = 0) => {
      console.log('🔍 Calendar video selected with rect:', {
        video: video.title,
        rect: { x: rect.pageX, y: rect.pageY, w: rect.width, h: rect.height },
      });

      // Convert VideoRecord to Asset
      const getVideoUri = (filePath: string) => {
        if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
          return filePath;
        }
        const baseUrl = 'https://eenyzudwktcjpefpoapi.supabase.co/storage/v1/object/public/videos';
        let cleanPath = filePath;
        if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
        if (cleanPath.startsWith('videos/')) cleanPath = cleanPath.substring('videos/'.length);
        return `${baseUrl}/${cleanPath}`;
      };

      const getThumbnailUri = () => {
        if (video.thumbnail_frames && video.thumbnail_frames.length > 0) {
          return video.thumbnail_frames[0];
        }
        if (video.thumbnail_path) {
          if (video.thumbnail_path.startsWith('http')) return video.thumbnail_path;
          return `https://eenyzudwktcjpefpoapi.supabase.co/storage/v1/object/public/videos/${video.thumbnail_path}`;
        }
        return undefined;
      };

      const asset: Asset = {
        id: video.id || '',
        type: 'video',
        uri: getVideoUri(video.file_path || ''),
        width: 1080,
        height: 1920,
        thumbnailUri: getThumbnailUri(),
        duration: video.duration,
        createdAt: video.created_at || new Date().toISOString(),
      };

      console.log('📦 Created asset:', { id: asset.id, uri: asset.uri, thumbnail: asset.thumbnailUri });

      dispatch({ type: 'OPEN_ZOOM_VIEWER', asset });
      open(asset, rect);
    },
    [open]
  );

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

  // Generate current month days with activity status
  const getCurrentMonthDays = useCallback(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    const videoDates = new Set(
      allVideos.map(video => {
        const date = new Date(video.created_at);
        if (date.getMonth() === month && date.getFullYear() === year) {
          return date.getDate();
        }
        return null;
      }).filter(Boolean)
    );

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        day,
        date,
        hasVideo: videoDates.has(day),
        isToday: day === today.getDate(),
      });
    }

    return days;
  }, [allVideos]);

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
    if (state.search.showSearchBar) {
      toggleSearchBar();
    }
  }, [state.search.showSearchBar]);

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

  const handleOutsidePress = useCallback(() => {
    if (state.search.showSearch) {
      handleCloseSearch();
    } else if (state.search.showSearchBar) {
      toggleSearchBar();
    }
  }, [state.search.showSearch, state.search.showSearchBar, handleCloseSearch, toggleSearchBar]);

  // Handle import videos from gallery using native PHPicker
  const handleImportVideos = () => {
    console.log('📱 Opening video picker...');

    // Use callback-based API (Promise version was hanging)
    launchImageLibrary(
      {
        mediaType: 'video',
        selectionLimit: 0, // 0 = unlimited selection (iOS 14+)
        presentationStyle: 'fullScreen',
      },
      async (result) => {
        try {
          console.log('🎯 Picker returned');

          if (result.didCancel) {
            console.log('❌ User cancelled video selection');
            return;
          }

          if (result.errorCode) {
            console.error('❌ Picker error:', result.errorCode, result.errorMessage);
            Alert.alert('Error', `Could not access videos: ${result.errorMessage}`);
            return;
          }

          if (!result.assets || result.assets.length === 0) {
            console.log('❌ No videos selected');
            return;
          }

          console.log(`✅ Selected ${result.assets.length} videos from native picker`);

          console.log('📋 Video details:');
          result.assets.forEach((asset, index) => {
            console.log(`  Video ${index + 1}:`);
            console.log(`    - uri: ${asset.uri}`);
            console.log(`    - fileName: ${asset.fileName}`);
            console.log(`    - type: ${asset.type}`);
            console.log(`    - fileSize: ${asset.fileSize}`);
            console.log(`    - width: ${asset.width}`);
            console.log(`    - height: ${asset.height}`);
            console.log(`    - duration: ${asset.duration}`);
          });

          // Convert to ImagePicker format with proper types
          console.log('🔄 Converting to ImagePicker format...');
          const videosToImport: ImagePicker.ImagePickerAsset[] = result.assets
            .filter(asset => {
              if (!asset.uri) {
                console.warn('⚠️ Skipping asset without URI:', asset.fileName);
                return false;
              }
              return true;
            })
            .map(asset => ({
              uri: asset.uri!,
              width: asset.width || 0,
              height: asset.height || 0,
              fileName: asset.fileName,
              fileSize: asset.fileSize,
              type: 'video' as const,
              duration: asset.duration,
              base64: asset.base64,
              originalPath: asset.originalPath,
              bitrate: asset.bitrate,
              timestamp: asset.timestamp,
              id: asset.id,
            }));

          console.log(`✅ ${videosToImport.length} videos ready for import`);

          // Add to import queue (this will trigger the upload in background)
          console.log('📥 Adding videos to ImportQueueService...');
          await ImportQueueService.addPickerVideosToQueue(videosToImport);
          console.log('✅ Videos added to queue successfully!');

          // Refresh immediately to show uploading videos
          fetchVideos();
        } catch (error) {
          console.error('========================================');
          console.error('❌ ERROR IN CALLBACK');
          console.error('========================================');
          console.error('Error details:', error);
          console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
          console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
          Alert.alert('Error', 'An error occurred during video import.');
        }
      }
    );
  };

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

  const renderEmpty = () => {
    if (state.loading && state.videos.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.brand.primary} />
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
            handleGridVideoPress(item);
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.ui.background }]}>
      <TouchableWithoutFeedback onPress={handleOutsidePress}>
        <View style={styles.content}>
          {/* Header - Normal or Search Mode */}
          {state.search.showSearch ? (
            <View style={styles.searchHeader}>
              <View style={styles.searchInputContainer}>
                <Icon name="search" size={20} color={theme.colors.text.tertiary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher par titre, date, mots-clés..."
                  placeholderTextColor={theme.colors.text.tertiary}
                  value={state.search.query}
                  onChangeText={(text) => dispatch({ type: 'SET_SEARCH_QUERY', query: text })}
                  autoFocus={true}
                  returnKeyType="search"
                />
                {state.search.query.length > 0 && (
                  <TouchableOpacity onPress={() => dispatch({ type: 'SET_SEARCH_QUERY', query: '' })}>
                    <Icon name="close" size={20} color={theme.colors.text.tertiary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.header}>
              {!state.search.showSearchBar ? (
                <>
                  {/* Normal mode: chap + spacer + icons aligned right */}
                  <Animated.View
                    style={{
                      opacity: searchBarProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0],
                      }),
                      transform: [{
                        translateX: searchBarProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -100],
                        }),
                      }],
                    }}
                  >
                    <Text style={styles.title}>chap</Text>
                  </Animated.View>

                  <View style={{ flex: 1 }} />

                  <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.iconButton} onPress={toggleSearchBar}>
                      <Icon name="chevronLeft" size={20} color={theme.colors.text.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => dispatch({ type: 'SET_VIEW_MODE', mode: state.viewMode === 'calendar' ? 'grid' : 'calendar' })}
                    >
                      <Icon
                        name={state.viewMode === 'calendar' ? 'grid' : 'calendar'}
                        size={20}
                        color={theme.colors.text.primary}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => dispatch({ type: 'TOGGLE_STREAK_MODAL', show: true })}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.streakContainer,
                        { backgroundColor: theme.colors.ui.surfaceHover }
                      ]}>
                        <Image
                          source={require('../../assets/fire.png')}
                          style={styles.fireIcon}
                          resizeMode="contain"
                        />
                        <Text style={[styles.streakText, { color: theme.colors.text.primary }]}>
                          {currentStreak}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  {/* Expanded mode: arrow left + search bar center + icons right */}
                  <Animated.View
                    style={{
                      opacity: searchBarProgress,
                      transform: [{
                        translateX: searchBarProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [250, 0], // Arrow slides from right (its normal position) to left
                        }),
                      }],
                    }}
                  >
                    <TouchableOpacity style={styles.iconButton} onPress={toggleSearchBar}>
                      <Icon name="chevronRight" size={20} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                  </Animated.View>

                  <Animated.View
                    style={{
                      flex: 1,
                      marginHorizontal: theme.spacing['2'],
                      opacity: searchBarProgress,
                      transform: [{
                        translateX: searchBarProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [300, 0], // Search bar slides in from right, slides out to right
                        }),
                      }],
                    }}
                  >
                    <TouchableOpacity
                      style={styles.expandedSearchInner}
                      onPress={() => dispatch({ type: 'TOGGLE_SEARCH_BAR', show: true })}
                      activeOpacity={0.7}
                    >
                      <Icon name="search" size={16} color={theme.colors.text.tertiary} />
                      <Text style={styles.searchBarPlaceholder}>Search...</Text>
                    </TouchableOpacity>
                  </Animated.View>

                  <Animated.View
                    style={[
                      styles.headerRight,
                      {
                        opacity: searchBarProgress,
                        transform: [{
                          translateX: searchBarProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [100, 0], // Icons slide in from right
                          }),
                        }],
                      }
                    ]}
                  >
                    <TouchableOpacity style={styles.iconButton} onPress={handleImportVideos}>
                      <Icon name="plus" size={20} color={theme.colors.text.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => dispatch({ type: 'SET_VIEW_MODE', mode: state.viewMode === 'calendar' ? 'grid' : 'calendar' })}
                    >
                      <Icon
                        name={state.viewMode === 'calendar' ? 'grid' : 'calendar'}
                        size={20}
                        color={theme.colors.text.primary}
                      />
                    </TouchableOpacity>

                    {/* Bouton Vertical Feed Mode */}
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => handleOpenVerticalFeed(0)}
                      disabled={state.videos.length === 0}
                    >
                      <Icon
                        name="play"
                        size={20}
                        color={state.videos.length === 0 ? theme.colors.text.disabled : theme.colors.text.primary}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.iconButton} onPress={handleNavigateToSettings}>
                      <Icon name="settings" size={20} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                  </Animated.View>
                </>
              )}
            </View>
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
            <View style={styles.searchContentContainer}>
              {state.search.isSearching ? (
                <View style={styles.searchLoadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.brand.primary} />
                  <Text style={styles.searchLoadingText}>Recherche en cours...</Text>
                </View>
              ) : state.search.query.trim() === '' ? (
                <View style={styles.searchEmptyState}>
                  <Icon name="search" size={32} color={theme.colors.text.disabled} />
                  <Text style={styles.searchEmptyTitle}>Search for your video</Text>
                </View>
              ) : state.search.results.length === 0 ? (
                <View style={styles.searchEmptyState}>
                  <Icon name="search" size={48} color={theme.colors.text.disabled} />
                  <Text style={styles.searchEmptyTitle}>Aucun résultat</Text>
                  <Text style={styles.searchEmptyText}>
                    Aucune vidéo trouvée pour "{state.search.query}"
                  </Text>
                </View>
              ) : (
                renderSearchGrid()
              )}
            </View>
          ) : (
            <View style={styles.contentContainer}>
              {allVideos.length === 0 ? (
                renderEmpty()
              ) : state.viewMode === 'grid' ? (
                <ZoomableVideoGallery
                  videos={allVideos}
                  onVideoPress={handleGridVideoPress}
                  onEndReached={handleLoadMore}
                  onEndReachedThreshold={0.8}
                />
              ) : (
                <CalendarGallery
                  videos={allVideos}
                  onVideoPressWithRect={handleCalendarVideoPressWithRect}
                  onVideoPress={handleCalendarVideoPress}
                  chapters={chapters}
                  onEndReached={handleLoadMore}
                  onEndReachedThreshold={0.8}
                />
              )}
            </View>
          )}

          {/* Day Debrief Screen (from calendar) */}
          {state.dayDebrief.selectedDate && (
            <DayDebriefScreen
              visible={state.dayDebrief.isOpen}
              date={state.dayDebrief.selectedDate}
              videos={state.dayDebrief.videos}
              onClose={handleCloseDayDebrief}
            />
          )}

          {/* Video Player (from grid) */}
          <VideoPlayer
            visible={state.videoPlayer.isOpen}
            video={state.videoPlayer.selectedVideo}
            videos={state.videoPlayer.videos}
            initialIndex={state.videoPlayer.initialIndex}
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
                      {getCurrentMonthDays().map((dayData) => (
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

          {/* Removed Import Progress Modal - videos now show inline with spinner */}
        </View>
      </TouchableWithoutFeedback>

      {/* Apple Photos-style Zoom Viewer */}
      {state.zoomViewer.isOpen && state.zoomViewer.asset && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {/* Backdrop */}
          <Reanimated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: 'black',
                opacity: backdropOpacity,
              },
            ]}
          />

          {/* Transition Portal */}
          {transitionState.isTransitioning &&
           transitionState.sourceRect &&
           transitionState.targetRect && (
            <SharedElementPortal
              sourceRect={transitionState.sourceRect}
              targetRect={transitionState.targetRect}
              imageUri={state.zoomViewer.asset.thumbnailUri || state.zoomViewer.asset.uri}
              transitionSpec={transitionSpec}
              direction={transitionState.direction || 'open'}
              onAnimationComplete={handleAnimationComplete}
            />
          )}

          {/* Zoomable Viewer */}
          {!transitionState.isTransitioning && (
            <ZoomableMediaViewer
              asset={state.zoomViewer.asset}
              backdropOpacity={backdropOpacity}
              onClose={() => {
                console.log('🔙 Closing zoom viewer');
                if (transitionState.sourceRect) {
                  close(transitionState.sourceRect);
                } else {
                  // Fallback: just close without transition
                  dispatch({ type: 'CLOSE_ZOOM_VIEWER' });
                  backdropOpacity.value = 0;
                }
              }}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['3'],
    backgroundColor: theme.colors.white,
  },
  logo: {
    width: 32,
    height: 32,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  fireIcon: {
    width: 20,
    height: 20,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '600',
  },
  iconButton: {
    padding: theme.spacing['1'], // 4px - divise par 2 l'espacement original
  },
  title: {
    fontFamily: 'Poppins-SemiBoldItalic',
    fontSize: 24,
    fontWeight: '600', // semi-bold (backup for systems without custom font)
    fontStyle: 'italic', // backup for systems without custom font
    letterSpacing: -0.72, // -3% de 24px
    color: theme.colors.text.primary,
    overflow: 'hidden',
  },
  contentContainer: {
    flex: 1,
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
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['3'],
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray100,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['3'],
    borderWidth: 1,
    borderColor: theme.colors.ui.border,
    borderRadius: 12,
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['3'],
    backgroundColor: theme.colors.gray50,
  },
  searchInput: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text.primary,
  },
  searchContentContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing['4'],
    paddingTop: theme.spacing['2'],
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
  // Expanded search bar (when open)
  expandedSearchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(128, 128, 128, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    height: 36,
  },
  searchBarPlaceholder: {
    fontSize: 14,
    color: theme.colors.text.tertiary,
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
});

export default LibraryScreen;