import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { VideoRecord } from '../lib/supabase';
import { theme } from '../styles';
import { Icon } from './Icon';
import { SourceRect } from './library/types';
import { useNetworkQuality } from '../hooks/useNetworkQuality'; // 🆕 Phase 1.3

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 2 columns with 16px padding on sides and 16px gap

interface VideoCardProps {
  video: VideoRecord;
  onPress?: (video: VideoRecord) => void;
  onPressWithRect?: (video: VideoRecord, rect: SourceRect) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  onPress,
  onPressWithRect
}) => {
  // 🆕 Phase 1.3: Network quality detection (pour futures optimisations)
  const networkQuality = useNetworkQuality();

  const [showPreview, setShowPreview] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const videoRef = useRef<Video>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<View>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getThumbnailUri = () => {
    if (video.thumbnail_path) {
      // Check if thumbnail_path is already a complete URL
      if (video.thumbnail_path.startsWith('http://') || video.thumbnail_path.startsWith('https://')) {
        return video.thumbnail_path;
      }
      return `https://eenyzudwktcjpefpoapi.supabase.co/storage/v1/object/public/videos/${video.thumbnail_path}`;
    }
    return null;
  };

  const getVideoUri = () => {
    // Check if file_path is already a complete URL
    if (video.file_path.startsWith('http://') || video.file_path.startsWith('https://')) {
      return video.file_path;
    }

    // Construct URL for relative path
    const baseUrl = 'https://eenyzudwktcjpefpoapi.supabase.co/storage/v1/object/public/videos';
    let cleanFilePath = video.file_path;
    if (cleanFilePath.startsWith('/')) {
      cleanFilePath = cleanFilePath.substring(1);
    }
    if (cleanFilePath.startsWith('videos/')) {
      cleanFilePath = cleanFilePath.substring('videos/'.length);
    }
    return `${baseUrl}/${cleanFilePath}`;
  };

  const handlePressIn = () => {
    // Start preview after a short delay
    timeoutRef.current = setTimeout(() => {
      setShowPreview(true);
    }, 500);
  };

  const handlePressOut = () => {
    // Cancel preview and stop video
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowPreview(false);
    setPreviewLoaded(false);
    if (videoRef.current) {
      videoRef.current.pauseAsync();
      videoRef.current.setPositionAsync(0);
    }
  };

  const measureThumbnail = useCallback((): Promise<SourceRect> => {
    return new Promise((resolve) => {
      if (containerRef.current) {
        containerRef.current.measureInWindow((x, y, width, height) => {
          resolve({
            x: 0,
            y: 0,
            width,
            height,
            pageX: x,
            pageY: y,
          });
        });
      }
    });
  }, []);

  const handlePress = async () => {
    handlePressOut(); // Clean up preview

    if (onPressWithRect) {
      const rect = await measureThumbnail();
      onPressWithRect(video, rect);
    } else if (onPress) {
      onPress(video);
    }
  };

  const handleVideoLoad = () => {
    setPreviewLoaded(true);
    if (videoRef.current && showPreview) {
      videoRef.current.playAsync();
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.7}
    >
      {/* Thumbnail/Video Preview */}
      <View ref={containerRef} style={styles.thumbnailContainer}>
        {/* Static thumbnail - display first frame only */}
        {!showPreview && video.thumbnail_frames && video.thumbnail_frames.length > 0 ? (
          <Image
            source={{ uri: video.thumbnail_frames[0] }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : !showPreview && getThumbnailUri() ? (
          <Image
            source={{ uri: getThumbnailUri()! }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : !showPreview && (
          <View style={styles.placeholderThumbnail}>
            <Icon name="cameraFilled" size={24} color={theme.colors.text.disabled} />
          </View>
        )}

        {/* Video preview */}
        {showPreview && (
          <Video
            ref={videoRef}
            source={{ uri: getVideoUri() }}
            style={styles.thumbnail}
            resizeMode={ResizeMode.COVER}
            shouldPlay={previewLoaded}
            isLooping={true}
            isMuted={true}
            onLoad={handleVideoLoad}
            useNativeControls={false}
          />
        )}

        {/* Play icon overlay */}
        <View style={styles.playOverlay}>
          <Icon name="play" size={20} color={theme.colors.white} />
        </View>

        {/* Duration badge */}
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>
            {formatDuration(video.duration)}
          </Text>
        </View>
      </View>

      {/* Video Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {video.title || 'Untitled Video'}
        </Text>

        <Text style={styles.date}>
          {video.created_at ? formatDate(video.created_at) : 'Unknown date'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.ui.muted,
    marginBottom: theme.spacing['4'],
    overflow: 'hidden',
    ...theme.layout.shadows.sm,
  },
  thumbnailContainer: {
    height: 120,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    transform: [{ scaleX: -1 }], // Effet miroir pour correspondre à la preview d'enregistrement
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.ui.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: theme.colors.white,
    ...theme.typography.tiny,
    fontWeight: '600',
  },
  info: {
    padding: theme.spacing['3'],
  },
  title: {
    ...theme.typography.body2,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing['1'],
  },
  date: {
    ...theme.typography.tiny,
    color: theme.colors.text.secondary,
  },
});