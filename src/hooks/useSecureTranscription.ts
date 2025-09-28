// Hook React pour la transcription sécurisée
import { useState, useEffect, useCallback } from 'react';
import { SecureTranscriptionService, TranscriptionStatus } from '../services/secureTranscriptionService';

export interface UseSecureTranscriptionResult {
  // États
  isTranscribing: boolean;
  transcriptionStatus: TranscriptionStatus | null;
  error: string | null;

  // Actions
  startTranscription: (videoId: string, videoUrl: string, language?: string) => Promise<void>;
  retryTranscription: (videoId: string, videoUrl: string, language?: string) => Promise<void>;
  clearError: () => void;

  // Données
  transcriptionText: string | null;
  transcriptionSegments: any[] | null;
}

export const useSecureTranscription = (videoId?: string): UseSecureTranscriptionResult => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState<TranscriptionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Charger le statut initial si un videoId est fourni
  useEffect(() => {
    if (videoId) {
      loadTranscriptionStatus(videoId);
    }
  }, [videoId]);

  // S'abonner aux mises à jour en temps réel
  useEffect(() => {
    if (!videoId) return;

    const subscription = SecureTranscriptionService.subscribeToTranscriptionStatus(
      videoId,
      (status) => {
        console.log('🔄 Transcription status update:', status);
        setTranscriptionStatus(status);

        if (status.processing_status === 'completed') {
          setIsTranscribing(false);
          setError(null);
        } else if (status.processing_status === 'failed') {
          setIsTranscribing(false);
          setError(status.error_message || 'Transcription failed');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [videoId]);

  const loadTranscriptionStatus = useCallback(async (targetVideoId: string) => {
    try {
      setError(null);
      const status = await SecureTranscriptionService.getTranscriptionStatus(targetVideoId);
      setTranscriptionStatus(status);

      if (status?.processing_status === 'processing') {
        setIsTranscribing(true);
      }
    } catch (err) {
      console.error('Failed to load transcription status:', err);
      setError(err instanceof Error ? err.message : 'Failed to load transcription status');
    }
  }, []);

  const startTranscription = useCallback(async (
    targetVideoId: string,
    localVideoUri: string,  // ✅ Maintenant on prend l'URI local
    language: string = 'fr'
  ) => {
    try {
      setIsTranscribing(true);
      setError(null);

      console.log('🚀 Starting secure transcription from local file:', { targetVideoId, language });

      // ✅ Utiliser la nouvelle méthode qui upload vers le storage d'abord
      const result = await SecureTranscriptionService.transcribeVideoFromLocalFile(
        targetVideoId,
        localVideoUri,
        language
      );

      if (result.success) {
        // Le statut sera mis à jour via la souscription temps réel
        console.log('✅ Transcription started successfully');
      } else {
        throw new Error(result.error || 'Transcription failed');
      }

    } catch (err) {
      console.error('❌ Failed to start transcription:', err);
      setIsTranscribing(false);
      setError(err instanceof Error ? err.message : 'Failed to start transcription');
    }
  }, []);

  const startTranscriptionFromStorage = useCallback(async (
    targetVideoId: string,
    storageFilePath: string,  // Chemin dans Supabase Storage
    language: string = 'fr'
  ) => {
    try {
      setIsTranscribing(true);
      setError(null);

      console.log('🚀 Starting transcription from storage:', { targetVideoId, storageFilePath, language });

      const result = await SecureTranscriptionService.transcribeVideoFromStorage(
        targetVideoId,
        storageFilePath,
        language
      );

      if (result.success) {
        console.log('✅ Transcription started successfully');
      } else {
        throw new Error(result.error || 'Transcription failed');
      }

    } catch (err) {
      console.error('❌ Failed to start transcription:', err);
      setIsTranscribing(false);
      setError(err instanceof Error ? err.message : 'Failed to start transcription');
    }
  }, []);

  const retryTranscription = useCallback(async (
    targetVideoId: string,
    videoUrl: string,
    language?: string
  ) => {
    try {
      setError(null);
      console.log('🔄 Retrying transcription:', targetVideoId);

      await SecureTranscriptionService.retryTranscription(targetVideoId, videoUrl, language);

      // Recharger le statut
      await loadTranscriptionStatus(targetVideoId);

    } catch (err) {
      console.error('❌ Failed to retry transcription:', err);
      setError(err instanceof Error ? err.message : 'Failed to retry transcription');
    }
  }, [loadTranscriptionStatus]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // États
    isTranscribing,
    transcriptionStatus,
    error,

    // Actions
    startTranscription,           // ✅ Transcription depuis fichier local
    startTranscriptionFromStorage, // ✅ Transcription depuis storage
    retryTranscription,
    clearError,

    // Données
    transcriptionText: transcriptionStatus?.text || null,
    transcriptionSegments: transcriptionStatus?.segments || null,
  };
};

// Hook pour rechercher dans les transcriptions
export const useTranscriptionSearch = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const searchTranscriptions = useCallback(async (query: string, userId?: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      setSearchError(null);

      const results = await SecureTranscriptionService.searchTranscriptions(query, userId);
      setSearchResults(results);

    } catch (err) {
      console.error('❌ Search failed:', err);
      setSearchError(err instanceof Error ? err.message : 'Search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSearchError(null);
  }, []);

  return {
    isSearching,
    searchResults,
    searchError,
    searchTranscriptions,
    clearSearch,
  };
};