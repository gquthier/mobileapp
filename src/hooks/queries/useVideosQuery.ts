/**
 * useVideosQuery Hook
 * TanStack Query wrapper pour VideoService
 *
 * Remplace les patterns useState + useEffect pour le fetching de vidéos
 * Gère automatiquement: cache, retry, background refetch, optimistic updates
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { VideoService } from '../../services/videoService';
import { VideoRecord } from '../../types';
import { queryOptions } from '../../lib/queryClient';

// ============================================================================
// FETCH ALL VIDEOS
// ============================================================================

interface UseVideosOptions {
  enabled?: boolean;
  initialData?: VideoRecord[];
}

export const useVideosQuery = (options?: UseVideosOptions) => {
  return useQuery<VideoRecord[], Error>({
    queryKey: ['videos'],
    queryFn: async () => {
      console.log('🔄 [React Query] Fetching all videos...');
      const videos = await VideoService.getAllVideos();
      console.log(`✅ [React Query] Fetched ${videos.length} videos`);
      return videos;
    },
    ...queryOptions.videos,
    enabled: options?.enabled ?? true,
    initialData: options?.initialData,
  });
};

// ============================================================================
// INFINITE QUERY FOR PAGINATION
// ============================================================================

interface UseInfiniteVideosOptions {
  pageSize?: number;
  enabled?: boolean;
}

export const useInfiniteVideosQuery = (options?: UseInfiniteVideosOptions) => {
  const pageSize = options?.pageSize ?? 50;

  return useInfiniteQuery<VideoRecord[], Error>({
    queryKey: ['videos', 'infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      // console.log(`🔄 [React Query] Fetching videos page ${pageParam}...`);

      // Simuler pagination avec offset/limit
      // TODO: Adapter selon votre API Supabase
      const allVideos = await VideoService.getAllVideos();
      const start = pageParam as number;
      const end = start + pageSize;
      const pageVideos = allVideos.slice(start, end);

      // console.log(`✅ [React Query] Fetched page with ${pageVideos.length} videos`);
      return pageVideos;
    },
    getNextPageParam: (lastPage, allPages) => {
      // Retourner undefined si plus de pages
      if (lastPage.length < pageSize) return undefined;
      return allPages.length * pageSize;
    },
    ...queryOptions.videos,
    enabled: options?.enabled ?? true,
  });
};

// ============================================================================
// FETCH VIDEOS BY CHAPTER
// ============================================================================

export const useVideosByChapterQuery = (chapterId: string | null, options?: UseVideosOptions) => {
  return useQuery<VideoRecord[], Error>({
    queryKey: ['videos', 'byChapter', chapterId],
    queryFn: async () => {
      if (!chapterId) return [];

      console.log(`🔄 [React Query] Fetching videos for chapter ${chapterId}...`);
      const videos = await VideoService.getVideosByChapter(chapterId);
      console.log(`✅ [React Query] Fetched ${videos.length} videos for chapter`);
      return videos;
    },
    ...queryOptions.videos,
    enabled: Boolean(chapterId) && (options?.enabled ?? true),
  });
};

// ============================================================================
// FETCH SINGLE VIDEO
// ============================================================================

export const useVideoQuery = (videoId: string | null) => {
  return useQuery<VideoRecord | null, Error>({
    queryKey: ['video', videoId],
    queryFn: async () => {
      if (!videoId) return null;

      console.log(`🔄 [React Query] Fetching video ${videoId}...`);
      const videos = await VideoService.getAllVideos();
      const video = videos.find(v => v.id === videoId) || null;
      console.log(`✅ [React Query] Fetched video:`, video?.title);
      return video;
    },
    ...queryOptions.videos,
    enabled: Boolean(videoId),
  });
};

// ============================================================================
// DELETE VIDEO MUTATION
// ============================================================================

export const useDeleteVideoMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (videoId: string) => {
      console.log(`🗑️ [React Query] Deleting video ${videoId}...`);
      await VideoService.deleteVideo(videoId);
    },
    // Optimistic update
    onMutate: async (videoId) => {
      // Cancel les refetch en cours
      await queryClient.cancelQueries({ queryKey: ['videos'] });

      // Snapshot pour rollback
      const previousVideos = queryClient.getQueryData<VideoRecord[]>(['videos']);

      // Optimistic update - retirer la vidéo immédiatement
      queryClient.setQueryData<VideoRecord[]>(['videos'], (old) =>
        old?.filter(v => v.id !== videoId) ?? []
      );

      return { previousVideos };
    },
    // Rollback en cas d'erreur
    onError: (err, videoId, context) => {
      console.error('❌ [React Query] Delete failed:', err);
      if (context?.previousVideos) {
        queryClient.setQueryData(['videos'], context.previousVideos);
      }
    },
    // Invalider le cache après succès
    onSuccess: () => {
      console.log('✅ [React Query] Video deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
  });
};

// ============================================================================
// UPDATE VIDEO MUTATION
// ============================================================================

interface UpdateVideoParams {
  id: string;
  updates: Partial<VideoRecord>;
}

export const useUpdateVideoMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<VideoRecord, Error, UpdateVideoParams>({
    mutationFn: async ({ id, updates }) => {
      console.log(`✏️ [React Query] Updating video ${id}...`);
      return await VideoService.updateVideo(id, updates);
    },
    // Optimistic update
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['videos'] });
      await queryClient.cancelQueries({ queryKey: ['video', id] });

      const previousVideos = queryClient.getQueryData<VideoRecord[]>(['videos']);
      const previousVideo = queryClient.getQueryData<VideoRecord>(['video', id]);

      // Update dans la liste
      queryClient.setQueryData<VideoRecord[]>(['videos'], (old) =>
        old?.map(v => v.id === id ? { ...v, ...updates } : v) ?? []
      );

      // Update le single video cache
      queryClient.setQueryData<VideoRecord>(['video', id], (old) =>
        old ? { ...old, ...updates } : old
      );

      return { previousVideos, previousVideo };
    },
    onError: (err, { id }, context) => {
      console.error('❌ [React Query] Update failed:', err);
      if (context?.previousVideos) {
        queryClient.setQueryData(['videos'], context.previousVideos);
      }
      if (context?.previousVideo) {
        queryClient.setQueryData(['video', id], context.previousVideo);
      }
    },
    onSuccess: (data) => {
      console.log('✅ [React Query] Video updated successfully');
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['video', data.id] });
    },
  });
};

// ============================================================================
// PREFETCH UTILITIES
// ============================================================================

export const usePrefetchVideo = () => {
  const queryClient = useQueryClient();

  return (videoId: string) => {
    return queryClient.prefetchQuery({
      queryKey: ['video', videoId],
      queryFn: async () => {
        const videos = await VideoService.getAllVideos();
        return videos.find(v => v.id === videoId) || null;
      },
      staleTime: queryOptions.videos.staleTime,
    });
  };
};

// ============================================================================
// CACHE UTILITIES
// ============================================================================

export const useVideoCache = () => {
  const queryClient = useQueryClient();

  return {
    // Obtenir une vidéo depuis le cache sans refetch
    getCachedVideo: (videoId: string): VideoRecord | undefined => {
      const videos = queryClient.getQueryData<VideoRecord[]>(['videos']);
      return videos?.find(v => v.id === videoId);
    },

    // Invalider le cache des vidéos
    invalidateVideos: () => {
      return queryClient.invalidateQueries({ queryKey: ['videos'] });
    },

    // Reset le cache complet des vidéos
    resetVideosCache: () => {
      queryClient.removeQueries({ queryKey: ['videos'] });
    },
  };
};