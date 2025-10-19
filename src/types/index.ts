export interface User {
  id: string;
  name: string;
  locale: string;
  backups: BackupSettings;
  reminders: ReminderSettings;
}

export interface BackupSettings {
  enabled: boolean;
  provider: 'icloud' | 'drive' | 'local';
  lastBackup?: Date;
}

export interface ReminderSettings {
  enabled: boolean;
  time: string;
  frequency: 'daily' | 'weekly';
}

export interface Chapter {
  id: string;
  userId: string;
  title: string;
  periodStart: Date;
  periodEnd?: Date;
  goals: string[];
  status: 'in_progress' | 'completed';
  videoCount?: number;
  progress?: number;
}

export interface Theme {
  id: string;
  chapterId: string;
  name: string;
  videoCount?: number;
}

export interface Video {
  id: string;
  themeId: string;
  title: string;
  duration: number;
  size: number;
  path: string;
  thumbnailPath?: string;
  createdAt: Date;
  mood?: 'positive' | 'neutral' | 'reflective' | 'challenging';
  keywords: string[];
  transcriptId?: string;
}

export interface Transcript {
  id: string;
  videoId: string;
  text: string;
  segments: TranscriptSegment[];
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  confidence: number;
}

export interface Insight {
  id: string;
  scope: 'video' | 'chapter' | 'weekly';
  summary: string;
  actions: string[];
  createdAt: Date;
}

export interface WordOfDay {
  id: string;
  date: Date;
  text: string;
  rationale: string;
  sources: VideoSource[];
}

export interface VideoSource {
  videoId: string;
  segment: TranscriptSegment;
}

export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  citedSegments?: VideoSource[];
  createdAt: Date;
}

export type FilterType = 'all' | 'in_progress' | 'completed';
export type ViewMode = 'chapters' | 'themes' | 'all';
export type RecordingState = 'ready' | 'recording' | 'paused' | 'confirming';

/**
 * Video Segment - Extends VideoRecord with segment timing information
 * Used when filtering by Life Area to play specific highlight segments instead of full videos
 */
export interface VideoSegment {
  // All VideoRecord fields
  id?: string;
  title: string;
  file_path: string;
  duration: number;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  thumbnail_path?: string;
  thumbnail_frames?: string[];
  theme_id?: string;
  chapter_id?: string;
  arc_number?: number;
  chapter_number?: number;
  location?: string;
  transcription_status?: string;
  transcription_completed?: string;
  metadata?: {
    isLocalBackup?: boolean;
    uploadFailed?: boolean;
    emergencyBackup?: boolean;
    uploadError?: string;
    [key: string]: any;
  };

  // Segment-specific fields
  is_segment?: boolean;           // Flag indicating this is a segment, not a full video
  segment_start_time?: number;    // Start timestamp in seconds
  segment_end_time?: number;      // End timestamp in seconds
  segment_life_area?: string;     // Life Area of this segment (Health, Family, etc.)
  segment_title?: string;         // Title of the highlight for this segment
}