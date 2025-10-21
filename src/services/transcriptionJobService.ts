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
   * 🔒 SÉCURISÉ: Vérifie que le job appartient à l'utilisateur via video_id
   */
  static async getTranscriptionJob(jobId: string, userId?: string): Promise<TranscriptionJob | null> {
    try {
      // 🔒 Get current user if not provided
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.error('❌ No authenticated user for getTranscriptionJob');
          return null;
        }
        currentUserId = user.id;
      }

      // 🔒 SECURITY: JOIN with videos to verify ownership
      const { data, error } = await supabase
        .from('transcription_jobs')
        .select(`
          *,
          videos!inner (
            id,
            user_id
          )
        `)
        .eq('id', jobId)
        .eq('videos.user_id', currentUserId) // ← PROTECTION CRITIQUE
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('⚠️ Transcription job not found or user does not own this job');
          return null; // Job not found or not owned by user
        }
        throw error;
      }

      // Remove nested videos data before returning
      const { videos, ...jobData } = data;
      return jobData as TranscriptionJob;

    } catch (error) {
      console.error('❌ Failed to get transcription job:', error);
      throw error;
    }
  }

  /**
   * Récupère tous les jobs d'un utilisateur
   * 🔒 SÉCURISÉ: Filtre par user_id via JOIN avec videos
   */
  static async getUserTranscriptionJobs(userId?: string, limit: number = 20): Promise<TranscriptionJob[]> {
    try {
      // 🔒 Get current user if not provided
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.error('❌ No authenticated user for getUserTranscriptionJobs');
          return [];
        }
        currentUserId = user.id;
      }

      // 🔒 SECURITY: JOIN with videos to filter by user_id
      const { data, error } = await supabase
        .from('transcription_jobs')
        .select(`
          *,
          videos!inner (
            user_id
          )
        `)
        .eq('videos.user_id', currentUserId) // ← PROTECTION CRITIQUE
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      // Remove nested videos data
      const cleanedData = (data || []).map(({ videos, ...job }) => job as TranscriptionJob);
      return cleanedData;

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
   * 🔒 SÉCURISÉ: Vérifie que le job appartient à l'utilisateur via video_id
   */
  static async retryJob(jobId: string, userId?: string): Promise<void> {
    try {
      console.log('🔄 Retrying failed job:', jobId);

      // 🔒 Get current user if not provided
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.error('❌ No authenticated user for retryJob');
          throw new Error('Authentication required');
        }
        currentUserId = user.id;
      }

      // 🔒 SECURITY: Verify job ownership before retrying
      const job = await this.getTranscriptionJob(jobId, currentUserId);
      if (!job) {
        console.error('❌ Job not found or user does not own this job');
        throw new Error('Job not found or access denied');
      }

      // Réinitialiser le statut du job (RLS will protect this too)
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
   * 🔒 SÉCURISÉ: Filtre par user_id via JOIN avec videos
   */
  static async searchTranscriptions(
    query: string,
    userId?: string,
    limit: number = 20
  ): Promise<TranscriptionJob[]> {
    try {
      console.log('🔍 Searching transcriptions:', { query, limit });

      // 🔒 Get current user if not provided
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.error('❌ No authenticated user for searchTranscriptions');
          return [];
        }
        currentUserId = user.id;
      }

      // 🔒 SECURITY: JOIN with videos to filter by user_id
      const { data, error } = await supabase
        .from('transcription_jobs')
        .select(`
          *,
          videos!inner (
            user_id
          )
        `)
        .eq('videos.user_id', currentUserId) // ← PROTECTION CRITIQUE
        .eq('status', 'completed')
        .ilike('transcription_text', `%${query}%`)
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      // Remove nested videos data
      const cleanedData = (data || []).map(({ videos, ...job }) => job as TranscriptionJob);

      console.log('✅ Found transcriptions:', cleanedData.length);
      return cleanedData;

    } catch (error) {
      console.error('❌ Search failed:', error);
      throw error;
    }
  }

  /**
   * Nettoie les anciens jobs échoués
   * 🔒 SÉCURISÉ: Filtre par user_id via JOIN avec videos
   */
  static async cleanupOldJobs(olderThanDays: number = 7, userId?: string): Promise<void> {
    try {
      console.log('🧹 Cleaning up old failed jobs older than', olderThanDays, 'days');

      // 🔒 Get current user if not provided
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.error('❌ No authenticated user for cleanupOldJobs');
          return;
        }
        currentUserId = user.id;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // 🔒 SECURITY: Get job IDs that belong to user via videos
      const { data: jobs, error: selectError } = await supabase
        .from('transcription_jobs')
        .select(`
          id,
          videos!inner (
            user_id
          )
        `)
        .eq('videos.user_id', currentUserId)
        .eq('status', 'failed')
        .lt('created_at', cutoffDate.toISOString());

      if (selectError) {
        throw selectError;
      }

      if (!jobs || jobs.length === 0) {
        console.log('ℹ️ No old failed jobs to clean up');
        return;
      }

      const jobIds = jobs.map(j => j.id);

      // Delete only those jobs (RLS will provide additional protection)
      const { error } = await supabase
        .from('transcription_jobs')
        .delete()
        .in('id', jobIds);

      if (error) {
        throw error;
      }

      console.log(`✅ Cleanup completed - removed ${jobIds.length} old failed jobs`);

    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Récupère les jobs avec highlights pour l'affichage
   * 🔒 SÉCURISÉ: Filtre par user_id via JOIN avec videos
   */
  static async getJobsWithHighlights(userId?: string, limit: number = 20): Promise<TranscriptionJob[]> {
    try {
      console.log('🎯 Fetching transcription jobs with highlights...');

      // 🔒 Get current user if not provided
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.error('❌ No authenticated user for getJobsWithHighlights');
          return [];
        }
        currentUserId = user.id;
      }

      // 🔒 SECURITY: JOIN with videos to filter by user_id
      const { data, error } = await supabase
        .from('transcription_jobs')
        .select(`
          *,
          videos!inner (
            user_id
          )
        `)
        .eq('videos.user_id', currentUserId) // ← PROTECTION CRITIQUE
        .eq('status', 'completed')
        .not('transcript_highlight', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      // Remove nested videos data
      const cleanedData = (data || []).map(({ videos, ...job }) => job as TranscriptionJob);

      console.log('✅ Found jobs with highlights:', cleanedData.length);
      return cleanedData;

    } catch (error) {
      console.error('❌ Failed to get jobs with highlights:', error);
      throw error;
    }
  }

  /**
   * Récupère les highlights d'un job spécifique
   * 🔒 SÉCURISÉ: Vérifie que le job appartient à l'utilisateur via video_id
   */
  static async getJobHighlights(jobId: string, userId?: string): Promise<any> {
    try {
      // 🔒 Get current user if not provided
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.error('❌ No authenticated user for getJobHighlights');
          return null;
        }
        currentUserId = user.id;
      }

      // 🔒 SECURITY: JOIN with videos to verify ownership
      const { data, error } = await supabase
        .from('transcription_jobs')
        .select(`
          transcript_highlight,
          videos!inner (
            user_id
          )
        `)
        .eq('id', jobId)
        .eq('videos.user_id', currentUserId) // ← PROTECTION CRITIQUE
        .eq('status', 'completed')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('⚠️ Job not found, no highlights, or user does not own this job');
          return null; // Job not found or no highlights or not owned
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
   * 🔒 SÉCURISÉ: Filtre par user_id via JOIN avec videos
   */
  static async getJobStats(userId?: string): Promise<{
    total: number;
    completed: number;
    failed: number;
    pending: number;
  }> {
    try {
      // 🔒 Get current user if not provided
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.error('❌ No authenticated user for getJobStats');
          return { total: 0, completed: 0, failed: 0, pending: 0 };
        }
        currentUserId = user.id;
      }

      // 🔒 SECURITY: JOIN with videos to filter by user_id
      const { data, error } = await supabase
        .from('transcription_jobs')
        .select(`
          status,
          videos!inner (
            user_id
          )
        `)
        .eq('videos.user_id', currentUserId); // ← PROTECTION CRITIQUE

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