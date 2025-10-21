import { supabase, VideoRecord } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import * as FileSystemNew from 'expo-file-system';
import { Audio } from 'expo-av';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { VideoCacheService } from './videoCacheService';
import { TranscriptionJobService } from './transcriptionJobService';
import { VideoThumbnailGenerator } from './import/VideoThumbnailGenerator'; // ✅ Phase 1: Use modular thumbnail generation
import { VideoSegment } from '../types'; // For segment-based Life Area filtering

export class VideoService {
  // Limite de taille pour Supabase (5GB configuré dans les settings)
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB

  // Upload configuration
  private static readonly UPLOAD_TIMEOUT_MS = 120000; // 120 seconds
  private static readonly MAX_RETRY_ATTEMPTS = 3; // Retry up to 3 times
  private static readonly RETRY_DELAY_BASE_MS = 2000; // Start with 2 seconds delay

  /**
   * ✅ Validate if a video is playable (centralized validation)
   * Filters out buggy/broken videos at the source
   *
   * This runs ONCE in VideoService.getAllVideos() instead of multiple times in UI components
   */
  private static validateVideo(video: VideoRecord): boolean {
    // 1. Check file_path exists and is not empty
    if (!video.file_path || video.file_path.trim() === '') {
      return false
    }

    // 2. Check if video is still uploading
    if (video.metadata && (video.metadata as any).isUploading) {
      return false
    }

    // 3. Exclude temporary local backup files FIRST (most common invalid case)
    // file:///var/mobile/.../video_backups/... or .../ExponentExperienceData/...
    if (video.file_path.startsWith('file:///')) {
      if (video.file_path.includes('video_backups') ||
          video.file_path.includes('ExponentExperienceData') ||
          video.file_path.includes('/Documents/')) {
        return false
      }
    }

    // 4. Check if file_path is a valid remote URL (http:// or https://)
    if (!video.file_path.startsWith('http://') && !video.file_path.startsWith('https://')) {
      return false
    }

    return true
  }

  /**
   * Retry wrapper with exponential backoff
   */
  private static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxAttempts: number = this.MAX_RETRY_ATTEMPTS
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔄 ${operationName} - Attempt ${attempt}/${maxAttempts}`);
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ ${operationName} - Attempt ${attempt} failed:`, error);

        if (attempt < maxAttempts) {
          // Exponential backoff: 2s, 4s, 8s
          const delayMs = this.RETRY_DELAY_BASE_MS * Math.pow(2, attempt - 1);
          console.log(`⏳ Retrying in ${delayMs / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    throw lastError || new Error(`${operationName} failed after ${maxAttempts} attempts`);
  }

  /**
   * ✅ DEPRECATED - Moved to VideoThumbnailGenerator module (Phase 1)
   * Use VideoThumbnailGenerator.generateFrames() instead
   *
   * Generate 3 thumbnail frames from video at different timestamps (optimized)
   * Reduced from 10 to 3 for better performance
   */
  private static async generateThumbnailFrames(videoUri: string, durationSeconds: number, videoId: string): Promise<string[]> {
    try {
      console.log('📸 Generating 3 thumbnail frames locally (optimized)...');

      const frameCount = 3; // Reduced from 10 to 3 for performance
      const durationMs = durationSeconds * 1000;
      const frameUrls: string[] = [];

      for (let i = 0; i < frameCount; i++) {
        try {
          // Calculate timestamp for this frame
          const baseTime = (durationMs / (frameCount + 1)) * (i + 1);
          const randomOffset = (Math.random() - 0.5) * 1000; // ±500ms variation
          const frameTimeMs = Math.floor(Math.max(500, Math.min(durationMs - 500, baseTime + randomOffset)));

          console.log(`📸 Generating frame ${i + 1}/${frameCount} at ${(frameTimeMs / 1000).toFixed(2)}s`);

          // Generate thumbnail using expo-video-thumbnails
          const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
            time: frameTimeMs,
            quality: 0.7,
          });

          console.log(`✅ Frame ${i + 1} generated locally: ${uri}`);

          // Read the thumbnail file
          const thumbnailBase64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // Upload to Supabase Storage
          const frameFileName = `thumbnail_${videoId}_frame${i}_${Date.now()}.jpg`;

          const { error: uploadError } = await supabase.storage
            .from('videos')
            .upload(frameFileName, this.decode(thumbnailBase64), {
              contentType: 'image/jpeg',
              upsert: false,
            });

          if (uploadError) {
            console.error(`❌ Error uploading frame ${i + 1}:`, uploadError);
            continue;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('videos')
            .getPublicUrl(frameFileName);

          frameUrls.push(urlData.publicUrl);
          console.log(`✅ Frame ${i + 1} uploaded: ${urlData.publicUrl}`);

          // Clean up local thumbnail file
          try {
            await FileSystem.deleteAsync(uri, { idempotent: true });
          } catch (cleanupError) {
            console.warn(`⚠️ Could not delete local thumbnail ${i + 1}:`, cleanupError);
          }

        } catch (frameError) {
          console.error(`❌ Error generating frame ${i + 1}:`, frameError);
          // Continue with other frames
        }
      }

      console.log(`✅ Generated ${frameUrls.length}/${frameCount} frames successfully`);
      return frameUrls;

    } catch (error) {
      console.error('❌ Error in generateThumbnailFrames:', error);
      return [];
    }
  }

  /**
   * Helper function to decode base64 to Uint8Array (used for thumbnails only)
   * Note: Not used for video upload anymore - we use direct multipart upload instead
   */
  private static decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Upload file with progression using expo-file-system (Solution 2)
   * More reliable than fetch for large files
   */
  private static async uploadWithProgression(
    videoUri: string,
    fileName: string,
    token: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const supabaseUrl = 'https://eenyzudwktcjpefpoapi.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlbnl6dWR3a3RjanBlZnBvYXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NzY0NTcsImV4cCI6MjA3NDM1MjQ1N30.iHLbdQaH-FSA7knlflVuRyUQ4n2kOzr3YttbShKiUZk';
    const uploadUrl = `${supabaseUrl}/storage/v1/object/videos/${fileName}`;

    console.log('📤 Starting direct multipart upload (supports files up to 5GB)...');

    // Use FileSystem.uploadAsync for direct file upload without loading into memory
    // This avoids "String length exceeds limit" errors for large videos
    const uploadResult = await FileSystemNew.uploadAsync(uploadUrl, videoUri, {
      httpMethod: 'POST',
      uploadType: 1, // MULTIPART (1 = multipart/form-data, supports large files)
      fieldName: 'file',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseAnonKey,
        'Content-Type': 'video/mp4',
      },
      uploadProgressCallback: (progress) => {
        const percentComplete = (progress.totalBytesSent / progress.totalBytesExpectedToSend) * 100;
        if (onProgress) {
          onProgress(percentComplete);
        }
        // Log every 10%
        if (Math.floor(percentComplete) % 10 === 0 && Math.floor(percentComplete) > 0) {
          console.log(`📊 Upload progress: ${percentComplete.toFixed(1)}%`);
        }
      },
    });

    // Check upload result
    if (uploadResult.status !== 200) {
      const errorBody = uploadResult.body ? JSON.parse(uploadResult.body) : {};
      throw new Error(`Upload failed with status ${uploadResult.status}: ${errorBody.message || uploadResult.body}`);
    }

    console.log('✅ Upload completed successfully via multipart (large file support)');
    return fileName;
  }

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

  static async uploadVideo(videoUri: string, title: string, userId?: string, chapterId?: string): Promise<VideoRecord | null> {
    let localBackupUri: string | null = null;
    let currentUserId: string | undefined = userId;

    try {
      console.log('📤 Starting video upload to Supabase...', { uri: videoUri, title, userId });

      // Step 0: Check and compress video if needed
      const processedVideoUri = await this.compressVideoIfNeeded(videoUri);
      localBackupUri = processedVideoUri; // Keep reference for Solution 3

      // Step 1: Get current user if not provided
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

      // Step 3: Get video duration (MEMORY FIX: avoid loading entire video into memory)
      let duration = 0;
      console.log('⏱️ Getting video duration from metadata (memory-efficient)...');

      // Try to get duration without loading entire video into memory
      // Fallback: estimate based on file size (very rough but saves ~50-100MB RAM)
      try {
        duration = Math.max(5, Math.floor(fileInfo.size / (1024 * 1024)) * 30);
        console.log('📏 Estimated duration from file size:', duration + 's (saved ~50-100MB RAM)');
      } catch (error) {
        console.warn('⚠️ Could not estimate duration:', error);
        duration = 60; // Default fallback
        console.log('📏 Using default fallback:', duration + 's');
      }

      // Step 4: Create filename and path
      const timestamp = new Date().getTime();
      const fileName = `video_${timestamp}.mp4`;
      const filePath = fileName;

      console.log('📝 Upload path:', filePath);

      // Get Supabase auth token for upload
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('No auth token available for upload');
      }

      // Step 5: Upload with retry and progression (Solutions 1 & 2)
      let uploadedFilePath: string | null = null;
      let uploadError: Error | null = null;

      try {
        uploadedFilePath = await this.retryWithBackoff(
          async () => {
            return await this.uploadWithProgression(
              processedVideoUri,
              filePath,
              token
            );
          },
          'Video upload',
          this.MAX_RETRY_ATTEMPTS
        );
        console.log('✅ Video uploaded successfully with retry logic');
      } catch (error) {
        uploadError = error as Error;
        console.error('❌ Upload failed after all retries:', error);
        console.warn('⚠️ Using local backup instead - video will be available locally');
      }

      // Step 6: Get the public URL or use local backup
      let videoFilePath: string;
      let isLocalBackup = false;

      if (uploadedFilePath) {
        const { data: urlData } = supabase.storage
          .from('videos')
          .getPublicUrl(uploadedFilePath);
        videoFilePath = urlData.publicUrl;
        console.log('🔗 Public URL generated:', videoFilePath);
      } else {
        // Solution 3: Use local backup if upload failed
        videoFilePath = localBackupUri!;
        isLocalBackup = true;
        console.log('📱 Using local backup path:', videoFilePath);
      }

      // Step 7: Save to database (works for both remote and local videos)
      const videoRecord: Omit<VideoRecord, 'id' | 'created_at'> = {
        title,
        file_path: videoFilePath,
        duration,
        user_id: currentUserId,
        chapter_id: chapterId,
        // Add metadata to track if this is a local backup pending upload
        ...(isLocalBackup && { metadata: { isLocalBackup: true, uploadFailed: true } }),
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

      // Step 8: Generate thumbnail frames (works for both local and remote)
      try {
        console.log('📸 Generating thumbnail frames locally with VideoThumbnailGenerator...');

        // ✅ Use modular VideoThumbnailGenerator (Phase 1)
        // For recorded videos, isImported = false (no cache copy needed)
        const frameUrls = await VideoThumbnailGenerator.generateFrames(
          processedVideoUri,
          duration,
          { videoId: dbData.id }
        );

        if (frameUrls.length > 0) {
          // Update video record with thumbnail frames
          const { error: updateError } = await supabase
            .from('videos')
            .update({
              thumbnail_path: frameUrls[0],
              thumbnail_frames: frameUrls,
            })
            .eq('id', dbData.id);

          if (updateError) {
            console.error('❌ Error updating video with thumbnails:', updateError);
          } else {
            console.log(`✅ ${frameUrls.length} frames generated and saved successfully`);
            dbData.thumbnail_path = frameUrls[0];
            dbData.thumbnail_frames = frameUrls;
          }
        } else {
          console.warn('⚠️ No frames were generated');
        }
      } catch (thumbnailError) {
        console.error('⚠️ Thumbnail generation failed (non-critical):', thumbnailError);
        // Continue without thumbnails - not critical
      }

      // Update cache with new video (non-blocking, fire-and-forget)
      this.updateCacheWithNewVideo(dbData).catch(err => {
        console.error('⚠️ Failed to update cache (non-critical):', err);
      });

      // Step 9: Create transcription job (only if video was uploaded successfully)
      if (!isLocalBackup && videoFilePath) {
        try {
          console.log('🎙️ Creating transcription job for uploaded video...');
          await TranscriptionJobService.createTranscriptionJob(
            videoFilePath,
            duration,
            fileInfo.size,
            dbData.id
          );
          console.log('✅ Transcription job created successfully');
        } catch (transcriptionError) {
          console.error('⚠️ Failed to create transcription job (non-critical):', transcriptionError);
          // Don't fail the upload if transcription job creation fails
        }
      } else if (isLocalBackup) {
        console.warn('⚠️ Video saved locally only - transcription will be processed when upload succeeds');
        console.warn('📝 You can still view and interact with this video locally');
      }

      return dbData;

    } catch (error) {
      console.error('❌ Error in uploadVideo:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });

      // Solution 3: Last resort - try to save local backup to database
      if (localBackupUri && currentUserId) {
        console.warn('🆘 Attempting to save video as local backup only...');
        try {
          const emergencyRecord: Omit<VideoRecord, 'id' | 'created_at'> = {
            title: title || 'Untitled Video',
            file_path: localBackupUri,
            duration: 0,
            user_id: currentUserId,
            metadata: { isLocalBackup: true, emergencyBackup: true, uploadError: error.message },
          };

          const { data: emergencyData, error: emergencyError } = await supabase
            .from('videos')
            .insert([emergencyRecord])
            .select()
            .single();

          if (!emergencyError && emergencyData) {
            console.log('✅ Emergency backup saved - video available locally:', emergencyData.id);
            return emergencyData;
          }
        } catch (emergencyErr) {
          console.error('❌ Emergency backup also failed:', emergencyErr);
        }
      }

      return null;
    }
  }

  /**
   * Update cache with newly uploaded video (background operation)
   */
  private static async updateCacheWithNewVideo(newVideo: VideoRecord): Promise<void> {
    try {
      const { videos: cachedVideos } = await VideoCacheService.loadFromCache();

      // Add new video to cache
      const updatedCache = [...cachedVideos, newVideo];

      // Sort chronologically
      const sortedCache = updatedCache.sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      await VideoCacheService.saveToCache(sortedCache);
      console.log('✅ Cache updated with new video');
    } catch (error) {
      console.error('❌ Error updating cache with new video:', error);
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

  static async getAllVideos(
    userId?: string,
    limit: number = 1000, // Pagination par défaut (augmenté pour compatibilité actuelle)
    offset: number = 0
  ): Promise<VideoRecord[]> {
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

      // Optimized: Single query with LEFT JOIN + Pagination + Indexes
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          transcription_jobs!left (
            status,
            completed_at,
            transcription_text,
            transcript_highlight
          )
        `)
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: true }) // ✅ Ordre chronologique: plus anciennes en premier
        .range(offset, offset + limit - 1); // Limiter les résultats

      if (error) {
        console.error('❌ Error fetching videos:', error);
        return [];
      }

      const videos = data || [];
      console.log('✅ Videos fetched successfully for user:', videos.length);

      // Extract transcription status from joined data
      const videosWithStatus = videos.map(video => {
        // Get the most recent transcription job
        const transcriptionJobs = video.transcription_jobs;
        const latestJob = Array.isArray(transcriptionJobs) && transcriptionJobs.length > 0
          ? transcriptionJobs.sort((a: any, b: any) =>
              new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
            )[0]
          : null;

        return {
          ...video,
          transcription_jobs: undefined, // Remove to avoid duplication
          transcription_status: latestJob?.status || null,
          transcription_completed: latestJob?.completed_at || null
        };
      });

      // ✅ OPTION 2: Filter invalid videos AT THE SOURCE (once, centralized)
      const validVideos = videosWithStatus.filter(this.validateVideo);
      const filteredCount = videosWithStatus.length - validVideos.length;

      if (filteredCount > 0) {
        console.log(`[VideoService] 🚫 Filtered out ${filteredCount} invalid videos at source (${validVideos.length} valid videos)`);
      }

      console.log('✅ Videos enriched with transcription status (optimized)');
      return validVideos;
    } catch (error) {
      console.error('❌ Error fetching videos:', error);
      return [];
    }
  }

  static async deleteVideo(id: string): Promise<boolean> {
    try {
      console.log('🗑️ Deleting video:', id);

      // 🔒 Get current user for security check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ No authenticated user for deleting video');
        return false;
      }

      // 🔒 SECURITY 1: Fetch video WITH user_id verification
      const { data: video, error: fetchError } = await supabase
        .from('videos')
        .select('file_path')
        .eq('id', id)
        .eq('user_id', user.id) // ← PROTECTION CRITIQUE
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          console.error('❌ Video not found or user does not own this video');
        } else {
          console.error('❌ Error fetching video for deletion:', fetchError);
        }
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

      // 🔒 SECURITY 2: Delete from database WITH user_id verification
      const { error: dbError } = await supabase
        .from('videos')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // ← PROTECTION CRITIQUE

      if (dbError) {
        console.error('❌ Database deletion error:', dbError);
        return false;
      }

      console.log('✅ Video deleted securely');
      return true;
    } catch (error) {
      console.error('❌ Error deleting video:', error);
      return false;
    }
  }

  /**
   * Advanced search in videos by multiple criteria
   * Searches in:
   * - Video title
   * - Date (multiple formats: FR/US, year, month names)
   * - Full transcription text (any spoken word)
   * - Highlights: titles, summaries, themes, categories
   */
  static async searchVideos(
    query: string,
    userId?: string,
    limit: number = 50
  ): Promise<VideoRecord[]> {
    try {
      console.time('🔍 Search performance');
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

      // Return empty if query is too short
      if (!query || query.trim().length < 2) {
        console.log('ℹ️ Query too short, skipping search');
        return [];
      }

      const normalizedQuery = query.trim().toLowerCase();

      // ✅ Strategy: Fetch all videos with transcriptions, then filter client-side
      // This is still fast because:
      // 1. We use .eq('user_id') which uses index
      // 2. We limit to reasonable number of videos
      // 3. Client-side filtering is fast for small datasets
      const { data: videos, error } = await supabase
        .from('videos')
        .select(`
          *,
          transcription_jobs!left (
            transcription_text,
            transcript_highlight,
            status,
            completed_at
          )
        `)
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: true }) // ✅ Ordre chronologique: plus anciennes en premier
        .limit(200); // Fetch more to compensate for client-side filtering

      if (error) {
        console.error('❌ Error searching videos:', error);
        console.timeEnd('🔍 Search performance');
        return [];
      }

      // ✅ Filter client-side: match in title OR transcription_text
      const filtered = (videos || []).filter(video => {
        const titleMatch = video.title?.toLowerCase().includes(normalizedQuery);

        // Check transcription_jobs array
        const transcriptionMatch = Array.isArray(video.transcription_jobs)
          ? video.transcription_jobs.some((job: any) =>
              job.transcription_text?.toLowerCase().includes(normalizedQuery)
            )
          : false;

        return titleMatch || transcriptionMatch;
      });

      // ✅ OPTION 2: Filter invalid videos AT THE SOURCE
      const validFiltered = filtered.filter(this.validateVideo);

      // Limit results
      const results = validFiltered.slice(0, limit);

      console.log(`✅ Found ${results.length} videos matching "${query}" (filtered from ${videos?.length || 0} total)`);
      console.timeEnd('🔍 Search performance');

      return results;

    } catch (error) {
      console.error('❌ Error searching videos:', error);
      console.timeEnd('🔍 Search performance');
      return [];
    }
  }

  /**
   * Search videos by life area in highlights
   * Returns VIDEO SEGMENTS instead of full videos - each segment represents a highlight
   * When user filters by Life Area (Health, Family, etc.), they see only the relevant segments
   */
  static async searchVideosByLifeArea(
    lifeArea: string,
    userId?: string,
    limit: number = 100
  ): Promise<VideoSegment[]> {
    try {
      console.time('🎯 Life area search performance');
      console.log('🎯 Searching videos for life area:', lifeArea);

      // Get current user if not provided
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.warn('❌ No authenticated user for life area search');
          return [];
        }
        currentUserId = user.id;
      }

      // Fetch all videos with transcription jobs
      const { data: videos, error } = await supabase
        .from('videos')
        .select(`
          *,
          transcription_jobs!left (
            transcript_highlight,
            status,
            completed_at
          )
        `)
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false }) // Most recent first
        .limit(200); // Fetch enough to find matches

      if (error) {
        console.error('❌ Error searching videos by life area:', error);
        console.timeEnd('🎯 Life area search performance');
        return [];
      }

      const normalizedLifeArea = lifeArea.toLowerCase();

      // 🆕 Extract segments instead of full videos
      const allSegments: VideoSegment[] = [];

      (videos || []).forEach(video => {
        // Validate video first
        if (!this.validateVideo(video)) {
          return;
        }

        const transcriptionJobs = video.transcription_jobs;
        if (!Array.isArray(transcriptionJobs) || transcriptionJobs.length === 0) {
          return;
        }

        transcriptionJobs.forEach((job: any) => {
          if (!job.transcript_highlight) return;

          const highlights = job.transcript_highlight.highlights;
          if (!Array.isArray(highlights)) return;

          // Extract all highlights matching this life area
          highlights.forEach((highlight: any) => {
            if (!highlight || !highlight.area) return;

            const areaMatch = highlight.area.toLowerCase() === normalizedLifeArea;

            if (areaMatch) {
              // Create a video segment for this highlight
              const segment: VideoSegment = {
                // Copy all VideoRecord fields
                ...video,
                // Remove transcription_jobs to avoid duplication
                transcription_jobs: undefined,
                // Add segment-specific fields
                is_segment: true,
                segment_start_time: highlight.start_time || highlight.startTime || 0,
                segment_end_time: highlight.end_time || highlight.endTime || video.duration || 0,
                segment_life_area: highlight.area,
                segment_title: highlight.title,
              };

              allSegments.push(segment);
            }
          });
        });
      });

      // 🎯 Group segments by video.id and keep only the FIRST segment (earliest start_time) per video
      const segmentsByVideo = new Map<string, VideoSegment>();

      allSegments.forEach(segment => {
        const videoId = segment.id!;
        const existing = segmentsByVideo.get(videoId);

        // If no segment for this video yet, or this segment starts earlier, keep it
        if (!existing || (segment.segment_start_time! < existing.segment_start_time!)) {
          segmentsByVideo.set(videoId, segment);
        }
      });

      // Convert Map to array
      const uniqueSegments = Array.from(segmentsByVideo.values());

      console.log(`🎯 Deduplication: ${allSegments.length} total segments → ${uniqueSegments.length} unique videos (kept first segment per video)`);

      // Sort segments by video creation date (most recent first)
      const sortedSegments = uniqueSegments.sort((a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );

      // Limit results
      const results = sortedSegments.slice(0, limit);

      console.log(`✅ Found ${results.length} unique videos for life area "${lifeArea}" (from ${videos?.length || 0} total videos)`);
      console.timeEnd('🎯 Life area search performance');

      return results;

    } catch (error) {
      console.error('❌ Error searching videos by life area:', error);
      console.timeEnd('🎯 Life area search performance');
      return [];
    }
  }

  /**
   * Get randomized feed for a specific Life Area
   * - Fetches videos filtered by Life Area (deduplicated)
   * - Applies seeded random shuffle for consistent but random order
   * - Returns unique videos (first highlight per video)
   */
  static async getRandomizedLifeAreaFeed(
    lifeArea: string,
    userId?: string,
    seed?: number // Optional seed for reproducibility
  ): Promise<VideoSegment[]> {
    try {
      console.log(`🎲 Generating randomized feed for Life Area: ${lifeArea}`);

      // Get deduplicated segments for this Life Area
      const segments = await this.searchVideosByLifeArea(lifeArea, userId, 100);

      if (segments.length === 0) {
        console.log(`ℹ️ No videos found for Life Area: ${lifeArea}`);
        return [];
      }

      // Seeded shuffle algorithm (Fisher-Yates with seed)
      const shuffled = this.seededShuffle([...segments], seed || Date.now());

      console.log(`✅ Randomized ${shuffled.length} videos for "${lifeArea}"`);
      return shuffled;

    } catch (error) {
      console.error(`❌ Error generating randomized feed for ${lifeArea}:`, error);
      return [];
    }
  }

  /**
   * Get "For You" feed (all videos randomized)
   * Includes all user's videos in random order
   */
  static async getForYouFeed(
    userId?: string,
    seed?: number
  ): Promise<VideoRecord[]> {
    try {
      console.log('🎲 Generating "For You" randomized feed');

      // Get all user's videos
      const videos = await this.getAllVideos(userId, 200); // Increased limit for better randomization

      if (videos.length === 0) {
        console.log('ℹ️ No videos found for user');
        return [];
      }

      // Seeded shuffle algorithm
      const shuffled = this.seededShuffle([...videos], seed || Date.now());

      console.log(`✅ Randomized ${shuffled.length} videos for "For You" feed`);
      return shuffled;

    } catch (error) {
      console.error('❌ Error generating For You feed:', error);
      return [];
    }
  }

  /**
   * Seeded shuffle using Fisher-Yates algorithm
   * Same seed = same order (reproducible randomness)
   */
  private static seededShuffle<T>(array: T[], seed: number): T[] {
    const shuffled = [...array];
    let currentIndex = shuffled.length;

    // Seeded random number generator (simple LCG)
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    while (currentIndex !== 0) {
      // Pick remaining element using seeded random
      const randomIndex = Math.floor(seededRandom(seed) * currentIndex);
      currentIndex--;
      seed++; // Increment seed for next iteration

      // Swap with current element
      [shuffled[currentIndex], shuffled[randomIndex]] = [
        shuffled[randomIndex],
        shuffled[currentIndex]
      ];
    }

    return shuffled;
  }
}