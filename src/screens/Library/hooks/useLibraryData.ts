/**
 * useLibraryData Hook
 *
 * Gère toute la logique de données dans LibraryScreen
 * - Fetch vidéos avec cache-first strategy
 * - Pagination (load more)
 * - Gestion des chapitres
 * - Import queue subscription
 * - Video player state
 * - View mode (calendar/grid)
 *
 * Phase 3.3 - LibraryScreen Refactoring (Étape 5 - Hook le plus complexe)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
import { VideoRecord, supabase } from '../../../lib/supabase';
import { VideoService } from '../../../services/videoService';
import { VideoCacheService } from '../../../services/videoCacheService';
import { ImportQueueService, ImportQueueState } from '../../../services/importQueueService';
import { getUserChapters, getCurrentChapter, Chapter } from '../../../services/chapterService';

interface PaginationState {
  page: number;
  hasMore: boolean;
  isLoadingMore: boolean;
}

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
  pagination: PaginationState;

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

export function useLibraryData(): UseLibraryDataReturn {
  // Data state
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'grid'>('calendar');

  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    page: 0,
    hasMore: true,
    isLoadingMore: false,
  });

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

  // Refs
  const fetchVideosRef = useRef<(pageToLoad?: number, append?: boolean) => Promise<void>>();
  const cancelledRef = useRef(false);

  // 🚀 OPTIMIZATION: Fetch videos with non-blocking cache-first strategy
  const fetchVideos = useCallback(async (pageToLoad: number = 0, append: boolean = false) => {
    try {
      if (!append) {
        if (cancelledRef.current) return; // ✅ Check cancelled before setState
        setLoading(true);
        setError(null);

        // 🚀 PHASE 1: Try cache first (fast, synchronous)
        console.log('📦 Loading videos from cache...');
        const cacheStartTime = Date.now();
        const { videos: cachedVideos } = await VideoCacheService.loadFromCache();
        const cacheElapsed = Date.now() - cacheStartTime;

        if (cachedVideos && cachedVideos.length > 0) {
          console.log(`✅ Cache hit! Loaded ${cachedVideos.length} videos in ${cacheElapsed}ms`);
          if (cancelledRef.current) return; // ✅ Check cancelled before dispatch
          setVideos(cachedVideos);
          setLoading(false);
        } else {
          console.log('💨 Cache miss, showing skeleton...');
        }
      } else {
        // Pagination: Loading more
        setPagination(prev => ({ ...prev, isLoadingMore: true }));
      }

      // 🚀 PHASE 2: Fetch from Supabase (network, slower)
      console.log(`🌐 Fetching videos from Supabase (page ${pageToLoad})...`);
      const networkStartTime = Date.now();

      const PAGE_SIZE = 50;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const offset = pageToLoad * PAGE_SIZE;

      // Query with pagination
      const { data, error: fetchError } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (fetchError) throw fetchError;

      const networkElapsed = Date.now() - networkStartTime;
      console.log(`✅ Fetched ${data.length} videos from network in ${networkElapsed}ms`);

      if (cancelledRef.current) return; // ✅ Check cancelled before dispatch

      // Update videos
      if (append) {
        setVideos(prev => [...prev, ...(data as VideoRecord[])]);
        setPagination(prev => ({
          ...prev,
          page: pageToLoad,
          hasMore: data.length === PAGE_SIZE,
          isLoadingMore: false,
        }));
      } else {
        setVideos(data as VideoRecord[]);
        setPagination({
          page: 0,
          hasMore: data.length === PAGE_SIZE,
          isLoadingMore: false,
        });
        setLoading(false);

        // 🚀 Update cache (non-blocking)
        VideoCacheService.saveToCache(data as VideoRecord[]);
      }
    } catch (err: any) {
      console.error('❌ Error fetching videos:', err);
      if (cancelledRef.current) return; // ✅ Check cancelled before dispatch
      // ✅ Error logged to console only (no UI display)
      // setError(err.message || 'Failed to load videos');
      setLoading(false);
      setPagination(prev => ({ ...prev, isLoadingMore: false }));
    }
  }, []);

  // Load more videos handler
  const handleLoadMore = useCallback(() => {
    if (!pagination.hasMore || pagination.isLoadingMore || loading) {
      console.log('⏸️ Skipping load more:', {
        hasMore: pagination.hasMore,
        isLoadingMore: pagination.isLoadingMore,
        loading,
      });
      return;
    }

    console.log('📄 Loading more videos, page:', pagination.page + 1);
    const nextPage = pagination.page + 1;
    fetchVideos(nextPage, true);
  }, [pagination, loading, fetchVideos]);

  // Toggle view mode
  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'calendar' ? 'grid' : 'calendar');
  }, []);

  // Update video player state (partial updates)
  const setVideoPlayer = useCallback((partialState: Partial<VideoPlayerState>) => {
    setVideoPlayerState(prev => ({ ...prev, ...partialState }));
  }, []);

  // Load chapters on mount
  useEffect(() => {
    const loadChapters = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Load all chapters
        const allChapters = await getUserChapters(user.id);
        setChapters(allChapters);

        // Load current chapter
        const current = await getCurrentChapter(user.id);
        setCurrentChapter(current);
      } catch (error) {
        console.error('❌ Error loading chapters:', error);
      }
    };

    loadChapters();
  }, []);

  // ✅ FIX: Keep fetchVideosRef updated with latest version
  useEffect(() => {
    fetchVideosRef.current = fetchVideos;
  }, [fetchVideos]);

  // 🚀 OPTIMIZATION: Load videos after interactions complete (non-blocking)
  useEffect(() => {
    // Reset cancelled flag on mount
    cancelledRef.current = false;

    // Skeleton UI is already visible immediately
    // Now defer heavy operations until after navigation animation
    const handle = InteractionManager.runAfterInteractions(() => {
      console.log('🚀 Starting fetchVideos after interactions complete');
      fetchVideos(0, false);
    });

    return () => {
      // ✅ Set cancelled flag to prevent setState after unmount
      cancelledRef.current = true;
      handle.cancel();
    };
  }, [fetchVideos]);

  // 🚀 OPTIMIZATION: Subscribe to import queue updates (defer queue loading)
  useEffect(() => {
    // 🚀 Defer queue state loading to avoid blocking initial render
    const handle = InteractionManager.runAfterInteractions(() => {
      // Load persisted queue state after interactions complete (100ms delay)
      setTimeout(() => {
        console.log('🚀 Loading import queue state (deferred)');
        ImportQueueService.loadQueueState();
      }, 100);
    });

    // Subscribe to queue updates
    const unsubscribe = ImportQueueService.subscribe((queueState) => {
      setImportState({ queueState });

      // Don't show progress modal - videos will show inline with spinner
      // Just refresh when imports complete
      if (queueState.completedCount > 0 && !queueState.isProcessing) {
        // ✅ FIX: Defer fetchVideos to avoid blocking during interactions/animations
        // Wait 500ms for any ongoing animations to complete before fetching
        setTimeout(() => {
          console.log('🔄 Import completed - refreshing videos (deferred)');
          fetchVideosRef.current?.();
        }, 500);
      }
    });

    return () => {
      handle.cancel();
      unsubscribe();
    };
  }, []); // ✅ FIX: Empty deps - no re-subscriptions, use fetchVideosRef instead

  return {
    // Data state
    videos,
    loading,
    error,
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
