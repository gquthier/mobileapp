/**
 * TanStack Query Configuration
 * Phase 3 Optimization - 23/10/2024
 *
 * Configuration centralisée pour React Query avec:
 * - Cache persistant de 10 minutes
 * - Stale time de 5 minutes
 * - Retry intelligent
 * - Background refetch désactivé par défaut
 */

import { QueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';

// Configuration optimisée pour mobile
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Durée avant que les données soient considérées "stale"
      staleTime: 5 * 60 * 1000, // 5 minutes

      // Durée de conservation en cache
      cacheTime: 10 * 60 * 1000, // 10 minutes

      // Nombre de tentatives en cas d'échec
      retry: (failureCount, error: any) => {
        // Ne pas retry si erreur 404 ou 401
        if (error?.status === 404 || error?.status === 401) {
          return false;
        }
        // Maximum 2 retries
        return failureCount < 2;
      },

      // Délai entre les retries (exponential backoff)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Désactiver le refetch automatique au focus (mobile)
      refetchOnWindowFocus: false,

      // Désactiver le refetch lors de la reconnexion réseau
      refetchOnReconnect: 'always',

      // Garder les données précédentes pendant le refetch
      keepPreviousData: true,
    },

    mutations: {
      // Retry mutations seulement 1 fois
      retry: 1,

      // Délai de retry pour mutations
      retryDelay: 1000,
    },
  },
});

// Configuration spécifique par type de données
export const queryOptions = {
  // Videos: cache plus long car changent rarement
  videos: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  },

  // Chapters: cache moyen
  chapters: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
  },

  // Transcriptions: cache très long car immuables
  transcriptions: {
    staleTime: 60 * 60 * 1000, // 1 heure
    cacheTime: 24 * 60 * 60 * 1000, // 24 heures
  },

  // User data: cache court car peut changer souvent
  user: {
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 5 * 60 * 1000, // 5 minutes
  },

  // Highlights: cache long car généré une fois
  highlights: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 heure
  },
};

// Helper pour invalidation en cascade
export const invalidateRelatedQueries = async (queryKey: string[]) => {
  // Exemple: si on invalide une vidéo, invalider aussi ses highlights
  if (queryKey[0] === 'video') {
    await queryClient.invalidateQueries(['highlights', queryKey[1]]);
    await queryClient.invalidateQueries(['transcription', queryKey[1]]);
  }

  // Si on invalide un chapitre, invalider les vidéos associées
  if (queryKey[0] === 'chapter') {
    await queryClient.invalidateQueries(['videos']);
  }
};

// Helper pour préfetch de données
export const prefetchNextPage = async (queryKey: string[], pageParam: number) => {
  return queryClient.prefetchQuery({
    queryKey: [...queryKey, { page: pageParam }],
    staleTime: queryOptions.videos.staleTime,
  });
};

// Fonction pour nettoyer le cache (utile pour debug/settings)
export const clearQueryCache = () => {
  queryClient.clear();
};

// Fonction pour obtenir les stats du cache (debug)
export const getCacheStats = () => {
  if (__DEV__) {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    console.log('📊 Cache Stats:', {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      activeQueries: queries.filter(q => q.state.fetchStatus === 'fetching').length,
      cachedData: queries.filter(q => q.state.data !== undefined).length,
    });
  }
};

export default queryClient;