import { VideoService } from './videoService';
import { VideoRecord } from '../lib/supabase';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy'; // ✅ Use legacy API for createUploadTask
import { TranscriptionJobService } from './transcriptionJobService';
import { VideoThumbnailGenerator } from './import/VideoThumbnailGenerator'; // ✅ Phase 1: Modular thumbnail generation
import { VideoUploader } from './import/VideoUploader'; // ✅ Phase 2: Modular video upload
import { VideoRecordManager } from './import/VideoRecordManager'; // ✅ Phase 3: Modular database operations
import { ImportQueueManager } from './import/ImportQueueManager'; // ✅ Phase 3: Modular queue management

// Note: expo-task-manager not installed yet - background upload still works with FileSystem.BACKGROUND session type

export interface ImportVideoItem {
  id: string; // Unique ID for this import job
  asset?: MediaLibrary.Asset; // For MediaLibrary imports
  pickerAsset?: ImagePicker.ImagePickerAsset; // For ImagePicker imports
  uri: string; // Video URI
  filename: string; // Video filename
  title?: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number; // 0-100
  error?: string;
  videoRecord?: VideoRecord;
  retryCount: number;
  metadata?: any; // Optional metadata
}

export interface ImportQueueState {
  items: ImportVideoItem[];
  currentIndex: number;
  isProcessing: boolean;
  totalCount: number;
  completedCount: number;
  failedCount: number;
}

type ProgressCallback = (state: ImportQueueState) => void;

export class ImportQueueService {
  // ✅ Phase 3: All state management delegated to ImportQueueManager
  // private static queue → ImportQueueManager.getItems()
  // private static isProcessing → ImportQueueManager.isQueueProcessing()
  // private static currentIndex → ImportQueueManager.getCurrentIndex()
  // private static listeners → ImportQueueManager.subscribe()

  private static readonly CONCURRENT_UPLOADS = 2; // Process 2 videos at a time

  /**
   * ✅ Add a single recorded video to the upload queue
   */
  static async addRecordedVideoToQueue(
    videoUri: string,
    title: string,
    userId: string,
    chapterId?: string,
    duration?: number
  ): Promise<string> {
    console.log('📥 Adding recorded video to upload queue:', { videoUri, title, userId, chapterId });

    const itemId = `recorded_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // ✅ Extract relative path from absolute URI for recorded videos
    // Format: file:///.../.../Documents/video_backups/backup_1234567890.mov
    // → Extract: video_backups/backup_1234567890.mov
    let relativeUri: string | undefined;
    if (videoUri.includes('video_backups/')) {
      const parts = videoUri.split('video_backups/');
      if (parts.length > 1) {
        relativeUri = `video_backups/${parts[1]}`;
        console.log('📂 Extracted relative path:', relativeUri);
      }
    }

    const newItem: ImportVideoItem = {
      id: itemId,
      uri: videoUri, // Keep absolute path for immediate use
      relativeUri: relativeUri, // ✅ Store relative path for iOS container changes
      filename: `${title || 'Recording'}_${Date.now()}.mp4`,
      title: title || 'Recorded Video',
      status: 'pending',
      progress: 0,
      retryCount: 0,
      metadata: {
        isRecorded: true,
        chapterId,
        duration,
      },
    };

    // ✅ Phase 3: Use ImportQueueManager
    ImportQueueManager.addItems([newItem]);
    await ImportQueueManager.saveState();
    ImportQueueManager.notifyListeners();

    // Start processing if not already running
    if (!ImportQueueManager.isQueueProcessing()) {
      this.processQueue();
    }

    return itemId;
  }

  /**
   * Add videos from MediaLibrary to the import queue
   */
  static async addToQueue(assets: MediaLibrary.Asset[], chapterId?: string): Promise<void> {
    console.log(`📥 Adding ${assets.length} videos to import queue`);
    console.log(`📖 Chapter ID: ${chapterId || 'none'}`);

    const newItems: ImportVideoItem[] = assets.map((asset, index) => ({
      id: `import_${Date.now()}_${index}`,
      asset,
      uri: asset.uri,
      filename: asset.filename,
      title: asset.filename.replace(/\.(mp4|mov|avi|m4v)$/i, ''),
      status: 'pending',
      progress: 0,
      retryCount: 0,
      metadata: {
        isImported: true,
        chapterId: chapterId || null,
        width: asset.width,
        height: asset.height,
        orientation: asset.width > asset.height ? 'landscape' : 'portrait',
        duration: asset.duration,
      },
    }));

    // ✅ Phase 3: Use ImportQueueManager
    ImportQueueManager.addItems(newItems);
    await ImportQueueManager.saveState();
    ImportQueueManager.notifyListeners();

    // Start processing if not already running
    if (!ImportQueueManager.isQueueProcessing()) {
      this.processQueue();
    }
  }

  /**
   * Add videos from ImagePicker to the import queue
   */
  static async addPickerVideosToQueue(assets: ImagePicker.ImagePickerAsset[], chapterId?: string): Promise<void> {
    console.log('========================================');
    console.log('📥 IMPORTQUEUESERVICE: addPickerVideosToQueue called');
    console.log('========================================');
    console.log(`📊 Assets to add: ${assets.length}`);
    console.log(`📖 Chapter ID: ${chapterId || 'none'}`);

    assets.forEach((asset, idx) => {
      console.log(`  Asset ${idx + 1}:`);
      console.log(`    - uri: ${asset.uri}`);
      console.log(`    - fileName: ${asset.fileName}`);
      console.log(`    - type: ${asset.type}`);
      console.log(`    - width: ${asset.width}, height: ${asset.height}`);
      console.log(`    - duration: ${asset.duration}`);
    });

    console.log('🔄 Creating ImportVideoItem objects...');
    const newItems: ImportVideoItem[] = assets.map((asset, index) => {
      const item = {
        id: `import_${Date.now()}_${index}`,
        pickerAsset: asset,
        uri: asset.uri,
        filename: asset.fileName || `video_${Date.now()}_${index}.mp4`,
        title: (asset.fileName || `video_${index}`).replace(/\.(mp4|mov|avi|m4v)$/i, ''),
        status: 'pending' as const,
        progress: 0,
        retryCount: 0,
        metadata: {
          isImported: true,
          chapterId: chapterId || null,  // ✅ Ajouter le chapter ID
          width: asset.width,
          height: asset.height,
          orientation: (asset.width || 0) > (asset.height || 0) ? 'landscape' : 'portrait',
          duration: asset.duration,
        },
      };
      console.log(`  ✅ Created item ${index + 1}: ${item.id}`);
      return item;
    });

    console.log(`✅ Created ${newItems.length} ImportVideoItem objects`);

    // ✅ Phase 3: Use ImportQueueManager
    ImportQueueManager.addItems(newItems);
    await ImportQueueManager.saveState();
    ImportQueueManager.notifyListeners();

    // Start processing if not already running
    if (!ImportQueueManager.isQueueProcessing()) {
      console.log('🚀 Queue not processing, starting processQueue()...');
      this.processQueue();
    } else {
      console.log('⚠️ Queue already processing, skipping processQueue() call');
    }

    console.log('========================================');
    console.log('✅ IMPORTQUEUESERVICE: addPickerVideosToQueue completed');
    console.log('========================================');
  }

  /**
   * Process the queue - uploads videos concurrently
   */
  private static async processQueue(): Promise<void> {
    console.log('========================================');
    console.log('🚀 PROCESSQUEUE: Called');
    console.log('========================================');

    // ✅ Phase 3: Use ImportQueueManager
    if (ImportQueueManager.isQueueProcessing()) {
      console.log('⚠️ Queue already processing, exiting');
      console.log('========================================');
      return;
    }

    ImportQueueManager.setProcessing(true);
    const queueLength = ImportQueueManager.getQueueLength();
    const currentIndex = ImportQueueManager.getCurrentIndex();

    console.log(`📊 Queue length: ${queueLength} items`);
    console.log(`📊 Current index: ${currentIndex}`);
    console.log(`📊 Concurrent uploads: ${this.CONCURRENT_UPLOADS}`);
    console.log('📢 Notifying listeners (isProcessing = true)...');
    ImportQueueManager.notifyListeners();

    try {
      // Process videos in batches
      let batchNumber = 0;
      while (ImportQueueManager.hasMoreItems()) {
        batchNumber++;
        console.log(`\n--- Batch ${batchNumber} (index ${ImportQueueManager.getCurrentIndex()}) ---`);

        // ✅ Phase 3: Get batch from ImportQueueManager
        const batch = ImportQueueManager.getNextBatch(this.CONCURRENT_UPLOADS);

        console.log(`📦 Batch items: ${batch.length}`);
        batch.forEach((item, idx) => {
          console.log(`  ${idx + 1}. ${item.filename} (status: ${item.status}, id: ${item.id})`);
        });

        if (batch.length === 0) {
          console.log('⚠️ No pending/failed items in batch, skipping...');
          ImportQueueManager.incrementIndex(this.CONCURRENT_UPLOADS);
          continue;
        }

        // Process batch concurrently
        console.log(`🔄 Processing ${batch.length} items concurrently...`);
        const results = await Promise.allSettled(
          batch.map(item => this.processItem(item))
        );

        console.log(`✅ Batch ${batchNumber} completed:`);
        results.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            console.log(`  ✅ Item ${idx + 1}: fulfilled`);
          } else {
            console.log(`  ❌ Item ${idx + 1}: rejected -`, result.reason);
          }
        });

        ImportQueueManager.incrementIndex(this.CONCURRENT_UPLOADS);
        console.log(`💾 Saving queue state (currentIndex now ${ImportQueueManager.getCurrentIndex()})...`);
        await ImportQueueManager.saveState();
      }

      console.log('\n========================================');
      console.log('✅ PROCESSQUEUE: All batches completed');
      console.log(`📊 Final Results: ${ImportQueueManager.getCompletedCount()} completed, ${ImportQueueManager.getFailedCount()} failed`);
      console.log('========================================');

    } catch (error) {
      console.error('========================================');
      console.error('❌ PROCESSQUEUE: Error processing queue');
      console.error('Error:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      console.error('========================================');
    } finally {
      console.log('🏁 PROCESSQUEUE: Finally block - setting isProcessing = false');
      ImportQueueManager.setProcessing(false);
      ImportQueueManager.notifyListeners();
      console.log('✅ PROCESSQUEUE: Completed');
    }
  }

  /**
   * ✅ DEPRECATED - Moved to VideoThumbnailGenerator module (Phase 1)
   * Use VideoThumbnailGenerator.generateFramesWithCache() instead
   */

  /**
   * ✅ DEPRECATED - Moved to VideoUploader module (Phase 2)
   * Use VideoUploader.uploadVideo() instead
   *
   * Upload video using FileSystem background upload (non-blocking)
   * Returns: { fileName: string, fileSize: number }
   */
  private static async uploadVideoBackground(
    videoUri: string,
    fileName: string,
    userId: string,
    itemId: string,
    onProgress: (progress: number) => void
  ): Promise<{ fileName: string; fileSize: number }> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 [UploadBackground] Starting background upload');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📋 Item ID: ${itemId}`);
    console.log(`📄 Filename: ${fileName}`);
    console.log(`📍 Source URI: ${videoUri}`);
    console.log(`👤 User ID: ${userId}`);

    // ✅ Check if file exists before attempting upload
    console.log('🔍 Checking if file exists...');
    const fileInfo = await FileSystem.getInfoAsync(videoUri);

    if (!fileInfo.exists) {
      console.error('❌ File does not exist at path:', videoUri);
      throw new Error(`File not found: ${videoUri}. The file may have been moved or deleted.`);
    }

    console.log('✅ File exists and is accessible');

    // Get file size for logging and determine timeout
    let fileSize = 0;
    let dynamicTimeout = 600; // Default 10 minutes

    if ('size' in fileInfo) {
      fileSize = fileInfo.size;
      const sizeInMB = (fileSize / (1024 * 1024)).toFixed(2);
      console.log(`📦 File size: ${sizeInMB} MB`);

      // ✅ Dynamic timeout based on file size (assume 1MB/sec minimum upload speed)
      // Add buffer: 2x the theoretical minimum time, with max of 30 minutes
      const theoreticalSeconds = fileSize / (1024 * 1024); // Assume 1MB/sec
      dynamicTimeout = Math.min(1800, Math.max(600, theoreticalSeconds * 2)); // Min 10min, max 30min

      console.log(`⏱️ Dynamic timeout calculated: ${(dynamicTimeout / 60).toFixed(1)} minutes`);

      // ✅ Warn if file is very large (>500MB)
      if (fileSize > 500 * 1024 * 1024) {
        console.warn(`⚠️ Large file detected (${sizeInMB}MB). Upload may take ${(dynamicTimeout / 60).toFixed(1)} minutes.`);
      }
    }

    // Get auth token
    console.log('🔐 Retrieving authentication token...');
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      console.error('❌ No authentication token available');
      throw new Error('No auth token available for upload');
    }
    console.log('✅ Auth token retrieved');

    // Construct Supabase Storage upload URL
    const uploadUrl = `https://eenyzudwktcjpefpoapi.supabase.co/storage/v1/object/videos/${userId}/${fileName}`;
    console.log(`🔗 Upload URL: ${uploadUrl}`);

    // ✅ Create background upload task with progress tracking
    console.log('⚙️ Creating upload task...');
    const uploadStartTime = Date.now();
    let lastLoggedPercent = 0;

    const uploadTask = FileSystem.createUploadTask(
      uploadUrl,
      videoUri,
      {
        httpMethod: 'POST',
        uploadType: 1 as any, // MULTIPART
        fieldName: 'file',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-upsert': 'true', // Allow overwriting
        },
        // ✅ Enable background mode (1 = BACKGROUND)
        sessionType: 1 as any,
        // ✅ Dynamic timeout based on file size (10-30 minutes)
        timeoutIntervalForRequest: dynamicTimeout,
        timeoutIntervalForResource: dynamicTimeout,
      },
      (data: any) => {
        // Progress callback
        const percent = (data.totalBytesSent / data.totalBytesExpectedToSend) * 100;
        const sentMB = (data.totalBytesSent / (1024 * 1024)).toFixed(2);
        const totalMB = (data.totalBytesExpectedToSend / (1024 * 1024)).toFixed(2);

        // Log every 10% or significant milestones
        const percentInt = Math.floor(percent / 10) * 10;
        if (percentInt > lastLoggedPercent && percentInt % 10 === 0) {
          const elapsed = ((Date.now() - uploadStartTime) / 1000).toFixed(1);
          console.log(`📤 [Upload] ${percentInt}% | ${sentMB}/${totalMB} MB | ${elapsed}s elapsed`);
          lastLoggedPercent = percentInt;
        }

        onProgress(percent);
      }
    );

    console.log('🚀 Starting upload task execution...');
    console.log(`⏱️ Timeout configured: ${dynamicTimeout}s (${(dynamicTimeout / 60).toFixed(1)}min)`);
    console.log(`📦 File size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);

    const result = await uploadTask.uploadAsync();
    const uploadDuration = ((Date.now() - uploadStartTime) / 1000).toFixed(2);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 [UploadBackground] Upload completed');
    console.log(`⏱️ Duration: ${uploadDuration}s (${(parseFloat(uploadDuration) / 60).toFixed(1)}min)`);
    console.log(`📊 Upload speed: ${(fileSize / (1024 * 1024) / parseFloat(uploadDuration)).toFixed(2)} MB/s`);
    console.log(`📊 Status: ${result?.status}`);
    console.log(`📝 Body: ${result?.body?.substring(0, 100)}...`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (!result || result.status !== 200) {
      console.error('❌ Upload failed');
      console.error(`   Status: ${result?.status}`);
      console.error(`   Body: ${result?.body}`);
      throw new Error(`Upload failed with status ${result?.status}: ${result?.body}`);
    }

    console.log(`✅ [UploadBackground] Success! File uploaded to: ${fileName}`);
    return { fileName, fileSize };
  }

  /**
   * Process a single item from the queue
   */
  private static async processItem(item: ImportVideoItem): Promise<void> {
    console.log('\n========================================');
    console.log(`📤 PROCESSITEM: Starting - ${item.filename}`);
    console.log(`📋 Item ID: ${item.id}`);
    console.log(`📋 Item URI: ${item.uri}`);
    console.log('========================================');

    try {
      // Update status to uploading
      console.log('🔄 Setting status to "uploading"...');
      ImportQueueManager.updateItem(item.id, {
        status: 'uploading',
        progress: 0
      });
      ImportQueueManager.notifyListeners();
      console.log('✅ Status updated, listeners notified');

      let metadata: any;
      let videoUri: string;

      // ✅ Handle recorded video (no asset)
      if (item.metadata?.isRecorded) {
        console.log('🎬 Processing recorded video...');
        metadata = item.metadata;

        // ✅ Reconstruct absolute path from relative path (iOS container-safe)
        if (item.relativeUri) {
          // Reconstruct: Documents/video_backups/backup_XXX.mov
          const currentContainer = FileSystem.documentDirectory;
          videoUri = `${currentContainer}${item.relativeUri}`;
          console.log('🔄 Reconstructed path from relative:', item.relativeUri, '→', videoUri);
        } else {
          // Fallback to absolute path (legacy or non-recorded videos)
          videoUri = item.uri;
          console.log('📍 Using absolute URI (legacy):', videoUri);
        }

        console.log('📍 Video URI (Recorded):', videoUri);
      }
      // Handle MediaLibrary asset
      else if (item.asset) {
        console.log('📚 Processing MediaLibrary asset...');
        // Get asset info with location
        const assetInfo = await MediaLibrary.getAssetInfoAsync(item.asset.id);
        console.log('✅ Asset info retrieved:', assetInfo);

        // Extract metadata
        metadata = {
          isImported: true,
          originalFilename: item.asset.filename,
          originalCreationTime: item.asset.creationTime,
          originalModificationTime: item.asset.modificationTime,
          width: item.asset.width,
          height: item.asset.height,
          orientation: item.asset.width > item.asset.height ? 'landscape' : 'portrait',
          location: assetInfo.location || null,
        };

        videoUri = assetInfo.localUri || assetInfo.uri;
        console.log('📍 Video URI (MediaLibrary):', videoUri);
      }
      // Handle ImagePicker asset
      else if (item.pickerAsset) {
        console.log('📸 Processing ImagePicker asset...');
        console.log('📋 Picker asset details:');
        console.log(`  - fileName: ${item.pickerAsset.fileName}`);
        console.log(`  - timestamp: ${item.pickerAsset.timestamp ? new Date(item.pickerAsset.timestamp).toISOString() : 'none'}`);
        console.log(`  - dimensions: ${item.pickerAsset.width}x${item.pickerAsset.height}`);
        console.log(`  - duration: ${item.pickerAsset.duration}s`);
        console.log(`  - type: ${item.pickerAsset.type}`);

        metadata = item.metadata || {
          isImported: true,
          originalFilename: item.pickerAsset.fileName || item.filename,
          originalCreationTime: item.pickerAsset.timestamp,
          originalModificationTime: item.pickerAsset.timestamp,
          width: item.pickerAsset.width,
          height: item.pickerAsset.height,
          orientation: (item.pickerAsset.width || 0) > (item.pickerAsset.height || 0) ? 'landscape' : 'portrait',
          duration: item.pickerAsset.duration,
        };

        videoUri = item.uri;
        console.log('📍 Video URI (ImagePicker):', videoUri);
      } else {
        throw new Error('No asset or picker asset provided');
      }

      console.log('📍 Video metadata:', JSON.stringify(metadata, null, 2));

      // Progress simulation (we'll get real progress later)
      console.log('📊 Updating progress to 10%...');
      ImportQueueManager.updateItem(item.id, { progress: 10 });
      ImportQueueManager.notifyListeners();

      // Get current user
      console.log('👤 Getting current user...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ Auth error:', authError);
        throw new Error('User not authenticated');
      }
      console.log('✅ User authenticated:', user.id);

      // ✅ Upload video using background upload (non-blocking)
      console.log('🚀 Starting background upload...');
      const fileName = `video_${Date.now()}_${item.id}.mp4`;

      // Use original video URI (compression can be added later if needed)
      const processedVideoUri = videoUri;

      // ✅ Get video duration from metadata (MEMORY FIX: avoid loading entire video into memory)
      let duration = 0;
      console.log('⏱️ Getting video duration from metadata (memory-efficient)...');

      // Priority 1: Use duration from metadata (most reliable, no memory load)
      if (metadata.duration && metadata.duration > 0) {
        duration = Math.round(metadata.duration);
        console.log(`✅ Duration from metadata: ${duration}s (0 MB memory overhead)`);
      }
      // Priority 2: Use duration from recorded video metadata
      else if (item.metadata?.duration && item.metadata.duration > 0) {
        duration = Math.round(item.metadata.duration);
        console.log(`✅ Duration from item metadata: ${duration}s (0 MB memory overhead)`);
      }
      // Priority 3: Use MediaLibrary asset duration
      else if (item.asset?.duration && item.asset.duration > 0) {
        duration = Math.round(item.asset.duration);
        console.log(`✅ Duration from MediaLibrary asset: ${duration}s (0 MB memory overhead)`);
      }
      // Priority 4: Use ImagePicker asset duration
      else if (item.pickerAsset?.duration && item.pickerAsset.duration > 0) {
        duration = Math.round(item.pickerAsset.duration);
        console.log(`✅ Duration from ImagePicker asset: ${duration}s (0 MB memory overhead)`);
      }
      // Fallback: Estimate based on file size (very rough estimate)
      else {
        console.warn('⚠️ No duration metadata available, using file size estimate');
        try {
          const fileInfo = await FileSystem.getInfoAsync(processedVideoUri);
          if (fileInfo.exists && fileInfo.size) {
            // Rough estimate: assume ~1MB per 30 seconds of video at 720p
            duration = Math.max(5, Math.floor(fileInfo.size / (1024 * 1024)) * 30);
            console.log(`📊 Estimated duration from file size: ${duration}s`);
          } else {
            duration = 60; // Default fallback
            console.log(`📊 Using default fallback: ${duration}s`);
          }
        } catch (error) {
          duration = 60;
          console.log(`📊 Using default fallback due to error: ${duration}s`);
        }
      }

      console.log(`✅ Final duration: ${duration}s (saved ~50-100MB RAM by avoiding Audio.Sound)`)

      // ✅ Upload in background with progress tracking using VideoUploader (Phase 2)
      const uploadResult = await VideoUploader.uploadVideo(
        processedVideoUri,
        fileName,
        user.id,
        {
          onProgress: (progress) => {
            const mappedProgress = Math.min(80, 20 + (progress.percent * 0.6)); // Map 0-100% upload to 20-80% progress
            ImportQueueManager.updateItem(item.id, { progress: mappedProgress });
            ImportQueueManager.notifyListeners();
          }
        }
      );

      const uploadedFilePath = uploadResult.fileName;
      const fileSize = uploadResult.fileSize;

      console.log('✅ Background upload completed!');
      console.log(`  - Uploaded file path: ${uploadedFilePath}`);
      console.log(`  - File size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // STEP 3: CREATE VIDEO RECORD IN DATABASE (Using VideoRecordManager - Phase 3)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const publicUrl = VideoRecordManager.buildPublicUrl(user.id, uploadedFilePath);

      // Determine original creation time
      let createdAt: string | undefined;
      if (item.asset?.creationTime) {
        createdAt = new Date(item.asset.creationTime).toISOString();
      } else if (item.pickerAsset?.timestamp) {
        createdAt = new Date(item.pickerAsset.timestamp).toISOString();
      }

      // ✅ Phase 3: Use VideoRecordManager to create video record
      const videoRecord = await VideoRecordManager.createVideoRecord({
        userId: user.id,
        title: item.title || 'Imported Video',
        filePath: publicUrl,
        duration: duration,
        metadata: metadata,
        chapterId: metadata?.chapterId || undefined,
        createdAt: createdAt,
      });

      console.log('📊 Updating progress to 80%...');
      ImportQueueManager.updateItem(item.id, { progress: 80 });
      ImportQueueManager.notifyListeners();

      // ✅ Phase 3: Use VideoRecordManager to update metadata and location
      if (metadata.location) {
        await VideoRecordManager.updateVideoMetadata(videoRecord.id, {
          metadata: metadata,
          location: metadata.location,
        });
      } else if (metadata) {
        await VideoRecordManager.updateVideoMetadata(videoRecord.id, {
          metadata: metadata,
        });
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // STEP 3.5: GENERATE THUMBNAIL FRAMES
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📸 [Thumbnails] STEP 3.5: Generating thumbnail frames');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      const thumbnailStartTime = Date.now();

      try {
        // ✅ For imported videos, copy to cache directory first (expo-video-thumbnails needs accessible file)
        let thumbnailVideoUri = processedVideoUri;

        if (item.metadata?.isImported || item.asset || item.pickerAsset) {
          console.log('📋 Imported video detected, copying to cache for thumbnail generation...');

          try {
            // Copy video to cache directory with accessible permissions
            const cacheFileName = `temp_thumb_${videoRecord.id}.mp4`;
            const cacheUri = `${FileSystem.cacheDirectory}${cacheFileName}`;

            console.log(`📂 Copying from ${processedVideoUri} to ${cacheUri}`);
            await FileSystem.copyAsync({
              from: processedVideoUri,
              to: cacheUri,
            });

            thumbnailVideoUri = cacheUri;
            console.log('✅ Video copied to cache successfully');

            // Generate thumbnails from cache file using new module
            const frameUrls = await VideoThumbnailGenerator.generateFrames(
              thumbnailVideoUri,
              duration,
              { videoId: videoRecord.id }
            );

            // Clean up cache file after generating thumbnails
            try {
              await FileSystem.deleteAsync(cacheUri, { idempotent: true });
              console.log('🧹 Cleaned up cache file');
            } catch (cleanupError) {
              console.warn('⚠️ Could not delete cache file:', cleanupError);
            }

            if (frameUrls.length > 0) {
              // ✅ Phase 3: Use VideoRecordManager to update thumbnails
              await VideoRecordManager.updateVideoThumbnails(videoRecord.id, {
                thumbnailPath: frameUrls[0],
                thumbnailFrames: frameUrls,
              });

              videoRecord.thumbnail_path = frameUrls[0];
              videoRecord.thumbnail_frames = frameUrls;
              console.log(`✅ ${frameUrls.length} frames generated and saved successfully`);
            } else {
              console.warn('⚠️ No frames were generated');
            }

          } catch (copyError) {
            console.error('❌ Error copying video to cache:', copyError);
            // Try without copying (might work for some URIs) using new module
            const frameUrls = await VideoThumbnailGenerator.generateFrames(
              processedVideoUri,
              duration,
              { videoId: videoRecord.id }
            );

            if (frameUrls.length > 0) {
              // ✅ Phase 3: Use VideoRecordManager to update thumbnails
              await VideoRecordManager.updateVideoThumbnails(videoRecord.id, {
                thumbnailPath: frameUrls[0],
                thumbnailFrames: frameUrls,
              });

              videoRecord.thumbnail_path = frameUrls[0];
              videoRecord.thumbnail_frames = frameUrls;
              console.log(`✅ ${frameUrls.length} frames generated successfully (without cache)`);
            }
          }
        } else {
          // For recorded videos, use URI directly with new module
          const frameUrls = await VideoThumbnailGenerator.generateFrames(
            thumbnailVideoUri,
            duration,
            { videoId: videoRecord.id }
          );

          if (frameUrls.length > 0) {
            // ✅ Phase 3: Use VideoRecordManager to update thumbnails
            await VideoRecordManager.updateVideoThumbnails(videoRecord.id, {
              thumbnailPath: frameUrls[0],
              thumbnailFrames: frameUrls,
            });

            videoRecord.thumbnail_path = frameUrls[0];
            videoRecord.thumbnail_frames = frameUrls;
            console.log(`✅ ${frameUrls.length} frames generated and saved successfully`);
          } else {
            console.warn('⚠️ No frames were generated');
          }
        }

        const thumbnailDuration = Date.now() - thumbnailStartTime;
        console.log(`⏱️ Thumbnail generation completed in ${(thumbnailDuration / 1000).toFixed(1)}s`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      } catch (thumbnailError) {
        const thumbnailDuration = Date.now() - thumbnailStartTime;
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('⚠️ [Thumbnails] Thumbnail generation failed (non-critical)');
        console.error(`⏱️ Failed after ${(thumbnailDuration / 1000).toFixed(1)}s`);
        console.error('Error:', thumbnailError);
        console.error('Error message:', thumbnailError instanceof Error ? thumbnailError.message : 'Unknown');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        // Continue without thumbnails - not critical
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // STEP 4: CREATE TRANSCRIPTION JOB
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎙️ [TranscriptionJob] STEP 4: Creating transcription job');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      const transcriptionStartTime = Date.now();

      try {
        // Construct proper public URL with user_id in path
        const videoUrl = `https://eenyzudwktcjpefpoapi.supabase.co/storage/v1/object/public/videos/${user.id}/${uploadedFilePath}`;
        console.log('📋 Transcription job parameters:');
        console.log(`  - Video URL: ${videoUrl}`);
        console.log(`  - Video ID: ${videoRecord.id}`);
        console.log(`  - Duration: ${duration}s`);
        console.log(`  - File size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`  - User ID: ${user.id}`);

        console.log('🚀 Calling TranscriptionJobService.createTranscriptionJob...');
        const jobStartTime = Date.now();

        // ✅ Round duration to integer (DB expects integer, not float)
        const roundedDuration = Math.round(duration);
        console.log(`⏱️ Duration: ${duration}s → ${roundedDuration}s (rounded for DB)`);

        await TranscriptionJobService.createTranscriptionJob(
          videoUrl,
          roundedDuration, // ✅ Use rounded duration
          fileSize, // ✅ Now passing actual file size (matches recorded videos)
          videoRecord.id
        );

        const jobDuration = Date.now() - jobStartTime;
        console.log(`⏱️ TranscriptionJobService call completed in ${jobDuration}ms`);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ [TranscriptionJob] Job created and queued successfully!');
        console.log(`📊 Video will be processed by AssemblyAI`);
        console.log(`📊 Status can be monitored in transcription_jobs table`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      } catch (transcriptionError) {
        const transcriptionDuration = Date.now() - transcriptionStartTime;
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('⚠️ [TranscriptionJob] Failed to create transcription job');
        console.error(`⏱️ Failed after ${transcriptionDuration}ms`);
        console.error('Error:', transcriptionError);
        console.error('Error message:', transcriptionError instanceof Error ? transcriptionError.message : 'Unknown');
        console.error('Error stack:', transcriptionError instanceof Error ? transcriptionError.stack : 'No stack');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.warn('⚠️ Import will continue without transcription (non-critical error)');
        // Don't fail the import if transcription fails
      }

      console.log('📊 Updating progress to 100%...');
      ImportQueueManager.updateItem(item.id, {
        progress: 100,
        status: 'completed',
        videoRecord: videoRecord
      });
      console.log(`✅ Successfully imported: ${item.filename}`);

      // ✅ CLEANUP: Delete local backup after successful upload (for recorded videos)
      if (item.metadata?.isRecorded && videoUri) {
        try {
          console.log('🧹 [CLEANUP] Deleting local backup after successful upload...');
          const fileInfo = await FileSystem.getInfoAsync(videoUri);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(videoUri, { idempotent: true });
            console.log('✅ [CLEANUP] Local backup deleted:', videoUri);
          } else {
            console.log('⚠️ [CLEANUP] Backup file already deleted or not found');
          }
        } catch (cleanupError) {
          console.warn('⚠️ [CLEANUP] Could not delete backup (non-critical):', cleanupError);
          // Non-critical error - upload succeeded, just couldn't clean up
        }
      }

      console.log('========================================');
      console.log(`✅ PROCESSITEM: Completed - ${item.filename}`);
      console.log('========================================\n');

    } catch (error) {
      console.error('========================================');
      console.error(`❌ PROCESSITEM: Failed - ${item.filename}`);
      console.error('Error:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      console.error('========================================');

      const errorMessage = error instanceof Error ? error.message : String(error);
      const isTimeoutError = errorMessage.includes('timed out') ||
                             errorMessage.includes('NSURLErrorDomain') ||
                             errorMessage.includes('Code=-1001');

      // ✅ Phase 3: Use ImportQueueManager for retry logic
      if (ImportQueueManager.shouldRetry(item)) {
        ImportQueueManager.updateItem(item.id, {
          retryCount: item.retryCount + 1,
          status: 'pending',
          progress: 0
        });

        if (isTimeoutError) {
          console.log(`🔄 Network timeout detected. Retrying (${item.retryCount + 1}/${ImportQueueManager.getMaxRetryAttempts()})`);
          console.log(`💡 TIP: Check your network connection. Large videos may take 10-30 minutes to upload.`);
        } else {
          console.log(`🔄 Retrying (${item.retryCount + 1}/${ImportQueueManager.getMaxRetryAttempts()})`);
        }
      } else {
        ImportQueueManager.updateItem(item.id, {
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        if (isTimeoutError) {
          console.log(`❌ Max retries reached. Video upload timed out after ${ImportQueueManager.getMaxRetryAttempts()} attempts.`);
          console.log(`💡 This usually means the file is too large or network is too slow.`);
          console.log(`💡 Try: (1) Use WiFi instead of cellular, (2) Upload smaller videos, (3) Check network quality`);
        } else {
          console.log(`❌ Max retries reached, marking as failed`);
        }
      }
    }

    console.log('💾 Saving queue state...');
    await ImportQueueManager.saveState();
    console.log('📢 Notifying listeners...');
    ImportQueueManager.notifyListeners();
    console.log('✅ processItem cleanup complete\n');
  }

  /**
   * Get current queue state
   * ✅ Phase 3: Delegates to ImportQueueManager
   */
  static getState(): ImportQueueState {
    return ImportQueueManager.getState();
  }

  /**
   * Subscribe to queue updates
   * ✅ Phase 3: Delegates to ImportQueueManager
   */
  static subscribe(callback: ProgressCallback): () => void {
    return ImportQueueManager.subscribe(callback);
  }

  /**
   * Load queue state from AsyncStorage
   * ✅ Phase 3: Delegates to ImportQueueManager
   * ✅ Automatically cleans up invalid backups on load
   */
  static async loadQueueState(): Promise<void> {
    await ImportQueueManager.loadState();

    // ✅ Clean up invalid backups first (old files, iOS container changes)
    await this.cleanupInvalidBackups();

    // Resume processing if there are pending items
    if (ImportQueueManager.hasPendingItems() && !ImportQueueManager.isQueueProcessing()) {
      console.log('📥 Resuming previous import queue');
      this.processQueue();
    }
  }

  /**
   * Clear completed items from queue
   * ✅ Phase 3: Delegates to ImportQueueManager
   */
  static clearCompleted(): void {
    ImportQueueManager.clearCompleted();
    ImportQueueManager.saveState();
    ImportQueueManager.notifyListeners();
  }

  /**
   * Clear all items from queue
   * ✅ Phase 3: Delegates to ImportQueueManager
   */
  static clearAll(): void {
    ImportQueueManager.clearAll();
    ImportQueueManager.saveState();
    ImportQueueManager.notifyListeners();
  }

  /**
   * Retry failed items
   * ✅ Phase 3: Delegates to ImportQueueManager
   */
  static retryFailed(): void {
    ImportQueueManager.retryFailed();
    ImportQueueManager.saveState();

    if (!ImportQueueManager.isQueueProcessing()) {
      this.processQueue();
    }
  }

  /**
   * Cancel processing (will stop after current batch completes)
   * ✅ Phase 3: Delegates to ImportQueueManager
   */
  static cancelProcessing(): void {
    ImportQueueManager.cancelProcessing();
  }

  /**
   * ✅ Clean up invalid items from the queue
   * Removes items with files that no longer exist (e.g., after iOS container changes)
   * Also removes completed items older than 7 days
   */
  static async cleanupInvalidBackups(): Promise<void> {
    try {
      // console.log('🧹 [CLEANUP] Starting queue cleanup...');
      const items = ImportQueueManager.getItems();
      let removedInvalid = 0;
      let removedOldCompleted = 0;
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

      for (const item of items) {
        // ✅ Remove old completed items (older than 7 days)
        if (item.status === 'completed') {
          // Extract timestamp from item.id (format: recorded_1760792452623_xxx or import_1760792452623_xxx)
          const timestampMatch = item.id.match(/(?:recorded|import)_(\d+)_/);
          if (timestampMatch) {
            const itemTimestamp = parseInt(timestampMatch[1], 10);
            if (itemTimestamp < sevenDaysAgo) {
              // console.log(`🗑️ [CLEANUP] Removing old completed item: ${item.filename} (age: ${Math.floor((Date.now() - itemTimestamp) / (24 * 60 * 60 * 1000))} days)`);
              ImportQueueManager.removeItem(item.id);
              removedOldCompleted++;
              continue;
            }
          }
        }

        // ✅ Check if file exists for pending/failed recorded videos
        if (item.metadata?.isRecorded && (item.status === 'pending' || item.status === 'failed')) {
          let videoUri: string;

          // Reconstruct path from relative URI if available
          if (item.relativeUri) {
            const currentContainer = FileSystem.documentDirectory;
            videoUri = `${currentContainer}${item.relativeUri}`;
          } else {
            videoUri = item.uri;
          }

          try {
            const fileInfo = await FileSystem.getInfoAsync(videoUri);
            if (!fileInfo.exists) {
              console.log(`🗑️ [CLEANUP] Removing invalid item (file not found): ${item.filename}`);
              console.log(`   Path checked: ${videoUri}`);
              ImportQueueManager.removeItem(item.id);
              removedInvalid++;
            }
          } catch (error) {
            console.log(`🗑️ [CLEANUP] Removing invalid item (error checking file): ${item.filename}`);
            ImportQueueManager.removeItem(item.id);
            removedInvalid++;
          }
        }
      }

      if (removedInvalid > 0 || removedOldCompleted > 0) {
        await ImportQueueManager.saveState();
        // console.log(`✅ [CLEANUP] Removed ${removedInvalid} invalid backup(s) and ${removedOldCompleted} old completed item(s)`);
      } else {
        // console.log('✅ [CLEANUP] Queue is clean, no items removed');
      }

      ImportQueueManager.notifyListeners();
    } catch (error) {
      console.error('❌ [CLEANUP] Error cleaning up queue:', error);
    }
  }
}
