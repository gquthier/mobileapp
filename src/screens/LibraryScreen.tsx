import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../styles';
import { TopBar } from '../components/TopBar';
import { Icon } from '../components/Icon';
import { CalendarGallery } from '../components/CalendarGallery';
import { VideoPlayer } from '../components/VideoPlayer';
import { VideoRecord } from '../lib/supabase';
import { VideoService } from '../services/videoService';

const LibraryScreen: React.FC = () => {
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoRecord | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'grid'>('calendar');

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
            <TouchableOpacity style={styles.iconButton}>
              <Icon name="search" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
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

        {/* Main content area */}
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
});

export default LibraryScreen;