import { supabase, VideoRecord } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';

export class VideoService {
  static async uploadVideo(videoUri: string, title: string, userId?: string): Promise<VideoRecord | null> {
    try {
      console.log('📤 Starting video upload to Supabase...', { uri: videoUri, title, userId });

      // Step 1: Get current user if not provided
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.error('❌ No authenticated user found:', authError);
          throw new Error('Must be logged in to upload videos');
        }
        currentUserId = user.id;
        console.log('👤 Using authenticated user:', user.email);
      }

      // Step 2: Validate video file exists
      const fileInfo = await FileSystem.getInfoAsync(videoUri);
      if (!fileInfo.exists) {
        throw new Error('Video file not found');
      }

      console.log('📁 Video file info:', {
        exists: fileInfo.exists,
        size: fileInfo.size,
        uri: fileInfo.uri
      });

      // Step 2: Convert video to base64 for React Native
      console.log('🔄 Reading video file as base64...');
      const base64Data = await FileSystem.readAsStringAsync(videoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('📦 Base64 data length:', base64Data.length);

      // Step 3: Create filename and path
      const timestamp = new Date().getTime();
      const fileName = `video_${timestamp}.mp4`;
      const filePath = `videos/${fileName}`;

      console.log('📝 Upload path:', filePath);

      // Step 4: Convert base64 to ArrayBuffer for Supabase
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      console.log('🔧 ArrayBuffer size:', bytes.length);

      // Step 5: Upload to Supabase Storage
      console.log('⬆️ Uploading to Supabase Storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, bytes, {
          contentType: 'video/mp4',
          upsert: false,
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw uploadError;
      }

      console.log('✅ Video uploaded successfully:', uploadData);

      // Step 6: Get the public URL
      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      console.log('🔗 Public URL generated:', urlData.publicUrl);

      // Step 7: Get video duration
      let duration = 0;
      try {
        const { sound } = await Audio.Sound.createAsync({ uri: videoUri });
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

      // Step 8: Save to database
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

      console.log('✅ Videos fetched successfully for user:', data?.length || 0);
      return data || [];
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
}