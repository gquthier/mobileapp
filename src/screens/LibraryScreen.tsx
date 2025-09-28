import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../styles';
import { TopBar } from '../components/TopBar';
import { Icon } from '../components/Icon';
import { CalendarGallerySimple as CalendarGallery } from '../components/CalendarGallerySimple';
import { VideoPlayer } from '../components/VideoPlayer';
import { VideoRecord } from '../lib/supabase';
import { VideoService } from '../services/videoService';

const LibraryScreen: React.FC = () => {
  const navigation = useNavigation();
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoRecord | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'grid'>('calendar');

  // Search states
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VideoRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  const handleVideoPress = (video: VideoRecord) => {
    setSelectedVideo(video);
    setShowPlayer(true);
  };

  const handleClosePlayer = () => {
    setShowPlayer(false);
    setSelectedVideo(null);
  };

  const handleNavigateToSettings = () => {
    // Navigate to the Settings tab
    navigation.navigate('Settings' as never);
  };

  const handleSearchPress = () => {
    setShowSearch(true);
  };

  const handleCloseSearch = () => {
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await VideoService.searchVideos(query);
      setSearchResults(results);
    } catch (error) {
      console.error('❌ Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const debounceTimer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, performSearch]);

  const renderEmpty = () => {
    if (loading && videos.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.brand.primary} />
          <Text style={styles.loadingText}>Loading your memories...</Text>
        </View>
      );
    }

    if (videos.length === 0 && !loading) {
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../../assets/logo-noir.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Memories</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconButton} onPress={handleSearchPress}>
              <Icon name="search" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleNavigateToSettings}>
              <Icon name="settings" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Error state */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchVideos} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search Interface */}
        {showSearch && (
          <View style={styles.searchContainer}>
            <View style={styles.searchHeader}>
              <TouchableOpacity onPress={handleCloseSearch} style={styles.closeSearchButton}>
                <Icon name="chevronLeft" size={20} color={theme.colors.text.primary} />
              </TouchableOpacity>
              <Text style={styles.searchTitle}>Rechercher</Text>
              <View style={styles.searchPlaceholder} />
            </View>

            <View style={styles.searchInput}>
              <Icon name="search" size={20} color={theme.colors.text.tertiary} />
              <TextInput
                style={styles.input}
                placeholder="Rechercher par titre ou date..."
                placeholderTextColor={theme.colors.text.tertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={true}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icon name="close" size={20} color={theme.colors.text.tertiary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Search Results */}
            <View style={styles.searchResults}>
              {isSearching ? (
                <View style={styles.searchLoadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.brand.primary} />
                  <Text style={styles.searchLoadingText}>Recherche en cours...</Text>
                </View>
              ) : searchQuery.trim() === '' ? (
                <View style={styles.searchEmptyState}>
                  <Icon name="search" size={48} color={theme.colors.text.disabled} />
                  <Text style={styles.searchEmptyTitle}>Rechercher vos vidéos</Text>
                  <Text style={styles.searchEmptyText}>
                    Tapez un titre ou une date{'\n'}(ex: "vacances", "septembre", "2025")
                  </Text>
                </View>
              ) : searchResults.length === 0 ? (
                <View style={styles.searchEmptyState}>
                  <Icon name="search" size={48} color={theme.colors.text.disabled} />
                  <Text style={styles.searchEmptyTitle}>Aucun résultat</Text>
                  <Text style={styles.searchEmptyText}>
                    Aucune vidéo trouvée pour "{searchQuery}"
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={searchResults}
                  keyExtractor={(item) => item.id || ''}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.searchResultItem}
                      onPress={() => {
                        handleVideoPress(item);
                        handleCloseSearch();
                      }}
                    >
                      <View style={styles.resultThumbnail}>
                        {item.thumbnail_path ? (
                          <Image
                            source={{ uri: item.thumbnail_path }}
                            style={styles.thumbnailImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.thumbnailPlaceholder}>
                            <Icon name="cameraFilled" size={24} color={theme.colors.gray400} />
                          </View>
                        )}
                      </View>
                      <View style={styles.resultInfo}>
                        <Text style={styles.resultTitle} numberOfLines={1}>
                          {item.title || 'Vidéo sans titre'}
                        </Text>
                        <Text style={styles.resultDate}>
                          {item.created_at ? new Date(item.created_at).toLocaleDateString('fr-FR') : ''}
                        </Text>
                      </View>
                      <Icon name="chevronRight" size={16} color={theme.colors.text.tertiary} />
                    </TouchableOpacity>
                  )}
                  ListHeaderComponent={() => (
                    <Text style={styles.resultsCount}>
                      {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''} trouvé{searchResults.length > 1 ? 's' : ''}
                    </Text>
                  )}
                  style={styles.searchResultsList}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
          </View>
        )}

        {/* Main content area */}
        {!showSearch && (
          <View style={styles.contentContainer}>
            {videos.length === 0 ? (
              renderEmpty()
            ) : (
              <CalendarGallery
                videos={videos}
                onVideoPress={handleVideoPress}
                chapters={chapters}
              />
            )}
          </View>
        )}

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
    backgroundColor: theme.colors.white,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['3'],
    backgroundColor: theme.colors.white,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['3'],
    flex: 1,
  },
  logo: {
    width: 32,
    height: 32,
  },
  headerRight: {
    flexDirection: 'row',
    gap: theme.spacing['2'],
  },
  iconButton: {
    padding: theme.spacing['2'],
  },
  title: {
    fontSize: 18,
    fontWeight: '400',
    color: theme.colors.text.primary,
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
  // Search styles
  searchContainer: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['3'],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray100,
  },
  closeSearchButton: {
    padding: theme.spacing['2'],
  },
  searchTitle: {
    ...theme.typography.h2,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  searchPlaceholder: {
    width: 40,
  },
  searchInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['3'],
    marginHorizontal: theme.spacing['4'],
    marginVertical: theme.spacing['3'],
    borderWidth: 1,
    borderColor: theme.colors.ui.border,
    borderRadius: 12,
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['3'],
    backgroundColor: theme.colors.gray50,
  },
  input: {
    flex: 1,
    ...theme.typography.body,
    color: theme.colors.text.primary,
  },
  searchResults: {
    flex: 1,
    paddingHorizontal: theme.spacing['4'],
  },
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing['6'],
  },
  searchEmptyTitle: {
    ...theme.typography.h3,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: theme.spacing['4'],
    marginBottom: theme.spacing['2'],
  },
  searchEmptyText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  resultsCount: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing['4'],
    fontWeight: '600',
  },
  searchResultsList: {
    flex: 1,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing['3'],
    marginBottom: theme.spacing['2'],
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.gray100,
  },
  resultThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: theme.spacing['3'],
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: theme.colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing['1'],
  },
  resultDate: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
});

export default LibraryScreen;