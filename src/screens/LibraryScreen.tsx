import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography } from '../styles/theme';
import { TopBar } from '../components/TopBar';
import { Icon } from '../components/Icon';
import { Chip } from '../components/Chip';
import { VideoCard } from '../components/VideoCard';
import { VideoPlayer } from '../components/VideoPlayer';
import { VideoRecord } from '../lib/supabase';
import { VideoService } from '../services/videoService';

type SortOption = 'newest' | 'oldest' | 'title' | 'duration';

const LibraryScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoRecord | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);

  // Fetch videos from Supabase
  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🎥 Fetching videos from Supabase...');

      const videosData = await VideoService.getAllVideos();
      console.log('✅ Videos fetched:', videosData.length);

      // Set videos without fetching transcriptions for now
      setVideos(videosData);
    } catch (error) {
      console.error('❌ Error fetching videos:', error);
      setError('Failed to load videos. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load videos on component mount
  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // Handle pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchVideos();
    setRefreshing(false);
  }, [fetchVideos]);

  // Sort videos based on selected option
  const getSortedVideos = (videos: VideoRecord[]): VideoRecord[] => {
    const sorted = [...videos];

    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) =>
          new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
        );
      case 'oldest':
        return sorted.sort((a, b) =>
          new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime()
        );
      case 'title':
        return sorted.sort((a, b) =>
          (a.title || '').toLowerCase().localeCompare((b.title || '').toLowerCase())
        );
      case 'duration':
        return sorted.sort((a, b) => (b.duration || 0) - (a.duration || 0));
      default:
        return sorted;
    }
  };

  // Filter and search videos
  const getFilteredVideos = (): VideoRecord[] => {
    let filtered = [...videos];

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(video =>
        (video.title?.toLowerCase().includes(query)) ||
        (video.created_at?.includes(query))
      );
    }

    // Apply sorting
    return getSortedVideos(filtered);
  };

  const filteredVideos = getFilteredVideos();

  const handleVideoPress = (video: VideoRecord) => {
    setSelectedVideo(video);
    setShowPlayer(true);
  };

  const handleClosePlayer = () => {
    setShowPlayer(false);
    setSelectedVideo(null);
  };

  const getSortOptions = (): { label: string; value: SortOption }[] => [
    { label: 'Newest First', value: 'newest' },
    { label: 'Oldest First', value: 'oldest' },
    { label: 'Title A-Z', value: 'title' },
    { label: 'Duration', value: 'duration' },
  ];

  const renderVideoItem = ({ item, index }: { item: VideoRecord; index: number }) => (
    <View style={index % 2 === 0 ? styles.videoItemLeft : styles.videoItemRight}>
      <VideoCard video={item} onPress={handleVideoPress} />
    </View>
  );

  const renderHeader = () => (
    <View>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInput}>
          <Icon name="search" size={16} color={colors.gray500} />
          <TextInput
            style={styles.input}
            placeholder="Search titles, dates..."
            placeholderTextColor={colors.gray500}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={16} color={colors.gray500} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => {
            // Cycle through sort options
            const options = getSortOptions();
            const currentIndex = options.findIndex(opt => opt.value === sortBy);
            const nextIndex = (currentIndex + 1) % options.length;
            setSortBy(options[nextIndex].value);
          }}
        >
          <Icon name="list" size={20} color={colors.black} />
        </TouchableOpacity>
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <View style={styles.sortOptions}>
          {getSortOptions().map((option) => (
            <Chip
              key={option.value}
              active={sortBy === option.value}
              onPress={() => setSortBy(option.value)}
              style={styles.sortChip}
            >
              {option.label}
            </Chip>
          ))}
        </View>
      </View>

      {/* Results count */}
      {!loading && (
        <Text style={styles.resultsCount}>
          {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''}
          {searchQuery.trim() && ` matching "${searchQuery}"`}
        </Text>
      )}

      {/* Error state */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchVideos} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => {
    if (loading && videos.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.black} />
          <Text style={styles.loadingText}>Loading your videos...</Text>
        </View>
      );
    }

    if (searchQuery.trim() && filteredVideos.length === 0 && !loading) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="search" size={48} color={colors.gray400} />
          <Text style={styles.emptyTitle}>No videos found</Text>
          <Text style={styles.emptyText}>
            Try adjusting your search terms or clear the search
          </Text>
          <TouchableOpacity
            style={styles.clearSearchButton}
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearSearchText}>Clear Search</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (filteredVideos.length === 0 && !loading) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="cameraFilled" size={48} color={colors.gray400} />
          <Text style={styles.emptyTitle}>No videos yet</Text>
          <Text style={styles.emptyText}>
            Record your first video to see it here
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TopBar
          title="Library"
          right={<Icon name="folder" size={20} color={colors.black} />}
        />

        <FlatList
          data={filteredVideos}
          renderItem={renderVideoItem}
          keyExtractor={(item) => item.id || ''}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          numColumns={2}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={[
            styles.galleryContainer,
            filteredVideos.length === 0 && styles.emptyGalleryContainer
          ]}
        />

        {/* Video Player Modal */}
        <VideoPlayer
          visible={showPlayer}
          video={selectedVideo}
          onClose={handleClosePlayer}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.gray50,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.black,
    backgroundColor: 'transparent',
  },
  filterButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: 8,
    backgroundColor: colors.gray50,
  },
  sortContainer: {
    marginBottom: 16,
  },
  sortLabel: {
    ...typography.caption,
    fontSize: 12,
    color: colors.gray600,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sortOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortChip: {
    marginRight: 0,
  },
  resultsCount: {
    ...typography.caption,
    fontSize: 13,
    color: colors.gray600,
    marginBottom: 16,
  },
  galleryContainer: {
    paddingBottom: 20,
  },
  emptyGalleryContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    justifyContent: 'space-between',
  },
  videoItemLeft: {
    flex: 1,
    marginRight: 8,
  },
  videoItemRight: {
    flex: 1,
    marginLeft: 8,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.gray100,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    ...typography.body,
    fontSize: 14,
    color: colors.gray700,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.black,
    borderRadius: 8,
  },
  retryText: {
    ...typography.bodyBold,
    color: colors.white,
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60,
  },
  loadingText: {
    ...typography.body,
    marginTop: 16,
    fontSize: 14,
    color: colors.gray600,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: '600',
    color: colors.black,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    ...typography.body,
    fontSize: 14,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  clearSearchButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.gray200,
    borderRadius: 8,
  },
  clearSearchText: {
    ...typography.bodyBold,
    fontSize: 14,
    color: colors.black,
  },
});

export default LibraryScreen;