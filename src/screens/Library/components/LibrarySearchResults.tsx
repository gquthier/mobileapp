/**
 * LibrarySearchResults Component
 *
 * Affiche les résultats de recherche dans une grille 5 colonnes
 * - Optimisé avec FlatList virtualisation
 * - Supporte thumbnails animés et statiques
 * - Loading state et empty state
 *
 * Phase 3.3 - LibraryScreen Refactoring (Étape 10)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
} from 'react-native';
import { useTheme } from '../../../hooks/useTheme';
import { Icon } from '../../../components/Icon';
import { LoadingDots } from '../../../components/LoadingDots';
import { VideoRecord } from '../../../lib/supabase';

const { width: screenWidth } = Dimensions.get('window');
const GRID_PADDING = 4;
const GRID_GAP = 1;
const THUMBNAIL_WIDTH = (screenWidth - (GRID_PADDING * 2) - (GRID_GAP * 4)) / 5; // 5 columns with gaps
const THUMBNAIL_HEIGHT = THUMBNAIL_WIDTH * 1.33; // Vertical aspect ratio (4:3)

interface LibrarySearchResultsProps {
  results: VideoRecord[];
  query: string;
  isSearching: boolean;
  onVideoPress: (video: VideoRecord, allVideos: VideoRecord[], index: number) => void;
  brandColor: string;
}

export const LibrarySearchResults: React.FC<LibrarySearchResultsProps> = ({
  results,
  query,
  isSearching,
  onVideoPress,
  brandColor,
}) => {
  const theme = useTheme();

  // Loading state
  if (isSearching) {
    return (
      <View style={styles.searchLoadingContainer}>
        <LoadingDots color={brandColor} size={6} />
        <Text style={styles.searchLoadingText}>Searching...</Text>
      </View>
    );
  }

  // Empty state (no query)
  if (query.trim() === '') {
    return <View />;
  }

  // No results
  if (results.length === 0) {
    return (
      <View style={styles.searchEmptyState}>
        <Icon name="search" size={48} color={theme.colors.text.disabled} />
        <Text style={styles.searchEmptyTitle}>No results</Text>
        <Text style={styles.searchEmptyText}>
          No videos found for "{query}"
        </Text>
      </View>
    );
  }

  // Results grid
  return (
    <FlatList
      data={results}
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
      renderItem={({ item, index }) => (
        <TouchableOpacity
          style={styles.gridThumbnail}
          onPress={() => onVideoPress(item, results, index)}
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
};

const styles = StyleSheet.create({
  searchLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  searchLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  searchEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  searchEmptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  searchEmptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  gridContainer: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: 20,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  gridThumbnail: {
    width: THUMBNAIL_WIDTH,
    height: THUMBNAIL_HEIGHT,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  gridThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  gridThumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
});
