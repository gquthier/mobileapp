// Service de transcription avec extraction audio asynchrone
import { supabase } from '../lib/supabase';

export interface TranscriptionJob {
  id: string;
  user_id: string;
  video_url: string;
  video_id?: string;
  audio_url?: string;
  video_duration_seconds?: number;
  video_size_bytes?: number;
  audio_size_bytes?: number;
  transcription?: any;
  transcription_text?: string;
  transcript_highlight?: any;
  language?: string;
  status: 'pending' | 'extracting_audio' | 'transcribing' | 'completed' | 'failed';
  error_message?: string;
  retry_count: number;
  created_at: string;
  audio_extracted_at?: string;
  transcription_started_at?: string;
  completed_at?: string;
}

export interface TranscriptionJobRequest {
  videoUrl: string;
  videoDuration?: number;
  videoSizeBytes?: number;
  videoId?: string;
}

export class TranscriptionJobService {

  /**
   * Démarre un nouveau job de transcription asynchrone
   */
  static async createTranscriptionJob(
    videoUrl: string,
    videoDuration?: number,
    videoSizeBytes?: number,
    videoId?: string
  ): Promise<TranscriptionJob> {
    try {
      console.log('🚀 Creating transcription job:', { videoUrl, videoDuration, videoSizeBytes, videoId });

      // Vérifier authentification
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('User not authenticated');
      }

      // Appeler l'Edge Function pour créer le job
      const { data, error } = await supabase.functions.invoke('queue-transcription', {
        body: {
          videoUrl,
          videoDuration,
          videoSizeBytes,
          videoId
        },
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        console.error('❌ Job creation error:', error);
        throw new Error(`Failed to create transcription job: ${error.message}`);
      }

      console.log('✅ Transcription job created:', data.jobId);

      // Récupérer les détails du job créé
      const job = await this.getTranscriptionJob(data.jobId);
      if (!job) {
        throw new Error('Job created but not found in database');
      }

      return job;

    } catch (error) {
      console.error('❌ Create transcription job failed:', error);
      throw error;
    }
  }

  /**
   * Récupère un job de transcription par ID
   */
  static async getTranscriptionJob(jobId: string): Promise<TranscriptionJob | null> {
    try {
      const { data, error } = await supabase
        .from('transcription_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Job not found
        }
        throw error;
      }

      return data;

    } catch (error) {
      console.error('❌ Failed to get transcription job:', error);
      throw error;
    }
  }

  /**
   * Récupère tous les jobs d'un utilisateur
   */
  static async getUserTranscriptionJobs(limit: number = 20): Promise<TranscriptionJob[]> {
    try {
      const { data, error } = await supabase
        .from('transcription_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];

    } catch (error) {
      console.error('❌ Failed to get user transcription jobs:', error);
      throw error;
    }
  }

  /**
   * Surveille le statut d'un job en temps réel
   */
  static subscribeToJobStatus(
    jobId: string,
    onStatusChange: (job: TranscriptionJob) => void,
    onError?: (error: Error) => void
  ) {
    console.log('👁️ Subscribing to job status updates:', jobId);

    const subscription = supabase
      .channel(`transcription_job_${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transcription_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          console.log('📡 Job status update received:', payload.new);
          if (payload.new) {
            onStatusChange(payload.new as TranscriptionJob);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ Subscription error');
          onError?.(new Error('Real-time subscription failed'));
        }
      });

    return subscription;
  }

  /**
   * Polling intelligent pour surveiller le statut d'un job
   */
  static async pollJobStatus(
    jobId: string,
    onStatusChange: (job: TranscriptionJob) => void,
    options: {
      maxAttempts?: number;
      initialDelay?: number;
      maxDelay?: number;
      backoffMultiplier?: number;
    } = {}
  ): Promise<TranscriptionJob> {
    const {
      maxAttempts = 60, // 5 minutes max avec progression
      initialDelay = 2000, // 2 secondes
      maxDelay = 10000, // 10 secondes max
      backoffMultiplier = 1.5
    } = options;

    console.log('🔄 Starting job status polling for:', jobId);

    let attempts = 0;
    let delay = initialDelay;

    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          attempts++;
          console.log(`📊 Polling attempt ${attempts}/${maxAttempts}`);

          const job = await this.getTranscriptionJob(jobId);
          if (!job) {
            reject(new Error('Job not found'));
            return;
          }

          onStatusChange(job);

          if (job.status === 'completed') {
            console.log('🎉 Job completed successfully!');
            resolve(job);
          } else if (job.status === 'failed') {
            console.log('❌ Job failed:', job.error_message);
            reject(new Error(job.error_message || 'Transcription failed'));
          } else if (attempts >= maxAttempts) {
            console.log('⏰ Polling timeout reached');
            reject(new Error('Transcription timeout - job may still be processing'));
          } else {
            // Continue polling avec backoff exponentiel
            console.log(`⏳ Job status: ${job.status}, retrying in ${delay}ms...`);
            setTimeout(checkStatus, delay);
            delay = Math.min(delay * backoffMultiplier, maxDelay);
          }
        } catch (error) {
          console.error('❌ Polling error:', error);
          reject(error);
        }
      };

      // Premier check immédiat
      setTimeout(checkStatus, 1000);
    });
  }

  /**
   * Relance un job échoué
   */
  static async retryJob(jobId: string): Promise<void> {
    try {
      console.log('🔄 Retrying failed job:', jobId);

      // Réinitialiser le statut du job
      const { error: updateError } = await supabase
        .from('transcription_jobs')
        .update({
          status: 'pending',
          error_message: null
        })
        .eq('id', jobId);

      if (updateError) {
        throw updateError;
      }

      // Redéclencher le processing
      const { error: functionError } = await supabase.functions.invoke('process-transcription', {
        body: { jobId }
      });

      if (functionError) {
        throw functionError;
      }

      console.log('✅ Job retry triggered successfully');

    } catch (error) {
      console.error('❌ Failed to retry job:', error);
      throw error;
    }
  }

  /**
   * Recherche dans les transcriptions terminées
   */
  static async searchTranscriptions(
    query: string,
    limit: number = 20
  ): Promise<TranscriptionJob[]> {
    try {
      console.log('🔍 Searching transcriptions:', { query, limit });

      const { data, error } = await supabase
        .from('transcription_jobs')
        .select('*')
        .eq('status', 'completed')
        .ilike('transcription_text', `%${query}%`)
        .order('completed_at', { ascending: false })
        .limit(limit);

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
   * Nettoie les anciens jobs échoués
   */
  static async cleanupOldJobs(olderThanDays: number = 7): Promise<void> {
    try {
      console.log('🧹 Cleaning up old failed jobs older than', olderThanDays, 'days');

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const { error } = await supabase
        .from('transcription_jobs')
        .delete()
        .eq('status', 'failed')
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        throw error;
      }

      console.log('✅ Cleanup completed');

    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Récupère les jobs avec highlights pour l'affichage
   */
  static async getJobsWithHighlights(limit: number = 20): Promise<TranscriptionJob[]> {
    try {
      console.log('🎯 Fetching transcription jobs with highlights...');

      const { data, error } = await supabase
        .from('transcription_jobs')
        .select('*')
        .eq('status', 'completed')
        .not('transcript_highlight', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      console.log('✅ Found jobs with highlights:', data?.length || 0);
      return data || [];

    } catch (error) {
      console.error('❌ Failed to get jobs with highlights:', error);
      throw error;
    }
  }

  /**
   * Récupère les highlights d'un job spécifique
   */
  static async getJobHighlights(jobId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('transcription_jobs')
        .select('transcript_highlight')
        .eq('id', jobId)
        .eq('status', 'completed')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Job not found or no highlights
        }
        throw error;
      }

      return data?.transcript_highlight || null;

    } catch (error) {
      console.error('❌ Failed to get job highlights:', error);
      throw error;
    }
  }

  /**
   * Statistiques des jobs utilisateur
   */
  static async getJobStats(): Promise<{
    total: number;
    completed: number;
    failed: number;
    pending: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('transcription_jobs')
        .select('status');

      if (error) {
        throw error;
      }

      const stats = {
        total: data?.length || 0,
        completed: data?.filter(j => j.status === 'completed').length || 0,
        failed: data?.filter(j => j.status === 'failed').length || 0,
        pending: data?.filter(j => ['pending', 'extracting_audio', 'transcribing'].includes(j.status)).length || 0,
      };

      return stats;

    } catch (error) {
      console.error('❌ Failed to get job stats:', error);
      throw error;
    }
  }
}