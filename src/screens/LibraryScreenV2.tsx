/**
 * LibraryScreenV2 - Version avec React Query
 *
 * Migration complète vers TanStack Query:
 * - useInfiniteQuery pour la pagination
 * - Optimistic updates sur delete
 * - Cache automatique avec invalidation intelligente
 * - Pull-to-refresh simplifié
 *
 * Phase 3 - TanStack Query Migration
 */

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
import { Icon } from '../components/Icon';
import { LoadingDots } from '../components/LoadingDots';
import { VideoPlayer } from '../components/VideoPlayer';
import { VideoRecord } from '../lib/supabase';
import { ImportQueueService, ImportQueueState } from '../services/importQueueService';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { GlassButton, GlassContainer } from './OptimizedGlassComponents';
import { useTheme as useThemeContext } from '../contexts/ThemeContext';

// ✅ Phase 3.3 - Refactored UI components
import {
  LibraryChapterModal,
  LibraryCalendarView,
  LibraryGridView,
  LibrarySearchResults,
} from './Library/components';

// ✅ Phase 3 - Use React Query version of data hook
import { useLibraryDataV2 } from './Library/hooks/useLibraryDataV2';
import { useStreak, useLibraryAnimations, useLibrarySearch } from './Library/hooks';

// ✅ React Query hooks for mutations
import { useDeleteVideoMutation } from '../hooks/queries/useVideosQuery';

const { width: screenWidth } = Dimensions.get('window');
const GRID_PADDING = 4;
const GRID_GAP = 1;
const THUMBNAIL_WIDTH = (screenWidth - (GRID_PADDING * 2) - (GRID_GAP * 4)) / 5; // 5 columns with gaps
const THUMBNAIL_HEIGHT = THUMBNAIL_WIDTH * 1.33; // Vertical aspect ratio (4:3)

// Life areas for filtering
const LIFE_AREAS = [
  'Health', 'Family', 'Friends', 'Love', 'Work',
  'Business', 'Money', 'Growth', 'Leisure', 'Home',
  'Spirituality', 'Community'
];

const LibraryScreenV2: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { brandColor } = useThemeContext();

  // ✅ Phase 3 - Use React Query version of data hook
  const libraryData = useLibraryDataV2();
  const libraryAnimations = useLibraryAnimations(libraryData.viewMode);
  const librarySearch = useLibrarySearch(libraryAnimations.searchBarProgress);
  const streakData = useStreak(libraryData.videos);

  // ✅ React Query mutation for delete
  const deleteVideoMutation = useDeleteVideoMutation();

  // Extract functions and state from hooks for direct use
  const { fetchVideos, handleLoadMore, selectedChapterId, setSelectedChapterId, chapters, currentChapter } = libraryData;
  const {
    performSearch,
    handleSearchPress,
    handleCloseSearch,
    toggleSearchBar,
    handleCollapseSearchBar,
    handleLifeAreaPress,
    query: searchQuery,
    results: searchResults,
    setQuery: setSearchQuery,
    isSearching,
    showSearch,
    showSearchBar,
    selectedLifeArea,
    lifeAreaResults,
    isSearchingLifeArea,
    lifeAreaScrollViewRef,
  } = librarySearch;
  const { currentStreak, getStreakMessage, getCurrentMonthDays } = streakData;

  // Track keyboard visibility
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Modal states
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);

  // Search input ref
  const searchInputRef = useRef<TextInput>(null);

  // ✅ Calculate header height for content inset
  // Header is now absolute positioned, so we need proper inset
  const headerHeightCalendar = insets.top + 72; // More spacing for calendar view
  const headerHeightGrid = insets.top + 60; // Less spacing for grid view

  // Extract animations for backward compatibility
  const { searchBarProgress, calendarIconScale, gridIconScale, toggleSelectorPosition, scrollY, headerOpacity } = libraryAnimations;
  const { modalScale, modalOpacity, filterButtonScale, chapterScrollY, chapterTitleSlide, chapterTitleOpacity } = libraryAnimations;

  // ✅ FIX: Stable date ref to avoid recalculations every minute
  const currentDateRef = useRef(new Date());

  // Create infinite scroll array (3x duplication for smooth looping)
  const infiniteLifeAreas = useMemo(() => {
    return [...LIFE_AREAS, ...LIFE_AREAS, ...LIFE_AREAS];
  }, []);

  // Handle life area scroll for infinite loop
  const handleLifeAreaScroll = useCallback((event: any) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const contentWidth = event.nativeEvent.contentSize.width;
    const viewWidth = event.nativeEvent.layoutMeasurement.width;

    // Approximate width of one set of items (12 items)
    const oneSetWidth = contentWidth / 3;

    // If scrolled past 2/3 (into the third set), jump back to middle set
    if (scrollX > oneSetWidth * 2 - viewWidth) {
      librarySearch.lifeAreaScrollViewRef.current?.scrollTo({ x: oneSetWidth, animated: false });
    }
    // If scrolled before 1/3 (into the first set), jump forward to middle set
    else if (scrollX < oneSetWidth / 3) {
      librarySearch.lifeAreaScrollViewRef.current?.scrollTo({ x: oneSetWidth + scrollX, animated: false });
    }
  }, [librarySearch.lifeAreaScrollViewRef]);

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
  const isFirstRender = useRef(true);

  useEffect(() => {
    const targetCalendarScale = libraryData.viewMode === 'calendar' ? 1 : 0.9;
    const targetGridScale = libraryData.viewMode === 'grid' ? 1 : 0.9;
    const targetSelectorPosition = libraryData.viewMode === 'calendar' ? 0 : 1;

    if (isFirstRender.current) {
      calendarIconScale.setValue(targetCalendarScale);
      gridIconScale.setValue(targetGridScale);
      toggleSelectorPosition.setValue(targetSelectorPosition);
      isFirstRender.current = false;
    } else {
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
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }),
      ]).start();
    }
  }, [libraryData.viewMode]);

  // ✅ React Query: Pull-to-refresh handler simplified
  const onRefresh = useCallback(async () => {
    console.log('🔄 [React Query] Pull-to-refresh triggered');
    await fetchVideos(); // React Query will handle the rest
  }, [fetchVideos]);

  // Handle search input change
  const handleSearchInputChange = useCallback((text: string) => {
    setSearchQuery(text);
    performSearch(text);
  }, [setSearchQuery, performSearch]);

  // ✅ Open video handler with React Query data
  const openVideo = useCallback((video: VideoRecord, videos: VideoRecord[], initialTimestamp?: number) => {
    console.log(`🎬 Opening video: ${video.title || 'Untitled'} at ${initialTimestamp || 0}s`);
    const index = videos.findIndex(v => v.id === video.id);

    libraryData.setVideoPlayer({
      isOpen: true,
      selectedVideo: video,
      videos,
      initialIndex: Math.max(0, index),
      initialTimestamp,
    });
    // ✅ VideoPlayer is a Modal component, not a navigation screen
  }, [libraryData]);

  // ✅ Close video player handler
  const handleCloseVideoPlayer = useCallback(() => {
    libraryData.setVideoPlayer({ isOpen: false });
  }, [libraryData]);

  // ✅ Delete video handler with React Query mutation
  const handleDeleteVideo = useCallback(async (video: VideoRecord) => {
    Alert.alert(
      'Delete Video',
      'Are you sure you want to delete this video? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // ✅ Use React Query mutation with optimistic update
              await deleteVideoMutation.mutateAsync(video.id);
              console.log('✅ [React Query] Video deleted successfully');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('❌ [React Query] Failed to delete video:', error);
              Alert.alert('Error', 'Failed to delete video');
            }
          },
        },
      ]
    );
  }, [deleteVideoMutation]);

  // Handle view mode toggle
  const handleViewModeToggle = useCallback((mode: 'calendar' | 'grid') => {
    libraryData.setViewMode(mode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [libraryData.setViewMode]);

  // Handle import videos
  const handleImportVideos = useCallback(() => {
    navigation.navigate('VideoImport' as never);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [navigation]);

  // Handle outside press for search
  const handleOutsidePress = useCallback(() => {
    if (searchQuery) {
      Keyboard.dismiss();
    } else {
      handleCloseSearch();
    }
  }, [searchQuery, handleCloseSearch]);

  // Handle open chapter modal
  const handleOpenChapterModal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowChapterModal(true);
  }, []);

  // Handle close chapter modal
  const handleCloseChapterModal = useCallback(() => {
    setShowChapterModal(false);
  }, []);

  // Filter videos by chapter if selected
  const filteredVideos = useMemo(() => {
    if (!selectedChapterId) {
      return libraryData.videos;
    }

    const selectedChapter = chapters.find(c => c.id === selectedChapterId);
    if (!selectedChapter) {
      return libraryData.videos;
    }

    return libraryData.videos.filter(video => {
      const videoDate = new Date(video.created_at);
      const startDate = new Date(selectedChapter.created_at);
      const endDate = selectedChapter.completed_at ? new Date(selectedChapter.completed_at) : new Date();

      return videoDate >= startDate && videoDate <= endDate;
    });
  }, [libraryData.videos, selectedChapterId, chapters]);

  // Render content based on state
  const renderContent = () => {
    if (libraryData.loading && libraryData.videos.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <LoadingDots />
        </View>
      );
    }

    if (searchQuery) {
      return (
        <LibrarySearchResults
          query={searchQuery}
          results={searchResults}
          isSearching={isSearching}
          onVideoPress={openVideo}
          brandColor={brandColor}
        />
      );
    }

    if (libraryData.viewMode === 'calendar') {
      return (
        <LibraryCalendarView
          videos={filteredVideos}
          onVideoPress={openVideo}
          chapters={chapters}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.8}
          contentInsetTop={headerHeightCalendar}
          refreshControl={
            <RefreshControl
              refreshing={libraryData.loading}
              onRefresh={onRefresh}
              tintColor={brandColor}
            />
          }
        />
      );
    } else {
      return (
        <LibraryGridView
          videos={filteredVideos}
          onVideoPress={openVideo}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.8}
          contentInsetTop={headerHeightGrid}
          refreshControl={
            <RefreshControl
              refreshing={libraryData.loading}
              onRefresh={onRefresh}
              tintColor={brandColor}
            />
          }
        />
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header - Normal or Search Mode */}
        {showSearch ? (
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
                      value={searchQuery}
                      onChangeText={(text) => {
                        setSearchQuery(text);
                        performSearch(text);
                      }}
                      autoFocus={true}
                      returnKeyType="search"
                    />
                    {searchQuery && searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
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
              {!showSearchBar ? (
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
                            outputRange: [0, -200],
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
                          interactive={true}
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
                            outputRange: [0, 200],
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
                    {/* Expanded mode: search bar + import + settings */}
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

        {/* Content Area */}
        {showSearch ? (
          <TouchableWithoutFeedback onPress={handleOutsidePress}>
            <View style={[styles.searchContentContainer, { paddingTop: insets.top + 44 }]}>
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
                  const isSelected = selectedLifeArea === area;
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
              {isSearchingLifeArea ? (
                <View style={[styles.searchLoadingContainer, { paddingHorizontal: theme.spacing['4'] }]}>
                  <LoadingDots />
                  <Text style={styles.searchLoadingText}>Loading...</Text>
                </View>
              ) : selectedLifeArea && lifeAreaResults.length > 0 ? (
                <View style={{ paddingHorizontal: 2 }}>
                  <FlatList
                    data={lifeAreaResults}
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
                          const itemIndex = lifeAreaResults.findIndex(v => v.id === item.id);
                          openVideo(item, lifeAreaResults, item.segment_start_time);
                        }}
                      >
                        <Image
                          source={{ uri: item.thumbnail_path || undefined }}
                          style={styles.lifeAreaGridImage}
                        />
                      </TouchableOpacity>
                    )}
                  />
                </View>
              ) : selectedLifeArea && lifeAreaResults.length === 0 ? (
                <View style={styles.searchEmptyContainer}>
                  <Text style={styles.searchEmptyText}>
                    No videos found for "{selectedLifeArea}"
                  </Text>
                </View>
              ) : searchQuery ? (
                // Show regular search results when searching by text
                renderContent()
              ) : null}
            </View>
          </TouchableWithoutFeedback>
        ) : (
          // Normal mode - show library content
          renderContent()
        )}

        {/* Chapter Modal */}
        <LibraryChapterModal
          visible={showChapterModal}
          chapters={chapters}
          currentChapter={currentChapter}
          selectedChapterId={selectedChapterId}
          onSelectChapter={setSelectedChapterId}
          onClose={() => setShowChapterModal(false)}
          modalScale={modalScale}
          modalOpacity={modalOpacity}
          chapterScrollY={chapterScrollY}
          chapterTitleSlide={chapterTitleSlide}
          chapterTitleOpacity={chapterTitleOpacity}
          brandColor={brandColor}
        />

        {/* Video Player Modal - ✅ Fixed from navigation.navigate bug */}
        <VideoPlayer
          visible={libraryData.videoPlayer.isOpen}
          video={libraryData.videoPlayer.selectedVideo}
          videos={libraryData.videoPlayer.videos}
          initialIndex={libraryData.videoPlayer.initialIndex}
          initialTimestamp={libraryData.videoPlayer.initialTimestamp}
          onClose={handleCloseVideoPlayer}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
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
    gap: theme.spacing['3'],
  },
  searchGlassBar: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
  },
  searchInputInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing['4'],
    gap: theme.spacing['2'],
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text.primary,
    ...theme.typography.body,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    paddingVertical: 12,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    fontStyle: 'italic',
    color: theme.colors.text.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['2'],
  },
  chevronGlassContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  singleViewToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedSearchBar: {
    borderRadius: 22,
    overflow: 'hidden',
    height: 44,
  },
  expandedSearchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Search mode container
  searchContentContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Life Area styles
  lifeAreaScrollView: {
    flexGrow: 0,
    marginBottom: theme.spacing['2'],
  },
  lifeAreaBubblesContainer: {
    paddingHorizontal: theme.spacing['4'],
    paddingTop: 18, // Space above keywords
    gap: theme.spacing['2'],
    flexDirection: 'row',
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
  lifeAreaGridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  lifeAreaGridContainer: {
    paddingBottom: 20,
  },
  lifeAreaGridThumbnail: {
    width: (screenWidth - 16) / 4,
    height: ((screenWidth - 16) / 4) * 1.33,
    padding: 1,
  },
  lifeAreaGridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: theme.colors.gray100,
  },
  searchLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchLoadingText: {
    marginTop: theme.spacing['2'],
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  searchEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing['6'],
  },
  searchEmptyText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
});

export default LibraryScreenV2;