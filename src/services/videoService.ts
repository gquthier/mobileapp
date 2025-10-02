import { supabase, VideoRecord } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';

export class VideoService {
  // Limite de taille pour Supabase (5GB configuré dans les settings)
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB

  /**
   * Compresse une vidéo si elle dépasse la limite de taille
   */
  private static async compressVideoIfNeeded(videoUri: string): Promise<string> {
    try {
      console.log('🔍 Checking video file size...');

      // Vérifier la taille du fichier
      const fileInfo = await FileSystem.getInfoAsync(videoUri);
      if (!fileInfo.exists) {
        throw new Error('Video file not found');
      }

      const fileSizeMB = fileInfo.size / 1024 / 1024;
      const maxSizeMB = this.MAX_FILE_SIZE / 1024 / 1024;
      const maxSizeGB = this.MAX_FILE_SIZE / 1024 / 1024 / 1024;

      console.log(`📏 Original file size: ${fileSizeMB.toFixed(2)}MB`);

      // Si le fichier est déjà sous la limite, on retourne tel quel
      if (fileInfo.size <= this.MAX_FILE_SIZE) {
        console.log(`✅ File size OK (${fileSizeMB.toFixed(2)}MB / ${maxSizeGB.toFixed(1)}GB limit), no compression needed`);
        return videoUri;
      }

      console.log('🗜️ File too large, would need compression...');

      // Pour l'instant, on affiche juste un avertissement
      // La vraie compression vidéo nécessite des packages natifs plus complexes
      console.warn('⚠️ VIDEO TOO LARGE: This should not happen with 5GB limit!');
      console.warn('📊 File size:', `${fileSizeMB.toFixed(2)}MB`);
      console.warn('📊 Max allowed:', `${maxSizeGB.toFixed(1)}GB (${maxSizeMB.toFixed(0)}MB)`);

      // Normalement ne devrait jamais arriver avec 5GB
      throw new Error(`Video file too large (${fileSizeMB.toFixed(2)}MB). Maximum allowed: ${maxSizeGB.toFixed(1)}GB. This is unexpected - please contact support.`);

    } catch (error) {
      console.error('❌ Error checking/compressing video:', error);
      throw error;
    }
  }

  static async uploadVideo(videoUri: string, title: string, userId?: string): Promise<VideoRecord | null> {
    try {
      console.log('📤 Starting video upload to Supabase...', { uri: videoUri, title, userId });

      // Step 0: Check and compress video if needed
      const processedVideoUri = await this.compressVideoIfNeeded(videoUri);

      // Step 1: Get current user if not provided
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.error('❌ No authenticated user found:', authError);
          console.warn('🔧 DEV MODE: Creating anonymous session for testing...');

          // DEV MODE: Create temporary test user
          const testEmail = `test-${Date.now()}@example.com`;
          const testPassword = 'testPassword123!';

          console.log('🔑 Attempting sign up for testing...', testEmail);
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
          });

          if (signUpError) {
            console.error('❌ Auto sign-up failed:', signUpError);
            throw new Error('Must be logged in to upload videos. Please sign in first.');
          }

          if (signUpData.user) {
            currentUserId = signUpData.user.id;
            console.log('✅ Auto-created test user:', signUpData.user.email);
          } else {
            throw new Error('Failed to create test user session');
          }
        } else {
          currentUserId = user.id;
          console.log('👤 Using authenticated user:', user.email);
        }
      }

      // Step 2: Validate processed video file exists
      const fileInfo = await FileSystem.getInfoAsync(processedVideoUri);
      if (!fileInfo.exists) {
        throw new Error('Processed video file not found');
      }

      console.log('📁 Processed video file info:', {
        exists: fileInfo.exists,
        size: fileInfo.size,
        uri: fileInfo.uri,
        sizeMB: (fileInfo.size / 1024 / 1024).toFixed(2) + 'MB'
      });

      // Step 3: Create filename and path
      const timestamp = new Date().getTime();
      const fileName = `video_${timestamp}.mp4`;
      const filePath = fileName;

      console.log('📝 Upload path:', filePath);

      // Step 4: Upload directly using fetch with multipart/form-data
      // This avoids base64 conversion and string length limits
      console.log('⬆️ Uploading to Supabase Storage (direct file upload)...');

      // Create FormData for multipart upload
      const formData = new FormData();

      // For React Native, we need to create a proper file object
      const videoFile = {
        uri: processedVideoUri,
        type: 'video/mp4',
        name: fileName,
      } as any;

      formData.append('file', videoFile);

      // Get Supabase auth token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Upload using fetch API directly
      const supabaseUrl = 'https://eenyzudwktcjpefpoapi.supabase.co';
      const uploadUrl = `${supabaseUrl}/storage/v1/object/videos/${filePath}`;

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type - let FormData set it with boundary
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ Upload failed:', uploadResponse.status, errorText);
        throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
      }

      const uploadData = await uploadResponse.json();
      console.log('✅ Video uploaded successfully:', uploadData);

      // Step 5: Get the public URL
      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      console.log('🔗 Public URL generated:', urlData.publicUrl);

      // Step 6: Get video duration
      let duration = 0;
      try {
        const { sound } = await Audio.Sound.createAsync({ uri: processedVideoUri });
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.durationMillis) {
          duration = Math.round(status.durationMillis / 1000);
          console.log('⏱️ Video duration:', duration + 's');
          await sound.unloadAsync();
        }
      } catch (error) {
        console.warn('⚠️ Could not get video duration:', error);
        // Fallback: estimate based on file size (very rough)
        duration = Math.max(5, Math.floor(fileInfo.size / (1024 * 1024)) * 30);
        console.log('📏 Estimated duration:', duration + 's');
      }

      // Step 7: Save to database
      const videoRecord: Omit<VideoRecord, 'id' | 'created_at'> = {
        title,
        file_path: urlData.publicUrl,
        duration,
        user_id: currentUserId,
      };

      console.log('💾 Saving to database:', videoRecord);

      const { data: dbData, error: dbError } = await supabase
        .from('videos')
        .insert([videoRecord])
        .select()
        .single();

      if (dbError) {
        console.error('❌ Database error:', dbError);
        throw dbError;
      }

      console.log('✅ Video record saved successfully:', dbData);

      // Step 8: Call Supabase Edge Function to generate 6 animated frames
      try {
        console.log('📸 Calling Supabase Edge Function to generate frames...');

        // Extract just the filename from the full URL for the Edge Function
        const filePathForFunction = filePath; // Just the filename like "video_123456.mp4"

        const { data: functionData, error: functionError } = await supabase.functions.invoke('generate-thumbnail', {
          body: {
            video_id: dbData.id,
            file_path: filePathForFunction,
            duration: duration
          }
        });

        if (functionError) {
          console.error('❌ Edge Function error:', functionError);
          throw functionError;
        }

        if (functionData?.success) {
          console.log(`✅ ${functionData.frame_count} frames generated by Edge Function`);
          dbData.thumbnail_path = functionData.thumbnail_path;
          dbData.thumbnail_frames = functionData.thumbnail_frames;
        } else {
          console.error('❌ Edge Function returned error:', functionData?.error);
        }
      } catch (thumbnailError) {
        console.error('⚠️ Animated frames generation failed (non-critical):', thumbnailError);
        // Continue without thumbnails - not critical
      }

      return dbData;

    } catch (error) {
      console.error('❌ Error in uploadVideo:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return null;
    }
  }

  static async testSupabaseConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing Supabase connection...');

      // Test 1: Check storage bucket exists
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      if (bucketError) {
        console.error('❌ Bucket list error:', bucketError);
        return false;
      }

      console.log('📦 Available buckets:', buckets?.map(b => b.name));

      const videoBucket = buckets?.find(b => b.name === 'videos');
      if (!videoBucket) {
        console.error('❌ Videos bucket not found');
        return false;
      }

      // Test 2: Check database connection
      const { data, error: dbError } = await supabase
        .from('videos')
        .select('count')
        .limit(1);

      if (dbError) {
        console.error('❌ Database connection error:', dbError);
        return false;
      }

      console.log('✅ Supabase connection test successful');
      return true;
    } catch (error) {
      console.error('❌ Supabase connection test failed:', error);
      return false;
    }
  }

  static async getAllVideos(userId?: string): Promise<VideoRecord[]> {
    try {
      // Get current user if not provided
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.warn('⚠️ No authenticated user found for fetching videos');
          return [];
        }
        currentUserId = user.id;
      }

      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching videos:', error);
        return [];
      }

      const videos = data || [];
      console.log('✅ Videos fetched successfully for user:', videos.length);

      // Enrichir avec le statut de transcription pour chaque vidéo
      const videosWithStatus = await Promise.all(
        videos.map(async (video) => {
          try {
            const { data: jobs } = await supabase
              .from('transcription_jobs')
              .select('status, completed_at')
              .eq('video_id', video.id)
              .order('created_at', { ascending: false })
              .limit(1);

            const latestJob = jobs && jobs.length > 0 ? jobs[0] : null;

            return {
              ...video,
              transcription_status: latestJob?.status || null,
              transcription_completed: latestJob?.completed_at || null
            };
          } catch (err) {
            console.error('⚠️ Error fetching transcription status for video:', video.id, err);
            return video;
          }
        })
      );

      console.log('✅ Videos enriched with transcription status');
      return videosWithStatus;
    } catch (error) {
      console.error('❌ Error fetching videos:', error);
      return [];
    }
  }

  static async deleteVideo(id: string): Promise<boolean> {
    try {
      console.log('🗑️ Deleting video:', id);

      // First get the video to find the file path
      const { data: video, error: fetchError } = await supabase
        .from('videos')
        .select('file_path')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching video for deletion:', fetchError);
        return false;
      }

      // Extract file path from URL for storage deletion
      const filePath = video.file_path.split('/').pop();
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('videos')
          .remove([`videos/${filePath}`]);

        if (storageError) {
          console.error('⚠️ Storage deletion error (continuing with DB deletion):', storageError);
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('videos')
        .delete()
        .eq('id', id);

      if (dbError) {
        console.error('❌ Database deletion error:', dbError);
        return false;
      }

      console.log('✅ Video deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Error deleting video:', error);
      return false;
    }
  }

  /**
   * Search videos by title and date
   */
  static async searchVideos(query: string, userId?: string): Promise<VideoRecord[]> {
    try {
      console.log('🔍 Searching videos for:', query);

      // Get current user if not provided
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.warn('❌ No authenticated user for search');
          return [];
        }
        currentUserId = user.id;
      }

      const queryLower = query.toLowerCase().trim();

      // Get all user videos first
      const { data: videos, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching videos for search:', error);
        return [];
      }

      if (!videos || videos.length === 0) {
        console.log('ℹ️ No videos found for user');
        return [];
      }

      // Filter videos by title and date on client side
      const filteredVideos = videos.filter(video => {
        // Search by title
        if (video.title?.toLowerCase().includes(queryLower)) {
          return true;
        }

        // Search by date (various formats)
        if (video.created_at) {
          const videoDate = new Date(video.created_at);

          // Check different date formats
          const dateFormats = [
            videoDate.toLocaleDateString('fr-FR'), // 28/09/2025
            videoDate.toLocaleDateString('en-US'), // 9/28/2025
            videoDate.toISOString().split('T')[0], // 2025-09-28
            videoDate.getFullYear().toString(), // 2025
            videoDate.toLocaleDateString('fr-FR', { month: 'long' }).toLowerCase(), // septembre
            videoDate.toLocaleDateString('fr-FR', { month: 'short' }).toLowerCase(), // sept.
            videoDate.toLocaleDateString('en-US', { month: 'long' }).toLowerCase(), // september
            videoDate.toLocaleDateString('en-US', { month: 'short' }).toLowerCase(), // sep
          ];

          if (dateFormats.some(format => format.includes(queryLower))) {
            return true;
          }

          // Search by day/month/year separately
          const day = videoDate.getDate().toString();
          const month = (videoDate.getMonth() + 1).toString();
          const year = videoDate.getFullYear().toString();

          if (day === queryLower || month === queryLower || year === queryLower) {
            return true;
          }
        }

        return false;
      });

      console.log(`✅ Found ${filteredVideos.length} videos matching "${query}"`);
      return filteredVideos;

    } catch (error) {
      console.error('❌ Error searching videos:', error);
      return [];
    }
  }
}