import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../styles';
import { Icon } from '../components/Icon';
import { LoadingDots } from '../components/LoadingDots';
import { useTheme } from '../contexts/ThemeContext';
import { ImportQueueService } from '../services/importQueueService';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 16) / 3; // 3 columns

type ViewMode = 'albums' | 'videos';

interface AlbumSimple extends MediaLibrary.Album {
  // Ne stocke QUE l'ID - pas de thumbnail, pas de count
  // Ultra rapide!
}

/**
 * ✅ Memoized video item component for FlatList performance
 */
interface VideoItemProps {
  item: MediaLibrary.Asset;
  isSelected: boolean;
  onPress: (id: string) => void;
  formatDuration: (seconds: number) => string;
  brandColor: string;
}

const VideoItem: React.FC<VideoItemProps> = ({ item, isSelected, onPress, formatDuration, brandColor }) => {
  return (
    <TouchableOpacity
      style={styles.videoItem}
      onPress={() => onPress(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.videoThumbnail}>
        <View style={styles.placeholderContainer}>
          <Icon name="video" size={40} color={theme.colors.text.tertiary} />
        </View>
      </View>

      {isSelected && <View style={styles.selectedOverlay} />}

      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
        {isSelected && <Icon name="check" size={14} color="#FFFFFF" />}
      </View>

      {item.duration > 0 && (
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>
            {formatDuration(item.duration)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const VideoItemMemo = React.memo(VideoItem, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.brandColor === nextProps.brandColor
  );
});

export function VideoImportScreen() {
  const navigation = useNavigation();
  const { brandColor } = useTheme();

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('albums');
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumSimple | null>(null);

  // Albums state (ultra simple - juste les IDs et titres)
  const [albums, setAlbums] = useState<AlbumSimple[]>([]);
  const [loadingAlbums, setLoadingAlbums] = useState(true);
  const [albumThumbnails, setAlbumThumbnails] = useState<Record<string, string>>({});

  // Videos state
  const [videos, setVideos] = useState<MediaLibrary.Asset[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [endCursor, setEndCursor] = useState<string | undefined>();

  // Load albums on mount
  useEffect(() => {
    loadAlbums();
  }, []);

  /**
   * ⚡ ULTRA FAST: Just get album list, no counts, no thumbnails!
   * Exactly like Apple Photos
   */
  const loadAlbums = async () => {
    try {
      const startTime = Date.now();
      console.log('📂 Loading albums...');
      setLoadingAlbums(true);

      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Nous avons besoin d\'accéder à vos photos pour importer des vidéos.');
        setLoadingAlbums(false);
        return;
      }

      // ✅ Just get album list - NO additional queries!
      const albumsResult = await MediaLibrary.getAlbumsAsync({
        includeSmartAlbums: true,
      });

      const loadTime = Date.now() - startTime;
      console.log(`✅ Loaded ${albumsResult.length} albums in ${loadTime}ms`);

      // ✅ Sort smart albums first (Recents, Videos)
      const sortedAlbums = albumsResult.sort((a, b) => {
        const smartAlbums = ['Recents', 'Videos', 'All Videos', 'Camera Roll'];
        const aIsSmart = smartAlbums.includes(a.title);
        const bIsSmart = smartAlbums.includes(b.title);

        if (aIsSmart && !bIsSmart) return -1;
        if (!aIsSmart && bIsSmart) return 1;
        return a.title.localeCompare(b.title);
      });

      setAlbums(sortedAlbums);
      setLoadingAlbums(false);

      // ✅ Load thumbnails in background (non-blocking)
      loadAlbumThumbnails(sortedAlbums);
    } catch (error) {
      console.error('❌ Error loading albums:', error);
      Alert.alert('Erreur', 'Impossible de charger les albums.');
      setLoadingAlbums(false);
    }
  };

  /**
   * ✅ Load thumbnails for albums (background, non-blocking)
   */
  const loadAlbumThumbnails = async (albumsList: AlbumSimple[]) => {
    try {
      console.log('📸 Loading album thumbnails in background...');
      const thumbnails: Record<string, string> = {};

      // Load thumbnails for all albums (parallel, but limit concurrency to avoid memory issues)
      const batchSize = 5; // Process 5 albums at a time
      for (let i = 0; i < albumsList.length; i += batchSize) {
        const batch = albumsList.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (album) => {
            try {
              // Get first video from album
              const result = await MediaLibrary.getAssetsAsync({
                album: album.id,
                mediaType: 'video',
                first: 1,
                sortBy: MediaLibrary.SortBy.creationTime,
              });

              if (result.assets.length > 0) {
                const firstVideo = result.assets[0];

                // Get video info with localUri
                const assetInfo = await MediaLibrary.getAssetInfoAsync(firstVideo.id);
                const videoUri = assetInfo.localUri || assetInfo.uri;

                // Generate thumbnail
                const { uri: thumbnailUri } = await VideoThumbnails.getThumbnailAsync(
                  videoUri,
                  {
                    time: 1000, // 1 second into the video
                    quality: 0.5, // Lower quality for faster loading
                  }
                );

                thumbnails[album.id] = thumbnailUri;
              }
            } catch (error) {
              console.warn(`⚠️ Could not load thumbnail for album ${album.title}:`, error);
            }
          })
        );

        // Update state after each batch for progressive loading
        setAlbumThumbnails({ ...thumbnails });
      }

      console.log(`✅ Loaded ${Object.keys(thumbnails).length} album thumbnails`);
    } catch (error) {
      console.error('❌ Error loading album thumbnails:', error);
    }
  };

  /**
   * ⚡ Load videos from album - INSTANT display with native URIs
   */
  const loadVideos = async (album: AlbumSimple, loadMore = false) => {
    try {
      const startTime = Date.now();
      console.log(`📹 Loading videos from album: ${album.title}...`);

      if (!loadMore) {
        setLoadingVideos(true);
        setVideos([]);
        setSelectedIds(new Set());
        setEndCursor(undefined);
      }

      // ✅ Load 30 videos at a time
      const result = await MediaLibrary.getAssetsAsync({
        album: album.id,
        mediaType: 'video',
        first: 30,
        after: loadMore ? endCursor : undefined,
        sortBy: MediaLibrary.SortBy.creationTime,
      });

      const loadTime = Date.now() - startTime;
      console.log(`✅ Loaded ${result.assets.length} videos in ${loadTime}ms`);

      // ✅ Display IMMEDIATELY with native URIs (no conversion!)
      if (loadMore) {
        setVideos(prev => [...prev, ...result.assets]);
      } else {
        setVideos(result.assets);
      }

      setEndCursor(result.endCursor);
      setHasMore(result.hasNextPage);
      setLoadingVideos(false);
    } catch (error) {
      console.error('❌ Error loading videos:', error);
      Alert.alert('Erreur', 'Impossible de charger les vidéos.');
      setLoadingVideos(false);
    }
  };

  /**
   * Handle album selection
   */
  const handleAlbumPress = (album: AlbumSimple) => {
    console.log(`📂 Selected album: ${album.title}`);
    setSelectedAlbum(album);
    setViewMode('videos');
    loadVideos(album);
  };

  /**
   * Handle back navigation
   */
  const handleBack = () => {
    if (viewMode === 'videos') {
      setViewMode('albums');
      setSelectedAlbum(null);
      setVideos([]);
      setSelectedIds(new Set());
    } else {
      navigation.goBack();
    }
  };

  /**
   * Toggle video selection
   */
  const toggleSelection = useCallback((videoId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  }, []);

  /**
   * Select/Deselect all videos
   */
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === videos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(videos.map(v => v.id)));
    }
  }, [videos, selectedIds]);

  /**
   * Import selected videos
   * ✅ Only convert URIs for SELECTED videos
   */
  const handleImport = async () => {
    console.log(`🚀 handleImport called! selectedIds.size = ${selectedIds.size}`);

    if (selectedIds.size === 0) {
      Alert.alert('Aucune sélection', 'Veuillez sélectionner au moins une vidéo.');
      return;
    }

    // ✅ Popup de confirmation avant import
    Alert.alert(
      'Confirmer l\'import',
      `Importer ${selectedIds.size} vidéo${selectedIds.size > 1 ? 's' : ''} ?`,
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Importer',
          onPress: async () => {
            try {
              console.log(`📥 Importing ${selectedIds.size} selected videos...`);
              const startTime = Date.now();

              const selectedVideos = videos.filter(v => selectedIds.has(v.id));

              console.log(`✅ Selected ${selectedVideos.length} videos for import`);
              selectedVideos.forEach((asset, index) => {
                console.log(`  ${index + 1}. ${asset.filename} (${asset.duration}s)`);
              });

              // ✅ Get current chapter to assign imported videos
              const { data: { user } } = await supabase.auth.getUser();
              let currentChapterId: string | undefined;

              if (user) {
                const { getCurrentChapter } = require('../services/chapterService');
                const currentChapter = await getCurrentChapter(user.id);
                currentChapterId = currentChapter?.id;

                if (currentChapterId) {
                  console.log(`📖 Assigning imported videos to current chapter: ${currentChapter.title}`);
                } else {
                  console.log('⚠️ No current chapter - videos will be unassigned');
                }
              }

              // ✅ Pass MediaLibrary.Asset directly - NO conversion needed!
              // ImportQueueService will handle URI conversion when needed
              await ImportQueueService.addToQueue(selectedVideos, currentChapterId);

              // ✅ Naviguer immédiatement vers Library
              console.log('🔄 Navigating back to Library...');

              // Go back twice: once to exit videos view, once to exit VideoImportScreen
              if (viewMode === 'videos') {
                navigation.goBack(); // Back to albums
              }
              navigation.goBack(); // Back to Library

              // ✅ Afficher le popup APRÈS la navigation (toast-like)
              setTimeout(() => {
                Alert.alert(
                  'Import en cours',
                  `${selectedVideos.length} vidéo${selectedVideos.length > 1 ? 's sont' : ' est'} en cours de traitement. Vous pouvez continuer à utiliser l'application pendant l'import.`,
                  [{ text: 'OK' }]
                );
              }, 500); // Petit délai pour laisser la navigation se terminer
            } catch (error) {
              console.error('❌ Error importing videos:', error);
              Alert.alert('Erreur', 'Une erreur est survenue lors de l\'import.');
            }
          },
        },
      ]
    );
  };

  /**
   * Load more videos
   */
  const handleLoadMore = () => {
    if (hasMore && !loadingVideos && selectedAlbum) {
      loadVideos(selectedAlbum, true);
    }
  };

  /**
   * Format duration
   */
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Render album item with thumbnail
   */
  const renderAlbumItem = useCallback(({ item }: { item: AlbumSimple }) => {
    const thumbnailUri = albumThumbnails[item.id];

    return (
      <TouchableOpacity
        style={styles.albumItem}
        onPress={() => handleAlbumPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.albumThumbnailContainer}>
          {thumbnailUri ? (
            <Image
              source={{ uri: thumbnailUri }}
              style={styles.albumThumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.albumIconContainer}>
              <Icon name="video" size={32} color={theme.colors.text.primary} />
            </View>
          )}
        </View>

        <View style={styles.albumInfo}>
          <Text style={styles.albumTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.albumSubtitle}>Album vidéo</Text>
        </View>

        <Icon name="chevronRight" size={20} color={theme.colors.text.tertiary} />
      </TouchableOpacity>
    );
  }, [albumThumbnails]);

  /**
   * Render video item
   */
  const renderVideoItem = useCallback(({ item }: { item: MediaLibrary.Asset }) => {
    const isSelected = selectedIds.has(item.id);
    return (
      <VideoItemMemo
        item={item}
        isSelected={isSelected}
        onPress={toggleSelection}
        formatDuration={formatDuration}
        brandColor={brandColor}
      />
    );
  }, [selectedIds, toggleSelection, brandColor]);

  /**
   * Render footer loader
   */
  const renderFooter = () => {
    if (!loadingVideos) return null;
    return (
      <View style={styles.footerLoader}>
        <LoadingDots color={brandColor} size={6} />
      </View>
    );
  };

  // ==================== RENDER ====================

  if (loadingAlbums) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <Icon name="chevronLeft" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Chargement...</Text>
          </View>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.loadingContainer}>
          <LoadingDots color={brandColor} />
          <Text style={styles.loadingText}>Chargement des albums...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
          <Icon name="chevronLeft" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {viewMode === 'albums' ? 'Albums' : selectedAlbum?.title || 'Vidéos'}
          </Text>
          {viewMode === 'videos' && (
            <Text style={styles.headerSubtitle}>
              {selectedIds.size} / {videos.length} sélectionnée{selectedIds.size > 1 ? 's' : ''}
            </Text>
          )}
        </View>

        {viewMode === 'videos' && (
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerButton} onPress={handleSelectAll}>
              <Text style={styles.selectAllText}>
                {selectedIds.size === videos.length ? 'Tout\ndésél.' : 'Tout\nsél.'}
              </Text>
            </TouchableOpacity>
            {selectedIds.size > 0 && (
              <TouchableOpacity
                style={styles.checkIconContainer}
                onPress={handleImport}
                activeOpacity={0.7}
              >
                <Icon name="check" size={20} color={theme.colors.brand.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}
        {viewMode === 'albums' && <View style={styles.headerButton} />}
      </View>

      {/* Content */}
      {viewMode === 'albums' ? (
        // Albums List
        <FlatList
          data={albums}
          renderItem={renderAlbumItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.albumsContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        // Videos Grid
        <>
          {loadingVideos && videos.length === 0 ? (
            <View style={styles.loadingContainer}>
              <LoadingDots color={brandColor} />
              <Text style={styles.loadingText}>Chargement des vidéos...</Text>
            </View>
          ) : (
            <FlatList
              data={videos}
              renderItem={renderVideoItem}
              keyExtractor={(item) => item.id}
              numColumns={3}
              contentContainerStyle={styles.videosContainer}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={renderFooter}
              maxToRenderPerBatch={12}
              initialNumToRender={12}
              windowSize={7}
              updateCellsBatchingPeriod={50}
              removeClippedSubviews={true}
              getItemLayout={(data, index) => ({
                length: ITEM_SIZE - 4,
                offset: (ITEM_SIZE - 4) * Math.floor(index / 3),
                index,
              })}
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Import Button */}
          {selectedIds.size > 0 && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.importButton}
                onPress={handleImport}
                activeOpacity={0.8}
              >
                <Text style={styles.importButtonText}>
                  Importer {selectedIds.size} vidéo{selectedIds.size > 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.ui.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.text.secondary,
  },

  // ==================== HEADER ====================
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.gray200,
  },
  headerButton: {
    padding: 8,
    minWidth: 60,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text.primary, // ✅ Noir au lieu de violet
    textAlign: 'center',
    lineHeight: 14,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ==================== ALBUMS ====================
  albumsContainer: {
    padding: 8,
  },
  albumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    padding: 16,
    marginBottom: 8,
    marginHorizontal: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.gray200,
  },
  albumThumbnailContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  albumThumbnail: {
    width: '100%',
    height: '100%',
  },
  albumIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: theme.colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumInfo: {
    flex: 1,
  },
  albumTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  albumSubtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },

  // ==================== VIDEOS ====================
  videosContainer: {
    padding: 2,
  },
  videoItem: {
    width: ITEM_SIZE - 4,
    height: ITEM_SIZE - 4,
    margin: 2,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: theme.colors.gray100,
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.gray100,
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  checkbox: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: theme.colors.brand.primary,
    borderColor: theme.colors.brand.primary,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },

  // ==================== FOOTER ====================
  footer: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: theme.colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.gray200,
  },
  importButton: {
    backgroundColor: theme.colors.text.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  importButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
