/**
 * Shared TypeScript types for Import Queue System
 *
 * This file contains all type definitions used across the modular import queue architecture.
 */

import { VideoRecord } from '../../lib/supabase';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';

// ============================================================================
// IMPORT QUEUE TYPES
// ============================================================================

/**
 * Represents a single video item in the import queue
 */
export interface ImportVideoItem {
  id: string; // Unique ID for this import job
  asset?: MediaLibrary.Asset; // For MediaLibrary imports
  pickerAsset?: ImagePicker.ImagePickerAsset; // For ImagePicker imports
  uri: string; // Video URI (absolute path)
  relativeUri?: string; // Relative path for recorded videos (survives iOS container changes)
  filename: string; // Video filename
  title?: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number; // 0-100
  error?: string;
  videoRecord?: VideoRecord;
  retryCount: number;
  metadata?: VideoMetadata; // Video metadata (dimensions, duration, etc.)
}

/**
 * Current state of the import queue
 */
export interface ImportQueueState {
  items: ImportVideoItem[];
  currentIndex: number;
  isProcessing: boolean;
  totalCount: number;
  completedCount: number;
  failedCount: number;
}

/**
 * Callback function type for queue state updates
 */
export type ProgressCallback = (state: ImportQueueState) => void;

// ============================================================================
// VIDEO METADATA TYPES
// ============================================================================

/**
 * Video metadata extracted from various sources
 */
export interface VideoMetadata {
  isImported?: boolean;
  isRecorded?: boolean;
  originalFilename?: string;
  originalCreationTime?: number;
  originalModificationTime?: number;
  width?: number;
  height?: number;
  orientation?: 'landscape' | 'portrait';
  duration?: number;
  chapterId?: string | null;
  location?: {
    latitude: number;
    longitude: number;
  } | null;
}

// ============================================================================
// UPLOAD TYPES
// ============================================================================

/**
 * Upload progress information
 */
export interface UploadProgress {
  totalBytesSent: number;
  totalBytesExpectedToSend: number;
  percent: number;
}

/**
 * Result of a successful video upload
 */
export interface UploadResult {
  fileName: string;
  fileSize: number;
  publicUrl: string;
}

/**
 * Upload options
 */
export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  timeout?: number; // Timeout in seconds
}

// ============================================================================
// THUMBNAIL TYPES
// ============================================================================

/**
 * Options for thumbnail generation
 */
export interface ThumbnailOptions {
  frameCount?: number; // Number of frames to generate (default: 3)
  quality?: number; // JPEG quality 0-1 (default: 0.7)
  videoId: string; // Video ID for storage path
}

/**
 * Result of thumbnail generation
 */
export interface ThumbnailResult {
  frameUrls: string[]; // Array of public URLs for uploaded frames
  thumbnailPath: string; // Primary thumbnail (first frame)
}

/**
 * Prepared video for thumbnail generation (with cleanup)
 */
export interface PreparedVideo {
  cacheUri: string; // URI in cache directory
  cleanup: () => Promise<void>; // Cleanup function to delete cache file
}

// ============================================================================
// DATABASE TYPES
// ============================================================================

/**
 * Data required to create a video record in database
 */
export interface VideoRecordData {
  userId: string;
  title: string;
  filePath: string;
  duration: number;
  metadata: VideoMetadata;
  chapterId?: string;
  createdAt?: string; // ISO 8601 timestamp (for imported videos)
}

/**
 * Data for updating video metadata
 */
export interface VideoMetadataUpdate {
  metadata?: VideoMetadata;
  location?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Data for updating video thumbnails
 */
export interface VideoThumbnailUpdate {
  thumbnailPath: string;
  thumbnailFrames: string[];
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Error thrown during upload process
 */
export class UploadError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

/**
 * Error thrown during thumbnail generation
 */
export class ThumbnailGenerationError extends Error {
  constructor(
    message: string,
    public frameIndex?: number
  ) {
    super(message);
    this.name = 'ThumbnailGenerationError';
  }
}

/**
 * Error thrown during database operations
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}
