import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://eenyzudwktcjpefpoapi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlbnl6dWR3a3RjanBlZnBvYXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NzY0NTcsImV4cCI6MjA3NDM1MjQ1N30.iHLbdQaH-FSA7knlflVuRyUQ4n2kOzr3YttbShKiUZk';

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
  theme_id?: string;
  chapter_id?: string;
}

export interface Chapter {
  id?: string;
  title: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  color?: string;
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