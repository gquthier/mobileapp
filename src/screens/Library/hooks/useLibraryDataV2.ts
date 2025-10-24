/**
 * useLibraryDataV2 Hook - Version React Query
 *
 * Migration de useLibraryData pour utiliser TanStack Query
 * - Remplacement de useState/useEffect par useQuery
 * - Infinite query pour la pagination
 * - Cache automatique et invalidation
 *
 * Phase 3 - TanStack Query Migration
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { VideoRecord } from '../../../lib/supabase';
import { ImportQueueService, ImportQueueState } from '../../../services/importQueueService';
import { Chapter } from '../../../services/chapterService';
import { useQueryClient } from '@tanstack/react-query';

// Import des nouveaux hooks React Query
import { useInfiniteVideosQuery } from '../../../hooks/queries/useVideosQuery';
import { useChaptersQuery, useCurrentChapterQuery } from '../../../hooks/queries/useChaptersQuery';

interface VideoPlayerState {
  isOpen: boolean;
  selectedVideo: VideoRecord | null;
  videos: VideoRecord[];
  initialIndex: number;
  initialTimestamp?: number;
}

interface UseLibraryDataReturn {
  // Data state
  videos: VideoRecord[];
  loading: boolean;
  error: string | null;
  chapters: Chapter[];
  currentChapter: Chapter | null;
  selectedChapterId: string | null;
  viewMode: 'calendar' | 'grid';

  // Pagination
  pagination: {
    page: number;
    hasMore: boolean;
    isLoadingMore: boolean;
  };

  // Import queue
  importState: { queueState: ImportQueueState };

  // Video player
  videoPlayer: VideoPlayerState;

  // Setters
  setViewMode: (mode: 'calendar' | 'grid') => void;
  setSelectedChapterId: (id: string | null) => void;
  setVideoPlayer: (state: Partial<VideoPlayerState>) => void;

  // Functions
  fetchVideos: (pageToLoad?: number, append?: boolean) => Promise<void>;
  handleLoadMore: () => void;
  toggleViewMode: () => void;
}

export function useLibraryDataV2(): UseLibraryDataReturn {
  console.log('🔵 [useLibraryDataV2] Hook initialization');

  // Query client pour invalidation
  const queryClient = useQueryClient();

  // ✅ React Query hooks remplacent useState/useEffect pour les vidéos
  const {
    data: infiniteData,
    isLoading,
    isError,
    error: queryError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
  } = useInfiniteVideosQuery({ pageSize: 50 });

  console.log('📊 [useLibraryDataV2] Videos query state:', {
    isLoading,
    isError,
    isRefetching,
    isFetchingNextPage,
    hasNextPage,
    pagesCount: infiniteData?.pages.length || 0,
    totalVideos: infiniteData?.pages.flatMap(p => p).length || 0,
  });

  // ✅ React Query pour les chapitres
  const { data: chapters = [] } = useChaptersQuery();
  const { data: currentChapter = null } = useCurrentChapterQuery();

  console.log('📚 [useLibraryDataV2] Chapters data:', {
    chaptersCount: chapters.length,
    currentChapter: currentChapter?.title || 'None',
  });

  // État local pour UI seulement
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'grid'>('calendar');

  // Import queue state
  const [importState, setImportState] = useState<{ queueState: ImportQueueState }>({
    queueState: {
      items: [],
      currentIndex: 0,
      isProcessing: false,
      totalCount: 0,
      completedCount: 0,
      failedCount: 0,
    },
  });

  // Video player state
  const [videoPlayer, setVideoPlayerState] = useState<VideoPlayerState>({
    isOpen: false,
    selectedVideo: null,
    videos: [],
    initialIndex: 0,
    initialTimestamp: undefined,
  });

  // Flatten les pages de l'infinite query en un seul tableau
  const videos = infiniteData?.pages.flatMap(page => page) ?? [];

  console.log('🎬 [useLibraryDataV2] Final videos array:', {
    count: videos.length,
    firstVideo: videos[0]?.title || 'None',
    lastVideo: videos[videos.length - 1]?.title || 'None',
  });

  // ✅ Wrapper pour compatibilité avec l'ancienne API
  const fetchVideos = useCallback(async (pageToLoad?: number, append?: boolean, silent?: boolean) => {
    // Ne pas logger à chaque appel pour éviter le spam
    if (append && hasNextPage) {
      // Pour la pagination, utiliser fetchNextPage
      await fetchNextPage();
    } else {
      // Pour refresh complet, utiliser refetch
      await refetch();
    }
  }, [refetch, fetchNextPage, hasNextPage]);

  // Load more handler avec React Query
  const handleLoadMore = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage || isLoading) {
      console.log('⏸️ Skipping load more:', {
        hasNextPage,
        isFetchingNextPage,
        isLoading,
      });
      return;
    }

    console.log('📄 [React Query] Loading next page...');
    fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage]);

  // Toggle view mode
  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'calendar' ? 'grid' : 'calendar');
  }, []);

  // Update video player state (partial updates)
  const setVideoPlayer = useCallback((partialState: Partial<VideoPlayerState>) => {
    setVideoPlayerState(prev => ({ ...prev, ...partialState }));
  }, []);

  // 🚀 Subscribe to import queue updates (only once on mount)
  useEffect(() => {
    // Defer queue state loading to avoid blocking initial render
    const handle = InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        ImportQueueService.loadQueueState();
      }, 100);
    });

    // Subscribe to queue updates
    const unsubscribe = ImportQueueService.subscribe((queueState) => {
      setImportState({ queueState });

      // Refresh videos when imports complete
      if (queueState.completedCount > 0 && !queueState.isProcessing) {
        setTimeout(() => {
          // Use queryClient directly to avoid re-render loop
          queryClient.invalidateQueries({ queryKey: ['videos'] });
        }, 500);
      }
    });

    return () => {
      handle.cancel();
      unsubscribe();
    };
  }, []); // Empty deps - only run once on mount

  // ✅ Création de l'objet pagination pour compatibilité
  const pagination = {
    page: infiniteData ? infiniteData.pages.length - 1 : 0,
    hasMore: hasNextPage ?? true,
    isLoadingMore: isFetchingNextPage,
  };

  return {
    // Data state
    videos,
    loading: isLoading,
    error: queryError?.message || null,
    chapters,
    currentChapter,
    selectedChapterId,
    viewMode,

    // Pagination
    pagination,

    // Import queue
    importState,

    // Video player
    videoPlayer,

    // Setters
    setViewMode,
    setSelectedChapterId,
    setVideoPlayer,

    // Functions
    fetchVideos,
    handleLoadMore,
    toggleViewMode,
  };
}