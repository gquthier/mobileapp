/**
 * LibraryGridView Component
 *
 * Wrapper autour de VideoGallery pour la vue grille
 * Affiche les vidéos dans une grille 4 colonnes avec thumbnails
 *
 * Phase 3.3 - LibraryScreen Refactoring (Étape 8)
 */

import React from 'react';
import { VideoRecord } from '../../../lib/supabase';
import { VideoGallery } from '../../../components/VideoGallery';

interface LibraryGridViewProps {
  videos: VideoRecord[];
  onVideoPress: (video: VideoRecord, allVideos: VideoRecord[], index: number) => void;
  onEndReached: () => void;
  onEndReachedThreshold?: number;
  contentInsetTop: number;
  refreshControl?: React.ReactElement; // ✅ Pull-to-refresh support
}

export const LibraryGridView: React.FC<LibraryGridViewProps> = ({
  videos,
  onVideoPress,
  onEndReached,
  onEndReachedThreshold = 0.8,
  contentInsetTop,
  refreshControl, // ✅ Pull-to-refresh support
}) => {
  return (
    <VideoGallery
      videos={videos}
      onVideoPress={onVideoPress}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      contentInsetTop={contentInsetTop}
      refreshControl={refreshControl}
    />
  );
};
