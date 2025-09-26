import { supabase, Transcription } from '../lib/supabase';

export interface TranscriptionData {
  video_id: string;
  text: string;
  segments?: any[];
  language?: string;
  duration?: number;
  confidence?: number;
  processing_status?: 'processing' | 'completed' | 'failed';
  error_message?: string;
}

export class TranscriptionDatabaseService {
  /**
   * Save or update transcription in Supabase
   */
  static async saveTranscription(data: TranscriptionData): Promise<Transcription | null> {
    try {
      console.log('💾 Saving transcription to database:', {
        video_id: data.video_id,
        text_length: data.text.length,
        status: data.processing_status,
      });

      // Check if transcription already exists for this video
      const { data: existing, error: checkError } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('video_id', data.video_id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('❌ Error checking existing transcription:', checkError);
        throw checkError;
      }

      let result;
      if (existing) {
        // Update existing transcription
        console.log('🔄 Updating existing transcription:', existing.id);
        const { data: updated, error: updateError } = await supabase
          .from('transcriptions')
          .update({
            text: data.text,
            segments: data.segments || [],
            language: data.language || 'en',
            duration: data.duration || 0,
            confidence: data.confidence || 0,
            processing_status: data.processing_status || 'completed',
            error_message: data.error_message,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) {
          console.error('❌ Error updating transcription:', updateError);
          throw updateError;
        }

        result = updated;
      } else {
        // Create new transcription
        console.log('➕ Creating new transcription for video:', data.video_id);
        const { data: created, error: createError } = await supabase
          .from('transcriptions')
          .insert({
            video_id: data.video_id,
            text: data.text,
            segments: data.segments || [],
            language: data.language || 'en',
            duration: data.duration || 0,
            confidence: data.confidence || 0,
            processing_status: data.processing_status || 'completed',
            error_message: data.error_message,
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Error creating transcription:', createError);
          throw createError;
        }

        result = created;
      }

      console.log('✅ Transcription saved successfully:', result.id);
      return result;

    } catch (error) {
      console.error('❌ Failed to save transcription:', error);
      return null;
    }
  }

  /**
   * Get transcription for a specific video
   */
  static async getTranscription(video_id: string): Promise<Transcription | null> {
    try {
      console.log('📖 Getting transcription for video:', video_id);

      const { data, error } = await supabase
        .from('transcriptions')
        .select('*')
        .eq('video_id', video_id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('ℹ️ No transcription found for video:', video_id);
          return null;
        }
        console.error('❌ Error fetching transcription:', error);
        throw error;
      }

      console.log('✅ Transcription found:', data.id);
      return data;

    } catch (error) {
      console.error('❌ Failed to get transcription:', error);
      return null;
    }
  }

  /**
   * Get all transcriptions for current user (via videos)
   */
  static async getUserTranscriptions(): Promise<Transcription[]> {
    try {
      console.log('📚 Getting all user transcriptions...');

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.warn('⚠️ No authenticated user found');
        return [];
      }

      // Get transcriptions for user's videos
      const { data, error } = await supabase
        .from('transcriptions')
        .select(`
          *,
          videos!inner (
            id,
            title,
            user_id
          )
        `)
        .eq('videos.user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching user transcriptions:', error);
        throw error;
      }

      console.log('✅ User transcriptions fetched:', data?.length || 0);
      return data || [];

    } catch (error) {
      console.error('❌ Failed to get user transcriptions:', error);
      return [];
    }
  }

  /**
   * Delete transcription by ID
   */
  static async deleteTranscription(transcription_id: string): Promise<boolean> {
    try {
      console.log('🗑️ Deleting transcription:', transcription_id);

      const { error } = await supabase
        .from('transcriptions')
        .delete()
        .eq('id', transcription_id);

      if (error) {
        console.error('❌ Error deleting transcription:', error);
        return false;
      }

      console.log('✅ Transcription deleted successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to delete transcription:', error);
      return false;
    }
  }

  /**
   * Update transcription status (for processing states)
   */
  static async updateTranscriptionStatus(
    video_id: string,
    status: 'processing' | 'completed' | 'failed',
    error_message?: string
  ): Promise<boolean> {
    try {
      console.log('🔄 Updating transcription status:', { video_id, status });

      const { error } = await supabase
        .from('transcriptions')
        .update({
          processing_status: status,
          error_message: error_message || null,
          updated_at: new Date().toISOString(),
        })
        .eq('video_id', video_id);

      if (error) {
        console.error('❌ Error updating transcription status:', error);
        return false;
      }

      console.log('✅ Transcription status updated');
      return true;

    } catch (error) {
      console.error('❌ Failed to update transcription status:', error);
      return false;
    }
  }

  /**
   * Search transcriptions by text content
   */
  static async searchTranscriptions(query: string): Promise<Transcription[]> {
    try {
      console.log('🔍 Searching transcriptions for:', query);

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.warn('⚠️ No authenticated user found');
        return [];
      }

      // Search in transcriptions using full-text search
      const { data, error } = await supabase
        .from('transcriptions')
        .select(`
          *,
          videos!inner (
            id,
            title,
            user_id
          )
        `)
        .eq('videos.user_id', user.id)
        .textSearch('text', query)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error searching transcriptions:', error);
        throw error;
      }

      console.log('✅ Transcription search results:', data?.length || 0);
      return data || [];

    } catch (error) {
      console.error('❌ Failed to search transcriptions:', error);
      return [];
    }
  }
}