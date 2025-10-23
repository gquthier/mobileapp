/**
 * useHighlightsQuery Hook
 * TanStack Query wrapper pour Highlights & Transcriptions
 *
 * Optimisation majeure: Bulk fetch au lieu de N+1 queries
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryOptions } from '../../lib/queryClient';

export interface TranscriptionJob {
  id: string;
  video_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transcript_text?: string;
  segments?: TranscriptSegment[];
  highlights?: Highlight[];
  language?: string;
  created_at: string;
  updated_at: string;
}

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  avg_logprob?: number;
  no_speech_prob?: number;
}

export interface Highlight {
  title: string;
  text: string;
  summary?: string;
  startTime: number;
  endTime?: number;
  importance?: number;
  confidence?: number;
}

// ============================================================================
// FETCH SINGLE VIDEO HIGHLIGHTS
// ============================================================================

export const useHighlightsQuery = (videoId: string | null) => {
  return useQuery<TranscriptionJob | null, Error>({
    queryKey: ['highlights', videoId],
    queryFn: async () => {
      if (!videoId) return null;

      console.log(`🔄 [React Query] Fetching highlights for video ${videoId}...`);

      const { data, error } = await supabase
        .from('transcription_jobs')
        .select('*')
        .eq('video_id', videoId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      console.log('✅ [React Query] Highlights fetched:', data?.highlights?.length || 0);
      return data || null;
    },
    ...queryOptions.highlights,
    enabled: Boolean(videoId),
  });
};

// ============================================================================
// BULK FETCH HIGHLIGHTS (OPTIMISATION PHASE 3)
// ============================================================================

export const useBulkHighlightsQuery = (videoIds: string[]) => {
  return useQuery<Map<string, TranscriptionJob>, Error>({
    queryKey: ['highlights', 'bulk', videoIds],
    queryFn: async () => {
      if (!videoIds.length) return new Map();

      console.log(`🔄 [React Query] Bulk fetching highlights for ${videoIds.length} videos...`);

      // Fetch par batch de 100 pour éviter limite URL
      const batchSize = 100;
      const batches = [];

      for (let i = 0; i < videoIds.length; i += batchSize) {
        const batch = videoIds.slice(i, i + batchSize);
        batches.push(batch);
      }

      const allJobs: TranscriptionJob[] = [];

      for (const batch of batches) {
        const { data, error } = await supabase
          .from('transcription_jobs')
          .select('*')
          .in('video_id', batch)
          .eq('status', 'completed');

        if (error) throw error;
        if (data) allJobs.push(...data);
      }

      // Créer une Map pour accès rapide O(1)
      const highlightsMap = new Map<string, TranscriptionJob>();
      allJobs.forEach(job => {
        highlightsMap.set(job.video_id, job);
      });

      console.log(`✅ [React Query] Bulk fetched ${highlightsMap.size} highlight sets`);
      return highlightsMap;
    },
    ...queryOptions.highlights,
    enabled: videoIds.length > 0,
  });
};

// ============================================================================
// FETCH TRANSCRIPTION STATUS
// ============================================================================

export const useTranscriptionStatusQuery = (videoId: string | null) => {
  return useQuery<string, Error>({
    queryKey: ['transcription', 'status', videoId],
    queryFn: async () => {
      if (!videoId) return 'none';

      const { data, error } = await supabase
        .from('transcription_jobs')
        .select('status')
        .eq('video_id', videoId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data?.status || 'none';
    },
    // Refresh plus souvent si processing
    refetchInterval: (data) => {
      if (data === 'processing' || data === 'pending') {
        return 5000; // Poll every 5 seconds
      }
      return false;
    },
    enabled: Boolean(videoId),
  });
};

// ============================================================================
// PREFETCH UTILITIES
// ============================================================================

export const usePrefetchHighlights = () => {
  const queryClient = useQueryClient();

  return async (videoIds: string[]) => {
    // Prefetch seulement les IDs pas déjà en cache
    const uncachedIds = videoIds.filter(id => {
      const cached = queryClient.getQueryData(['highlights', id]);
      return !cached;
    });

    if (uncachedIds.length === 0) {
      console.log('✨ [React Query] All highlights already cached');
      return;
    }

    console.log(`🔮 [React Query] Prefetching ${uncachedIds.length} highlights...`);

    return queryClient.prefetchQuery({
      queryKey: ['highlights', 'bulk', uncachedIds],
      queryFn: async () => {
        const { data } = await supabase
          .from('transcription_jobs')
          .select('*')
          .in('video_id', uncachedIds);

        const map = new Map();
        data?.forEach(job => map.set(job.video_id, job));
        return map;
      },
      staleTime: queryOptions.highlights.staleTime,
    });
  };
};

// ============================================================================
// CACHE UTILITIES
// ============================================================================

export const useHighlightsCache = () => {
  const queryClient = useQueryClient();

  return {
    // Obtenir depuis le bulk cache d'abord, puis individual
    getCachedHighlights: (videoId: string): TranscriptionJob | undefined => {
      // Chercher dans le cache individual
      const individual = queryClient.getQueryData<TranscriptionJob>(['highlights', videoId]);
      if (individual) return individual;

      // Chercher dans tous les bulk caches
      const allQueries = queryClient.getQueryCache().getAll();
      for (const query of allQueries) {
        if (query.queryKey[0] === 'highlights' && query.queryKey[1] === 'bulk') {
          const bulkData = query.state.data as Map<string, TranscriptionJob> | undefined;
          if (bulkData?.has(videoId)) {
            return bulkData.get(videoId);
          }
        }
      }

      return undefined;
    },

    // Invalider highlights pour une vidéo
    invalidateHighlights: (videoId: string) => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['highlights', videoId] }),
        queryClient.invalidateQueries({ queryKey: ['highlights', 'bulk'] }),
        queryClient.invalidateQueries({ queryKey: ['transcription', 'status', videoId] }),
      ]);
    },

    // Reset tout le cache highlights
    resetHighlightsCache: () => {
      queryClient.removeQueries({ queryKey: ['highlights'] });
      queryClient.removeQueries({ queryKey: ['transcription'] });
    },
  };
};