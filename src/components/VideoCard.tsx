import React, { useState, useRef } from 'react';
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
import { colors, typography } from '../styles/theme';
import { Icon } from './Icon';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 2 columns with 16px padding on sides and 16px gap

interface VideoCardProps {
  video: VideoRecord;
  onPress: (video: VideoRecord) => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, onPress }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const videoRef = useRef<Video>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

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

  const handlePress = () => {
    handlePressOut(); // Clean up preview
    onPress(video);
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
      <View style={styles.thumbnailContainer}>
        {/* Static thumbnail */}
        {!showPreview && getThumbnailUri() ? (
          <Image
            source={{ uri: getThumbnailUri()! }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : !showPreview && (
          <View style={styles.placeholderThumbnail}>
            <Icon name="cameraFilled" size={24} color={colors.gray400} />
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
          <Icon name="play" size={20} color={colors.white} />
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
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  thumbnailContainer: {
    height: 120,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gray100,
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
    color: colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  info: {
    padding: 12,
  },
  title: {
    ...typography.bodyBold,
    fontSize: 13,
    color: colors.black,
    marginBottom: 4,
    lineHeight: 16,
  },
  date: {
    ...typography.caption,
    fontSize: 11,
    color: colors.gray600,
  },
});