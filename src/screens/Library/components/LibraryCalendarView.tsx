/**
 * LibraryCalendarView Component
 *
 * Wrapper autour de CalendarGallerySimple pour la vue calendrier
 * Affiche les vidéos organisées par mois avec expandable sections
 *
 * Phase 3.3 - LibraryScreen Refactoring (Étape 7)
 */

import React from 'react';
import { VideoRecord } from '../../../lib/supabase';
import { Chapter } from '../../../services/chapterService';
import { CalendarGallerySimple as CalendarGallery } from '../../../components/CalendarGallerySimple';

interface LibraryCalendarViewProps {
  videos: VideoRecord[];
  chapters: Chapter[];
  onVideoPress: (video: VideoRecord, allVideos: VideoRecord[], index: number, timestamp?: number) => void;
  onEndReached: () => void;
  onEndReachedThreshold?: number;
  contentInsetTop: number;
  refreshControl?: React.ReactElement; // ✅ Pull-to-refresh support
}

export const LibraryCalendarView: React.FC<LibraryCalendarViewProps> = ({
  videos,
  chapters,
  onVideoPress,
  onEndReached,
  onEndReachedThreshold = 0.8,
  contentInsetTop,
  refreshControl, // ✅ Pull-to-refresh support
}) => {
  return (
    <CalendarGallery
      videos={videos}
      onVideoPress={onVideoPress}
      chapters={chapters}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      contentInsetTop={contentInsetTop}
      refreshControl={refreshControl}
    />
  );
};
