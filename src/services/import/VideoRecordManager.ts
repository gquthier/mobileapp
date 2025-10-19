/**
 * VideoRecordManager - Database Operations Module
 *
 * Responsible for all database operations related to video records.
 * Extracted from ImportQueueService as part of modular refactoring (Phase 3).
 *
 * Features:
 * - Create video records in database
 * - Update video metadata (location, timestamps)
 * - Update video thumbnails
 * - Error handling with custom DatabaseError
 * - Comprehensive logging for debugging
 *
 * @module VideoRecordManager
 */

import { supabase, VideoRecord } from '../../lib/supabase';
import {
  VideoRecordData,
  VideoMetadataUpdate,
  VideoThumbnailUpdate,
  DatabaseError,
} from './types';

export class VideoRecordManager {
  /**
   * Create a new video record in the database
   *
   * @param data - Video record data (title, filePath, duration, metadata, etc.)
   * @returns Created VideoRecord with id and timestamps
   *
   * @throws {DatabaseError} If insert fails
   *
   * @example
   * const record = await VideoRecordManager.createVideoRecord({
   *   userId: 'user-uuid',
   *   title: 'My Video',
   *   filePath: 'https://.../videos/user-uuid/video.mp4',
   *   duration: 120,
   *   metadata: { isImported: true, width: 1920, height: 1080 },
   *   chapterId: 'chapter-uuid',
   *   createdAt: '2025-01-01T12:00:00Z'
   * });
   */
  static async createVideoRecord(data: VideoRecordData): Promise<VideoRecord> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 [VideoRecordManager] Creating video record in database');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const dbStartTime = Date.now();

    console.log('🔗 Public URL:', data.filePath);
    console.log('👤 User ID:', data.userId);
    console.log('📄 Title:', data.title);
    console.log('⏱️ Duration:', data.duration, 'seconds');
    console.log('📋 Metadata:', JSON.stringify(data.metadata, null, 2));

    // Build insert data
    const insertData: any = {
      user_id: data.userId,
      title: data.title,
      file_path: data.filePath,
      duration: Math.round(data.duration), // ✅ Round to integer for DB
      metadata: data.metadata,
      chapter_id: data.chapterId || null,
    };

    // Add original creation time if provided (for imported videos)
    if (data.createdAt) {
      insertData.created_at = data.createdAt;
      console.log('📅 Original creation time:', insertData.created_at);
    } else {
      console.log('📅 Using current timestamp (no original creation time)');
    }

    console.log('💾 Executing INSERT query to videos table...');
    const insertStartTime = Date.now();

    const { data: videoRecord, error: insertError } = await supabase
      .from('videos')
      .insert([insertData])
      .select()
      .single();

    const insertDuration = Date.now() - insertStartTime;
    console.log(`⏱️ INSERT query completed in ${insertDuration}ms`);

    if (insertError || !videoRecord) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ [VideoRecordManager] Failed to create video record');
      console.error('Error code:', insertError?.code);
      console.error('Error message:', insertError?.message);
      console.error('Error details:', insertError?.details);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      throw new DatabaseError(
        `Failed to create video record: ${insertError?.message}`,
        insertError?.code,
        insertError?.details
      );
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ [VideoRecordManager] Video record created successfully!');
    console.log(`📊 Video ID: ${videoRecord.id}`);
    console.log(`📝 Title: ${videoRecord.title}`);
    console.log(`📁 File Path: ${videoRecord.file_path}`);
    console.log(`⏱️ Duration: ${videoRecord.duration}s`);
    console.log(`📅 Created At: ${videoRecord.created_at}`);

    const dbTotalDuration = Date.now() - dbStartTime;
    console.log(`📊 [VideoRecordManager] Database operation: ${dbTotalDuration}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return videoRecord;
  }

  /**
   * Update video metadata and location
   *
   * @param videoId - Video ID to update
   * @param update - Metadata and/or location to update
   * @returns True if update succeeded
   *
   * @throws {DatabaseError} If update fails critically (optional - returns false for non-critical errors)
   *
   * @example
   * await VideoRecordManager.updateVideoMetadata('video-uuid', {
   *   metadata: { isImported: true, width: 1920, height: 1080 },
   *   location: { latitude: 48.8566, longitude: 2.3522 }
   * });
   */
  static async updateVideoMetadata(
    videoId: string,
    update: VideoMetadataUpdate
  ): Promise<boolean> {
    console.log('🔄 [VideoRecordManager] Updating video with additional metadata...');
    const updateStartTime = Date.now();

    const updateData: any = {};

    if (update.metadata) {
      updateData.metadata = update.metadata;
      console.log('📋 Updating metadata:', JSON.stringify(update.metadata, null, 2));
    }

    if (update.location) {
      updateData.location = update.location;
      console.log('📍 Setting location:', JSON.stringify(update.location));
    }

    // Don't update if no data provided
    if (Object.keys(updateData).length === 0) {
      console.log('⚠️ No data to update, skipping');
      return true;
    }

    console.log('💾 Executing UPDATE query...');

    const { error: updateError } = await supabase
      .from('videos')
      .update(updateData)
      .eq('id', videoId);

    const updateDuration = Date.now() - updateStartTime;
    console.log(`⏱️ UPDATE query completed in ${updateDuration}ms`);

    if (updateError) {
      console.warn('⚠️ Could not update video metadata:', updateError.message);
      console.warn('Error code:', updateError.code);
      console.warn('Error details:', updateError.details);
      return false;
    }

    console.log('✅ Video metadata updated successfully');
    return true;
  }

  /**
   * Update video thumbnails (thumbnail_path and thumbnail_frames)
   *
   * @param videoId - Video ID to update
   * @param thumbnails - Thumbnail path and frame URLs
   * @returns True if update succeeded
   *
   * @throws {DatabaseError} If update fails
   *
   * @example
   * await VideoRecordManager.updateVideoThumbnails('video-uuid', {
   *   thumbnailPath: 'https://.../thumbnail_frame0.jpg',
   *   thumbnailFrames: [
   *     'https://.../thumbnail_frame0.jpg',
   *     'https://.../thumbnail_frame1.jpg',
   *     'https://.../thumbnail_frame2.jpg'
   *   ]
   * });
   */
  static async updateVideoThumbnails(
    videoId: string,
    thumbnails: VideoThumbnailUpdate
  ): Promise<boolean> {
    console.log('🖼️ [VideoRecordManager] Updating video thumbnails...');
    const updateStartTime = Date.now();

    const { error: thumbUpdateError } = await supabase
      .from('videos')
      .update({
        thumbnail_path: thumbnails.thumbnailPath,
        thumbnail_frames: thumbnails.thumbnailFrames,
      })
      .eq('id', videoId);

    const updateDuration = Date.now() - updateStartTime;
    console.log(`⏱️ Thumbnail UPDATE query completed in ${updateDuration}ms`);

    if (thumbUpdateError) {
      console.error('❌ Error updating video with thumbnails:', thumbUpdateError);
      console.error('Error code:', thumbUpdateError.code);
      console.error('Error message:', thumbUpdateError.message);

      throw new DatabaseError(
        `Failed to update thumbnails: ${thumbUpdateError.message}`,
        thumbUpdateError.code,
        thumbUpdateError.details
      );
    }

    console.log(`✅ ${thumbnails.thumbnailFrames.length} frames saved successfully`);
    return true;
  }

  /**
   * Build complete Supabase Storage public URL
   *
   * @param userId - User ID
   * @param fileName - File name in storage
   * @returns Complete public URL
   *
   * @example
   * const url = VideoRecordManager.buildPublicUrl('user-uuid', 'video_123.mp4');
   * // Returns: https://eenyzudwktcjpefpoapi.supabase.co/storage/v1/object/public/videos/user-uuid/video_123.mp4
   */
  static buildPublicUrl(userId: string, fileName: string): string {
    return `https://eenyzudwktcjpefpoapi.supabase.co/storage/v1/object/public/videos/${userId}/${fileName}`;
  }

  /**
   * Delete a video record from the database
   *
   * Note: This does NOT delete the file from storage, only the database record.
   * Use VideoService.deleteVideo() for complete deletion (storage + database).
   *
   * @param videoId - Video ID to delete
   * @returns True if deletion succeeded
   *
   * @throws {DatabaseError} If deletion fails
   *
   * @example
   * await VideoRecordManager.deleteVideoRecord('video-uuid');
   */
  static async deleteVideoRecord(videoId: string): Promise<boolean> {
    console.log('🗑️ [VideoRecordManager] Deleting video record...');
    console.log(`📋 Video ID: ${videoId}`);

    const { error: deleteError } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId);

    if (deleteError) {
      console.error('❌ Failed to delete video record:', deleteError);
      throw new DatabaseError(
        `Failed to delete video: ${deleteError.message}`,
        deleteError.code,
        deleteError.details
      );
    }

    console.log('✅ Video record deleted successfully');
    return true;
  }

  /**
   * Get a video record by ID
   *
   * @param videoId - Video ID to fetch
   * @returns VideoRecord or null if not found
   *
   * @example
   * const video = await VideoRecordManager.getVideoRecord('video-uuid');
   * if (video) {
   *   console.log('Video title:', video.title);
   * }
   */
  static async getVideoRecord(videoId: string): Promise<VideoRecord | null> {
    console.log('🔍 [VideoRecordManager] Fetching video record...');
    console.log(`📋 Video ID: ${videoId}`);

    const { data: video, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (error) {
      console.error('❌ Failed to fetch video record:', error);
      return null;
    }

    console.log('✅ Video record fetched successfully');
    return video;
  }
}
