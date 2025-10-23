/**
 * useChaptersQuery Hook
 * TanStack Query wrapper pour ChapterService
 *
 * Gère le fetching, caching et mutations des chapitres
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryOptions } from '../../lib/queryClient';

export interface Chapter {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  color?: string;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  goal?: string;
  video_count?: number;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

// ============================================================================
// FETCH ALL CHAPTERS
// ============================================================================

export const useChaptersQuery = () => {
  return useQuery<Chapter[], Error>({
    queryKey: ['chapters'],
    queryFn: async () => {
      console.log('🔄 [React Query] Fetching chapters...');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`✅ [React Query] Fetched ${data?.length || 0} chapters`);
      return data || [];
    },
    ...queryOptions.chapters,
  });
};

// ============================================================================
// FETCH CURRENT CHAPTER
// ============================================================================

export const useCurrentChapterQuery = () => {
  return useQuery<Chapter | null, Error>({
    queryKey: ['chapters', 'current'],
    queryFn: async () => {
      console.log('🔄 [React Query] Fetching current chapter...');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_current', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignorer "no rows"

      console.log('✅ [React Query] Current chapter:', data?.title || 'None');
      return data || null;
    },
    ...queryOptions.chapters,
  });
};

// ============================================================================
// FETCH SINGLE CHAPTER
// ============================================================================

export const useChapterQuery = (chapterId: string | null) => {
  return useQuery<Chapter | null, Error>({
    queryKey: ['chapter', chapterId],
    queryFn: async () => {
      if (!chapterId) return null;

      console.log(`🔄 [React Query] Fetching chapter ${chapterId}...`);

      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('id', chapterId)
        .single();

      if (error) throw error;

      console.log('✅ [React Query] Fetched chapter:', data?.title);
      return data;
    },
    ...queryOptions.chapters,
    enabled: Boolean(chapterId),
  });
};

// ============================================================================
// CREATE CHAPTER MUTATION
// ============================================================================

interface CreateChapterParams {
  title: string;
  description?: string;
  color?: string;
  start_date?: string;
  end_date?: string;
  goal?: string;
  is_current?: boolean;
}

export const useCreateChapterMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<Chapter, Error, CreateChapterParams>({
    mutationFn: async (params) => {
      console.log('➕ [React Query] Creating chapter:', params.title);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Si is_current, désactiver les autres chapitres
      if (params.is_current) {
        await supabase
          .from('chapters')
          .update({ is_current: false })
          .eq('user_id', user.id);
      }

      const { data, error } = await supabase
        .from('chapters')
        .insert({
          ...params,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      console.log('✅ [React Query] Chapter created:', data.title);
      // Invalider les queries liées
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
      if (data.is_current) {
        queryClient.invalidateQueries({ queryKey: ['chapters', 'current'] });
      }
    },
    onError: (error) => {
      console.error('❌ [React Query] Create chapter failed:', error);
    },
  });
};

// ============================================================================
// UPDATE CHAPTER MUTATION
// ============================================================================

interface UpdateChapterParams {
  id: string;
  updates: Partial<Chapter>;
}

export const useUpdateChapterMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<Chapter, Error, UpdateChapterParams>({
    mutationFn: async ({ id, updates }) => {
      console.log(`✏️ [React Query] Updating chapter ${id}...`);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Si on met à jour is_current, désactiver les autres
      if (updates.is_current) {
        await supabase
          .from('chapters')
          .update({ is_current: false })
          .eq('user_id', user.id)
          .neq('id', id);
      }

      const { data, error } = await supabase
        .from('chapters')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    // Optimistic update
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['chapters'] });
      await queryClient.cancelQueries({ queryKey: ['chapter', id] });

      const previousChapters = queryClient.getQueryData<Chapter[]>(['chapters']);
      const previousChapter = queryClient.getQueryData<Chapter>(['chapter', id]);

      // Update optimiste de la liste
      queryClient.setQueryData<Chapter[]>(['chapters'], (old) =>
        old?.map(c => c.id === id ? { ...c, ...updates } : c) ?? []
      );

      // Update optimiste du chapitre unique
      queryClient.setQueryData<Chapter>(['chapter', id], (old) =>
        old ? { ...old, ...updates } : old
      );

      return { previousChapters, previousChapter };
    },
    onError: (err, { id }, context) => {
      console.error('❌ [React Query] Update failed:', err);
      // Rollback
      if (context?.previousChapters) {
        queryClient.setQueryData(['chapters'], context.previousChapters);
      }
      if (context?.previousChapter) {
        queryClient.setQueryData(['chapter', id], context.previousChapter);
      }
    },
    onSuccess: (data) => {
      console.log('✅ [React Query] Chapter updated:', data.title);
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
      queryClient.invalidateQueries({ queryKey: ['chapter', data.id] });
      if (data.is_current) {
        queryClient.invalidateQueries({ queryKey: ['chapters', 'current'] });
      }
    },
  });
};

// ============================================================================
// DELETE CHAPTER MUTATION
// ============================================================================

export const useDeleteChapterMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (chapterId) => {
      console.log(`🗑️ [React Query] Deleting chapter ${chapterId}...`);

      const { error } = await supabase
        .from('chapters')
        .delete()
        .eq('id', chapterId);

      if (error) throw error;
    },
    // Optimistic update
    onMutate: async (chapterId) => {
      await queryClient.cancelQueries({ queryKey: ['chapters'] });

      const previousChapters = queryClient.getQueryData<Chapter[]>(['chapters']);

      queryClient.setQueryData<Chapter[]>(['chapters'], (old) =>
        old?.filter(c => c.id !== chapterId) ?? []
      );

      return { previousChapters };
    },
    onError: (err, chapterId, context) => {
      console.error('❌ [React Query] Delete failed:', err);
      if (context?.previousChapters) {
        queryClient.setQueryData(['chapters'], context.previousChapters);
      }
    },
    onSuccess: () => {
      console.log('✅ [React Query] Chapter deleted');
      queryClient.invalidateQueries({ queryKey: ['chapters'] });
      queryClient.invalidateQueries({ queryKey: ['chapters', 'current'] });
      queryClient.invalidateQueries({ queryKey: ['videos'] }); // Les vidéos peuvent être affectées
    },
  });
};

// ============================================================================
// CACHE UTILITIES
// ============================================================================

export const useChapterCache = () => {
  const queryClient = useQueryClient();

  return {
    getCachedChapter: (chapterId: string): Chapter | undefined => {
      const chapters = queryClient.getQueryData<Chapter[]>(['chapters']);
      return chapters?.find(c => c.id === chapterId);
    },

    getCurrentChapterFromCache: (): Chapter | undefined => {
      const chapters = queryClient.getQueryData<Chapter[]>(['chapters']);
      return chapters?.find(c => c.is_current);
    },

    invalidateChapters: () => {
      return queryClient.invalidateQueries({ queryKey: ['chapters'] });
    },

    resetChaptersCache: () => {
      queryClient.removeQueries({ queryKey: ['chapters'] });
      queryClient.removeQueries({ queryKey: ['chapter'] });
    },
  };
};