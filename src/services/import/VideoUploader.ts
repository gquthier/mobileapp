/**
 * VideoUploader - Background Video Upload Module
 *
 * Responsible for uploading video files to Supabase Storage with progress tracking.
 * Extracted from ImportQueueService as part of modular refactoring (Phase 2).
 *
 * Features:
 * - Background upload (continues even if app is backgrounded)
 * - Progress tracking with callbacks
 * - Dynamic timeout based on file size (10-60 minutes, 3x buffer for slow connections)
 * - Large file support (up to 5GB)
 * - File validation before upload
 * - Comprehensive logging for debugging
 *
 * @module VideoUploader
 */

import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../../lib/supabase';
import { UploadOptions, UploadResult, UploadError } from './types';

export class VideoUploader {
  // Supabase configuration
  private static readonly SUPABASE_URL = 'https://eenyzudwktcjpefpoapi.supabase.co';
  private static readonly SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlbnl6dWR3a3RjanBlZnBvYXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NzY0NTcsImV4cCI6MjA3NDM1MjQ1N30.iHLbdQaH-FSA7knlflVuRyUQ4n2kOzr3YttbShKiUZk';

  // Timeout configuration
  private static readonly MIN_TIMEOUT_SECONDS = 600; // 10 minutes
  private static readonly MAX_TIMEOUT_SECONDS = 3600; // 60 minutes (increased from 30min for slow connections)
  private static readonly LARGE_FILE_THRESHOLD_MB = 500;

  // Progress logging
  private static readonly PROGRESS_LOG_INTERVAL = 10; // Log every 10%

  /**
   * Upload video file to Supabase Storage with background support
   *
   * @param videoUri - Local file URI of the video
   * @param fileName - Destination filename in Supabase Storage
   * @param userId - User ID for storage path organization
   * @param options - Upload options (progress callback, timeout)
   * @returns Upload result with file path and size
   *
   * @throws {UploadError} If file doesn't exist, auth fails, or upload fails
   *
   * @example
   * const result = await VideoUploader.uploadVideo(
   *   'file:///path/to/video.mp4',
   *   'video_123.mp4',
   *   'user-uuid',
   *   {
   *     onProgress: (progress) => console.log(`${progress.percent}%`),
   *     timeout: 1800
   *   }
   * );
   */
  static async uploadVideo(
    videoUri: string,
    fileName: string,
    userId: string,
    options?: UploadOptions
  ): Promise<UploadResult> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 [VideoUploader] Starting background upload');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📄 Filename: ${fileName}`);
    console.log(`📍 Source URI: ${videoUri}`);
    console.log(`👤 User ID: ${userId}`);

    // Step 1: Validate file exists
    console.log('🔍 Checking if file exists...');
    const fileInfo = await FileSystem.getInfoAsync(videoUri);

    if (!fileInfo.exists) {
      console.error('❌ File does not exist at path:', videoUri);
      throw new UploadError(
        `File not found: ${videoUri}. The file may have been moved or deleted.`,
        404,
        false // Not retryable
      );
    }

    console.log('✅ File exists and is accessible');

    // Step 2: Get file size and calculate dynamic timeout
    let fileSize = 0;
    let dynamicTimeout = this.MIN_TIMEOUT_SECONDS;

    if ('size' in fileInfo) {
      fileSize = fileInfo.size;
      const sizeInMB = (fileSize / (1024 * 1024)).toFixed(2);
      console.log(`📦 File size: ${sizeInMB} MB`);

      // Calculate dynamic timeout based on file size
      // Assumption: 0.5MB/sec minimum upload speed (more realistic for slow connections)
      // Buffer: 3x the theoretical minimum time (for network fluctuations)
      const minUploadSpeedMBs = 0.5; // 500 KB/s minimum
      const theoreticalSeconds = (fileSize / (1024 * 1024)) / minUploadSpeedMBs;
      const bufferMultiplier = 3; // 3x buffer for network fluctuations
      dynamicTimeout = Math.min(
        this.MAX_TIMEOUT_SECONDS,
        Math.max(this.MIN_TIMEOUT_SECONDS, theoreticalSeconds * bufferMultiplier)
      );

      console.log(`⏱️ Dynamic timeout: ${(dynamicTimeout / 60).toFixed(1)} minutes`);

      // Warn if file is very large
      if (fileSize > this.LARGE_FILE_THRESHOLD_MB * 1024 * 1024) {
        console.warn(
          `⚠️ Large file detected (${sizeInMB}MB). Upload may take ${(dynamicTimeout / 60).toFixed(1)} minutes.`
        );
      }
    }

    // Use custom timeout if provided
    if (options?.timeout) {
      dynamicTimeout = options.timeout;
      console.log(`⏱️ Using custom timeout: ${(dynamicTimeout / 60).toFixed(1)} minutes`);
    }

    // Step 3: Get authentication token
    console.log('🔐 Retrieving authentication token...');
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      console.error('❌ No authentication token available');
      throw new UploadError(
        'No auth token available for upload',
        401,
        false // Not retryable (need to re-authenticate)
      );
    }
    console.log('✅ Auth token retrieved');

    // Step 4: Construct upload URL
    const uploadUrl = `${this.SUPABASE_URL}/storage/v1/object/videos/${userId}/${fileName}`;
    console.log(`🔗 Upload URL: ${uploadUrl}`);

    // Step 5: Create and execute upload task
    console.log('⚙️ Creating upload task...');
    const uploadStartTime = Date.now();
    let lastLoggedPercent = 0;

    const uploadTask = FileSystem.createUploadTask(
      uploadUrl,
      videoUri,
      {
        httpMethod: 'POST',
        uploadType: 1 as any, // MULTIPART (supports large files)
        fieldName: 'file',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-upsert': 'true', // Allow overwriting
        },
        // Enable background mode (continues if app backgrounded)
        sessionType: 1 as any, // BACKGROUND
        // Dynamic timeout based on file size
        timeoutIntervalForRequest: dynamicTimeout,
        timeoutIntervalForResource: dynamicTimeout,
      },
      (data: any) => {
        // Progress callback
        const totalBytesSent = data.totalBytesSent;
        const totalBytesExpectedToSend = data.totalBytesExpectedToSend;
        const percent = (totalBytesSent / totalBytesExpectedToSend) * 100;
        const sentMB = (totalBytesSent / (1024 * 1024)).toFixed(2);
        const totalMB = (totalBytesExpectedToSend / (1024 * 1024)).toFixed(2);

        // Log every PROGRESS_LOG_INTERVAL% (e.g., 10%)
        const percentInt = Math.floor(percent / this.PROGRESS_LOG_INTERVAL) * this.PROGRESS_LOG_INTERVAL;
        if (percentInt > lastLoggedPercent && percentInt % this.PROGRESS_LOG_INTERVAL === 0) {
          const elapsed = ((Date.now() - uploadStartTime) / 1000).toFixed(1);
          console.log(`📤 [Upload] ${percentInt}% | ${sentMB}/${totalMB} MB | ${elapsed}s elapsed`);
          lastLoggedPercent = percentInt;
        }

        // Call user-provided progress callback
        if (options?.onProgress) {
          options.onProgress({
            totalBytesSent,
            totalBytesExpectedToSend,
            percent,
          });
        }
      }
    );

    console.log('🚀 Starting upload task execution...');
    console.log(`⏱️ Timeout configured: ${dynamicTimeout}s (${(dynamicTimeout / 60).toFixed(1)}min)`);
    console.log(`📦 File size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);

    // Execute upload
    const result = await uploadTask.uploadAsync();
    const uploadDuration = ((Date.now() - uploadStartTime) / 1000).toFixed(2);

    // Step 6: Validate upload result
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 [VideoUploader] Upload completed');
    console.log(`⏱️ Duration: ${uploadDuration}s (${(parseFloat(uploadDuration) / 60).toFixed(1)}min)`);
    console.log(`📊 Upload speed: ${(fileSize / (1024 * 1024) / parseFloat(uploadDuration)).toFixed(2)} MB/s`);
    console.log(`📊 Status: ${result?.status}`);
    console.log(`📝 Body: ${result?.body?.substring(0, 100)}...`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (!result || result.status !== 200) {
      console.error('❌ Upload failed');
      console.error(`   Status: ${result?.status}`);
      console.error(`   Body: ${result?.body}`);

      // Determine if error is retryable
      const isRetryable = result?.status === 408 || // Timeout
                          result?.status === 429 || // Rate limit
                          result?.status === 500 || // Server error
                          result?.status === 502 || // Bad gateway
                          result?.status === 503 || // Service unavailable
                          result?.status === 504;   // Gateway timeout

      throw new UploadError(
        `Upload failed with status ${result?.status}: ${result?.body}`,
        result?.status,
        isRetryable
      );
    }

    console.log(`✅ [VideoUploader] Success! File uploaded to: ${fileName}`);

    return {
      fileName,
      fileSize,
      publicUrl: `${this.SUPABASE_URL}/storage/v1/object/public/videos/${userId}/${fileName}`,
    };
  }

  /**
   * Get public URL for an uploaded video
   *
   * @param fileName - Filename in Supabase Storage
   * @param userId - User ID for storage path
   * @returns Public URL for the video
   *
   * @example
   * const url = VideoUploader.getPublicUrl('video_123.mp4', 'user-uuid');
   * // Returns: https://.../storage/v1/object/public/videos/user-uuid/video_123.mp4
   */
  static getPublicUrl(fileName: string, userId: string): string {
    return `${this.SUPABASE_URL}/storage/v1/object/public/videos/${userId}/${fileName}`;
  }

  /**
   * Validate if a video file can be uploaded
   *
   * @param videoUri - Local file URI
   * @param maxSizeBytes - Maximum allowed file size in bytes (default: 5GB)
   * @returns Validation result with file info
   *
   * @throws {UploadError} If file doesn't exist or exceeds size limit
   *
   * @example
   * const validation = await VideoUploader.validateFile('file:///...');
   * console.log(`File is ${validation.sizeInMB}MB`);
   */
  static async validateFile(
    videoUri: string,
    maxSizeBytes: number = 5 * 1024 * 1024 * 1024 // 5GB default
  ): Promise<{ exists: boolean; size: number; sizeInMB: number }> {
    const fileInfo = await FileSystem.getInfoAsync(videoUri);

    if (!fileInfo.exists) {
      throw new UploadError(
        `File not found: ${videoUri}`,
        404,
        false
      );
    }

    const size = 'size' in fileInfo ? fileInfo.size : 0;
    const sizeInMB = size / (1024 * 1024);

    if (size > maxSizeBytes) {
      const maxSizeInGB = maxSizeBytes / (1024 * 1024 * 1024);
      throw new UploadError(
        `File too large: ${sizeInMB.toFixed(2)}MB exceeds ${maxSizeInGB}GB limit`,
        413, // Payload Too Large
        false
      );
    }

    return {
      exists: fileInfo.exists,
      size,
      sizeInMB,
    };
  }

  /**
   * Calculate estimated upload time based on file size and network speed
   *
   * @param fileSizeBytes - File size in bytes
   * @param networkSpeedMbps - Network speed in Mbps (default: 10)
   * @returns Estimated time in seconds
   *
   * @example
   * const estimatedTime = VideoUploader.estimateUploadTime(100 * 1024 * 1024, 10); // 100MB at 10Mbps
   * console.log(`Estimated: ${estimatedTime}s (~${(estimatedTime / 60).toFixed(1)}min)`);
   */
  static estimateUploadTime(
    fileSizeBytes: number,
    networkSpeedMbps: number = 10
  ): number {
    // Convert Mbps to bytes per second
    const networkSpeedBytesPerSecond = (networkSpeedMbps * 1024 * 1024) / 8;

    // Calculate theoretical time
    const theoreticalTime = fileSizeBytes / networkSpeedBytesPerSecond;

    // Add 20% buffer for overhead
    const estimatedTime = Math.ceil(theoreticalTime * 1.2);

    return estimatedTime;
  }
}
