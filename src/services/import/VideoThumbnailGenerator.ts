/**
 * VideoThumbnailGenerator - Thumbnail Generation Module
 *
 * Responsible for generating and uploading video thumbnail frames.
 * Extracted from ImportQueueService as part of modular refactoring (Phase 1).
 *
 * Features:
 * - Generate N frames at strategic timestamps
 * - Upload frames to Supabase Storage
 * - Handle cache management for imported videos
 * - Automatic cleanup after generation
 *
 * @module VideoThumbnailGenerator
 */

import * as VideoThumbnails from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../lib/supabase';
import {
  ThumbnailOptions,
  ThumbnailResult,
  PreparedVideo,
  ThumbnailGenerationError,
} from './types';

export class VideoThumbnailGenerator {
  private static readonly DEFAULT_FRAME_COUNT = 3;
  private static readonly DEFAULT_QUALITY = 0.7;

  /**
   * Generate N thumbnail frames from video
   *
   * @param videoUri - URI of the video file
   * @param durationSeconds - Video duration in seconds
   * @param options - Thumbnail generation options
   * @returns Array of public URLs for uploaded frames
   *
   * @example
   * const frames = await VideoThumbnailGenerator.generateFrames(
   *   'file:///path/to/video.mp4',
   *   120,
   *   { frameCount: 3, quality: 0.7, videoId: 'video-123' }
   * );
   */
  static async generateFrames(
    videoUri: string,
    durationSeconds: number,
    options: ThumbnailOptions
  ): Promise<string[]> {
    const frameCount = options.frameCount || this.DEFAULT_FRAME_COUNT;
    const quality = options.quality || this.DEFAULT_QUALITY;
    const videoId = options.videoId;

    console.log(`📸 Generating ${frameCount} thumbnail frames...`);
    console.log(`  - Video URI: ${videoUri}`);
    console.log(`  - Duration: ${durationSeconds}s`);
    console.log(`  - Quality: ${quality}`);

    const durationMs = durationSeconds * 1000;
    const frameUrls: string[] = [];

    for (let i = 0; i < frameCount; i++) {
      try {
        // Calculate timestamp for this frame with random variation
        const timestamp = this.calculateFrameTimestamp(durationMs, frameCount, i);

        console.log(`📸 Generating frame ${i + 1}/${frameCount} at ${(timestamp / 1000).toFixed(2)}s`);

        // Generate thumbnail using expo-video-thumbnails
        const { uri: localUri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time: timestamp,
          quality,
        });

        console.log(`✅ Frame ${i + 1} generated locally: ${localUri}`);

        // Upload to Supabase Storage
        const publicUrl = await this.uploadFrame(localUri, videoId, i);
        frameUrls.push(publicUrl);

        console.log(`✅ Frame ${i + 1} uploaded: ${publicUrl}`);

        // Clean up local thumbnail file
        await this.cleanupLocalFile(localUri);

      } catch (frameError) {
        console.error(`❌ Error generating frame ${i + 1}:`, frameError);
        // Continue with other frames instead of failing completely
        throw new ThumbnailGenerationError(
          `Failed to generate frame ${i + 1}`,
          i
        );
      }
    }

    console.log(`✅ Generated ${frameUrls.length}/${frameCount} frames successfully`);
    return frameUrls;
  }

  /**
   * Calculate timestamp for a frame with random variation
   *
   * @param durationMs - Video duration in milliseconds
   * @param frameCount - Total number of frames to generate
   * @param frameIndex - Index of current frame (0-based)
   * @returns Timestamp in milliseconds
   */
  private static calculateFrameTimestamp(
    durationMs: number,
    frameCount: number,
    frameIndex: number
  ): number {
    // Calculate base time (evenly distributed)
    const baseTime = (durationMs / (frameCount + 1)) * (frameIndex + 1);

    // Add random variation (±500ms) for more natural-looking frames
    const randomOffset = (Math.random() - 0.5) * 1000;

    // Ensure timestamp is within valid range (500ms from start/end)
    const timestamp = Math.floor(
      Math.max(500, Math.min(durationMs - 500, baseTime + randomOffset))
    );

    return timestamp;
  }

  /**
   * Upload a frame to Supabase Storage
   *
   * @param localUri - Local URI of the frame
   * @param videoId - Video ID for storage path
   * @param frameIndex - Index of the frame
   * @returns Public URL of uploaded frame
   */
  private static async uploadFrame(
    localUri: string,
    videoId: string,
    frameIndex: number
  ): Promise<string> {
    // Read the thumbnail file as base64
    const thumbnailBase64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Construct filename
    const frameFileName = `thumbnail_${videoId}_frame${frameIndex}_${Date.now()}.jpg`;

    // Decode base64 to Uint8Array
    const bytes = this.decodeBase64(thumbnailBase64);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(frameFileName, bytes, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      throw new ThumbnailGenerationError(
        `Failed to upload frame ${frameIndex}: ${uploadError.message}`,
        frameIndex
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('videos')
      .getPublicUrl(frameFileName);

    return urlData.publicUrl;
  }

  /**
   * Decode base64 string to Uint8Array
   *
   * @param base64 - Base64 encoded string
   * @returns Uint8Array
   */
  private static decodeBase64(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Clean up local thumbnail file
   *
   * @param uri - URI of file to delete
   */
  private static async cleanupLocalFile(uri: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (cleanupError) {
      console.warn(`⚠️ Could not delete local thumbnail:`, cleanupError);
      // Non-critical error, continue
    }
  }

  /**
   * Prepare video for thumbnail generation by copying to cache
   *
   * This is necessary for imported videos that may not be accessible
   * directly by expo-video-thumbnails.
   *
   * @param sourceUri - Original video URI
   * @param videoId - Video ID for cache filename
   * @returns Object with cache URI and cleanup function
   *
   * @example
   * const { cacheUri, cleanup } = await VideoThumbnailGenerator.prepareVideo(uri, 'video-123');
   * try {
   *   const frames = await VideoThumbnailGenerator.generateFrames(cacheUri, duration, options);
   * } finally {
   *   await cleanup();
   * }
   */
  static async prepareVideo(
    sourceUri: string,
    videoId: string
  ): Promise<PreparedVideo> {
    console.log('📋 Copying video to cache for thumbnail generation...');

    const cacheFileName = `temp_thumb_${videoId}.mp4`;
    const cacheUri = `${FileSystem.cacheDirectory}${cacheFileName}`;

    console.log(`📂 Copying from ${sourceUri} to ${cacheUri}`);

    await FileSystem.copyAsync({
      from: sourceUri,
      to: cacheUri,
    });

    console.log('✅ Video copied to cache successfully');

    // Return cache URI and cleanup function
    return {
      cacheUri,
      cleanup: async () => {
        try {
          await FileSystem.deleteAsync(cacheUri, { idempotent: true });
          console.log('🧹 Cleaned up cache file');
        } catch (error) {
          console.warn('⚠️ Could not delete cache file:', error);
        }
      },
    };
  }

  /**
   * Generate frames with automatic cache management for imported videos
   *
   * Convenience method that handles cache copying and cleanup automatically.
   *
   * @param videoUri - Original video URI
   * @param durationSeconds - Video duration in seconds
   * @param options - Thumbnail generation options
   * @param isImported - Whether this is an imported video (requires cache copy)
   * @returns Array of public URLs for uploaded frames
   */
  static async generateFramesWithCache(
    videoUri: string,
    durationSeconds: number,
    options: ThumbnailOptions,
    isImported: boolean = false
  ): Promise<string[]> {
    if (!isImported) {
      // For recorded videos, use URI directly
      return this.generateFrames(videoUri, durationSeconds, options);
    }

    // For imported videos, copy to cache first
    const { cacheUri, cleanup } = await this.prepareVideo(videoUri, options.videoId);

    try {
      const frames = await this.generateFrames(cacheUri, durationSeconds, options);
      return frames;
    } finally {
      await cleanup();
    }
  }
}
