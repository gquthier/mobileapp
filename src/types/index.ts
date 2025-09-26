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