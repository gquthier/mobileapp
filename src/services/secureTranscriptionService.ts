// Service de transcription sécurisé utilisant les Edge Functions Supabase
import { supabase } from '../lib/supabase';

export interface SecureTranscriptionRequest {
  videoId: string;
  videoUrl: string;
  language?: string;
}

export interface SecureTranscriptionResult {
  success: boolean;
  videoId: string;
  text?: string;
  segments?: Array<{
    id: number;
    start: number;
    end: number;
    text: string;
    confidence: number;
  }>;
  language?: string;
  processing_status: 'processing' | 'completed' | 'failed';
  error?: string;
}

export interface TranscriptionStatus {
  processing_status: 'processing' | 'completed' | 'failed';
  text?: string;
  segments?: any[];
  language?: string;
  error_message?: string;
  completed_at?: string;
  updated_at: string;
}

export class SecureTranscriptionService {

  /**
   * Upload vidéo vers Supabase Storage puis démarre la transcription
   */
  static async transcribeVideoFromLocalFile(
    videoId: string,
    localVideoUri: string,
    language: string = 'fr'
  ): Promise<SecureTranscriptionResult> {
    try {
      console.log('🔒 Starting secure transcription from local file:', { videoId, language });

      // Vérifier que l'utilisateur est authentifié
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('🔐 Initial session check:', {
        hasSession: !!session,
        sessionError,
        userId: session?.user?.id,
        accessToken: session?.access_token ? 'present' : 'missing'
      });

      if (!session) {
        throw new Error('User not authenticated');
      }

      // ÉTAPE 1: Upload de la vidéo vers Supabase Storage
      console.log('📤 Uploading video to Supabase Storage...');
      const storageFilePath = await this.uploadVideoToStorage(videoId, localVideoUri);

      // ÉTAPE 2: Appeler l'Edge Function avec le chemin de stockage
      return await this.callTranscriptionEdgeFunction(videoId, storageFilePath, language);

    } catch (error) {
      console.error('❌ Secure transcription failed:', error);
      throw error;
    }
  }

  /**
   * Démarre la transcription pour un fichier déjà en storage
   */
  static async transcribeVideoFromStorage(
    videoId: string,
    storageFilePath: string,
    language: string = 'fr'
  ): Promise<SecureTranscriptionResult> {
    try {
      console.log('🔒 Starting transcription from storage:', { videoId, storageFilePath, language });

      return await this.callTranscriptionEdgeFunction(videoId, storageFilePath, language);

    } catch (error) {
      console.error('❌ Transcription from storage failed:', error);
      throw error;
    }
  }

  /**
   * Upload une vidéo locale vers Supabase Storage
   */
  private static async uploadVideoToStorage(videoId: string, localVideoUri: string): Promise<string> {
    try {
      console.log('📁 Uploading video to Supabase Storage...', { videoId, localVideoUri });

      // Créer le nom de fichier unique
      const fileName = `video_${videoId}_${Date.now()}.mp4`;
      const filePath = fileName;  // Juste le nom du fichier, le bucket 'videos' est spécifié dans .from()

      console.log('📂 Storage path:', filePath);

      // Pour React Native, nous devons traiter l'URI différemment
      let fileData: any;

      if (localVideoUri.startsWith('file://') || localVideoUri.startsWith('/')) {
        // URI local React Native - utiliser une approche compatible
        console.log('📱 Processing React Native local file...');

        // Pour React Native, nous envoyons directement l'URI avec les métadonnées
        fileData = {
          uri: localVideoUri,
          type: 'video/mp4',
          name: fileName,
        };

        console.log('📊 File prepared for upload:', { uri: localVideoUri, name: fileName });
      } else {
        // Fallback pour d'autres types d'URI
        console.log('📋 Using direct URI approach...');
        fileData = {
          uri: localVideoUri,
          type: 'video/mp4',
          name: fileName,
        };
      }

      // Upload vers Supabase Storage avec le blob
      const { data, error } = await supabase.storage
        .from('videos')
        .upload(filePath, fileData, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'video/mp4'
        });

      if (error) {
        console.error('❌ Storage upload error:', error);
        throw new Error(`Failed to upload video: ${error.message}`);
      }

      console.log('✅ Video uploaded to storage successfully:', data.path);
      return data.path;

    } catch (error) {
      console.error('❌ Upload to storage failed:', error);
      throw error;
    }
  }

  /**
   * Appelle l'Edge Function pour déclencher la transcription
   */
  private static async callTranscriptionEdgeFunction(
    videoId: string,
    storageFilePath: string,
    language: string
  ): Promise<SecureTranscriptionResult> {
    try {
      // Vérifier l'authentification
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('🔐 Session check:', {
        hasSession: !!session,
        sessionError,
        userId: session?.user?.id,
        accessToken: session?.access_token ? 'present' : 'missing'
      });

      if (!session) {
        throw new Error('User not authenticated');
      }

      console.log('🤖 Calling transcription Edge Function...');

      // Appeler l'Edge Function avec le chemin de stockage
      const response = await supabase.functions.invoke('transcribe-video', {
        body: {
          videoId,
          storageFilePath,  // ✅ Chemin dans le storage, pas URL
          language
        },
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      const { data, error } = response;

      if (error) {
        console.error('❌ Edge Function error:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));

        // Try to get the actual error message from the response
        try {
          const errorBody = await error.context?._bodyInit;
          if (errorBody) {
            console.error('❌ Error response body:', errorBody);
          }
        } catch (bodyError) {
          console.error('❌ Could not parse error body:', bodyError);
        }

        throw new Error(`Transcription failed: ${error.message || JSON.stringify(error)}`);
      }

      console.log('✅ Edge Function completed:', data);
      return data;

    } catch (error) {
      console.error('❌ Edge Function call failed:', error);
      throw error;
    }
  }

  /**
   * Vérifie le statut de transcription d'une vidéo
   */
  static async getTranscriptionStatus(videoId: string): Promise<TranscriptionStatus | null> {
    try {
      console.log('📊 Checking transcription status for video:', videoId);

      const { data, error } = await supabase
        .from('transcriptions')
        .select('processing_status, text, segments, language, error_message, completed_at, updated_at')
        .eq('video_id', videoId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Pas de transcription trouvée
          return null;
        }
        throw error;
      }

      return data;

    } catch (error) {
      console.error('❌ Failed to get transcription status:', error);
      throw error;
    }
  }

  /**
   * Surveille le statut de transcription en temps réel
   */
  static subscribeToTranscriptionStatus(
    videoId: string,
    onStatusChange: (status: TranscriptionStatus) => void
  ) {
    console.log('👁️ Subscribing to transcription status updates:', videoId);

    const subscription = supabase
      .channel(`transcription_${videoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transcriptions',
          filter: `video_id=eq.${videoId}`
        },
        (payload) => {
          console.log('📡 Transcription status update received:', payload);

          if (payload.new) {
            onStatusChange(payload.new as TranscriptionStatus);
          }
        }
      )
      .subscribe();

    return subscription;
  }

  /**
   * Recherche dans les transcriptions
   */
  static async searchTranscriptions(
    query: string,
    userId?: string
  ): Promise<Array<any>> {
    try {
      console.log('🔍 Searching transcriptions:', { query, userId });

      let queryBuilder = supabase
        .from('transcriptions')
        .select(`
          *,
          videos (
            id,
            title,
            created_at,
            user_id,
            file_path
          )
        `)
        .ilike('text', `%${query}%`)
        .eq('processing_status', 'completed');

      if (userId) {
        queryBuilder = queryBuilder.eq('videos.user_id', userId);
      }

      const { data, error } = await queryBuilder
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      console.log('✅ Found transcriptions:', data?.length || 0);
      return data || [];

    } catch (error) {
      console.error('❌ Search failed:', error);
      throw error;
    }
  }

  /**
   * Obtient la transcription complète d'une vidéo
   */
  static async getTranscription(videoId: string) {
    try {
      console.log('📖 Getting transcription for video:', videoId);

      const { data, error } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('video_id', videoId)
        .eq('processing_status', 'completed')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;

    } catch (error) {
      console.error('❌ Failed to get transcription:', error);
      throw error;
    }
  }

  /**
   * Relance une transcription échouée
   */
  static async retryTranscription(videoId: string, videoUrl: string, language?: string) {
    try {
      console.log('🔄 Retrying transcription for video:', videoId);

      // Supprimer l'ancienne transcription échouée
      await supabase
        .from('transcriptions')
        .delete()
        .eq('video_id', videoId)
        .eq('processing_status', 'failed');

      // Relancer la transcription
      return await this.transcribeVideoFromStorage(videoId, videoUrl, language);

    } catch (error) {
      console.error('❌ Retry transcription failed:', error);
      throw error;
    }
  }

  /**
   * Nettoie les transcriptions échouées anciennes
   */
  static async cleanupFailedTranscriptions(olderThanDays: number = 7) {
    try {
      console.log('🧹 Cleaning up failed transcriptions older than', olderThanDays, 'days');

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const { error } = await supabase
        .from('transcriptions')
        .delete()
        .eq('processing_status', 'failed')
        .lt('updated_at', cutoffDate.toISOString());

      if (error) {
        throw error;
      }

      console.log('✅ Cleanup completed');

    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      throw error;
    }
  }
}