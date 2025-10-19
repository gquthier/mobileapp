/**
 * ImportQueueManager - Queue State Management Module
 *
 * Responsible for managing the import queue state, persistence, and listeners.
 * Extracted from ImportQueueService as part of modular refactoring (Phase 3).
 *
 * Features:
 * - Add/remove items from queue
 * - Queue state management (currentIndex, isProcessing)
 * - Persistence to AsyncStorage (survives app restarts)
 * - Observer pattern (subscribe/notify listeners)
 * - Queue utilities (clear, retry, counts)
 * - Comprehensive logging for debugging
 *
 * @module ImportQueueManager
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ImportVideoItem,
  ImportQueueState,
  ProgressCallback,
} from './types';

export class ImportQueueManager {
  // Queue state
  private static queue: ImportVideoItem[] = [];
  private static currentIndex: number = 0;
  private static isProcessing: boolean = false;

  // Observers
  private static listeners: ProgressCallback[] = [];

  // Configuration
  private static readonly STORAGE_KEY = '@import_queue_state';
  private static readonly MAX_RETRY_ATTEMPTS = 3;

  /**
   * Add items to the queue
   *
   * @param items - Items to add to queue
   *
   * @example
   * ImportQueueManager.addItems([
   *   { id: 'item-1', uri: '...', filename: 'video1.mp4', ... },
   *   { id: 'item-2', uri: '...', filename: 'video2.mp4', ... }
   * ]);
   */
  static addItems(items: ImportVideoItem[]): void {
    console.log(`📥 [ImportQueueManager] Adding ${items.length} items to queue`);
    console.log(`📊 Queue state BEFORE:`);
    console.log(`  - Current queue length: ${this.queue.length}`);
    console.log(`  - Current index: ${this.currentIndex}`);
    console.log(`  - Is processing: ${this.isProcessing}`);

    this.queue.push(...items);

    // Reset currentIndex if we're adding to a previously completed queue
    // This ensures new items get processed
    if (this.currentIndex >= this.queue.length - items.length) {
      console.log(`🔄 Resetting currentIndex from ${this.currentIndex} to 0 (new items added to completed queue)`);
      this.currentIndex = 0;
    }

    console.log(`📊 Queue state AFTER:`);
    console.log(`  - New queue length: ${this.queue.length}`);
    console.log(`  - Current index: ${this.currentIndex}`);
  }

  /**
   * Get current queue state
   *
   * @returns Current queue state with all items and counters
   *
   * @example
   * const state = ImportQueueManager.getState();
   * console.log(`Processing: ${state.isProcessing}`);
   * console.log(`Total: ${state.totalCount}, Completed: ${state.completedCount}`);
   */
  static getState(): ImportQueueState {
    return {
      items: [...this.queue], // Return copy to prevent external modifications
      currentIndex: this.currentIndex,
      isProcessing: this.isProcessing,
      totalCount: this.queue.length,
      completedCount: this.getCompletedCount(),
      failedCount: this.getFailedCount(),
    };
  }

  /**
   * Set processing state
   *
   * @param isProcessing - Whether queue is currently processing
   *
   * @example
   * ImportQueueManager.setProcessing(true);
   * // ... do work ...
   * ImportQueueManager.setProcessing(false);
   */
  static setProcessing(isProcessing: boolean): void {
    console.log(`🔄 [ImportQueueManager] Setting isProcessing = ${isProcessing}`);
    this.isProcessing = isProcessing;
  }

  /**
   * Check if queue is currently processing
   *
   * @returns True if processing
   */
  static isQueueProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Get current processing index
   *
   * @returns Current index in queue
   */
  static getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * Increment current index (move to next batch)
   *
   * @param increment - How many items to skip (default: 1)
   *
   * @example
   * ImportQueueManager.incrementIndex(2); // Skip 2 items (batch of 2)
   */
  static incrementIndex(increment: number = 1): void {
    this.currentIndex += increment;
    console.log(`📊 [ImportQueueManager] Current index now: ${this.currentIndex}`);
  }

  /**
   * Get items in queue
   *
   * @returns All queue items (copy)
   */
  static getItems(): ImportVideoItem[] {
    return [...this.queue];
  }

  /**
   * Get a specific item by index
   *
   * @param index - Item index
   * @returns Item at index or undefined
   */
  static getItem(index: number): ImportVideoItem | undefined {
    return this.queue[index];
  }

  /**
   * Get item by ID
   *
   * @param itemId - Item ID to find
   * @returns Item or undefined if not found
   *
   * @example
   * const item = ImportQueueManager.getItemById('import_123');
   * if (item) {
   *   console.log('Status:', item.status);
   * }
   */
  static getItemById(itemId: string): ImportVideoItem | undefined {
    return this.queue.find(item => item.id === itemId);
  }

  /**
   * Update item in queue
   *
   * @param itemId - Item ID to update
   * @param updates - Partial item updates
   *
   * @example
   * ImportQueueManager.updateItem('import_123', {
   *   status: 'completed',
   *   progress: 100
   * });
   */
  static updateItem(itemId: string, updates: Partial<ImportVideoItem>): void {
    const item = this.queue.find(i => i.id === itemId);
    if (item) {
      Object.assign(item, updates);
    }
  }

  /**
   * Remove item from queue by ID
   *
   * @param itemId - Item ID to remove
   * @returns True if item was found and removed
   *
   * @example
   * ImportQueueManager.removeItem('import_123');
   */
  static removeItem(itemId: string): boolean {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(item => item.id !== itemId);

    const wasRemoved = this.queue.length < initialLength;
    if (wasRemoved) {
      console.log(`🗑️ [ImportQueueManager] Removed item: ${itemId}`);
      console.log(`  - Queue length: ${initialLength} → ${this.queue.length}`);

      // Adjust currentIndex if necessary
      if (this.currentIndex > this.queue.length) {
        this.currentIndex = this.queue.length;
        console.log(`  - Adjusted currentIndex to ${this.currentIndex}`);
      }
    } else {
      console.warn(`⚠️ [ImportQueueManager] Item not found: ${itemId}`);
    }

    return wasRemoved;
  }

  /**
   * Subscribe to queue state changes
   *
   * @param callback - Function to call on state change
   * @returns Unsubscribe function
   *
   * @example
   * const unsubscribe = ImportQueueManager.subscribe((state) => {
   *   console.log('Queue updated:', state.completedCount, '/', state.totalCount);
   * });
   *
   * // Later...
   * unsubscribe();
   */
  static subscribe(callback: ProgressCallback): () => void {
    console.log('📢 [ImportQueueManager] New listener subscribed');
    this.listeners.push(callback);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
      console.log('📢 [ImportQueueManager] Listener unsubscribed');
    };
  }

  /**
   * Notify all listeners of state change
   *
   * Call this after any state modification to update UI.
   *
   * @example
   * ImportQueueManager.updateItem('item-1', { progress: 50 });
   * ImportQueueManager.notifyListeners(); // UI updates
   */
  static notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('❌ Error in listener callback:', error);
      }
    });
  }

  /**
   * Save queue state to AsyncStorage
   *
   * Call this after significant state changes to persist across app restarts.
   *
   * @returns Promise that resolves when save completes
   *
   * @example
   * await ImportQueueManager.saveState();
   */
  static async saveState(): Promise<void> {
    try {
      const state = this.getState();
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
      console.log('💾 [ImportQueueManager] Queue state saved to AsyncStorage');
    } catch (error) {
      console.error('❌ Failed to save queue state:', error);
    }
  }

  /**
   * Load queue state from AsyncStorage
   *
   * Call this on app startup to restore previous queue state.
   *
   * @returns Promise that resolves when load completes
   *
   * @example
   * await ImportQueueManager.loadState();
   * if (ImportQueueManager.hasPendingItems()) {
   *   console.log('Queue has pending items, resuming...');
   * }
   */
  static async loadState(): Promise<void> {
    try {
      const stateJson = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stateJson) {
        const state: ImportQueueState = JSON.parse(stateJson);
        this.queue = state.items;
        this.currentIndex = state.currentIndex;

        console.log('📥 [ImportQueueManager] Queue state loaded from AsyncStorage');
        console.log(`  - Queue length: ${this.queue.length}`);
        console.log(`  - Current index: ${this.currentIndex}`);
        console.log(`  - Pending items: ${this.queue.filter(i => i.status === 'pending' || i.status === 'failed').length}`);
      } else {
        console.log('📥 [ImportQueueManager] No saved queue state found');
      }
    } catch (error) {
      console.error('❌ Failed to load queue state:', error);
    }
  }

  /**
   * Check if queue has pending or failed items
   *
   * @returns True if there are items to process
   *
   * @example
   * if (ImportQueueManager.hasPendingItems()) {
   *   ImportQueueService.processQueue();
   * }
   */
  static hasPendingItems(): boolean {
    return this.queue.some(
      item => item.status === 'pending' || item.status === 'failed'
    );
  }

  /**
   * Clear completed items from queue
   *
   * Removes all items with status 'completed' and resets index.
   *
   * @example
   * ImportQueueManager.clearCompleted();
   * await ImportQueueManager.saveState();
   */
  static clearCompleted(): void {
    const beforeCount = this.queue.length;
    this.queue = this.queue.filter(item => item.status !== 'completed');
    this.currentIndex = 0;
    const afterCount = this.queue.length;

    console.log(`🧹 [ImportQueueManager] Cleared ${beforeCount - afterCount} completed items`);
    console.log(`  - Queue length: ${beforeCount} → ${afterCount}`);
  }

  /**
   * Clear all items from queue
   *
   * Completely resets the queue to empty state.
   *
   * @example
   * ImportQueueManager.clearAll();
   * await ImportQueueManager.saveState();
   */
  static clearAll(): void {
    const count = this.queue.length;
    this.queue = [];
    this.currentIndex = 0;
    this.isProcessing = false;

    console.log(`🧹 [ImportQueueManager] Cleared all ${count} items from queue`);
  }

  /**
   * Retry all failed items
   *
   * Resets status and retry count for all failed items.
   *
   * @example
   * ImportQueueManager.retryFailed();
   * await ImportQueueManager.saveState();
   * ImportQueueService.processQueue();
   */
  static retryFailed(): void {
    let retryCount = 0;

    this.queue.forEach(item => {
      if (item.status === 'failed') {
        item.status = 'pending';
        item.progress = 0;
        item.error = undefined;
        item.retryCount = 0;
        retryCount++;
      }
    });

    this.currentIndex = 0;

    console.log(`🔄 [ImportQueueManager] Retrying ${retryCount} failed items`);
  }

  /**
   * Get count of completed items
   *
   * @returns Number of completed items
   */
  static getCompletedCount(): number {
    return this.queue.filter(item => item.status === 'completed').length;
  }

  /**
   * Get count of failed items
   *
   * @returns Number of failed items
   */
  static getFailedCount(): number {
    return this.queue.filter(item => item.status === 'failed').length;
  }

  /**
   * Get count of pending items
   *
   * @returns Number of pending items
   */
  static getPendingCount(): number {
    return this.queue.filter(item => item.status === 'pending').length;
  }

  /**
   * Get count of uploading items
   *
   * @returns Number of uploading items
   */
  static getUploadingCount(): number {
    return this.queue.filter(item => item.status === 'uploading').length;
  }

  /**
   * Get max retry attempts allowed
   *
   * @returns Maximum retry attempts
   */
  static getMaxRetryAttempts(): number {
    return this.MAX_RETRY_ATTEMPTS;
  }

  /**
   * Check if item should be retried
   *
   * @param item - Item to check
   * @returns True if item should be retried
   *
   * @example
   * if (ImportQueueManager.shouldRetry(item)) {
   *   item.retryCount++;
   *   item.status = 'pending';
   * } else {
   *   item.status = 'failed';
   * }
   */
  static shouldRetry(item: ImportVideoItem): boolean {
    return item.retryCount < this.MAX_RETRY_ATTEMPTS;
  }

  /**
   * Cancel processing
   *
   * Sets isProcessing to false. Processing will stop after current batch completes.
   *
   * @example
   * ImportQueueManager.cancelProcessing();
   */
  static cancelProcessing(): void {
    console.log('⏹️ [ImportQueueManager] Cancelling queue processing');
    this.isProcessing = false;
  }

  /**
   * Get queue length
   *
   * @returns Total number of items in queue
   */
  static getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is empty
   *
   * @returns True if queue has no items
   */
  static isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Get batch of items to process
   *
   * @param batchSize - Number of items to get
   * @returns Array of items to process
   *
   * @example
   * const batch = ImportQueueManager.getNextBatch(2);
   * // Process batch concurrently
   */
  static getNextBatch(batchSize: number): ImportVideoItem[] {
    return this.queue
      .slice(this.currentIndex, this.currentIndex + batchSize)
      .filter(item => item.status === 'pending' || item.status === 'failed');
  }

  /**
   * Check if more items remain to process
   *
   * @returns True if currentIndex < queue length
   */
  static hasMoreItems(): boolean {
    return this.currentIndex < this.queue.length;
  }
}
