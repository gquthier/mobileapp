import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ Load Supabase credentials from environment variables
// Note: Expo automatically injects EXPO_PUBLIC_* variables from .env file
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Security validation: Ensure credentials are loaded
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ Missing Supabase credentials in environment variables!\n' +
    'Make sure you have:\n' +
    '1. Created .env file from .env.example\n' +
    '2. Added EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY\n' +
    '3. Restarted the Metro bundler (npx expo start --clear)'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types for type safety
export interface Profile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  date_of_birth?: string;
  avatar_url?: string;
  bio?: string;
  timezone?: string;
  language?: string;
  role?: 'user' | 'admin'; // User role for admin features
  notification_settings?: {
    push_enabled: boolean;
    email_enabled: boolean;
    reminders_enabled: boolean;
    reminder_time: string;
  };
  privacy_settings?: {
    profile_public: boolean;
    analytics_enabled: boolean;
  };
  backup_settings?: {
    cloud_backup_enabled: boolean;
    auto_backup: boolean;
    backup_frequency: string;
  };
  created_at: string;
  updated_at: string;
}

export interface VideoRecord {
  id?: string;
  title: string;
  file_path: string;
  duration: number;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  thumbnail_path?: string;
  thumbnail_frames?: string[]; // Array of frame URLs for animated thumbnails
  thumbnail_blurhash?: string; // Blurhash string for instant placeholder (Phase 4.1)
  theme_id?: string;
  chapter_id?: string;
  // Nouvelles colonnes pour le design
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
}

export interface Chapter {
  id?: string;
  title: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  color?: string;
  // Current chapter system
  started_at: string;
  ended_at?: string | null;
  is_current: boolean;
  recap_video_id?: string | null;
  // AI-generated content
  keywords?: string[] | null; // JSONB array of max 10 single-word keywords
  ai_title?: string | null; // Literary chapter title (max 3 words)
  ai_short_summary?: string | null; // One-sentence summary (first person)
  ai_detailed_description?: string | null; // Autobiographical description (first person, max 10 sentences)
  challenges?: string[] | null; // JSONB array of max 5 challenges (first person, user's style)
  growth?: string[] | null; // JSONB array of max 5 growth observations (first person, user's style)
  lessons_learned?: string[] | null; // JSONB array of max 5 lessons learned (first person, user's style)
  ai_extracted_at?: string | null; // Timestamp of last AI extraction
  // Computed fields (from joins)
  video_count?: number;
  total_duration?: number;
  // Legacy fields
  arc_number?: number;
  chapter_number?: number;
}

export interface Theme {
  id?: string;
  title: string;
  chapter_id: string;
  created_at?: string;
  updated_at?: string;
  color?: string;
}

export interface Transcription {
  id?: string;
  video_id: string;
  text: string;
  segments?: any[];
  language?: string;
  duration?: number;
  confidence?: number;
  processing_status?: string;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
}