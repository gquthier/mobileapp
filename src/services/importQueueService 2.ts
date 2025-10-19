import { VideoService } from './videoService';
import { VideoRecord } from '../lib/supabase';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

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
  private static queue: ImportVideoItem[] = [];
  private static isProcessing = false;
  private static currentIndex = 0;
  private static listeners: ProgressCallback[] = [];
  private static readonly STORAGE_KEY = '@import_queue_state';
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly CONCURRENT_UPLOADS = 2; // Process 2 videos at a time

  /**
   * Add videos from MediaLibrary to the import queue
   */
  static async addToQueue(assets: MediaLibrary.Asset[]): Promise<void> {
    console.log(`📥 Adding ${assets.length} videos to import queue`);

    const newItems: ImportVideoItem[] = assets.map((asset, index) => ({
      id: `import_${Date.now()}_${index}`,
      asset,
      uri: asset.uri,
      filename: asset.filename,
      title: asset.filename.replace(/\.(mp4|mov|avi|m4v)$/i, ''),
      status: 'pending',
      progress: 0,
      retryCount: 0,
    }));

    this.queue.push(...newItems);
    await this.saveQueueState();
    this.notifyListeners();

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Add videos from ImagePicker to the import queue
   */
  static async addPickerVideosToQueue(assets: ImagePicker.ImagePickerAsset[]): Promise<void> {
    console.log('========================================');
    console.log('📥 IMPORTQUEUESERVICE: addPickerVideosToQueue called');
    console.log('========================================');
    console.log(`📊 Assets to add: ${assets.length}`);

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
    console.log(`📊 Queue state BEFORE adding:`);
    console.log(`  - Current queue length: ${this.queue.length}`);
    console.log(`  - Current index: ${this.currentIndex}`);
    console.log(`  - Is processing: ${this.isProcessing}`);

    this.queue.push(...newItems);

    console.log(`📊 Queue state AFTER adding:`);
    console.log(`  - New queue length: ${this.queue.length}`);
    console.log(`  - Queue items:`, this.queue.map(q => ({ id: q.id, status: q.status, filename: q.filename })));

    console.log('💾 Saving queue state to AsyncStorage...');
    await this.saveQueueState();
    console.log('✅ Queue state saved');

    console.log('📢 Notifying listeners...');
    this.notifyListeners();
    console.log('✅ Listeners notified');

    // Start processing if not already running
    if (!this.isProcessing) {
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

    if (this.isProcessing) {
      console.log('⚠️ Queue already processing, exiting');
      console.log('========================================');
      return;
    }

    this.isProcessing = true;
    console.log(`📊 Queue length: ${this.queue.length} items`);
    console.log(`📊 Current index: ${this.currentIndex}`);
    console.log(`📊 Concurrent uploads: ${this.CONCURRENT_UPLOADS}`);
    console.log('📢 Notifying listeners (isProcessing = true)...');
    this.notifyListeners();

    try {
      // Process videos in batches
      let batchNumber = 0;
      while (this.currentIndex < this.queue.length) {
        batchNumber++;
        console.log(`\n--- Batch ${batchNumber} (index ${this.currentIndex}) ---`);

        const batch = this.queue.slice(
          this.currentIndex,
          this.currentIndex + this.CONCURRENT_UPLOADS
        ).filter(item => item.status === 'pending' || item.status === 'failed');

        console.log(`📦 Batch items: ${batch.length}`);
        batch.forEach((item, idx) => {
          console.log(`  ${idx + 1}. ${item.filename} (status: ${item.status}, id: ${item.id})`);
        });

        if (batch.length === 0) {
          console.log('⚠️ No pending/failed items in batch, skipping...');
          this.currentIndex += this.CONCURRENT_UPLOADS;
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

        this.currentIndex += this.CONCURRENT_UPLOADS;
        console.log(`💾 Saving queue state (currentIndex now ${this.currentIndex})...`);
        await this.saveQueueState();
      }

      console.log('\n========================================');
      console.log('✅ PROCESSQUEUE: All batches completed');
      console.log(`📊 Final Results: ${this.getCompletedCount()} completed, ${this.getFailedCount()} failed`);
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
      this.isProcessing = false;
      this.notifyListeners();
      console.log('✅ PROCESSQUEUE: Completed');
    }
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
      item.status = 'uploading';
      item.progress = 0;
      this.notifyListeners();
      console.log('✅ Status updated, listeners notified');

      let metadata: any;
      let videoUri: string;

      // Handle MediaLibrary asset
      if (item.asset) {
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
        metadata = item.metadata || {
          isImported: true,
          originalFilename: item.filename,
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
      item.progress = 10;
      this.notifyListeners();

      // Get current user
      console.log('👤 Getting current user...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('❌ Auth error:', authError);
        throw new Error('User not authenticated');
      }
      console.log('✅ User authenticated:', user.id);

      // Upload video using existing VideoService
      console.log('📊 Updating progress to 20%...');
      item.progress = 20;
      this.notifyListeners();

      console.log('🚀 Calling VideoService.uploadVideo...');
      console.log(`  - videoUri: ${videoUri}`);
      console.log(`  - title: ${item.title || 'Imported Video'}`);
      console.log(`  - userId: ${user.id}`);

      const videoRecord = await VideoService.uploadVideo(
        videoUri,
        item.title || 'Imported Video',
        user.id
      );

      console.log('📥 VideoService.uploadVideo returned:', videoRecord);

      if (!videoRecord) {
        throw new Error('Failed to upload video');
      }

      console.log('✅ Video uploaded successfully!');
      console.log(`  - Video ID: ${videoRecord.id}`);
      console.log(`  - Video title: ${videoRecord.title}`);

      console.log('📊 Updating progress to 80%...');
      item.progress = 80;
      this.notifyListeners();

      // Update video record with metadata
      console.log('🔄 Updating video metadata in database...');
      const updateData: any = {
        metadata: metadata,
      };

      // Add original creation date if available (from MediaLibrary)
      if (item.asset?.creationTime) {
        updateData.created_at = new Date(item.asset.creationTime).toISOString();
        console.log('📅 Adding original creation time:', updateData.created_at);
      }

      // Add location if available
      if (metadata.location) {
        updateData.location = metadata.location;
        console.log('📍 Adding location:', metadata.location);
      }

      console.log('💾 Executing Supabase update...');
      const { error: updateError } = await supabase
        .from('videos')
        .update(updateData)
        .eq('id', videoRecord.id);

      if (updateError) {
        console.warn('⚠️ Could not update video metadata:', updateError);
      } else {
        console.log('✅ Video metadata updated successfully');
      }

      // Create transcription job for the imported video
      console.log('🎙️ Creating transcription job...');
      const { error: transcriptionError } = await supabase
        .from('transcription_jobs')
        .insert([{
          video_id: videoRecord.id,
          user_id: user.id,
          status: 'pending',
        }]);

      if (transcriptionError) {
        console.warn('⚠️ Could not create transcription job:', transcriptionError);
      } else {
        console.log('✅ Transcription job created successfully');
      }

      console.log('📊 Updating progress to 100%...');
      item.progress = 100;
      item.status = 'completed';
      item.videoRecord = videoRecord;
      console.log(`✅ Successfully imported: ${item.filename}`);

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

      // Retry logic
      if (item.retryCount < this.MAX_RETRY_ATTEMPTS) {
        item.retryCount++;
        item.status = 'pending';
        item.progress = 0;
        console.log(`🔄 Retrying (${item.retryCount}/${this.MAX_RETRY_ATTEMPTS})`);
      } else {
        item.status = 'failed';
        item.error = error instanceof Error ? error.message : 'Unknown error';
        console.log(`❌ Max retries reached, marking as failed`);
      }
    }

    console.log('💾 Saving queue state...');
    await this.saveQueueState();
    console.log('📢 Notifying listeners...');
    this.notifyListeners();
    console.log('✅ processItem cleanup complete\n');
  }

  /**
   * Get current queue state
   */
  static getState(): ImportQueueState {
    return {
      items: [...this.queue],
      currentIndex: this.currentIndex,
      isProcessing: this.isProcessing,
      totalCount: this.queue.length,
      completedCount: this.getCompletedCount(),
      failedCount: this.getFailedCount(),
    };
  }

  /**
   * Subscribe to queue updates
   */
  static subscribe(callback: ProgressCallback): () => void {
    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Notify all listeners of state changes
   */
  private static notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }

  /**
   * Save queue state to AsyncStorage for persistence
   */
  private static async saveQueueState(): Promise<void> {
    try {
      const state = this.getState();
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('❌ Failed to save queue state:', error);
    }
  }

  /**
   * Load queue state from AsyncStorage
   */
  static async loadQueueState(): Promise<void> {
    try {
      const stateJson = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stateJson) {
        const state: ImportQueueState = JSON.parse(stateJson);
        this.queue = state.items;
        this.currentIndex = state.currentIndex;

        // Resume processing if there are pending items
        const hasPending = this.queue.some(
          item => item.status === 'pending' || item.status === 'failed'
        );
        if (hasPending && !this.isProcessing) {
          console.log('📥 Resuming previous import queue');
          this.processQueue();
        }
      }
    } catch (error) {
      console.error('❌ Failed to load queue state:', error);
    }
  }

  /**
   * Clear completed items from queue
   */
  static clearCompleted(): void {
    this.queue = this.queue.filter(item => item.status !== 'completed');
    this.currentIndex = 0;
    this.saveQueueState();
    this.notifyListeners();
  }

  /**
   * Clear all items from queue
   */
  static clearAll(): void {
    this.queue = [];
    this.currentIndex = 0;
    this.isProcessing = false;
    this.saveQueueState();
    this.notifyListeners();
  }

  /**
   * Retry failed items
   */
  static retryFailed(): void {
    this.queue.forEach(item => {
      if (item.status === 'failed') {
        item.status = 'pending';
        item.progress = 0;
        item.error = undefined;
        item.retryCount = 0;
      }
    });

    this.currentIndex = 0;
    this.saveQueueState();

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Get count of completed items
   */
  private static getCompletedCount(): number {
    return this.queue.filter(item => item.status === 'completed').length;
  }

  /**
   * Get count of failed items
   */
  private static getFailedCount(): number {
    return this.queue.filter(item => item.status === 'failed').length;
  }

  /**
   * Cancel processing (will stop after current batch completes)
   */
  static cancelProcessing(): void {
    console.log('⏹️ Cancelling queue processing');
    this.isProcessing = false;
    this.notifyListeners();
  }
}
