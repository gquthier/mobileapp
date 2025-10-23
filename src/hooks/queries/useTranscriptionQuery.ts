/**
 * useTranscriptionQuery Hook
 * TanStack Query wrapper pour Transcription Services
 *
 * Gère le fetching des transcriptions, segments et highlights
 * Optimisé pour VideoPlayer et ChapterDetailScreen
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryOptions } from '../../lib/queryClient';
import { TranscriptionJob, TranscriptSegment, Highlight } from './useHighlightsQuery';

// ============================================================================
// FETCH FULL TRANSCRIPTION JOB
// ============================================================================

export const useTranscriptionQuery = (videoId: string | null) => {
  return useQuery<TranscriptionJob | null, Error>({
    queryKey: ['transcription', videoId],
    queryFn: async () => {
      if (!videoId) return null;

      console.log(`🔄 [React Query] Fetching transcription for video ${videoId}...`);

      const { data, error } = await supabase
        .from('transcription_jobs')
        .select('*')
        .eq('video_id', videoId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows"

      console.log('✅ [React Query] Transcription fetched:', {
        status: data?.status,
        hasText: !!data?.transcript_text,
        segmentsCount: data?.segments?.length || 0,
        highlightsCount: data?.highlights?.length || 0,
      });

      return data || null;
    },
    ...queryOptions.transcriptions,
    enabled: Boolean(videoId),
  });
};

// ============================================================================
// FETCH TRANSCRIPTION TEXT ONLY
// ============================================================================

export const useTranscriptionTextQuery = (videoId: string | null) => {
  return useQuery<string | null, Error>({
    queryKey: ['transcription', 'text', videoId],
    queryFn: async () => {
      if (!videoId) return null;

      console.log(`🔄 [React Query] Fetching transcription text for ${videoId}...`);

      const { data, error } = await supabase
        .from('transcription_jobs')
        .select('transcript_text')
        .eq('video_id', videoId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data?.transcript_text || null;
    },
    ...queryOptions.transcriptions,
    enabled: Boolean(videoId),
  });
};

// ============================================================================
// FETCH TRANSCRIPTION SEGMENTS ONLY
// ============================================================================

export const useTranscriptionSegmentsQuery = (videoId: string | null) => {
  return useQuery<TranscriptSegment[], Error>({
    queryKey: ['transcription', 'segments', videoId],
    queryFn: async () => {
      if (!videoId) return [];

      console.log(`🔄 [React Query] Fetching transcript segments for ${videoId}...`);

      const { data, error } = await supabase
        .from('transcription_jobs')
        .select('segments')
        .eq('video_id', videoId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const segments = data?.segments || [];
      console.log(`✅ [React Query] Fetched ${segments.length} segments`);

      return segments;
    },
    ...queryOptions.transcriptions,
    enabled: Boolean(videoId),
  });
};

// ============================================================================
// FETCH FULL TRANSCRIPTION DATA (text + segments + highlights)
// ============================================================================

interface TranscriptionFullData {
  text: string | null;
  segments: TranscriptSegment[];
  highlights: Highlight[];
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'none';
  language?: string;
  created_at?: string;
  updated_at?: string;
}

export const useTranscriptionFullQuery = (videoId: string | null) => {
  return useQuery<TranscriptionFullData, Error>({
    queryKey: ['transcription', 'full', videoId],
    queryFn: async () => {
      if (!videoId) {
        return {
          text: null,
          segments: [],
          highlights: [],
          status: 'none',
        };
      }

      console.log(`🔄 [React Query] Fetching full transcription data for ${videoId}...`);

      const { data, error } = await supabase
        .from('transcription_jobs')
        .select('*')
        .eq('video_id', videoId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        return {
          text: null,
          segments: [],
          highlights: [],
          status: 'none',
        };
      }

      console.log('✅ [React Query] Full transcription data fetched:', {
        status: data.status,
        textLength: data.transcript_text?.length || 0,
        segments: data.segments?.length || 0,
        highlights: data.highlights?.length || 0,
      });

      return {
        text: data.transcript_text || null,
        segments: data.segments || [],
        highlights: data.highlights || [],
        status: data.status,
        language: data.language,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    },
    ...queryOptions.transcriptions,
    enabled: Boolean(videoId),
  });
};

// ============================================================================
// FETCH TRANSCRIPTION STATUS WITH POLLING
// ============================================================================

export const useTranscriptionStatusQuery = (videoId: string | null, enablePolling = false) => {
  return useQuery<'pending' | 'processing' | 'completed' | 'failed' | 'none', Error>({
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
    // Poll every 5 seconds if processing/pending AND polling enabled
    refetchInterval: (data) => {
      if (!enablePolling) return false;
      if (data === 'processing' || data === 'pending') {
        return 5000; // 5 seconds
      }
      return false;
    },
    enabled: Boolean(videoId),
  });
};

// ============================================================================
// BULK FETCH TRANSCRIPTIONS (for VideoPlayer optimization)
// ============================================================================

export const useBulkTranscriptionsQuery = (videoIds: string[]) => {
  return useQuery<Map<string, TranscriptionJob>, Error>({
    queryKey: ['transcriptions', 'bulk', videoIds],
    queryFn: async () => {
      if (!videoIds.length) return new Map();

      console.log(`🔄 [React Query] Bulk fetching transcriptions for ${videoIds.length} videos...`);

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
          .in('video_id', batch);

        if (error) throw error;
        if (data) allJobs.push(...data);
      }

      // Créer une Map pour accès rapide O(1)
      const transcriptionsMap = new Map<string, TranscriptionJob>();
      allJobs.forEach(job => {
        transcriptionsMap.set(job.video_id, job);
      });

      console.log(`✅ [React Query] Bulk fetched ${transcriptionsMap.size} transcriptions`);
      return transcriptionsMap;
    },
    ...queryOptions.transcriptions,
    enabled: videoIds.length > 0,
  });
};

// ============================================================================
// FETCH QUOTES FROM HIGHLIGHTS (for ChapterDetailScreen)
// ============================================================================

export interface Quote {
  id: string;
  video_id: string;
  title: string;
  text: string;
  summary?: string;
  timestamp: number;
  importance?: number;
  created_at?: string;
}

export const useQuotesQuery = (videoIds: string[]) => {
  return useQuery<Quote[], Error>({
    queryKey: ['quotes', videoIds],
    queryFn: async () => {
      if (!videoIds.length) return [];

      console.log(`🔄 [React Query] Fetching quotes for ${videoIds.length} videos...`);

      // Fetch transcriptions pour ces vidéos
      const { data, error } = await supabase
        .from('transcription_jobs')
        .select('video_id, highlights')
        .in('video_id', videoIds)
        .eq('status', 'completed');

      if (error) throw error;

      // Extraire les highlights et les transformer en quotes
      const quotes: Quote[] = [];

      data?.forEach(job => {
        if (job.highlights && Array.isArray(job.highlights)) {
          job.highlights.forEach((highlight: Highlight, index: number) => {
            quotes.push({
              id: `${job.video_id}-${index}`,
              video_id: job.video_id,
              title: highlight.title,
              text: highlight.text,
              summary: highlight.summary,
              timestamp: highlight.startTime,
              importance: highlight.importance,
            });
          });
        }
      });

      // Trier par importance (si disponible)
      quotes.sort((a, b) => (b.importance || 0) - (a.importance || 0));

      console.log(`✅ [React Query] Fetched ${quotes.length} quotes from ${data?.length || 0} videos`);
      return quotes;
    },
    ...queryOptions.transcriptions,
    enabled: videoIds.length > 0,
  });
};

// ============================================================================
// PREFETCH UTILITIES
// ============================================================================

export const usePrefetchTranscription = () => {
  const queryClient = useQueryClient();

  return async (videoId: string) => {
    // Check si déjà en cache
    const cached = queryClient.getQueryData(['transcription', videoId]);
    if (cached) {
      console.log('✨ [React Query] Transcription already cached');
      return;
    }

    console.log(`🔮 [React Query] Prefetching transcription for ${videoId}...`);

    return queryClient.prefetchQuery({
      queryKey: ['transcription', videoId],
      queryFn: async () => {
        const { data } = await supabase
          .from('transcription_jobs')
          .select('*')
          .eq('video_id', videoId)
          .single();

        return data || null;
      },
      staleTime: queryOptions.transcriptions.staleTime,
    });
  };
};

// ============================================================================
// CACHE UTILITIES
// ============================================================================

export const useTranscriptionCache = () => {
  const queryClient = useQueryClient();

  return {
    // Obtenir depuis le cache sans refetch
    getCachedTranscription: (videoId: string): TranscriptionJob | undefined => {
      // Chercher dans le cache individual
      const individual = queryClient.getQueryData<TranscriptionJob>(['transcription', videoId]);
      if (individual) return individual;

      // Chercher dans tous les bulk caches
      const allQueries = queryClient.getQueryCache().getAll();
      for (const query of allQueries) {
        if (query.queryKey[0] === 'transcriptions' && query.queryKey[1] === 'bulk') {
          const bulkData = query.state.data as Map<string, TranscriptionJob> | undefined;
          if (bulkData?.has(videoId)) {
            return bulkData.get(videoId);
          }
        }
      }

      return undefined;
    },

    // Obtenir le texte uniquement
    getCachedText: (videoId: string): string | null => {
      const cached = queryClient.getQueryData<string>(['transcription', 'text', videoId]);
      if (cached) return cached;

      // Fallback au full transcription
      const full = queryClient.getQueryData<TranscriptionJob>(['transcription', videoId]);
      return full?.transcript_text || null;
    },

    // Obtenir les segments uniquement
    getCachedSegments: (videoId: string): TranscriptSegment[] => {
      const cached = queryClient.getQueryData<TranscriptSegment[]>(['transcription', 'segments', videoId]);
      if (cached) return cached;

      // Fallback au full transcription
      const full = queryClient.getQueryData<TranscriptionJob>(['transcription', videoId]);
      return full?.segments || [];
    },

    // Invalider transcription pour une vidéo
    invalidateTranscription: (videoId: string) => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transcription', videoId] }),
        queryClient.invalidateQueries({ queryKey: ['transcription', 'text', videoId] }),
        queryClient.invalidateQueries({ queryKey: ['transcription', 'segments', videoId] }),
        queryClient.invalidateQueries({ queryKey: ['transcription', 'full', videoId] }),
        queryClient.invalidateQueries({ queryKey: ['transcription', 'status', videoId] }),
        queryClient.invalidateQueries({ queryKey: ['transcriptions', 'bulk'] }),
      ]);
    },

    // Reset tout le cache transcriptions
    resetTranscriptionsCache: () => {
      queryClient.removeQueries({ queryKey: ['transcription'] });
      queryClient.removeQueries({ queryKey: ['transcriptions'] });
      queryClient.removeQueries({ queryKey: ['quotes'] });
    },
  };
};

// ============================================================================
// EXPORT DEFAULT POUR COMPATIBILITÉ
// ============================================================================

export default {
  useTranscriptionQuery,
  useTranscriptionTextQuery,
  useTranscriptionSegmentsQuery,
  useTranscriptionFullQuery,
  useTranscriptionStatusQuery,
  useBulkTranscriptionsQuery,
  useQuotesQuery,
  usePrefetchTranscription,
  useTranscriptionCache,
};
