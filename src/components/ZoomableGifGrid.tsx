import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Image,
  Text,
  StyleSheet,
  AccessibilityInfo,
  PanGestureHandler,
  State,
} from 'react-native';
import { theme } from '../styles';
import { Icon } from './Icon';
import { VideoRecord } from '../lib/supabase';

const { width: screenWidth } = Dimensions.get('window');
const CONTAINER_PADDING = theme.spacing['4'] * 2; // Left + right padding
const GRID_GAP = theme.spacing['2'];

// Zoom levels: number of columns (1-5)
const ZOOM_LEVELS = [1, 2, 3, 4, 5];
const DEFAULT_ZOOM_INDEX = 2; // 3 columns by default
const MIN_CELL_SIZE = 60;
const MAX_CELL_SIZE = screenWidth - CONTAINER_PADDING;

interface ZoomableGifGridProps {
  videos: VideoRecord[];
  onVideoPress: (video: VideoRecord) => void;
  loading?: boolean;
}

interface GridCellProps {
  video: VideoRecord;
  cellSize: number;
  onPress: () => void;
}

const GridCell: React.FC<GridCellProps> = React.memo(({ video, cellSize, onPress }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Generate preview URL from video path (frontend-only approach)
  const getPreviewUrl = useCallback((video: VideoRecord): string | null => {
    if (!video.file_path) return null;

    // Try to construct thumbnail URL from video path
    // This assumes thumbnails are generated and stored alongside videos
    let thumbPath = video.file_path;

    // If it's already a URL, try to create thumbnail URL
    if (thumbPath.startsWith('http')) {
      // Replace video extension with .jpg for thumbnail
      thumbPath = thumbPath.replace(/\.(mp4|mov|avi|mkv)$/i, '_thumb.jpg');
    } else {
      // For relative paths, construct full URL
      const baseUrl = 'https://eenyzudwktcjpefpoapi.supabase.co/storage/v1/object/public/videos';
      let cleanPath = thumbPath.startsWith('/') ? thumbPath.substring(1) : thumbPath;
      if (cleanPath.startsWith('videos/')) {
        cleanPath = cleanPath.substring('videos/'.length);
      }
      thumbPath = `${baseUrl}/${cleanPath.replace(/\.(mp4|mov|avi|mkv)$/i, '_thumb.jpg')}`;
    }

    return thumbPath;
  }, []);

  const previewUrl = getPreviewUrl(video);

  // Format duration for accessibility
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'unknown duration';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} minutes ${secs} seconds`;
  };

  // Format date for accessibility
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return '';
    }
  };

  const accessibilityLabel = `Video: ${video.title || 'Untitled'}, recorded on ${formatDate(video.created_at)}, duration ${formatDuration(video.duration)}`;

  return (
    <TouchableOpacity
      style={[styles.gridCell, { width: cellSize, height: cellSize }]}
      onPress={onPress}
      activeOpacity={0.8}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Double tap to play video"
    >
      {previewUrl && !imageError ? (
        <Image
          source={{ uri: previewUrl }}
          style={styles.previewImage}
          onLoad={() => setImageLoading(false)}
          onError={() => {
            setImageError(true);
            setImageLoading(false);
          }}
          resizeMode="cover"
        />
      ) : (
        // Fallback: Video thumbnail placeholder
        <View style={styles.fallbackContainer}>
          <Icon
            name="cameraFilled"
            size={Math.min(cellSize / 3, 32)}
            color={theme.colors.gray400}
          />
        </View>
      )}

      {/* Loading indicator */}
      {imageLoading && !imageError && (
        <View style={styles.loadingOverlay}>
          <Icon name="loading" size={16} color={theme.colors.white} />
        </View>
      )}
    </TouchableOpacity>
  );
});

GridCell.displayName = 'GridCell';

export const ZoomableGifGrid: React.FC<ZoomableGifGridProps> = ({
  videos,
  onVideoPress,
  loading = false,
}) => {
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);

  // Calculate cell size based on zoom level
  const cellSize = useMemo(() => {
    const columns = ZOOM_LEVELS[zoomIndex];
    const availableWidth = screenWidth - CONTAINER_PADDING - (columns - 1) * GRID_GAP;
    const calculatedSize = availableWidth / columns;
    return Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, calculatedSize));
  }, [zoomIndex]);

  const numColumns = ZOOM_LEVELS[zoomIndex];

  // Handle zoom level change
  const changeZoomLevel = useCallback((direction: 'in' | 'out') => {
    setZoomIndex(current => {
      const newIndex = direction === 'in'
        ? Math.min(ZOOM_LEVELS.length - 1, current + 1)
        : Math.max(0, current - 1);

      // Announce zoom level change for accessibility
      const newColumns = ZOOM_LEVELS[newIndex];
      AccessibilityInfo.announceForAccessibility(`Grid density: ${newColumns} columns`);

      return newIndex;
    });
  }, []);

  // Handle video press
  const handleVideoPress = useCallback((video: VideoRecord) => {
    onVideoPress(video);
  }, [onVideoPress]);

  // Render grid item
  const renderGridItem = useCallback(({ item }: { item: VideoRecord }) => (
    <GridCell
      video={item}
      cellSize={cellSize}
      onPress={() => handleVideoPress(item)}
    />
  ), [cellSize, handleVideoPress]);

  // Calculate item layout for FlatList
  const getItemLayout = useCallback((data: any, index: number) => {
    const row = Math.floor(index / numColumns);
    const offset = row * (cellSize + GRID_GAP);
    return {
      length: cellSize,
      offset,
      index,
    };
  }, [cellSize, numColumns]);

  // Key extractor
  const keyExtractor = useCallback((item: VideoRecord) => item.id || '', []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Icon name="loading" size={32} color={theme.colors.gray500} />
        <Text style={styles.loadingText}>Loading videos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.gridContainer}>
        <FlatList
          data={videos}
          renderItem={renderGridItem}
          keyExtractor={keyExtractor}
          numColumns={numColumns}
          key={`grid-${numColumns}`} // Force re-render when columns change
          columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
          showsVerticalScrollIndicator={false}
          getItemLayout={getItemLayout}
          removeClippedSubviews={true}
          maxToRenderPerBatch={20}
          windowSize={10}
          initialNumToRender={20}
          contentContainerStyle={styles.gridContent}
          ItemSeparatorComponent={() => <View style={{ height: GRID_GAP }} />}
        />
      </View>

      {/* Accessibility zoom controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity
          style={[styles.zoomButton, zoomIndex === 0 && styles.zoomButtonDisabled]}
          onPress={() => changeZoomLevel('out')}
          disabled={zoomIndex === 0}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Zoom out, make grid cells larger"
        >
          <Icon
            name="minus"
            size={16}
            color={zoomIndex === 0 ? theme.colors.gray400 : theme.colors.gray700}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.zoomButton, zoomIndex === ZOOM_LEVELS.length - 1 && styles.zoomButtonDisabled]}
          onPress={() => changeZoomLevel('in')}
          disabled={zoomIndex === ZOOM_LEVELS.length - 1}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Zoom in, make grid cells smaller"
        >
          <Icon
            name="plus"
            size={16}
            color={zoomIndex === ZOOM_LEVELS.length - 1 ? theme.colors.gray400 : theme.colors.gray700}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gridContainer: {
    flex: 1,
  },
  gridContent: {
    padding: theme.spacing['2'],
    paddingBottom: theme.spacing['6'], // Extra space at bottom
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing['1'],
  },
  gridCell: {
    borderRadius: theme.layout.borderRadius.input,
    backgroundColor: theme.colors.gray100,
    overflow: 'hidden',
    marginHorizontal: theme.spacing['1'],
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.gray200,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing['8'],
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing['3'],
  },
  zoomControls: {
    position: 'absolute',
    bottom: theme.spacing['6'],
    right: theme.spacing['4'],
    flexDirection: 'row',
    gap: theme.spacing['2'],
  },
  zoomButton: {
    width: 44,
    height: 44,
    borderRadius: theme.layout.borderRadius.full,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.layout.shadows.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  zoomButtonDisabled: {
    backgroundColor: theme.colors.gray100,
    borderColor: theme.colors.gray200,
  },
});